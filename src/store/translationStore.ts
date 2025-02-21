// src/store/translationStore.ts

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

  // Teacher language preference
  teacherLang: string;
  setTeacherLang: (lang: string) => void;

  // Session ID so transcripts reference the correct session
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

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

  teacherLang: 'en',
  setTeacherLang: (lang: string) => {
    set({ teacherLang: lang });
  },

  sessionId: null,
  setSessionId: (id: string | null) => {
    set({ sessionId: id });
  },

  startRecording: async () => {
    try {
      const { webrtc, teacherLang } = get();
      console.log('startRecording with teacherLang =', teacherLang);

      await webrtc.initializeAudio();

      // Connect to your Node-based Google STT server
      const socket = await initializeGoogleSocket(teacherLang);

      socket.onopen = () => {
        console.log('Google STT WebSocket connected successfully.');
      };

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

      socket.onerror = (evt) => {
        console.error('Google STT socket error:', evt);
        set({ error: 'Google STT socket encountered an error' });
      };

      socket.onclose = (evt) => {
        console.log('Google STT socket closed:', evt.code, evt.reason);
      };

      set({ sttSocket: socket, isRecording: true, error: null });

      // Continuously send audio data to STT
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

    // Insert transcripts by session_id
    const { sessionId } = get();
    if (!sessionId) {
      console.warn('No sessionId set. Not storing transcript in class_history.');
    } else {
      try {
        const { error } = await supabase
          .from('class_history')
          .insert([{ session_id: sessionId, transcription: text }]);
        if (error) {
          console.error('Error inserting class_history:', error);
        }
      } catch (err) {
        console.error('Unexpected error inserting transcript:', err);
      }
    }

    // Also broadcast to students
    const classroomId = window.location.pathname.split('/').pop();
    if (classroomId) {
      await supabase.channel(`classroom:${classroomId}`).send({
        type: 'broadcast',
        event: 'transcription',
        payload: { transcription: text },
      });
    }
  },
}));
