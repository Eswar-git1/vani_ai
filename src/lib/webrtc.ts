import { Device } from 'mediasoup-client';

export class WebRTCManager {
  private device: Device | null = null;
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private onDataCallback: ((data: Blob) => void) | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  constructor() {
    this.device = new Device();
  }

  async initializeAudio(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
        video: false,
      });

      // Initialize Web Audio API components
      this.audioContext = new AudioContext({
        sampleRate: 16000,
        latencyHint: 'interactive',
      });

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing audio:', error);
      return Promise.reject(error);
    }
  }

  async startRecording(onData: (data: Blob) => void): Promise<void> {
    if (!this.stream || !this.audioContext || !this.mediaStreamSource || !this.processor) {
      throw new Error('Audio system not properly initialized');
    }

    this.onDataCallback = onData;

    // Connect audio nodes
    this.mediaStreamSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // Process audio data
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const audioData = new Float32Array(inputData);
      
      // Convert to 16-bit PCM
      const pcmData = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        pcmData[i] = Math.min(1, Math.max(-1, audioData[i])) * 0x7FFF;
      }

      // Send audio data
      if (this.onDataCallback) {
        const blob = new Blob([pcmData.buffer], { type: 'audio/l16' });
        this.onDataCallback(blob);
      }
    };
  }

  stopRecording(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.onDataCallback = null;
  }
}