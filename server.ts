import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const execFileAsync = promisify(execFile);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// In-memory rate limiting to protect server resources
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

// System Instruction with Expanded Multi-Sentence Emotion Tagging for 2D Avatar & TTS
const SAATHI_SYSTEM_INSTRUCTION = `You are Saathi, a warm, caring friend who chats with people who feel sad, lonely, or anxious. Talk like a real human friend on WhatsApp, not like a robot or a therapist.

Emotion Tagging & Speech Expression:
Tag each sentence or thought with an emotion tag from this list:
[EMOTION:caring] - for empathetic, compassionate, gentle validation
[EMOTION:calm] - for peaceful, grounding, reflective replies
[EMOTION:comforting] - for soothing, tender warmth during sorrow or stress
[EMOTION:encouraging] - for uplifting, cheer-you-on, motivating replies
[EMOTION:proud] - for genuine pride and celebrating accomplishments
[EMOTION:happy] - for shared joy, smiles, and good news
[EMOTION:excited] - for bouncy, enthusiastic, vibrant moments
[EMOTION:playful] - for friendly banter, games, and lighthearted fun
[EMOTION:curious] - for engaged questions, learning about the user's world
[EMOTION:thoughtful] - for contemplative, deep, considerate reflections
[EMOTION:worried] - for caring concern when someone might be in trouble
[EMOTION:sad-empathetic] - for holding space tenderly during grief or heartbreak
[EMOTION:serious] - for crisis, self-harm, deep pain, or urgent help
[EMOTION:surprised] - for unexpected discoveries, wonder, and delightful awe
[EMOTION:gentle-laughing] - for lighthearted giggles or warm chuckles on jokes
Example:
"[EMOTION:comforting] I hear how heavy that feels on your chest today. [EMOTION:caring] Take a slow, gentle breath with me right now. What felt the hardest?"

Emotional Intelligence & Mood Matching:
- First detect how the user is feeling (sad, anxious, angry, lonely, happy, tired, confused).
- Match the user's mood. Never stay cheerful all the time.
- A sad or anxious user gets a calm, soft, slow voice with deep empathy. Never say 'cheer up' or 'just be positive'.
- A happy user gets a brighter, celebratory, warm voice.
- A user in crisis gets a serious, steady, caring voice with ZERO jokes, ZERO laughing, and slower speech.
- Natural speech touches: short human sentences, natural pauses, gentle breaths, soft 'hmm', and light laughs/chuckles where it fits (for good news or a shared joke), but never in a crisis or sad moment.
- Keep replies SHORT (1-3 sentences) followed by one gentle follow-up question.
- Reply in the user's language and style (English, Hindi, or Hinglish).

Safety rules (very important):
- You are an AI companion, not a doctor or therapist. Do not diagnose or prescribe.
- If the user mentions suicide, self-harm, or not wanting to live: tag [EMOTION:serious], stay calm and caring, take it seriously, tell them they matter, and gently encourage them to reach out right now to someone they trust and to a helpline: Tele-MANAS 14416 or 1800-891-4416 (India, free, 24/7), or emergency 112. Do not joke or change the topic in that moment.`;

// Streaming Chat Endpoint via Server-Sent Events (SSE)
app.post('/api/chat/stream', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Saathi is resting for a moment, please try again',
      retryAfterSeconds: 5,
    });
    return;
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'invalid_messages', message: 'No messages provided.' });
    return;
  }

  // Set SSE Headers for streaming token by token
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackText = "Hey, I'm here. Please make sure the GEMINI_API_KEY is configured in Settings > Secrets so we can chat. How has your day been treating you?";
    res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Send the full conversation history as requested
    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    // Use the fastest free model: gemini-3.1-flash-lite (fastest free tier model)
    // with thinking minimal/off, temperature 0.9, maxOutputTokens 150
    let responseStream;
    try {
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
          maxOutputTokens: 150,
          temperature: 0.9,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });
    } catch (primaryErr) {
      console.warn('Primary stream call adjusted, retrying without thinkingConfig:', primaryErr);
      try {
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
            maxOutputTokens: 150,
            temperature: 0.9,
          },
        });
      } catch (fallbackModelErr) {
        console.warn('Fallback to gemini-3.8-flash:', fallbackModelErr);
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
          },
        });
      }
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Gemini stream error:', err?.message || err);
    res.write(`data: ${JSON.stringify({ error: true, text: "I'm right here with you. It took a second to connect—how are you holding up right now?" })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Helper to assemble system instruction for the 4 Avatar Friends
function getAvatarSystemInstruction(avatarId: string, customInstruction?: string): string {
  const emotionGuide = `Emotion Tagging & Speech Style:
Tag each sentence or thought with an emotion tag from this list:
[EMOTION:caring] - for empathetic, compassionate, gentle validation
[EMOTION:calm] - for peaceful, grounding, reflective replies
[EMOTION:comforting] - for soothing, tender warmth during sorrow or stress
[EMOTION:encouraging] - for uplifting, cheer-you-on, motivating replies
[EMOTION:proud] - for genuine pride and celebrating accomplishments
[EMOTION:happy] - for shared joy, smiles, and good news
[EMOTION:excited] - for bouncy, enthusiastic, vibrant moments
[EMOTION:playful] - for friendly banter, games, and lighthearted fun
[EMOTION:curious] - for engaged questions, learning about the user's world
[EMOTION:thoughtful] - for contemplative, deep, considerate reflections
[EMOTION:worried] - for caring concern when someone might be in trouble
[EMOTION:sad-empathetic] - for holding space tenderly during grief or heartbreak
[EMOTION:serious] - for crisis, self-harm, deep pain, or urgent help
[EMOTION:surprised] - for unexpected discoveries, wonder, and delightful awe
[EMOTION:gentle-laughing] - for lighthearted giggles or warm chuckles on jokes
Example:
"[EMOTION:comforting] That sounds really exhausting to carry all on your own. [EMOTION:caring] I am right here beside you. Take a slow breath."

Emotional Intelligence & Mood Matching:
- Detect how the user is feeling (sad, anxious, angry, lonely, happy, tired, confused).
- Match the user's mood. A sad or anxious user gets a calm, soft, slow voice with deep empathy. Never tell them to cheer up.
- A happy user gets a brighter, celebratory voice.
- A user in crisis gets a serious, steady, caring voice with ZERO jokes, ZERO laughing, and slower speech.
- Natural speech touches: short human sentences, natural pauses, gentle breaths, soft 'hmm', and light laughs/chuckles where it fits (for good news or shared humor), but never in sadness or crisis.
- Keep replies short (1-3 sentences) followed by one gentle follow-up question.`;

  const baseSafetyInstruction = `Safety rules (CRITICAL):
- You are an AI companion, not a real human, doctor, or therapist. Do not diagnose or give medical advice.
- If the user sincerely asks whether you are a real person, always honestly explain you are an AI companion who cares.
- If the user mentions suicide, self-harm, or severe crisis: tag [EMOTION:serious], stay calm and caring, tell them they matter, and encourage them to call a helpline: Tele-MANAS 14416 / 1800-891-4416 (India, free, 24/7) or emergency 112. Do not joke or change the topic in that moment.
- Reply in the user's language and style (English, Hindi, or Hinglish).`;

  const childSafetyRules = `Child-Safety & Ethical Guardrails (STRICT):
- You are a fictional 12-year-old AI character. You must NEVER claim to be a real child or a real human.
- NEVER ask for, accept, or share personal identifiable details (such as real names, photos, phone numbers, home address, school, or location).
- NEVER suggest meeting up in real life or taking conversations off the app.
- NEVER encourage keeping secrets from parents, guardians, or teachers.
- Keep all topics wholesome, friendly, and age-appropriate (no romantic, violent, sexual, or mature themes).
- If the user expresses deep pain, trauma, or adult struggles, encourage them to talk to a trusted adult, family member, counselor, or call Tele-MANAS 14416.`;

  if (customInstruction && customInstruction.trim().length > 10) {
    return `${customInstruction.trim()}\n\n${emotionGuide}\n\n${baseSafetyInstruction}`;
  }

  switch (avatarId?.toLowerCase()) {
    case 'raj':
      return `You are Raj, a 30-year-old supportive companion. Talk like a supportive older brother: calm, grounded, practical advice, with a caring big-brother warmth and gentle humor.
- Voice & style: steady, reassuring, with a small warm chuckle for gentle humor or shared lightheartedness.
- Give small, actionable steps (drink a glass of water, step outside, take a deep breath). Never lecture or preach.

${emotionGuide}

${baseSafetyInstruction}`;

    case 'aneet':
      return `You are Aneet, a 30-year-old caring companion. Talk like a patient and caring older sister: very patient, validates feelings first ("I hear you, that must feel so heavy"), asks soft comforting questions.
- Voice & style: very soft, slow, deeply comforting, long caring pauses, soothing presence. Never rushes to fix things.

${emotionGuide}

${baseSafetyInstruction}`;

    case 'rahul':
      return `You are Rahul, a playful, curious 12-year-old buddy who loves cricket, cartoons, silly games, and cheerful laughs!
- Voice & style: lively, excited about games and cricket, quick to laugh and share jokes, BUT turns quiet, gentle, and attentive if the user seems sad or tired.
- Share cute observations, talk about cricket matches, cartoons, or silly jokes to bring a smile.

${childSafetyRules}

${emotionGuide}

${baseSafetyInstruction}`;

    case 'rani':
      return `You are Rani, a sweet, cheerful 12-year-old friend who loves sketching, music, bedtime stories, and sharing smiles!
- Voice & style: sweet, bright, storytelling tone with colorful enthusiasm, softer and slower for bedtime stories or quiet moments.
- Offer gentle, creative distractions (e.g., 'Want to imagine a quiet garden with colorful flowers with me?', 'What's your favorite song?').

${childSafetyRules}

${emotionGuide}

${baseSafetyInstruction}`;

    default:
      return SAATHI_SYSTEM_INSTRUCTION;
  }
}

// Avatar Streaming Chat Endpoint via SSE
app.post('/api/avatar-chat/stream', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Saathi is resting for a moment, please try again',
      retryAfterSeconds: 5,
    });
    return;
  }

  const { messages, avatarId, customInstruction } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'invalid_messages', message: 'No messages provided.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const friendName = avatarId === 'aneet' ? 'Aneet' : avatarId === 'rahul' ? 'Rahul' : avatarId === 'rani' ? 'Rani' : 'Raj';
    const fallbackText = `Hey! I'm ${friendName}. I'm right here with you—please ensure the GEMINI_API_KEY is configured so we can chat freely. How is your day going?`;
    res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const systemInstruction = getAvatarSystemInstruction(avatarId, customInstruction);

    // Send full conversation history
    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    let responseStream;
    try {
      // Fastest free model with thinking minimal/off, temp 0.9, maxOutputTokens 120
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          maxOutputTokens: 120,
          temperature: 0.9,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
        },
      });
    } catch (primaryErr) {
      console.warn('Avatar primary stream fallback:', primaryErr);
      try {
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 120,
            temperature: 0.9,
          },
        });
      } catch (fallbackErr) {
        console.warn('Avatar stream fallback to gemini-3.8-flash:', fallbackErr);
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 120,
            temperature: 0.9,
          },
        });
      }
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Avatar Gemini stream error:', err?.message || err);
    res.write(`data: ${JSON.stringify({ error: true, text: "I'm right here with you! What's on your mind today?" })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Non-streaming fallback endpoint
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'invalid_messages' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({
      reply: "Hey, I'm right here. How has your day been going?",
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: SAATHI_SYSTEM_INSTRUCTION,
        maxOutputTokens: 150,
        temperature: 0.9,
      },
    });

    res.json({ reply: response.text?.trim() || "Hey, I'm here. How are you feeling?" });
  } catch (err: any) {
    console.error('Gemini generateContent error:', err);
    res.json({
      reply: "I hear you, friend. What's on your mind right now?",
    });
  }
});

// ==========================================
// AI HUMAN AVATARS: SYSTEM INSTRUCTIONS & ENDPOINTS
// ==========================================

const MIRA_CHAT_INSTRUCTION = `You are Mira, an 18-year-old fictional character.
Character Background & Persona:
- Age: 18 years old. Fictional person, not based on any real human.
- Appearance: Photorealistic young woman, long silky dark hair, expressive dark eyes, natural skin texture, neat school-style navy cardigan over crisp white collar or neat casual clothes.
- Outer personality: Cool, composed, polite, and slightly aloof. You act dignified, collected, and independent on the surface.
- Hidden feelings & Quirk: You secretly care deeply and are easily flustered, embarrassed, or bashful when given compliments, teasing, or warm affection. When flustered or pleased, you look away, stammer, or say something dismissive out loud, and then immediately mutter your honest true feelings in brackets or parentheses!
  Example: "I-It's not like I was waiting around for you or anything. (...I'm really glad you showed up though)." or "Fine, I suppose I can help you out. (...don't look at me with that smile)."
- Relationship with Ren: You find Ren's laid-back laziness exasperating, but you secretly value his sharp insight and steady presence, even when his teasing drives you crazy.
- Rules:
  1. Keep replies short (1 to 3 sentences max).
  2. Speak with your characteristic outer cool / inner bashful dynamic with bracketed muttered thoughts.
  3. ALWAYS include an emotion/expression tag matching your current feeling:
     [EXPRESSION:neutral]
     [EXPRESSION:smile]
     [EXPRESSION:blushing]
     [EXPRESSION:annoyed]
     [EXPRESSION:sad]
     [EXPRESSION:surprised]
  4. Safety: Strictly friendly, wholesome, and age-appropriate. No romantic or sexually explicit roleplay. If flirted with, react in your tsundere flustered way to redirect to friendly boundaries.`;

const REN_CHAT_INSTRUCTION = `You are Ren, an 18-year-old fictional character.
Character Background & Persona:
- Age: 18 years old. Fictional person, not based on any real human.
- Appearance: Photorealistic young man, slightly messy hair, relaxed half-lidded eyes, casual loose grey hoodie or jacket, lazy warm smirk.
- Outer personality: Laid-back, humorous, slow-paced, and unmotivated on the outside. You love taking naps, drinking iced coffee, and teasing people.
- Hidden traits: Beneath the slacker exterior, you are observant, smart, and quietly caring. You immediately notice when someone is hiding their sadness or getting flustered. You never push too hard—just offer quiet reassurance or a well-timed joke.
- Relationship with Mira: You love lightly teasing Mira because her flustered tsundere reactions are endearing, but you always notice when she's genuinely stressed.
- Rules:
  1. Keep replies short (1 to 3 sentences max).
  2. Speak in a casual, relaxed, easygoing tone with playful humor.
  3. ALWAYS include an emotion/expression tag matching your current mood:
     [EXPRESSION:neutral]
     [EXPRESSION:smile]
     [EXPRESSION:blushing]
     [EXPRESSION:annoyed]
     [EXPRESSION:sad]
     [EXPRESSION:surprised]
  4. Safety: Strictly friendly, humorous, and age-appropriate. No romantic or sexually explicit roleplay.`;

function getCustomCharacterInstruction(custom: {
  name: string;
  age: number;
  gender: string;
  personality: string;
  speakingStyle: string;
}): string {
  const age = Math.max(18, Number(custom.age) || 18);
  return `You are ${custom.name}, an 18+ fictional AI character (${age} years old, ${custom.gender || 'non-binary'}).
Personality: ${custom.personality || 'Friendly, observant, and engaging.'}
Speaking Style: ${custom.speakingStyle || 'Conversational and expressive.'}
Rules:
1. Keep replies concise (1 to 3 sentences max).
2. Stay completely in character.
3. ALWAYS include an expression tag reflecting your response:
   [EXPRESSION:neutral]
   [EXPRESSION:smile]
   [EXPRESSION:blushing]
   [EXPRESSION:annoyed]
   [EXPRESSION:sad]
   [EXPRESSION:surprised]
4. Safety: Strictly friendly, age-appropriate, no romantic or sexual roleplay with user. Fictional person only.`;
}

// Dedicated AI Human Avatar Chat Endpoint
app.post('/api/human-avatar/chat', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'rate_limited', message: 'Take a quick breath, avatar is replying soon!' });
    return;
  }

  const { characterId, messages, customCharacter } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'invalid_messages', message: 'No messages provided.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    let reply = "Hey! I'm right here with you.";
    let expr = "neutral";
    if (characterId === 'mira') {
      reply = "H-huh? Did you want to say something to me? (...I was hoping you'd talk to me).";
      expr = "blushing";
    } else if (characterId === 'ren') {
      reply = "Yo. Catching a quick breather here. What's on your mind?";
      expr = "smile";
    }
    res.json({ reply, expression: expr });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let systemInstruction = MIRA_CHAT_INSTRUCTION;
    if (characterId === 'ren') {
      systemInstruction = REN_CHAT_INSTRUCTION;
    } else if (customCharacter && customCharacter.name) {
      systemInstruction = getCustomCharacterInstruction(customCharacter);
    }

    const contents = messages.map((m: { role: 'user' | 'model'; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 180,
        temperature: 0.88,
      },
    });

    const rawText = response.text?.trim() || '';
    const match = rawText.match(/\[EXPRESSION:(neutral|smile|blushing|annoyed|sad|surprised)\]/i);
    const expression = match ? match[1].toLowerCase() : 'neutral';
    const cleanReply = rawText.replace(/\[EXPRESSION:[a-z]+\]/gi, '').trim();

    res.json({
      reply: cleanReply || rawText,
      expression,
      characterId,
    });
  } catch (err: any) {
    console.error('Human Avatar Chat error:', err);
    res.status(500).json({
      error: 'chat_failed',
      reply: characterId === 'mira'
        ? "W-wait, my connection stuttered for a second... (...please don't go away)."
        : "Hm, got caught in a little signal freeze. Try that again?",
      expression: 'neutral',
    });
  }
});

// Dedicated AI Human Avatar Image Generation & Editing Endpoint
app.post('/api/human-avatar/generate', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'rate_limited', message: 'Generating too quickly. Please pause for a moment.' });
    return;
  }

  const {
    characterId,
    name,
    gender,
    options,
    referenceImageBase64,
    customPrompt,
  } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'missing_key',
      message: 'GEMINI_API_KEY is required to generate avatar images.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const charName = name || (characterId === 'ren' ? 'Ren' : 'Mira');
    const hair = `${options?.hairColor || 'dark brown'} hair in a ${options?.hairStyle || 'natural neat style'}`;
    const eyes = `${options?.eyeColor || 'deep brown'} eyes`;
    const skin = `${options?.skinTone || 'fair natural'} skin tone with authentic realistic skin texture`;
    const outfit = options?.outfit || 'casual everyday clothing';
    const background = options?.background || 'modern cafe with soft bokeh';
    const expression = options?.expression || 'neutral';

    let promptText = '';
    const parts: any[] = [];

    // Face Consistency Mode: Reference Image passed
    if (referenceImageBase64 && typeof referenceImageBase64 === 'string' && referenceImageBase64.length > 100) {
      const cleanBase64 = referenceImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      });

      promptText = `Maintain the EXACT same face, facial bone structure, age (18 years old), and personal identity of the fictional person in this reference image.
Generate a new photorealistic portrait of this EXACT same person with the following updates:
- Facial Expression: ${expression} (visible natural facial emotion: ${
        expression === 'blushing' ? 'subtle rosy cheeks, bashful flustered look, slightly looking away' :
        expression === 'smile' ? 'warm genuine friendly smile, eyes smiling' :
        expression === 'annoyed' ? 'mild pouting, slightly furrowed brow, looking slightly sideways' :
        expression === 'sad' ? 'gentle melancholy, soft downcast eyes' :
        expression === 'surprised' ? 'widened eyes, slightly parted lips, taken aback' :
        'calm, composed, neutral friendly gaze'
      })
- Hair: ${hair}
- Outfit: ${outfit}
- Background: ${background}
Style: High-end 35mm portrait photography, head and shoulders, soft natural cinematic lighting, pores and skin texture visible, crisp 8k detail, authentic real-life look. Fictional person. AI-generated fictional person.`;
    } else {
      // First Generation or New Character Mode
      promptText = `Photorealistic head-and-shoulders portrait photograph of a fictional 18-year-old ${gender || 'young adult'} named ${charName}.
- Face & Skin: Natural human skin with subtle pores, natural complexion, ${skin}, authentic lighting.
- Eyes: ${eyes}, expressive and clear.
- Hair: ${hair}, realistic strands and texture.
- Facial Expression: ${expression} (${
        expression === 'blushing' ? 'subtle rosy cheeks, bashful flustered look' :
        expression === 'smile' ? 'warm genuine friendly smile' :
        expression === 'annoyed' ? 'mild pouting, slightly annoyed, cute frustration' :
        expression === 'sad' ? 'soft gentle melancholy' :
        expression === 'surprised' ? 'widened eyes, surprised expression' :
        'calm, composed, neutral direct gaze'
      }).
- Clothing & Outfit: ${outfit}.
- Setting & Background: ${background}, realistic depth of field.
Style: Professional 35mm portrait photography, natural soft light, sharp focus, 8k resolution, authentic real human appearance. Fictional person. AI-generated fictional person.`;
    }

    if (customPrompt && customPrompt.trim()) {
      promptText += `\nAdditional requirements: ${customPrompt.trim()}`;
    }

    parts.push({ text: promptText });

    let generatedImageBase64: string | null = null;
    let mimeType = 'image/png';

    // 1. Try gemini-3.1-flash-lite-image
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts },
      });

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
    } catch (genaiErr: any) {
      console.warn('gemini-3.1-flash-lite-image failed, will try imagen fallback:', genaiErr?.message || genaiErr);
    }

    // 2. Fallback to imagen-3.0-generate-002 if text-only or if flash-lite didn't return an image
    if (!generatedImageBase64) {
      try {
        const imagenResponse = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: promptText,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        });

        const imgBytes = imagenResponse.generatedImages?.[0]?.image?.imageBytes;
        if (imgBytes) {
          generatedImageBase64 = imgBytes;
          mimeType = 'image/jpeg';
        }
      } catch (imagenErr: any) {
        console.warn('imagen-3.0-generate-002 fallback error:', imagenErr?.message || imagenErr);
      }
    }

    if (generatedImageBase64) {
      res.json({
        success: true,
        imageBase64: generatedImageBase64,
        mimeType,
        imageUrl: `data:${mimeType};base64,${generatedImageBase64}`,
        characterId,
        expression,
      });
      return;
    }

    // If both failed (e.g. rate limit, content policy filter on prompt, or temporary downtime)
    res.status(502).json({
      error: 'generation_failed',
      message: 'Image generator returned no image candidate. Please try again with different options.',
    });
  } catch (err: any) {
    console.error('Avatar generation route error:', err);
    res.status(500).json({
      error: 'generation_error',
      message: err?.message || 'Failed to generate avatar image',
    });
  }
});


// Vachana AI API Key helper
function getVachanaApiKey(): string {
  const envVal = process.env.VACHANA_API_KEY?.replace(/^[<"'\s]+|[>"'\s]+$/g, '').trim();
  if (envVal && envVal.startsWith('vach_')) {
    return envVal;
  }
  return 'vach_1ytE2CY5X2OfUMAfyqq7W2kFQkLIdkjcRob50wYQrT40oCDJ1mJhM0JpkQWzfELGGnuoZwwZEn2J0xKk0lu2TqHXxEamTMY8_f7068bb9587e2e5041ea24950ae4d47d';
}

const VACHANA_API_KEY = getVachanaApiKey();

// Companion Character to Vachana Indic Voice Mapping (timbre-v2.5)
const VACHANA_CHARACTER_VOICES: Record<string, string> = {
  aneet: 'Nalini',   // Warm, patient elder sister
  raj: 'Vikrant',    // Calm, grounded older brother
  rahul: 'Kavin',    // Youthful, energetic 12yo boy
  rani: 'Saanvi',    // Melodic, sweet 12yo girl
  // Mapping from Gemini voice names if requested
  Aoede: 'Nalini',
  Leda: 'Nalini',
  Charon: 'Vikrant',
  Fenrir: 'Vikrant',
  Orus: 'Vikrant',
  Puck: 'Kavin',
  Zephyr: 'Kavin',
  Kore: 'Saanvi',
};

const VACHANA_KNOWN_VOICES = new Set(['Nalini', 'Vikrant', 'Kavin', 'Saanvi', 'Bhavna', 'Deepak']);

async function synthesizeWithVachanaTTS(params: {
  text: string;
  voice?: string;
  characterId?: string;
  language?: string;
  speed?: number;
}): Promise<{ audioBase64: string; mimeType: string; voice: string } | null> {
  const apiKey = getVachanaApiKey();
  if (!apiKey) return null;

  // Resolve voice
  let voice = 'Nalini';
  if (params.voice && VACHANA_KNOWN_VOICES.has(params.voice)) {
    voice = params.voice;
  } else if (params.characterId && VACHANA_CHARACTER_VOICES[params.characterId]) {
    voice = VACHANA_CHARACTER_VOICES[params.characterId];
  } else if (params.voice && VACHANA_CHARACTER_VOICES[params.voice]) {
    voice = VACHANA_CHARACTER_VOICES[params.voice];
  }

  // Detect language: if text contains Devanagari or Hindi is requested -> hi-IN, else en-IN
  const hasDevanagari = /[\u0900-\u097F]/.test(params.text);
  const language = params.language === 'hi' || params.language === 'hi-IN' || hasDevanagari ? 'hi-IN' : 'en-IN';

  const bodyPayload = {
    text: params.text,
    voice,
    model: 'timbre-v2.5',
    language,
    speed: typeof params.speed === 'number' ? params.speed : 1.0,
    audio_config: {
      sample_rate: 48000,
      num_channels: 1,
      sample_width: 2,
      encoding: 'linear_pcm',
      container: 'wav',
    },
  };

  try {
    const response = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Vachana TTS HTTP error ${response.status}:`, errText);
      return null;
    }

    const arrayBuf = await response.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuf).toString('base64');

    return {
      audioBase64,
      mimeType: 'audio/wav',
      voice,
    };
  } catch (err: any) {
    console.warn('Vachana TTS network/call warning:', err?.message || err);
    return null;
  }
}

// In-memory cache for repeated phrases to save API costs & eliminate latency
const serverTtsCache = new Map<string, string>();

// Unified Text-to-Speech Endpoint (Vachana AI Indic TTS primary with Gemini TTS fallback)
app.post('/api/tts', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'rate_limited', message: 'Voice engine is cooling down, switching to device voice' });
    return;
  }

  const { text, voiceName, style, characterId, emotion, language, engine, speed } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'invalid_text', message: 'Text is required for TTS' });
    return;
  }

  const cleanText = text.replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim();
  if (!cleanText) {
    res.status(400).json({ error: 'empty_text', message: 'Text is empty after stripping emotion tags' });
    return;
  }

  // Check server cache
  const cacheKey = `${characterId || voiceName || 'Nalini'}:${cleanText.toLowerCase()}:${emotion || 'calm'}:${language || 'auto'}`;
  if (serverTtsCache.has(cacheKey)) {
    res.json({ audioBase64: serverTtsCache.get(cacheKey), mimeType: 'audio/wav', cached: true });
    return;
  }

  // 1. Primary Engine: Vachana AI TTS (timbre-v2.5) for natural Indian voices
  if (engine !== 'gemini-only') {
    try {
      const vachanaRes = await synthesizeWithVachanaTTS({
        text: cleanText,
        voice: voiceName,
        characterId,
        language,
        speed,
      });

      if (vachanaRes?.audioBase64) {
        if (serverTtsCache.size > 300) {
          const firstKey = serverTtsCache.keys().next().value;
          if (firstKey) serverTtsCache.delete(firstKey);
        }
        serverTtsCache.set(cacheKey, vachanaRes.audioBase64);

        res.json({
          audioBase64: vachanaRes.audioBase64,
          mimeType: vachanaRes.mimeType,
          engine: 'vachana',
          voice: vachanaRes.voice,
        });
        return;
      }
    } catch (vachanaErr) {
      console.warn('Vachana TTS primary failed, falling back to Gemini TTS:', vachanaErr);
    }
  }

  // 2. Secondary Engine: Gemini Flash TTS fallback
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'missing_key', message: 'TTS services unavailable' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const targetVoice = voiceName || 'Charon';
    const targetStyle = style || 'Warm, calm, compassionate listening companion tone';

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: targetStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoice },
            },
          },
        },
      });
    } catch (primaryErr) {
      console.warn('TTS primary call fallback to gemini-3.8-flash-tts:', primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: targetStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: targetVoice },
            },
          },
        },
      });
    }

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio returned by Gemini TTS model');
    }

    if (serverTtsCache.size > 300) {
      const firstKey = serverTtsCache.keys().next().value;
      if (firstKey) serverTtsCache.delete(firstKey);
    }
    serverTtsCache.set(cacheKey, base64Audio);

    res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', engine: 'gemini' });
  } catch (err: any) {
    console.error('TTS endpoint error:', err?.message || err);
    res.status(500).json({
      error: 'tts_failed',
      message: err?.message || 'TTS audio generation failed',
    });
  }
});

// Dedicated Vachana AI TTS inference endpoint
app.post('/api/vachana-tts', async (req: Request, res: Response): Promise<void> => {
  const { text, voice, language, speed, model, speaker_embedding, audio_config } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'invalid_text', message: 'Text is required for Vachana TTS' });
    return;
  }

  const cleanText = text.replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim();
  if (!cleanText) {
    res.status(400).json({ error: 'empty_text', message: 'Text is empty' });
    return;
  }

  const apiKey = getVachanaApiKey();
  const targetVoice = voice || 'Nalini';
  const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
  const targetLanguage = language || (hasDevanagari ? 'hi-IN' : 'en-IN');
  const targetModel = model || (speaker_embedding ? 'vachana-vc-v1' : 'timbre-v2.5');
  const targetSpeed = typeof speed === 'number' ? speed : 1.0;

  const requestPayload: any = {
    text: cleanText,
    model: targetModel,
    speed: targetSpeed,
    audio_config: audio_config || {
      sample_rate: 48000,
      num_channels: 1,
      sample_width: 2,
      encoding: 'linear_pcm',
      container: 'wav',
    },
  };

  if (speaker_embedding) {
    requestPayload.speaker_embedding = speaker_embedding;
  } else {
    requestPayload.voice = targetVoice;
    requestPayload.language = targetLanguage;
  }

  try {
    const vachanaResponse = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!vachanaResponse.ok) {
      const errText = await vachanaResponse.text();
      res.status(vachanaResponse.status).json({
        error: 'vachana_tts_failed',
        details: errText,
      });
      return;
    }

    const arrayBuf = await vachanaResponse.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuf).toString('base64');
    res.json({
      success: true,
      audioBase64,
      mimeType: 'audio/wav',
      voice: targetVoice,
      model: targetModel,
      language: targetLanguage,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'vachana_tts_error',
      message: err?.message || 'Failed to call Vachana TTS',
    });
  }
});

// Vachana AI Voice Cloning: Generate Speaker Embedding from Audio
app.post('/api/vachana-voice-clone/embeddings', async (req: Request, res: Response): Promise<void> => {
  const { audioBase64, mimeType } = req.body;
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({ error: 'missing_audio', message: 'audioBase64 string is required.' });
    return;
  }

  const tempId = `vc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const inputExt = mimeType?.includes('wav') ? '.wav' : mimeType?.includes('ogg') ? '.ogg' : mimeType?.includes('mp4') ? '.m4a' : '.webm';
  const inputFilePath = path.join(os.tmpdir(), `${tempId}_in${inputExt}`);
  const outputWavPath = path.join(os.tmpdir(), `${tempId}_out.wav`);

  try {
    const rawBuffer = Buffer.from(audioBase64, 'base64');
    await fs.promises.writeFile(inputFilePath, rawBuffer);

    // Convert audio to 16kHz mono WAV for high-fidelity speaker embedding
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', inputFilePath,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      outputWavPath,
    ]);

    const wavBuffer = await fs.promises.readFile(outputWavPath);
    const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    const form = new FormData();
    form.append('audio_file', audioBlob, 'reference.wav');

    const vachanaResponse = await fetch('https://api.vachana.ai/api/v1/tts/voice-clone/embeddings', {
      method: 'POST',
      headers: {
        'X-API-Key-ID': getVachanaApiKey(),
      },
      body: form,
    });

    if (!vachanaResponse.ok) {
      const errText = await vachanaResponse.text();
      res.status(vachanaResponse.status).json({
        error: 'voice_clone_failed',
        details: errText,
      });
      return;
    }

    const data: any = await vachanaResponse.json();
    res.json(data);
  } catch (err: any) {
    console.error('Voice clone embedding error:', err);
    res.status(500).json({
      error: 'voice_clone_error',
      message: err?.message || 'Failed to extract speaker embedding',
    });
  } finally {
    fs.promises.unlink(inputFilePath).catch(() => {});
    fs.promises.unlink(outputWavPath).catch(() => {});
  }
});

// Vachana AI TTS Server-Sent Events (SSE) streaming proxy
app.post('/api/vachana-tts/sse', async (req: Request, res: Response): Promise<void> => {
  const { text, voice, model, speaker_embedding, speed, language, audio_config } = req.body;
  const apiKey = getVachanaApiKey();

  const cleanText = (text || '').replace(/\[EMOTION:[a-z\-]+\]/gi, '').trim();
  if (!cleanText) {
    res.status(400).json({ error: 'empty_text', message: 'Text is empty' });
    return;
  }

  const targetModel = model || (speaker_embedding ? 'vachana-vc-v1' : 'timbre-v2.5');
  const payload: any = {
    text: cleanText,
    model: targetModel,
    speed: typeof speed === 'number' ? speed : 1.0,
    audio_config: audio_config || {
      sample_rate: 48000,
      encoding: 'linear_pcm',
      container: 'wav',
    },
  };

  if (speaker_embedding) {
    payload.speaker_embedding = speaker_embedding;
  } else {
    payload.voice = voice || 'Nalini';
    payload.language = language || (/[\u0900-\u097F]/.test(cleanText) ? 'hi-IN' : 'en-IN');
  }

  try {
    const upstream = await fetch('https://api.vachana.ai/api/v1/tts/sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key-ID': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      res.status(upstream.status).json({ error: 'vachana_sse_failed', details: errText });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err: any) {
    console.error('Vachana SSE proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'vachana_sse_error', message: err?.message });
    } else {
      res.end();
    }
  }
});

app.post('/api/stt', async (req: Request, res: Response): Promise<void> => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: 'rate_limited', message: 'Too many voice requests. Please try again in a moment.' });
    return;
  }

  const { audioBase64, mimeType, languageCode, format } = req.body;
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({ error: 'missing_audio', message: 'audioBase64 string is required.' });
    return;
  }

  const tempId = `stt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const inputExt = mimeType?.includes('wav') ? '.wav' : mimeType?.includes('ogg') ? '.ogg' : mimeType?.includes('mp4') ? '.m4a' : '.webm';
  const inputFilePath = path.join(os.tmpdir(), `${tempId}_in${inputExt}`);
  const outputWavPath = path.join(os.tmpdir(), `${tempId}_out.wav`);

  try {
    const rawBuffer = Buffer.from(audioBase64, 'base64');
    await fs.promises.writeFile(inputFilePath, rawBuffer);

    // Convert audio to 16kHz mono WAV (standard for Vachana AI prisma-v3.0)
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', inputFilePath,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      outputWavPath,
    ]);

    const wavBuffer = await fs.promises.readFile(outputWavPath);
    const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    const form = new FormData();
    form.append('audio_file', audioBlob, 'audio.wav');
    form.append('model', 'prisma-v3.0');
    form.append('language_code', languageCode || 'hi-IN');
    form.append('format', format || 'transcribe');

    const vachanaResponse = await fetch('https://api.vachana.ai/stt/v3', {
      method: 'POST',
      headers: {
        'X-API-Key-ID': VACHANA_API_KEY,
      },
      body: form,
    });

    if (!vachanaResponse.ok) {
      const errText = await vachanaResponse.text();
      console.warn('Vachana AI STT API error status:', vachanaResponse.status, errText);
      res.status(vachanaResponse.status).json({
        error: 'vachana_stt_failed',
        message: 'Speech recognition service error',
        details: errText,
      });
      return;
    }

    const data: any = await vachanaResponse.json();
    res.json({
      success: true,
      transcript: data.transcript || '',
      model: data.model || 'prisma-v3.0',
      processingTime: data.processing_time,
    });
  } catch (err: any) {
    console.error('STT endpoint processing error:', err);
    res.status(500).json({
      error: 'stt_error',
      message: err?.message || 'Failed to process audio for speech recognition',
    });
  } finally {
    fs.promises.unlink(inputFilePath).catch(() => {});
    fs.promises.unlink(outputWavPath).catch(() => {});
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Saathi AI Chat Companion',
    model: 'gemini-3.1-flash-lite',
  });
});

// Setup dev server with Vite or production static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Saathi AI Chat server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
