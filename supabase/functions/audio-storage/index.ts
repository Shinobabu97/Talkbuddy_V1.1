import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface AudioStorageRequest {
  audioData: string; // base64 encoded audio
  word?: string;
  sessionId?: string;
  practiceType?: 'word' | 'sentence' | 'conversation';
  metadata?: {
    transcription?: string;
    score?: number;
    attempts?: number;
    timestamp?: string;
  };
}

interface AudioStorageResponse {
  audioId: string;
  url?: string;
  stored: boolean;
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioData, word, sessionId, practiceType = 'word', metadata }: AudioStorageRequest = await req.json()

    // Generate unique audio ID
    const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // In a real implementation, you would:
    // 1. Store audio in a cloud storage service (AWS S3, Google Cloud Storage, etc.)
    // 2. Store metadata in a database
    // 3. Generate signed URLs for audio access
    
    // For now, we'll simulate storage and return the audio data
    const storageResponse: AudioStorageResponse = {
      audioId,
      url: `data:audio/webm;base64,${audioData}`, // Temporary data URL
      stored: true,
      metadata: {
        word,
        sessionId,
        practiceType,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    }

    // In a production app, you would store this in a database:
    // await supabase.from('audio_practice_sessions').insert({
    //   audio_id: audioId,
    //   user_id: userId,
    //   word: word,
    //   session_id: sessionId,
    //   practice_type: practiceType,
    //   audio_url: cloudStorageUrl,
    //   metadata: metadata,
    //   created_at: new Date().toISOString()
    // })

    return new Response(
      JSON.stringify(storageResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Audio storage function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Audio storage failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
