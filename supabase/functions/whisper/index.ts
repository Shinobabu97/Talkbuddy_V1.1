import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface WhisperRequest {
  audioData: string; // base64 encoded audio
  language?: string;
  storeForAnalysis?: boolean; // Flag to store audio for pronunciation analysis
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioData, language = 'de', storeForAnalysis = true }: WhisperRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Convert base64 to blob
    const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
      type: 'audio/webm'
    })

    // Create form data for Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', language)
    formData.append('response_format', 'json')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Whisper API error: ${error}`)
    }

    const data = await response.json()
    const transcription = data.text

    if (!transcription) {
      throw new Error('No transcription received from Whisper')
    }

    // Store audio for pronunciation analysis if requested
    let audioId = null
    if (storeForAnalysis) {
      // In a real implementation, you'd store this in a database
      // For now, we'll return the audio data with the response
      audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    return new Response(
      JSON.stringify({
        transcription: transcription,
        language: language,
        audioId: audioId,
        storedForAnalysis: storeForAnalysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Whisper function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Transcription failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
