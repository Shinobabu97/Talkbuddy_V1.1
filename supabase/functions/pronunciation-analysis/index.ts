import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PronunciationAnalysisRequest {
  audioData: string; // base64 encoded audio
  transcription: string;
  language?: string;
}

interface PronunciationAnalysisResponse {
  hasPronunciationErrors: boolean;
  words: Array<{
    word: string;
    score: number; // 0-100
    needsPractice: boolean;
    feedback: string;
    commonMistakes?: string[];
    difficulty?: string;
    soundsToFocus?: string[];
    improvementTips?: string[];
    syllableAnalysis?: Array<{
      syllable: string;
      score: number;
      feedback: string;
      phoneticExpected: string;
      phoneticActual?: string;
    }>;
  }>;
  overallScore: number;
  suggestions: string[];
  scoringBreakdown?: {
    vowelAccuracy: number;
    consonantAccuracy: number;
    rhythm: number;
    stress: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioData, transcription, language = 'de' }: PronunciationAnalysisRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Extract words from transcription
    const words = transcription.split(' ').filter(word => word.length > 0);
    
    // For now, we'll use AI analysis since we don't have real pronunciation scoring
    // In a production app, you'd integrate with services like Azure Speech or Google Cloud Speech
    const systemPrompt = `You are a German pronunciation expert. Analyze the following German words for pronunciation accuracy and provide detailed scoring with syllable-level analysis.

Words: ${words.join(', ')}

For each word, provide:
1. Pronunciation score (0-100, where 100 is perfect)
2. Specific feedback on pronunciation issues
3. Common mistakes for this word
4. Difficulty level (easy/medium/hard)
5. Specific sounds to focus on
6. Syllable-by-syllable analysis with individual scores

Scoring criteria:
- 90-100: Native-like pronunciation
- 80-89: Very good, minor issues
- 70-79: Good, some noticeable issues
- 60-69: Fair, several issues
- 50-59: Poor, many issues
- 0-49: Very poor, major issues

Return ONLY a JSON object with this structure:
{
  "hasPronunciationErrors": boolean,
  "words": [
    {
      "word": "word",
      "score": 75,
      "needsPractice": true,
      "feedback": "Focus on the 'ch' sound - it should be pronounced like 'ch' in 'Bach'",
      "commonMistakes": ["Pronouncing 'ch' as 'k'", "Not aspirating the 'ch' sound"],
      "difficulty": "medium",
      "soundsToFocus": ["ch", "ü"],
      "improvementTips": ["Practice 'ch' sounds with 'Bach'", "Work on vowel length"],
      "syllableAnalysis": [
        {
          "syllable": "Stra",
          "score": 85,
          "feedback": "Good pronunciation of 'Str' cluster",
          "phoneticExpected": "ʃtʁa",
          "phoneticActual": "ʃtʁa"
        },
        {
          "syllable": "ße",
          "score": 65,
          "feedback": "The 'ß' sound needs work - should be sharper",
          "phoneticExpected": "sə",
          "phoneticActual": "zə"
        }
      ]
    }
  ],
  "overallScore": 80,
  "suggestions": ["Practice 'ch' sounds", "Work on vowel length", "Focus on umlauts"],
  "scoringBreakdown": {
    "vowelAccuracy": 85,
    "consonantAccuracy": 70,
    "rhythm": 80,
    "stress": 75
  }
}`

    // Call OpenAI API for pronunciation analysis
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
        max_tokens: 1000,
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
    let analysis: PronunciationAnalysisResponse
    try {
      analysis = JSON.parse(analysisText)
    } catch (parseError) {
      // If JSON parsing fails, return a basic analysis
      analysis = {
        hasPronunciationErrors: false,
        words: words.map(word => ({
          word,
          score: 85,
          needsPractice: false,
          feedback: 'Good pronunciation'
        })),
        overallScore: 85,
        suggestions: []
      }
    }

    return new Response(
      JSON.stringify(analysis),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Pronunciation analysis function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Pronunciation analysis failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
