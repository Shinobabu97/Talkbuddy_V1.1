import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface AnalysisRequest {
  message: string;
  userLevel?: string;
  source?: 'text' | 'voice';
}

interface AnalysisResponse {
  hasErrors: boolean;
  errorTypes: {
    grammar: boolean;
    vocabulary: boolean;
    pronunciation: boolean;
  };
  corrections: {
    grammar?: string;
    vocabulary?: Array<{wrong: string, correct: string, meaning: string}>;
    pronunciation?: string;
  };
  suggestions: {
    grammar?: string;
    vocabulary?: string;
    pronunciation?: string;
  };
  wordsForPractice?: Array<{
    word: string;
    needsPractice: boolean;
    score?: number;
    errorType?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, userLevel = 'Intermediate', source = 'text' }: AnalysisRequest = await req.json()

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const systemPrompt = `You are a CONSERVATIVE German language tutor. Only flag CLEAR, OBVIOUS errors.

CRITICAL: BE VERY CONSERVATIVE - DO NOT flag correct sentences as having errors!

Only flag these CLEAR errors:

1. GRAMMAR ERRORS (only obvious ones):
   - Wrong verb conjugation (ich bin vs ich ist)
   - Incorrect word order (Ich heute gehe vs Ich gehe heute)
   - Wrong articles (der Mädchen vs das Mädchen)
   - Missing required words (Ich nach Hause vs Ich gehe nach Hause)

2. VOCABULARY ERRORS (only clear mistakes):
   - Non-existent German words
   - Completely wrong word choice that changes meaning
   - English words mixed in German sentences

3. PRONUNCIATION ISSUES (only from voice input with clear mispronunciations):
   - Obvious mispronounced proper nouns (E-Field vs Eiffel)
   - Clear phonetic errors that create different words

DO NOT FLAG:
- Correct sentences (like "Der Film heißt Money Heist")
- Minor style differences
- Regional variations
- Sentences that are grammatically correct
- English names or titles in German sentences (these are normal)

EXAMPLES OF WHAT NOT TO FLAG:
- "Der Film heißt Money Heist" ← CORRECT, don't flag
- "Ich wohne in Berlin" ← CORRECT, don't flag
- "Das ist sehr interessant" ← CORRECT, don't flag

Return ONLY a JSON object:
{
  "hasErrors": boolean,
  "errorTypes": {
    "grammar": boolean,
    "vocabulary": boolean, 
    "pronunciation": boolean
  },
  "corrections": {
    "grammar": "corrected sentence if grammar errors found",
    "vocabulary": [{"wrong": "incorrect_word", "correct": "correct_word", "meaning": "English meaning"}],
    "pronunciation": "pronunciation tips for difficult words"
  },
  "suggestions": {
    "grammar": "brief grammar explanation",
    "vocabulary": "vocabulary learning tips", 
    "pronunciation": "pronunciation practice tips"
  },
  "wordsForPractice": [
    {"word": "difficult_word", "needsPractice": true, "score": 60, "errorType": "pronunciation|grammar|vocabulary"}
  ]
}

User Level: ${userLevel}
Source: ${source}
German Text: "${message}"`

    // Call OpenAI API
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
        max_tokens: 500,
        temperature: 0.1, // Lower temperature for more consistent, conservative responses
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

    let analysis: AnalysisResponse
    try {
      analysis = JSON.parse(analysisText)
    } catch (parseError) {
      // If JSON parsing fails, default to NO ERRORS (conservative approach)
      analysis = {
        hasErrors: false,
        errorTypes: {
          grammar: false,
          vocabulary: false,
          pronunciation: false
        },
        corrections: {},
        suggestions: {},
        wordsForPractice: []
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
    console.error('Comprehensive analysis function error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Analysis failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})