import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TranscriptionRequest {
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
    const { audioData, language, storeForAnalysis = true }: TranscriptionRequest = await req.json()

    console.log('🎤 === DEEPGRAM TRANSCRIPTION FUNCTION CALLED ===')
    console.log('📦 Audio data length:', audioData?.length || 0)
    console.log('🌍 Language parameter received:', language || 'undefined')
    console.log('💾 Store for analysis:', storeForAnalysis)
    
    // Determine language to use - if 'de' is provided, always use it
    // Otherwise default to 'auto' for auto-detection
    const languageToUse = language === 'de' ? 'de' : (language === 'en' ? 'en' : null)
    console.log('🌍 Language to use for Deepgram API:', languageToUse || 'auto (detection)')
    console.log('🌍 Language was explicitly set:', language !== undefined && language !== null)

    // Get Deepgram API key from Supabase secret
    const deepgramApiKey = Deno.env.get('Talkbuddy_Transcription')
    if (!deepgramApiKey) {
      console.error('❌ Deepgram API key not configured - check Supabase secret "Talkbuddy_Transcription"')
      throw new Error('Deepgram API key not configured')
    }
    console.log('✅ Deepgram API key retrieved from Supabase secret')

    // Validate audio data
    if (!audioData || audioData.length === 0) {
      console.error('No audio data provided')
      throw new Error('No audio data provided')
    }

    // Convert base64 to Uint8Array for Deepgram API
    let audioBuffer;
    try {
      const binaryString = atob(audioData)
      audioBuffer = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        audioBuffer[i] = binaryString.charCodeAt(i)
      }
      console.log('✅ Audio buffer created:', { size: audioBuffer.length, type: 'audio/webm' })
    } catch (conversionError) {
      console.error('❌ Error converting base64 to buffer:', conversionError)
      throw new Error('Invalid audio data format')
    }

    // Build Deepgram API URL with parameters
    const deepgramUrl = new URL('https://api.deepgram.com/v1/listen')
    // Use nova-2 model for best accuracy
    deepgramUrl.searchParams.append('model', 'nova-2')
    // Enable word-level timestamps for pronunciation analysis
    deepgramUrl.searchParams.append('punctuate', 'true')
    deepgramUrl.searchParams.append('diarize', 'false')
    deepgramUrl.searchParams.append('utterances', 'false')
    deepgramUrl.searchParams.append('paragraphs', 'true')
    
    // Add language parameter if specified
    if (languageToUse) {
      deepgramUrl.searchParams.append('language', languageToUse)
      console.log('✅ Language parameter added to Deepgram API:', languageToUse)
    } else {
      console.log('⚠️ Using auto-detection (language not specified)')
    }

    console.log('📤 Calling Deepgram API...')
    console.log('📤 API URL:', deepgramUrl.toString())
    console.log('📤 Model: nova-2')
    console.log('📤 Language:', languageToUse || 'auto (detection)')
    console.log('📤 Audio buffer size:', audioBuffer.length, 'bytes')

    // Call Deepgram API
    const response = await fetch(deepgramUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBuffer,
    })

    console.log('📥 Deepgram API response status:', response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Deepgram API error:', error)
      console.error('❌ Response status:', response.status)
      throw new Error(`Deepgram API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    console.log('✅ Deepgram API response received')
    console.log('📦 Full response structure:', JSON.stringify(Object.keys(data), null, 2))
    
    // Extract transcription from Deepgram response
    // Deepgram response structure: results.channels[0].alternatives[0].transcript
    const channel = data.results?.channels?.[0]
    const alternative = channel?.alternatives?.[0]
    
    if (!alternative) {
      console.error('❌ Invalid Deepgram response structure:', JSON.stringify(data, null, 2))
      throw new Error('Invalid response structure from Deepgram API')
    }
    
    const transcription = alternative.transcript || ''
    const words = alternative.words || [] // Word-level timestamps from Deepgram
    const paragraphs = channel?.paragraphs || alternative.paragraphs || null // Paragraph-level data if available
    
    console.log('📊 Alternative structure:', JSON.stringify(Object.keys(alternative), null, 2))
    console.log('📊 Words available:', words.length > 0)
    console.log('📊 Paragraphs available:', !!paragraphs)
    
    // Map Deepgram words to match Whisper format if needed
    // Deepgram words have: word, start, end, confidence
    // Whisper format has: word, start, end (and possibly other fields)
    const mappedWords = words.map((word: any) => ({
      word: word.word,
      start: word.start,
      end: word.end,
      confidence: word.confidence
    }))
    
    // Create segments from paragraphs if available, otherwise from words
    let segments: any[] = []
    if (paragraphs) {
      // Check if paragraphs is an object with a paragraphs array or if it's directly an array
      const paragraphArray = Array.isArray(paragraphs) ? paragraphs : (paragraphs.paragraphs || [])
      if (paragraphArray.length > 0) {
        segments = paragraphArray.map((para: any) => ({
          start: para.start || para.start_time || 0,
          end: para.end || para.end_time || 0,
          text: para.sentences?.map((s: any) => s.text || s).join(' ') || para.text || para.transcript || ''
        }))
        console.log('✅ Created segments from paragraphs:', segments.length)
      }
    }
    
    // If no segments from paragraphs, create from words
    if (segments.length === 0 && words.length > 0) {
      // Create a single segment from all words if no paragraphs
      segments = [{
        start: words[0].start,
        end: words[words.length - 1].end,
        text: transcription
      }]
      console.log('✅ Created single segment from words')
    }
    
    console.log('📝 Transcription:', transcription)
    console.log('🌍 Detected language (if available):', data.metadata?.language || 'not provided')
    console.log('📊 Word count:', mappedWords.length)
    console.log('📊 Segment count:', segments.length)

    if (!transcription || transcription.trim() === '') {
      console.error('❌ Empty transcription received from Deepgram')
      throw new Error('No transcription received from Deepgram')
    }

    console.log('✅ Transcription successful')
    console.log('📝 Final transcription:', transcription)
    console.log('📊 Word timing data:', mappedWords.length, 'words')
    console.log('📊 Segment timing data:', segments.length, 'segments')

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
        language: language || languageToUse || 'auto',
        words: mappedWords, // Include word timing (mapped from Deepgram format)
        segments: segments, // Include segment timing (mapped from Deepgram format)
        audioId: audioId,
        storedForAnalysis: storeForAnalysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Deepgram transcription function error:', error)
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
