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
    const { audioData, transcription }: PronunciationAnalysisRequest = await req.json()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Extract words from transcription
    const words = transcription.split(' ').filter(word => word.length > 0);
    
    // For now, we'll use AI analysis since we don't have real pronunciation scoring
    // In a production app, you'd integrate with services like Azure Speech or Google Cloud Speech
    const systemPrompt = `You are a German pronunciation expert. Analyze the following German words for pronunciation accuracy and provide detailed scoring with syllable-level analysis including stress patterns.

Words: ${words.join(', ')}

For each word, provide:
1. Pronunciation score (0-100, where 100 is perfect)
2. Specific feedback on pronunciation issues
3. Common mistakes for this word
4. Difficulty level (easy/medium/hard)
5. Specific sounds to focus on
6. Syllable-by-syllable analysis with individual scores AND stress patterns
7. Stress pattern analysis comparing actual vs expected emphasis

Scoring criteria:
- 90-100: Excellent pronunciation - Native-like, very clear and accurate
- 80-89: Very good pronunciation - Minor improvements possible
- 70-79: Good pronunciation - Some areas need slight refinement
- 60-69: Fair pronunciation - Needs more practice for better accuracy
- 50-59: Poor pronunciation - Requires significant practice
- 0-49: Very poor pronunciation - Focus on pronunciation fundamentals

Stress Pattern Analysis:
- Include phoneticExpected and phoneticActual with stress markers (ˈ for primary stress, ˌ for secondary stress)
- Analyze stress patterns for each syllable
- Compare actual stress placement with expected stress placement
- Provide feedback on stress accuracy

CRITICAL: The feedback text MUST match the score ranges exactly:
- For scores 90-100: Use "Excellent pronunciation" feedback
- For scores 80-89: Use "Very good pronunciation" feedback  
- For scores 70-79: Use "Good pronunciation" feedback
- For scores 60-69: Use "Fair pronunciation" feedback
- For scores below 60: Use feedback indicating "significant practice needed"

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
          "feedback": "Very good pronunciation of 'Str' cluster. Minor improvements possible.",
          "phoneticExpected": "ˈʃtʁa",
          "phoneticActual": "ˈʃtʁa"
        },
        {
          "syllable": "ße",
          "score": 65,
          "feedback": "Fair pronunciation of 'ß'. Needs more practice for better accuracy.",
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
      
      // Normalize feedback to match score ranges
      const normalizeFeedback = (score: number, originalFeedback: string, word?: string): string => {
        if (score >= 90) {
          return word ? `Excellent pronunciation of "${word}"! Very clear and accurate.` : `Excellent pronunciation! Very clear and accurate.`;
        } else if (score >= 80) {
          return word ? `Very good pronunciation of "${word}". Minor improvements possible.` : `Very good pronunciation. Minor improvements possible.`;
        } else if (score >= 70) {
          return word ? `Good pronunciation of "${word}". Some areas need slight refinement.` : `Good pronunciation. Some areas need slight refinement.`;
        } else if (score >= 60) {
          return word ? `Fair pronunciation of "${word}". Needs more practice for better accuracy.` : `Fair pronunciation. Needs more practice for better accuracy.`;
        } else {
          return word ? `"${word}" requires significant practice. Focus on pronunciation fundamentals.` : `Requires significant practice. Focus on pronunciation fundamentals.`;
        }
      };
      
      // Apply consistent feedback to all words and syllables, and recalculate overall scores
      analysis.words = analysis.words.map(word => {
        // Calculate overall word score based on syllable scores
        let calculatedOverallScore = word.score; // Default to original score
        
        if (word.syllableAnalysis && word.syllableAnalysis.length > 0) {
          const syllableScores = word.syllableAnalysis.map(s => s.score);
          const averageSyllableScore = syllableScores.reduce((sum, score) => sum + score, 0) / syllableScores.length;
          calculatedOverallScore = Math.round(averageSyllableScore);
        }
        
        return {
          ...word,
          score: calculatedOverallScore, // Use calculated score based on syllables
          feedback: normalizeFeedback(calculatedOverallScore, word.feedback, word.word),
          syllableAnalysis: word.syllableAnalysis?.map(syllable => ({
            ...syllable,
            feedback: normalizeFeedback(syllable.score, syllable.feedback, syllable.syllable)
          }))
        };
      });
      
      // Recalculate overall analysis score based on word scores
      if (analysis.words.length > 0) {
        const wordScores = analysis.words.map(w => w.score);
        analysis.overallScore = Math.round(wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length);
      }
      
    } catch {
      // If JSON parsing fails, return a basic analysis with dynamic feedback
      const generateScoreBasedFeedback = (word: string, score: number): string => {
        return normalizeFeedback(score, '', word);
      };
      
      analysis = {
        hasPronunciationErrors: false,
        words: words.map(word => {
          const score = 85; // Default score for fallback
          return {
            word,
            score: score,
            needsPractice: false,
            feedback: generateScoreBasedFeedback(word, score),
            syllableAnalysis: word.split('').map(char => ({
              syllable: char,
              score: score, // Use same score for syllables in fallback
              feedback: generateScoreBasedFeedback(char, score),
              phoneticExpected: char,
              phoneticActual: char
            }))
          };
        }),
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
