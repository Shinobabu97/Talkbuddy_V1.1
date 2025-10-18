import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface TTSRequest {
  text: string;
  speed?: number; // Optional speed parameter (0.5 to 2.0)
}

interface TTSResponse {
  audioUrl: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, speed = 0.85 }: TTSRequest = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate speed parameter
    if (speed && (speed < 0.5 || speed > 2.0)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Speed must be between 0.5 and 2.0' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI TTS API with consistent German voice settings
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova', // Consistent female voice optimized for German
        response_format: 'mp3',
        speed: speed // Use the provided speed parameter
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI TTS API error: ${response.status} ${errorData}`)
    }

    // Convert audio to base64 for transmission
    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
    const audioUrl = `data:audio/mp3;base64,${audioBase64}`

    const result: TTSResponse = {
      audioUrl,
      success: true
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('German TTS error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate German speech' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
