/**
 * Vachana AI Speech-to-Text (STT) v3 Service
 * Powered by Vachana AI prisma-v3.0 model with auto Indic language detection.
 */

export interface VachanaSTTResult {
  success: boolean;
  transcript: string;
  model?: string;
  processingTime?: number;
  error?: string;
}

class VachanaSTTService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecordingInternal: boolean = false;
  private currentMimeType: string = 'audio/webm';

  public isSupported(): boolean {
    return typeof window !== 'undefined' &&
      Boolean(navigator?.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined';
  }

  public isRecording(): boolean {
    return this.isRecordingInternal;
  }

  public async startRecording(onAudioLevel?: (volume: number) => void): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Microphone audio recording is not supported in this browser environment.');
    }

    if (this.isRecordingInternal) {
      this.cancelRecording();
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Find supported container format
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];
      this.currentMimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const options = this.currentMimeType ? { mimeType: this.currentMimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Optional live audio volume analyzer
      if (onAudioLevel && window.AudioContext) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioCtx.createMediaStreamSource(this.audioStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkLevel = () => {
            if (!this.isRecordingInternal) {
              audioCtx.close().catch(() => {});
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length / 255;
            onAudioLevel(avg);
            requestAnimationFrame(checkLevel);
          };
          requestAnimationFrame(checkLevel);
        } catch (e) {
          console.warn('Audio level monitoring warning:', e);
        }
      }

      this.mediaRecorder.start(250); // Slice data every 250ms
      this.isRecordingInternal = true;
    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  public async stopAndTranscribe(language: string = 'indic-auto'): Promise<VachanaSTTResult> {
    if (!this.mediaRecorder || !this.isRecordingInternal) {
      return { success: false, transcript: '', error: 'Not recording' };
    }

    return new Promise((resolve) => {
      const recorder = this.mediaRecorder!;

      recorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: this.currentMimeType || 'audio/webm' });
          this.cleanup();

          if (blob.size < 100) {
            resolve({ success: true, transcript: '' });
            return;
          }

          // Convert Blob to base64
          const base64Audio = await this.blobToBase64(blob);

          // Language mapping for Vachana AI (e.g. hi-IN, en-IN, or custom code)
          let languageCode = 'hi-IN';
          if (language === 'hi' || language === 'hi-IN') {
            languageCode = 'hi-IN';
          } else if (language === 'en' || language === 'en-IN') {
            languageCode = 'en-IN';
          } else if (language) {
            languageCode = language;
          }

          const res = await fetch('/api/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: this.currentMimeType || 'audio/webm',
              languageCode,
              format: 'transcribe',
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            resolve({
              success: false,
              transcript: '',
              error: errData.message || 'Speech recognition failed',
            });
            return;
          }

          const data: VachanaSTTResult = await res.json();
          resolve(data);
        } catch (err: any) {
          resolve({
            success: false,
            transcript: '',
            error: err?.message || 'Error transcribing speech',
          });
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        this.cleanup();
        resolve({ success: false, transcript: '', error: String(err) });
      }
    });
  }

  public cancelRecording(): void {
    if (this.mediaRecorder && this.isRecordingInternal) {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isRecordingInternal = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data:audio/xyz;base64, prefix
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const vachanaSTTService = new VachanaSTTService();
