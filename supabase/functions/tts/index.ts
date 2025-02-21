import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

/**
 * We'll read the TTS API key from Supabase secrets:
 *   supabase secrets set GOOGLE_TTS_API_KEY="YOUR_API_KEY"
 */
const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_TTS_API_KEY") || "";

// Helper: Map short code (e.g. "en") to official TTS languageCode & voice
function mapGoogleTtsLanguage(lang: string): { languageCode: string; voiceName: string } {
  // Expand for more languages
  const languageMap: Record<string, { languageCode: string; voiceName: string }> = {
    en: { languageCode: "en-US", voiceName: "en-US-Wavenet-D" },
    es: { languageCode: "es-ES", voiceName: "es-ES-Wavenet-A" },
    hi: { languageCode: "hi-IN", voiceName: "hi-IN-Wavenet-A" },
    // ...
  };
  return languageMap[lang] || { languageCode: "en-US", voiceName: "en-US-Wavenet-D" };
}

serve(async (req: Request) => {
  // 1) Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // 2) Only POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 3) Check API key
  if (!GOOGLE_TTS_API_KEY) {
    return new Response(JSON.stringify({ error: "No Google TTS API key set" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 4) Parse JSON
  let text = "";
  let language = "en";
  try {
    const body = await req.json();
    text = body.text || "";
    language = body.language || "en";
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "No text provided" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 5) Map short code to TTS language
  const { languageCode, voiceName } = mapGoogleTtsLanguage(language);

  // 6) Build TTS request body
  const requestBody = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  };

  try {
    // 7) Call Google TTS with an API key param
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 8) Decode base64
    const data = await response.json();
    if (!data.audioContent) {
      return new Response(JSON.stringify({ error: "No audioContent in TTS response" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    const binary = atob(data.audioContent);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }

    // 9) Return MP3 with CORS
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
