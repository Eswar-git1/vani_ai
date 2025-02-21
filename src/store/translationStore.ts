import { create } from 'zustand';
import { WebRTCManager } from '../lib/webrtc';
import { initializeGoogleSocket } from '../lib/api';
import { supabase } from '../lib/supabase';

interface TranslationState {
  isRecording: boolean;
  transcription: string;
  error: string | null;
  webrtc: WebRTCManager;
  sttSocket: WebSocket | null;

  // Teacher language state
  teacherLang: string;
  setTeacherLang: (lang: string) => void;

  startRecording: () => Promise<void>;
  stopRecording: () => void;
  setTranscription: (text: string) => void;
  setError: (err: string | null) => void;
  processTranscription: (text: string) => Promise<void>;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  isRecording: false,
  transcription: '',
  error: null,
  webrtc: new WebRTCManager(),
  sttSocket: null,

  // Initialize teacherLang to 'en' (or whatever default you want)
  teacherLang: 'en',

  // The new setter:
  setTeacherLang: (lang: string) => {
    set({ teacherLang: lang });
  },

  startRecording: async () => {
    try {
      const { webrtc, teacherLang } = get();
      console.log('startRecording with teacherLang =', teacherLang);

      await webrtc.initializeAudio();

      // Connect to your Node-based Google STT server
      const socket = await initializeGoogleSocket(teacherLang); // Pass teacherLang here

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            const transcript = data.transcript;
            if (transcript && transcript.trim()) {
              console.log('Received transcript:', transcript);
              await get().processTranscription(transcript);
            }
          }
        } catch (err) {
          console.error('Error parsing STT message:', err);
        }
      };

      set({ sttSocket: socket, isRecording: true, error: null });

      await webrtc.startRecording(async (audioData: Blob) => {
        const { sttSocket } = get();
        if (sttSocket?.readyState === WebSocket.OPEN) {
          const arrayBuffer = await audioData.arrayBuffer();
          sttSocket.send(arrayBuffer);
        }
      });

      console.log('Teacher recording started with Google STT');
    } catch (err) {
      console.error('Recording error:', err);
      set({
        error: 'Failed to start recording: ' + (err as Error).message,
        isRecording: false,
        sttSocket: null,
      });
    }
  },

  stopRecording: () => {
    const { webrtc, sttSocket } = get();
    webrtc.stopRecording();
    if (sttSocket?.readyState === WebSocket.OPEN) {
      sttSocket.close();
    }
    set({ isRecording: false, sttSocket: null });
  },

  setTranscription: (text: string) => {
    set({ transcription: text });
  },

  setError: (err: string | null) => {
    set({ error: err });
  },

  processTranscription: async (text: string) => {
    set({ transcription: text });
    const classroomId = window.location.pathname.split('/').pop();
    if (classroomId) {
      console.log('Sending transcription to classroom:', classroomId);
      const { data, error } = await supabase
        .from('class_history')
        .insert([{ classroom_id: classroomId, transcription: text }]);

      if (error) {
        console.error('Error inserting class history:', error);
      } else {
        console.log('Class history inserted:', data);
      }

      await supabase.channel(`classroom:${classroomId}`).send({
        type: 'broadcast',
        event: 'transcription',
        payload: { transcription: text },
      });
    }
  },
}));