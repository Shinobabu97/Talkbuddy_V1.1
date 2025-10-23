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
    const { audioData, language = 'auto', storeForAnalysis = true }: WhisperRequest = await req.json()

    console.log('Whisper function called with:', { 
      audioDataLength: audioData?.length, 
      language, 
      storeForAnalysis 
    })

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured')
      throw new Error('OpenAI API key not configured')
    }

    // Validate audio data
    if (!audioData || audioData.length === 0) {
      console.error('No audio data provided')
      throw new Error('No audio data provided')
    }

    // Convert base64 to blob
    let audioBlob;
    try {
      audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], {
        type: 'audio/webm'
      })
      console.log('Audio blob created:', { size: audioBlob.size, type: audioBlob.type })
    } catch (conversionError) {
      console.error('Error converting base64 to blob:', conversionError)
      throw new Error('Invalid audio data format')
    }

    // Create form data for Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    formData.append('model', 'whisper-1')
    
    // Only add language if it's not 'auto'
    if (language !== 'auto') {
      formData.append('language', language)
    }
    
    formData.append('response_format', 'verbose_json')
    
    // Add timestamp granularities for pronunciation analysis
    formData.append('timestamp_granularities[]', 'word')
    formData.append('timestamp_granularities[]', 'segment')

    console.log('Calling OpenAI Whisper API with timing data...')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    console.log('Whisper API response status:', response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI Whisper API error:', error)
      throw new Error(`OpenAI Whisper API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    console.log('Whisper API response data:', data)
    
    const transcription = data.text
    const words = data.words || [] // Word-level timestamps
    const segments = data.segments || [] // Segment-level timestamps

    if (!transcription || transcription.trim() === '') {
      console.error('Empty transcription received from Whisper')
      throw new Error('No transcription received from Whisper')
    }

    console.log('Transcription successful:', transcription)
    console.log('Word timing data:', words.length, 'words')

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
        words: words, // Include word timing
        segments: segments, // Include segment timing
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
