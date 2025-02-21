// src/store/studentTranslationStore.ts
import { create } from 'zustand';
import { translateText, textToSpeech } from '../lib/api';

interface StudentTranslationState {
  displayText: string;           // final translated text (for subtitles)
  teacherTranscription: string;  // raw teacher text in English
  audioUrl: string | null;       // TTS audio URL to play
  audioEnabled: boolean;
  error: string | null;
  setAudioEnabled: (enabled: boolean) => void;
  // Updated to accept two parameters: teacherText and studentLang.
  handleTeacherTranscription: (teacherText: string, studentLang: string) => Promise<void>;
  setDisplayText: (txt: string) => void;
}

export const useStudentTranslationStore = create<StudentTranslationState>((set, get) => {
  // We'll store our debounce timer reference here.
  let debounceTimeout: number | null = null;

  return {
    displayText: '',
    teacherTranscription: '',
    audioUrl: null,
    audioEnabled: true,
    error: null,

    setAudioEnabled: (enabled: boolean) => {
      set({ audioEnabled: enabled });
    },

    setDisplayText: (txt: string) => {
      set({ displayText: txt });
    },

    handleTeacherTranscription: async (teacherText: string, studentLang: string) => {
      // Log the received teacher text.
      console.log("Received teacherText:", teacherText, "for student language:", studentLang);
      // Update the raw transcription in state immediately.
      set({ teacherTranscription: teacherText });

      // Clear any existing debounce timer.
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // Set a new debounce timeout – wait 1 second (1000ms) before processing.
      debounceTimeout = window.setTimeout(async () => {
        try {
          // Translate from English to studentLang.
          const translated = await translateText(teacherText, studentLang);
          console.log("Translated text:", translated);
          set({ displayText: translated });

          // If audio is enabled, trigger TTS.
          if (get().audioEnabled) {
            const audioBuffer = await textToSpeech(translated, studentLang);
            const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            console.log("Generated TTS audio URL:", url);
            set({ audioUrl: url });
          }
        } catch (err) {
          console.error('Error in handleTeacherTranscription:', err);
          set({ error: 'Translation/TTS error: ' + (err as Error).message });
        }
      }, 1000);
    },
  };
});
