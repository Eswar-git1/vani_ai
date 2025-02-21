// src/lib/api.ts

import { supabase } from "./supabase";

// If you prefer storing the Render URL in an .env var, do something like:
// const GOOGLE_STT_WEBSOCKET_URL = import.meta.env.VITE_GOOGLE_STT_WEBSOCKET_URL || 'wss://my-stt-server.onrender.com';
const GOOGLE_STT_WEBSOCKET_URL = 'wss://my-stt-server.onrender.com';

let googleSocket: WebSocket | null = null;

/**
 * Connects to your Node-based Google STT WebSocket server.
 * 1) Opens a WS connection to your Render app.
 * 2) Sends a "config" message so the Node server starts streamingRecognize.
 * 3) Returns the opened socket.
 */
export async function initializeGoogleSocket(teacherLang: string): Promise<WebSocket> {
  if (googleSocket && googleSocket.readyState === WebSocket.OPEN) {
    // If an existing socket is open, close it before re-initializing
    googleSocket.close();
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GOOGLE_STT_WEBSOCKET_URL);

    const connectionTimeout = setTimeout(() => {
      ws.close();
      reject(new Error('Google STT WebSocket connection timed out'));
    }, 10000);

    ws.addEventListener('open', () => {
      clearTimeout(connectionTimeout);
      console.log('Connected to Google STT WS:', GOOGLE_STT_WEBSOCKET_URL);

      // Send an initial config message so the Node server starts the STT stream
      const configMsg = {
        type: 'config',
        language: teacherLang === 'mixed' ? null : teacherLang, // Send null for auto-detection when mixed
        enableAutoDetection: teacherLang === 'mixed', // Enable auto-detection when mixed
      };
      ws.send(JSON.stringify(configMsg));

      googleSocket = ws;
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        // If the server sends { type: 'ready' }, we know STT stream is set up
        if (data.type === 'ready') {
          console.log('Google STT stream ready');
          resolve(ws);
        }
      } catch (err) {
        // Not a JSON control message
      }
    });

    ws.addEventListener('error', (err) => {
      clearTimeout(connectionTimeout);
      console.error('WebSocket error connecting to Google STT:', err);
      reject(err);
    });

    ws.addEventListener('close', (evt) => {
      console.log('Google STT WebSocket closed:', evt.code, evt.reason);
    });
  });
}

/**
 * (Optional) If you still need Google Translate or TTS, keep these.
 * Otherwise, remove unused code.
 */
const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error('Google Translate API key not configured');
  }
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: targetLang }),
      }
    );
    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}

// If you have TTS via Supabase Edge Function, you can keep or remove this.
export async function textToSpeech(text: string, language: string): Promise<ArrayBuffer> {
  try {
    const supabaseTtsUrl = `https://fhhxdsqaxwiaemwazhwx.functions.supabase.co/tts`;
    const response = await fetch(supabaseTtsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (!response.ok) {
      throw new Error(`Text-to-speech failed: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Text-to-speech error:', error);
    throw new Error('Failed to convert text to speech');
  }
}
export async function insertClassHistory(classroomId: string, transcription: string) {
  try {
    const { data, error } = await supabase
      .from('class_history')
      .insert([{ classroom_id: classroomId, transcription }]);

    if (error) {
      console.error('Error inserting class history:', error);
      throw error;
    }

    console.log('Class history inserted:', data);
    return data;
  } catch (err) {
    console.error('Unexpected error inserting class history:', err);
    throw err;
  }
}