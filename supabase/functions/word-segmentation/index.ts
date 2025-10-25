import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface WordSegmentationRequest {
  audioData: string; // base64 encoded audio
  transcription: string;
  language?: string;
}

interface WordSegment {
  word: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  duration: number; // in seconds
  audioSegment?: string; // base64 encoded audio segment
}

interface WordSegmentationResponse {
  segments: WordSegment[];
  totalDuration: number;
  wordCount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioData, transcription, language = 'de' }: WordSegmentationRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Extract words from transcription
    const words = transcription.split(' ').filter(word => word.length > 0);
    
    // For now, we'll use AI to estimate word timing
    // In a production app, you'd use services like Azure Speech or Google Cloud Speech
    const systemPrompt = `You are a German language expert. Analyze the following German text and provide estimated timing for each word in a conversation context.

Text: "${transcription}"

For each word, provide:
1. Estimated start time (in seconds from beginning)
2. Estimated duration (in seconds)
3. Difficulty level for pronunciation practice

Return ONLY a JSON object with this structure:
{
  "segments": [
    {
      "word": "word",
      "startTime": 0.5,
      "endTime": 1.2,
      "duration": 0.7,
      "difficulty": "easy|medium|hard"
    }
  ],
  "totalDuration": 5.0,
  "wordCount": 3
}`

    // Call OpenAI API for word timing estimation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const analysisText = data.choices[0]?.message?.content

    if (!analysisText) {
      throw new Error('No analysis received from OpenAI')
    }

    // Parse the JSON response
    let segmentation: WordSegmentationResponse
    try {
      segmentation = JSON.parse(analysisText)
    } catch (parseError) {
      // If JSON parsing fails, create basic segmentation
      const basicSegments: WordSegment[] = words.map((word, index) => ({
        word,
        startTime: index * 0.8, // 0.8 seconds per word estimate
        endTime: (index + 1) * 0.8,
        duration: 0.8
      }));

      segmentation = {
        segments: basicSegments,
        totalDuration: words.length * 0.8,
        wordCount: words.length
      }
    }

    // In a real implementation, you would:
    // 1. Use audio processing to extract actual word segments
    // 2. Use speech recognition services for precise timing
    // 3. Store audio segments for individual word practice

    return new Response(
      JSON.stringify(segmentation),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Word segmentation function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Word segmentation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
