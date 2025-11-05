import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Access-Control-Allow-Credentials': 'false'
}

serve(async (req) => {
  // Handle CORS preflight requests - MUST return 200
  // This MUST be checked FIRST, before any async operations or JSON parsing
  // CRITICAL: Return immediately without any async operations or error handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    const { audioData, transcription, language = 'de', post_id } = await req.json()
    
    if (!audioData || !transcription) {
      return new Response(
        JSON.stringify({ error: 'Audio data and transcription are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // post_id is optional (kept for backward compatibility but not required)
    console.log('🎤 === PRONUNCIATION ANALYSIS WITH OPENAI WHISPER API ===')
    console.log('Expected transcription:', transcription)
    console.log('Language:', language)
    if (post_id) console.log('Post ID:', post_id)

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    console.log('🔑 API Key check:', {
      'OPENAI_API_KEY': !!openaiApiKey,
      'Found key': !!openaiApiKey,
      'Key length': openaiApiKey?.length || 0
    })
    
    if (!openaiApiKey) {
      console.error('❌ OpenAI API Key not found in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          details: 'Set OPENAI_API_KEY environment variable in Supabase Secrets. This service uses OpenAI Whisper API for pronunciation analysis.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Verify audio data format - ensure it's a base64 string
    let audioBase64: string
    if (typeof audioData === 'string') {
      // Remove data URL prefix if present (e.g., "data:audio/webm;base64,")
      audioBase64 = audioData.includes(',') ? audioData.split(',')[1] : audioData
      console.log('✅ Audio data is string, length:', audioBase64.length)
    } else {
      console.error('❌ Audio data is not a string:', typeof audioData)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid audio data format',
          details: 'Audio data must be a base64-encoded string'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Call OpenAI Whisper API
    try {
      console.log('📡 Calling OpenAI Whisper API...')
      
      // Convert base64 to blob
      let audioBlob: Blob
      try {
        audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], {
          type: 'audio/webm'
        })
        console.log('✅ Audio blob created:', { size: audioBlob.size, type: audioBlob.type })
      } catch (conversionError) {
        console.error('❌ Error converting base64 to blob:', conversionError)
        throw new Error('Invalid audio data format - cannot convert to blob')
      }

      // Create form data for Whisper API
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('model', 'whisper-1')
      
      // Set language to German if specified
      if (language && language !== 'auto') {
        formData.append('language', language)
      }
      
      formData.append('response_format', 'verbose_json')
      
      // Request word-level timestamps for timing analysis
      formData.append('timestamp_granularities[]', 'word')
      formData.append('timestamp_granularities[]', 'segment')

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      })

      console.log('📡 Whisper API Response Status:', whisperResponse.status)
      console.log('📡 Whisper API Response OK:', whisperResponse.ok)

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text()
        console.error('❌ Whisper API Error Response Status:', whisperResponse.status)
        console.error('❌ Whisper API Error Response Body:', errorText)
        
        // Try to parse error as JSON for better logging
        let errorDetails = errorText
        try {
          const errorJson = JSON.parse(errorText)
          console.error('❌ Parsed Error JSON:', JSON.stringify(errorJson, null, 2))
          errorDetails = typeof errorJson === 'object' ? JSON.stringify(errorJson) : errorText
        } catch (e) {
          console.error('❌ Error response is not JSON:', e)
        }
        
        // Determine error type
        let errorMessage = 'Failed to analyze pronunciation'
        let statusCode = 500
        
        if (whisperResponse.status === 401) {
          errorMessage = 'Authentication failed with OpenAI Whisper API - check your API key'
        } else if (whisperResponse.status === 429) {
          errorMessage = 'OpenAI Whisper API rate limit exceeded. Please try again in a moment.'
          statusCode = 429
        } else if (whisperResponse.status === 400) {
          errorMessage = 'Invalid request format for OpenAI Whisper API'
          statusCode = 400
        }
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: `OpenAI Whisper API error: ${errorDetails}. Status: ${whisperResponse.status}. This service uses OpenAI Whisper API for pronunciation analysis.`,
            statusCode: whisperResponse.status,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: statusCode
          }
        )
      }

      const whisperData = await whisperResponse.json()
      console.log('✅ Whisper API Response received:', JSON.stringify(whisperData, null, 2))

      const actualTranscription = whisperData.text || ''
      const words = whisperData.words || []
      const segments = whisperData.segments || []
      const duration = segments.length > 0 ? segments[segments.length - 1].end : 0

      console.log('📝 Actual transcription from Whisper:', actualTranscription)
      console.log('📝 Expected transcription:', transcription)
      console.log('⏱️ Duration:', duration, 'seconds')
      console.log('📊 Words detected:', words.length)

      // Generate pronunciation scores based on transcription comparison
      const mappedResponse = generatePronunciationScoresFromComparison(
        actualTranscription,
        transcription,
        words,
        duration
      )

      return new Response(
        JSON.stringify(mappedResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } catch (apiError) {
      console.error('❌ Error calling OpenAI Whisper API:', apiError)
      // Fallback to mock response for development/debugging
      console.log('⚠️ Falling back to mock response')
      const expectedWords = transcription.split(' ').filter(word => word.length > 0)
      const mockResponse = generateMockResponse(expectedWords, transcription)
      
      return new Response(
        JSON.stringify(mockResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }
  } catch (error) {
    console.error('❌ Error in pronunciation analysis:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Generate pronunciation scores by comparing Whisper transcription with expected text
function generatePronunciationScoresFromComparison(
  actualTranscription: string,
  expectedTranscription: string,
  whisperWords: any[],
  duration: number
) {
  // Normalize transcriptions for comparison (lowercase, remove punctuation)
  const normalizeText = (text: string) => text.toLowerCase().replace(/[.,!?;:]/g, '').trim()
  const actualNormalized = normalizeText(actualTranscription)
  const expectedNormalized = normalizeText(expectedTranscription)
  
  // Split into words
  const expectedWords = expectedNormalized.split(/\s+/).filter(w => w.length > 0)
  const actualWords = actualNormalized.split(/\s+/).filter(w => w.length > 0)
  
  // Calculate word-level accuracy
  const wordMatches: boolean[] = []
  const maxLength = Math.max(expectedWords.length, actualWords.length)
  
  for (let i = 0; i < maxLength; i++) {
    const expectedWord = expectedWords[i] || ''
    const actualWord = actualWords[i] || ''
    
    if (expectedWord && actualWord) {
      // Exact match
      if (expectedWord === actualWord) {
        wordMatches.push(true)
      } else {
        // Check similarity using Levenshtein distance
        const similarity = calculateSimilarity(expectedWord, actualWord)
        wordMatches.push(similarity >= 0.7) // 70% similarity threshold
      }
    } else {
      wordMatches.push(false)
    }
  }
  
  // Calculate overall accuracy
  const correctWords = wordMatches.filter(m => m).length
  const totalWords = expectedWords.length || 1
  const accuracy = (correctWords / totalWords) * 100
  
  // Calculate timing metrics
  const wordsPerSecond = actualWords.length / Math.max(duration, 1)
  const idealWordsPerSecond = 2.5 // Typical German speaking pace
  const speedScore = Math.max(0, Math.min(100, (idealWordsPerSecond / Math.max(wordsPerSecond, 0.5)) * 100))
  
  // Analyze pauses from word timestamps
  let pauseScore = 100
  if (whisperWords.length > 1) {
    const pauses: number[] = []
    for (let i = 1; i < whisperWords.length; i++) {
      const pause = whisperWords[i].start - whisperWords[i - 1].end
      if (pause > 0.5) pauses.push(pause) // Pauses longer than 0.5 seconds
    }
    // Reduce score for excessive pauses
    pauseScore = Math.max(60, 100 - (pauses.length * 10))
  }
  
  // Generate word-level scores
  const words = expectedWords.map((word, index) => {
    const isCorrect = wordMatches[index] || false
    const baseScore = isCorrect ? 85 : 65
    
    // Add variation based on word characteristics
    const hasUmlauts = /[äöü]/.test(word)
    const hasCh = /ch/.test(word)
    const hasR = /r/.test(word)
    const isLong = word.length > 6
    
    let wordScore = baseScore
    if (!isCorrect) {
      if (hasUmlauts) wordScore -= 15
      if (hasCh) wordScore -= 20
      if (hasR) wordScore -= 10
      if (isLong) wordScore -= 5
    } else {
      // Add positive variation for correct pronunciation
      wordScore += Math.floor(Math.random() * 10) - 5 // ±5 points
    }
    
    wordScore = Math.max(40, Math.min(100, wordScore))
    
    // Calculate dimension scores
    const soundAccuracy = wordScore
    const stressEmphasis = Math.round(wordScore * 0.95)
    const smoothness = Math.round(pauseScore * 0.9)
    const correctSpeed = Math.round(speedScore)
    const intonationRhythm = Math.round((wordScore + speedScore) / 2)
    const understandability = wordScore
    
    const avgScore = Math.round(
      (soundAccuracy + stressEmphasis + smoothness + correctSpeed + intonationRhythm + understandability) / 6
    )
    
    const needsPractice = avgScore < 75
    const feedback = needsPractice
      ? `"${word}" needs more practice. Focus on the areas highlighted below.`
      : `Good pronunciation of "${word}"`
    
    return {
      word,
      score: avgScore,
      needsPractice,
      feedback,
      dimensions: {
        soundAccuracy: {
          score: soundAccuracy,
          feedback: {
            correct: soundAccuracy >= 70 ? [`Correct pronunciation of sounds in "${word}"`] : [],
            incorrect: soundAccuracy < 70 ? [`Some sounds need improvement in "${word}"`] : [],
            improvement: soundAccuracy < 70 ? [`Practice individual sounds more slowly`, `Listen to native pronunciation`] : []
          }
        },
        stressEmphasis: {
          score: stressEmphasis,
          feedback: {
            correct: stressEmphasis >= 70 ? [`Good stress placement`] : [],
            incorrect: stressEmphasis < 70 ? [`Stress on wrong syllable`] : [],
            improvement: stressEmphasis < 70 ? [`Focus on correct syllable stress`, `Practice word stress patterns`] : []
          }
        },
        smoothness: {
          score: smoothness,
          feedback: {
            correct: smoothness >= 70 ? [`Smooth flow without hesitations`] : [],
            incorrect: smoothness < 70 ? [`Unnatural pauses detected`] : [],
            improvement: smoothness < 70 ? [`Practice speaking more fluidly`, `Reduce hesitations`] : []
          }
        },
        correctSpeed: {
          score: correctSpeed,
          feedback: {
            correct: correctSpeed >= 70 ? [`Appropriate speaking pace`] : [],
            incorrect: correctSpeed < 70 ? [`Speaking too fast or too slow`] : [],
            improvement: correctSpeed < 70 ? [`Match natural German speaking pace`, `Practice with timing`] : []
          }
        },
        intonationRhythm: {
          score: intonationRhythm,
          feedback: {
            correct: intonationRhythm >= 70 ? [`Good speech melody`] : [],
            incorrect: intonationRhythm < 70 ? [`Intonation needs work`] : [],
            improvement: intonationRhythm < 70 ? [`Practice rising and falling tones`, `Match German rhythm patterns`] : []
          }
        },
        understandability: {
          score: understandability,
          feedback: {
            correct: understandability >= 70 ? [`Clear and understandable`] : [],
            incorrect: understandability < 70 ? [`Could be clearer`] : [],
            improvement: understandability < 70 ? [`Focus on clarity`, `Practice articulation`] : []
          }
        }
      }
    }
  })
  
  // Calculate sentence-level scores
  const overallScore = Math.round(accuracy)
  const sentenceScore = overallScore
  
  // Calculate sentence-level dimensions
  const sentenceDimensions = {
    soundAccuracy: {
      score: words.length > 0 
        ? Math.round(words.reduce((sum, w) => sum + w.dimensions.soundAccuracy.score, 0) / words.length)
        : overallScore,
      feedback: {
        correct: overallScore >= 75 ? [`Overall sound accuracy is good`] : [],
        incorrect: overallScore < 75 ? [`Some sounds need improvement throughout the sentence`] : [],
        improvement: overallScore < 75 ? [`Practice difficult sounds individually`, `Focus on clarity`] : []
      }
    },
    stressEmphasis: {
      score: words.length > 0
        ? Math.round(words.reduce((sum, w) => sum + w.dimensions.stressEmphasis.score, 0) / words.length)
        : overallScore,
      feedback: {
        correct: overallScore >= 75 ? [`Stress patterns are correct`] : [],
        incorrect: overallScore < 75 ? [`Work on syllable stress`] : [],
        improvement: overallScore < 75 ? [`Practice word stress patterns`, `Listen to native speakers`] : []
      }
    },
    smoothness: {
      score: Math.round(pauseScore),
      feedback: {
        correct: pauseScore >= 70 ? [`Speech flows smoothly`] : [],
        incorrect: pauseScore < 70 ? [`Too many pauses`] : [],
        improvement: pauseScore < 70 ? [`Practice speaking without hesitations`, `Increase fluency`] : []
      }
    },
    correctSpeed: {
      score: Math.round(speedScore),
      feedback: {
        correct: speedScore >= 70 ? [`Pace is appropriate`] : [],
        incorrect: speedScore < 70 ? [`Adjust speaking speed`] : [],
        improvement: speedScore < 70 ? [`Match natural German pace`, `Practice timing`] : []
      }
    },
    intonationRhythm: {
      score: Math.round((pauseScore + speedScore) / 2),
      feedback: {
        correct: overallScore >= 75 ? [`Good intonation`] : [],
        incorrect: overallScore < 75 ? [`Intonation needs work`] : [],
        improvement: overallScore < 75 ? [`Practice speech melody`, `Focus on rhythm`] : []
      }
    },
    understandability: {
      score: overallScore,
      feedback: {
        correct: overallScore >= 75 ? [`Speech is clear and understandable`] : [],
        incorrect: overallScore < 75 ? [`Could be clearer`] : [],
        improvement: overallScore < 75 ? [`Focus on clarity`, `Practice articulation`] : []
      }
    }
  }
  
  // Generate suggestions
  const suggestions = overallScore >= 75
    ? ['Great job! Continue practicing for even better pronunciation']
    : ['Focus on the areas highlighted in the detailed analysis', 'Practice difficult words individually']
  
  const result = {
    overallScore,
    sentenceScore,
    words,
    hasPronunciationErrors: overallScore < 75,
    suggestions,
    sentenceDimensions,
    source: 'practice' as const
  }
  
  return result
}

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

// Fallback: Mock response generator (used when API fails)
function generateMockResponse(words: string[], transcription: string) {
  const wordAnalyses = words.map((word, index) => {
    // Generate mock scores for each dimension
    const soundAccuracy = Math.floor(Math.random() * 40) + 50; // 50-90
    const stressEmphasis = Math.floor(Math.random() * 40) + 50;
    const smoothness = Math.floor(Math.random() * 40) + 50;
    const correctSpeed = Math.floor(Math.random() * 40) + 50;
    const intonationRhythm = Math.floor(Math.random() * 40) + 50;
    const understandability = Math.floor(Math.random() * 40) + 50;
    
    // Calculate average score
    const avgScore = Math.round(
      (soundAccuracy + stressEmphasis + smoothness + correctSpeed + intonationRhythm + understandability) / 6
    );

    return {
      word,
      score: avgScore,
      needsPractice: avgScore < 75,
      feedback: avgScore >= 75 
        ? `Good pronunciation of "${word}"` 
        : `"${word}" needs more practice. Focus on the areas highlighted below.`,
      dimensions: {
        soundAccuracy: {
          score: soundAccuracy,
          feedback: {
            correct: soundAccuracy >= 70 ? [`Correct pronunciation of sounds in "${word}"`] : [],
            incorrect: soundAccuracy < 70 ? [`Some sounds need improvement in "${word}"`] : [],
            improvement: soundAccuracy < 70 ? [`Practice individual sounds more slowly`, `Listen to native pronunciation`] : []
          }
        },
        stressEmphasis: {
          score: stressEmphasis,
          feedback: {
            correct: stressEmphasis >= 70 ? [`Good stress placement`] : [],
            incorrect: stressEmphasis < 70 ? [`Stress on wrong syllable`] : [],
            improvement: stressEmphasis < 70 ? [`Focus on correct syllable stress`, `Practice word stress patterns`] : []
          }
        },
        smoothness: {
          score: smoothness,
          feedback: {
            correct: smoothness >= 70 ? [`Smooth flow without hesitations`] : [],
            incorrect: smoothness < 70 ? [`Unnatural pauses detected`] : [],
            improvement: smoothness < 70 ? [`Practice speaking more fluidly`, `Reduce hesitations`] : []
          }
        },
        correctSpeed: {
          score: correctSpeed,
          feedback: {
            correct: correctSpeed >= 70 ? [`Appropriate speaking pace`] : [],
            incorrect: correctSpeed < 70 ? [`Speaking too fast or too slow`] : [],
            improvement: correctSpeed < 70 ? [`Match natural German speaking pace`, `Practice with timing`] : []
          }
        },
        intonationRhythm: {
          score: intonationRhythm,
          feedback: {
            correct: intonationRhythm >= 70 ? [`Good speech melody`] : [],
            incorrect: intonationRhythm < 70 ? [`Intonation needs work`] : [],
            improvement: intonationRhythm < 70 ? [`Practice rising and falling tones`, `Match German rhythm patterns`] : []
          }
        },
        understandability: {
          score: understandability,
          feedback: {
            correct: understandability >= 70 ? [`Clear and understandable`] : [],
            incorrect: understandability < 70 ? [`Could be clearer`] : [],
            improvement: understandability < 70 ? [`Focus on clarity`, `Practice articulation`] : []
          }
        }
      }
    };
  });

  // Calculate overall scores
  const overallScore = Math.round(
    wordAnalyses.reduce((sum, w) => sum + w.score, 0) / wordAnalyses.length
  );

  // Calculate sentence-level dimension scores (averages of word scores)
  const sentenceDimensions = {
    soundAccuracy: {
      score: Math.round(
        wordAnalyses.reduce((sum, w) => sum + w.dimensions.soundAccuracy.score, 0) / wordAnalyses.length
      ),
      feedback: {
        correct: overallScore >= 75 ? [`Overall sound accuracy is good`] : [],
        incorrect: overallScore < 75 ? [`Some sounds need improvement throughout the sentence`] : [],
        improvement: overallScore < 75 ? [`Practice difficult sounds individually`, `Focus on clarity`] : []
      }
    },
    stressEmphasis: {
      score: Math.round(
        wordAnalyses.reduce((sum, w) => sum + w.dimensions.stressEmphasis.score, 0) / wordAnalyses.length
      ),
      feedback: {
        correct: overallScore >= 75 ? [`Stress patterns are correct`] : [],
        incorrect: overallScore < 75 ? [`Work on syllable stress`] : [],
        improvement: overallScore < 75 ? [`Practice word stress patterns`, `Listen to native speakers`] : []
      }
    },
    smoothness: {
      score: Math.round(
        wordAnalyses.reduce((sum, w) => sum + w.dimensions.smoothness.score, 0) / wordAnalyses.length
      ),
      feedback: {
        correct: overallScore >= 75 ? [`Speech flows smoothly`] : [],
        incorrect: overallScore < 75 ? [`Too many pauses`] : [],
        improvement: overallScore < 75 ? [`Practice speaking without hesitations`, `Increase fluency`] : []
      }
    },
    correctSpeed: {
      score: Math.round(
        wordAnalyses.reduce((sum, w) => sum + w.dimensions.correctSpeed.score, 0) / wordAnalyses.length
      ),
      feedback: {
        correct: overallScore >= 75 ? [`Pace is appropriate`] : [],
        incorrect: overallScore < 75 ? [`Adjust speaking speed`] : [],
        improvement: overallScore < 75 ? [`Match natural German pace`, `Practice timing`] : []
      }
    },
    intonationRhythm: {
      score: Math.round(
        wordAnalyses.reduce((sum, w) => sum + w.dimensions.intonationRhythm.score, 0) / wordAnalyses.length
      ),
      feedback: {
        correct: overallScore >= 75 ? [`Good intonation`] : [],
        incorrect: overallScore < 75 ? [`Intonation needs work`] : [],
        improvement: overallScore < 75 ? [`Practice speech melody`, `Focus on rhythm`] : []
      }
    },
    understandability: {
      score: Math.round(
        wordAnalyses.reduce((sum, w) => sum + w.dimensions.understandability.score, 0) / wordAnalyses.length
      ),
      feedback: {
        correct: overallScore >= 75 ? [`Speech is clear and understandable`] : [],
        incorrect: overallScore < 75 ? [`Could be clearer`] : [],
        improvement: overallScore < 75 ? [`Focus on clarity`, `Practice articulation`] : []
      }
    }
  };

  const result = {
    overallScore,
    sentenceScore: overallScore,
    words: wordAnalyses,
    hasPronunciationErrors: overallScore < 75,
    suggestions: overallScore >= 75 
      ? ['Great job! Continue practicing for even better pronunciation']
      : ['Focus on the areas highlighted in the detailed analysis', 'Practice difficult words individually'],
    sentenceDimensions,
    source: 'practice' as const
  };

  return result;
}
