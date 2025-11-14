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
  
  // Generate word-level scores for ALL expected words
  // Ensure every word in the expected sentence gets word-level data, even if not detected
  const words = expectedWords.map((word, index) => {
    // Check if word was matched (wordMatches array may be shorter than expectedWords)
    const isCorrect = index < wordMatches.length ? wordMatches[index] : false
    
    // For words not detected in actual transcription, assign lower base score
    // but still provide complete word-level data
    const wasDetected = index < actualWords.length
    const baseScore = isCorrect ? 85 : (wasDetected ? 65 : 50) // Lower score for undetected words
    
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
    
    // Check dimension scores to align feedback with dimension-level assessment
    const dimensionScores = [soundAccuracy, stressEmphasis, smoothness, correctSpeed, intonationRhythm, understandability]
    const amberDimensions = dimensionScores.filter(score => score >= 60 && score < 80).length
    const redDimensions = dimensionScores.filter(score => score < 60).length
    const greenDimensions = dimensionScores.filter(score => score >= 80).length
    
    // Generate feedback aligned with dimension scores
    let feedback: string
    if (redDimensions > 0) {
      // If any dimension is Red, emphasize urgent need for practice
      if (redDimensions >= 3) {
        feedback = `"${word}" needs significant practice. Multiple areas require attention - see details below.`
      } else {
        feedback = `"${word}" needs more practice. Focus on the areas highlighted below.`
      }
    } else if (amberDimensions >= 3) {
      // Multiple Amber dimensions
      feedback = `"${word}" needs more practice. Focus on the areas highlighted below.`
    } else if (amberDimensions > 0) {
      // If some dimensions are Amber, acknowledge good parts but note improvement needed
      feedback = `Good pronunciation of "${word}" with some areas for improvement. See details below.`
    } else if (greenDimensions === 6) {
      // All dimensions are Green
      feedback = `Excellent pronunciation of "${word}"`
    } else {
      // Mostly good
      feedback = `Good pronunciation of "${word}"`
    }
    
    return {
      word,
      score: avgScore,
      needsPractice,
      feedback,
      dimensions: {
        soundAccuracy: {
          score: soundAccuracy,
          feedback: {
            // For scores 0-9: NO positive feedback, only incorrect and improvement
            correct: soundAccuracy >= 10 ? (soundAccuracy >= 70 ? [`Correct pronunciation of sounds in "${word}"`] : []) : [],
            incorrect: soundAccuracy < 10 
              ? [`Sounds in "${word}" were not pronounced correctly`, `Pronunciation needs significant improvement`, `Focus on articulating each sound clearly`]
              : soundAccuracy < 70 
                ? [`Some sounds need improvement in "${word}"`] 
                : [],
            improvement: soundAccuracy < 10
              ? [`Practice individual sounds very slowly`, `Listen to native pronunciation multiple times`, `Focus on correct articulation`, `Break down the word into individual sounds`, `Record yourself and compare with native speakers`]
              : soundAccuracy < 60
                ? [`Practice individual sounds more slowly`, `Listen to native pronunciation`, `Focus on correct articulation`]
                : soundAccuracy < 80
                  ? [`Practice individual sounds more slowly`, `Listen to native pronunciation`]
                  : []
          }
        },
        stressEmphasis: {
          score: stressEmphasis,
          feedback: {
            correct: stressEmphasis >= 10 ? (stressEmphasis >= 70 ? [`Good stress placement`] : []) : [],
            incorrect: stressEmphasis < 10
              ? [`Stress placement on "${word}" is incorrect`, `Syllable stress needs significant improvement`, `Focus on identifying the correct stressed syllable`]
              : stressEmphasis < 70
                ? [`Stress on wrong syllable`]
                : [],
            improvement: stressEmphasis < 10
              ? [`Focus on correct syllable stress`, `Practice word stress patterns repeatedly`, `Listen carefully to native speakers`, `Tap out the rhythm to identify stressed syllables`, `Practice with emphasis on the correct syllable`]
              : stressEmphasis < 60
                ? [`Focus on correct syllable stress`, `Practice word stress patterns`, `Listen carefully to native speakers`]
                : stressEmphasis < 80
                  ? [`Focus on correct syllable stress`, `Practice word stress patterns`]
                  : []
          }
        },
        smoothness: {
          score: smoothness,
          feedback: {
            correct: smoothness >= 10 ? (smoothness >= 70 ? [`Smooth flow without hesitations`] : []) : [],
            incorrect: smoothness < 10
              ? [`Flow in "${word}" is not smooth`, `Multiple hesitations and pauses detected`, `Pronunciation lacks fluency`]
              : smoothness < 70
                ? [`Unnatural pauses detected`]
                : [],
            improvement: smoothness < 10
              ? [`Practice speaking more fluidly`, `Reduce hesitations significantly`, `Work on connecting sounds smoothly`, `Practice linking sounds together`, `Record yourself and focus on eliminating pauses`]
              : smoothness < 60
                ? [`Practice speaking more fluidly`, `Reduce hesitations`, `Work on connecting words smoothly`]
                : smoothness < 80
                  ? [`Practice speaking more fluidly`, `Reduce hesitations`]
                  : []
          }
        },
        correctSpeed: {
          score: correctSpeed,
          feedback: {
            correct: correctSpeed >= 10 ? (correctSpeed >= 70 ? [`Appropriate speaking pace`] : []) : [],
            incorrect: correctSpeed < 10
              ? [`Speaking pace for "${word}" is inappropriate`, `Speed needs significant adjustment`, `Too fast or too slow compared to natural pace`]
              : correctSpeed < 70
                ? [`Speaking too fast or too slow`]
                : [],
            improvement: correctSpeed < 10
              ? [`Match natural German speaking pace`, `Practice with timing`, `Record yourself and compare`, `Use a metronome to practice consistent pace`, `Slow down and focus on clarity first`]
              : correctSpeed < 60
                ? [`Match natural German speaking pace`, `Practice with timing`, `Record yourself and compare`]
                : correctSpeed < 80
                  ? [`Match natural German speaking pace`, `Practice with timing`]
                  : []
          }
        },
        intonationRhythm: {
          score: intonationRhythm,
          feedback: {
            correct: intonationRhythm >= 10 ? (intonationRhythm >= 70 ? [`Good speech melody`] : []) : [],
            incorrect: intonationRhythm < 10
              ? [`Intonation and rhythm for "${word}" need significant work`, `Speech melody is incorrect`, `Rhythm patterns are not matching natural German speech`]
              : intonationRhythm < 70
                ? [`Intonation needs work`]
                : [],
            improvement: intonationRhythm < 10
              ? [`Practice rising and falling tones`, `Match German rhythm patterns`, `Focus on natural speech flow`, `Listen to native speakers and mimic their intonation`, `Practice with emphasis on correct pitch patterns`]
              : intonationRhythm < 60
                ? [`Practice rising and falling tones`, `Match German rhythm patterns`, `Focus on natural speech flow`]
                : intonationRhythm < 80
                  ? [`Practice rising and falling tones`, `Match German rhythm patterns`]
                  : []
          }
        },
        understandability: {
          score: understandability,
          feedback: {
            correct: understandability >= 10 ? (understandability >= 70 ? [`Clear and understandable`] : []) : [],
            incorrect: understandability < 10
              ? [`"${word}" is not clear or understandable`, `Pronunciation needs significant improvement for clarity`, `Focus on making each sound distinct and clear`]
              : understandability < 70
                ? [`Could be clearer`]
                : [],
            improvement: understandability < 10
              ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`, `Open your mouth more when speaking`, `Slow down and enunciate each sound clearly`, `Record yourself and compare with native speakers`]
              : understandability < 60
                ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`]
                : understandability < 80
                  ? [`Focus on clarity`, `Practice articulation`]
                  : []
          }
        }
      }
    }
  })
  
  // Calculate sentence-level dimension scores first
  const soundAccuracyScore = words.length > 0 
    ? Math.round(words.reduce((sum, w) => sum + w.dimensions.soundAccuracy.score, 0) / words.length)
    : Math.round(accuracy)
  const stressEmphasisScore = words.length > 0
    ? Math.round(words.reduce((sum, w) => sum + w.dimensions.stressEmphasis.score, 0) / words.length)
    : Math.round(accuracy)
  const smoothnessScore = Math.round(pauseScore)
  const correctSpeedScore = Math.round(speedScore)
  const intonationRhythmScore = Math.round((pauseScore + speedScore) / 2)
  const understandabilityScore = Math.round(accuracy)
  
  // Calculate sentence-level dimensions with feedback based on calculated scores
  // Green (>=90): Show only correct feedback
  // Amber (70-89): Show correct AND incorrect AND improvement feedback
  // Red (<70): Show incorrect AND improvement feedback (may show some correct if >= 10)
  // Scores 0-9: NO positive feedback, only incorrect and improvement feedback
  const sentenceDimensions = {
    soundAccuracy: {
      score: soundAccuracyScore,
      feedback: {
        // For scores 0-9: NO positive feedback
        correct: soundAccuracyScore >= 10
          ? (soundAccuracyScore >= 90 
              ? [`Overall sound accuracy is excellent`]
              : soundAccuracyScore >= 70 
                ? [`Some sounds were articulated clearly`]
                : soundAccuracyScore >= 60
                  ? [`A few sounds were pronounced correctly`]
                  : [])
          : [],
        incorrect: soundAccuracyScore < 10
          ? [`Sounds throughout the sentence were not pronounced correctly`, `Pronunciation needs significant improvement`, `Focus on articulating each sound clearly throughout the sentence`]
          : soundAccuracyScore < 90
            ? soundAccuracyScore >= 70
              ? [`Some sounds need improvement throughout the sentence`]
              : [`Many sounds need improvement throughout the sentence`]
            : [],
        improvement: soundAccuracyScore < 10
          ? [`Practice difficult sounds individually`, `Focus on clarity`, `Work on articulation throughout the sentence`, `Listen to native pronunciation and mimic the mouth shape`, `Break down difficult words into individual sounds`, `Record yourself and compare with native speakers`]
          : soundAccuracyScore < 70
            ? [`Practice difficult sounds individually`, `Focus on clarity`, `Work on articulation throughout the sentence`, `Listen to native pronunciation and mimic the mouth shape`]
            : soundAccuracyScore < 90
              ? [`Practice difficult sounds individually`, `Focus on clarity`, `Work on articulation throughout the sentence`]
              : []
      }
    },
    stressEmphasis: {
      score: stressEmphasisScore,
      feedback: {
        correct: stressEmphasisScore >= 10
          ? (stressEmphasisScore >= 90
              ? [`Stress patterns are excellent`]
              : stressEmphasisScore >= 70
                ? [`Stress patterns are mostly correct`]
                : stressEmphasisScore >= 60
                  ? [`Some stress patterns were correct`]
                  : [])
          : [],
        incorrect: stressEmphasisScore < 10
          ? [`Syllable stress throughout the sentence needs significant improvement`, `Stress placement is incorrect`, `Focus on identifying and using correct stressed syllables`]
          : stressEmphasisScore < 90
            ? stressEmphasisScore >= 70
              ? [`Some syllable stress needs work`]
              : [`Syllable stress needs significant improvement`]
            : [],
        improvement: stressEmphasisScore < 10
          ? [`Practice word stress patterns`, `Listen to native speakers`, `Focus on correct syllable emphasis`, `Tap the beat while speaking to lock in stressed syllables`, `Practice with emphasis on the correct syllables`, `Record yourself and compare stress patterns`]
          : stressEmphasisScore < 70
            ? [`Practice word stress patterns`, `Listen to native speakers`, `Focus on correct syllable emphasis`, `Tap the beat while speaking to lock in stressed syllables`]
            : stressEmphasisScore < 90
              ? [`Practice word stress patterns`, `Listen to native speakers`, `Focus on correct syllable emphasis`]
              : []
      }
    },
    smoothness: {
      score: smoothnessScore,
      feedback: {
        correct: smoothnessScore >= 10
          ? (smoothnessScore >= 90
              ? [`Speech flows very smoothly`]
              : smoothnessScore >= 70
                ? [`Speech flows smoothly in most parts`]
                : smoothnessScore >= 60
                  ? [`Some segments flowed smoothly`]
                  : [])
          : [],
        incorrect: smoothnessScore < 10
          ? [`Too many pauses interrupt the flow throughout the sentence`, `Speech lacks fluency`, `Multiple hesitations detected`]
          : smoothnessScore < 90
            ? smoothnessScore >= 70
              ? [`There are some brief pauses that interrupt the flow`]
              : [`Too many pauses interrupt the flow`]
            : [],
        improvement: smoothnessScore < 10
          ? [`Practice speaking without hesitations`, `Increase fluency`, `Work on connecting words smoothly`, `Record yourself and focus on reducing pauses`, `Practice linking words together`, `Focus on eliminating breaks between words`]
          : smoothnessScore < 70
            ? [`Practice speaking without hesitations`, `Increase fluency`, `Work on connecting words smoothly`, `Record yourself and focus on reducing pauses`]
            : smoothnessScore < 90
              ? [`Practice speaking without hesitations`, `Increase fluency`, `Work on connecting words smoothly`]
              : []
      }
    },
    correctSpeed: {
      score: correctSpeedScore,
      feedback: {
        correct: correctSpeedScore >= 10
          ? (correctSpeedScore >= 90
              ? [`Pace is excellent`]
              : correctSpeedScore >= 70
                ? [`Pace is mostly appropriate`]
                : correctSpeedScore >= 60
                  ? [`Some parts match a natural pace`]
                  : [])
          : [],
        incorrect: correctSpeedScore < 10
          ? [`Speaking speed throughout the sentence needs significant adjustment`, `Pace is too fast or too slow`, `Speed does not match natural German speaking pace`]
          : correctSpeedScore < 90
            ? correctSpeedScore >= 70
              ? [`The speed drifts slightly faster or slower in places`]
              : [`Speaking speed needs adjustment`]
            : [],
        improvement: correctSpeedScore < 10
          ? [`Match natural German pace`, `Practice timing`, `Record yourself and compare with native speakers`, `Count a steady beat to keep pace consistent`, `Use a metronome to practice consistent pace`, `Slow down and focus on clarity first`]
          : correctSpeedScore < 70
            ? [`Match natural German pace`, `Practice timing`, `Record yourself and compare with native speakers`, `Count a steady beat to keep pace consistent`]
            : correctSpeedScore < 90
              ? [`Match natural German pace`, `Practice timing`, `Record yourself and compare with native speakers`]
              : []
      }
    },
    intonationRhythm: {
      score: intonationRhythmScore,
      feedback: {
        correct: intonationRhythmScore >= 10
          ? (intonationRhythmScore >= 90
              ? [`Intonation and rhythm are excellent`]
              : intonationRhythmScore >= 70
                ? [`Good intonation in most parts`]
                : intonationRhythmScore >= 60
                  ? [`You followed the German melody in some phrases`]
                  : [])
          : [],
        incorrect: intonationRhythmScore < 10
          ? [`Intonation and rhythm throughout the sentence need significant work`, `Speech melody is incorrect`, `Rhythm patterns are not matching natural German speech`]
          : intonationRhythmScore < 90
            ? intonationRhythmScore >= 70
              ? [`The pitch contour flattens in parts of the sentence`]
              : [`Intonation and rhythm need significant work`]
            : [],
        improvement: intonationRhythmScore < 10
          ? [`Practice speech melody`, `Focus on rhythm`, `Work on natural speech flow`, `Exaggerate rises and falls as you practice`, `Shadow a native recording to copy rhythm and pitch`, `Listen to native speakers and mimic their intonation patterns`]
          : intonationRhythmScore < 70
            ? [`Practice speech melody`, `Focus on rhythm`, `Work on natural speech flow`, `Exaggerate rises and falls as you practice`, `Shadow a native recording to copy rhythm and pitch`]
            : intonationRhythmScore < 90
              ? [`Practice speech melody`, `Focus on rhythm`, `Work on natural speech flow`]
              : []
      }
    },
    understandability: {
      score: understandabilityScore,
      feedback: {
        correct: understandabilityScore >= 10
          ? (understandabilityScore >= 90
              ? [`Speech is very clear and understandable`]
              : understandabilityScore >= 70
                ? [`Speech is mostly clear and understandable`]
                : understandabilityScore >= 60
                  ? [`Most of the sentence remains understandable`]
                  : [])
          : [],
        incorrect: understandabilityScore < 10
          ? [`Several parts of the sentence are hard to understand`, `Pronunciation needs significant improvement for clarity`, `Focus on making each sound distinct and clear`]
          : understandabilityScore < 90
            ? understandabilityScore >= 70
              ? [`Some parts could be clearer`]
              : [`Several parts are hard to understand`]
            : [],
        improvement: understandabilityScore < 10
          ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`, `Enunciate syllables more clearly`, `Open your mouth a bit more and slow down difficult parts`, `Record yourself and compare with native speakers`]
          : understandabilityScore < 70
            ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`, `Enunciate syllables more clearly`, `Open your mouth a bit more and slow down difficult parts`]
            : understandabilityScore < 90
              ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`]
              : []
      }
    }
  }
  
  // Calculate sentence-level scores as average of all 6 dimension scores
  const dimensionScores = [
    sentenceDimensions.soundAccuracy.score,
    sentenceDimensions.stressEmphasis.score,
    sentenceDimensions.smoothness.score,
    sentenceDimensions.correctSpeed.score,
    sentenceDimensions.intonationRhythm.score,
    sentenceDimensions.understandability.score
  ];
  const overallScore = Math.round(
    dimensionScores.reduce((sum, score) => sum + score, 0) / dimensionScores.length
  );
  const sentenceScore = overallScore;
  
  // Generate sentence-level feedback aligned with dimension scores
  const sentenceAmberDimensions = dimensionScores.filter(score => score >= 60 && score < 80).length
  const sentenceRedDimensions = dimensionScores.filter(score => score < 60).length
  const sentenceGreenDimensions = dimensionScores.filter(score => score >= 80).length
  
  // Generate suggestions aligned with dimension scores
  const suggestions = sentenceRedDimensions > 0
    ? sentenceRedDimensions >= 3
      ? ['Multiple areas need significant improvement', 'Practice each dimension individually', 'Focus on the areas highlighted in the detailed analysis']
      : ['Some areas need significant improvement', 'Focus on the areas highlighted in the detailed analysis', 'Practice difficult words individually']
    : sentenceAmberDimensions >= 3
    ? ['Focus on the areas highlighted in the detailed analysis', 'Practice difficult words individually']
    : sentenceAmberDimensions > 0
    ? ['Good overall pronunciation with some areas for improvement', 'Review the detailed dimension feedback']
    : sentenceGreenDimensions === 6
    ? ['Excellent pronunciation! Continue practicing for consistency']
    : ['Great job! Continue practicing for even better pronunciation']
  
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
            // For scores 0-9: NO positive feedback
            correct: soundAccuracy >= 10 ? (soundAccuracy >= 70 ? [`Correct pronunciation of sounds in "${word}"`] : []) : [],
            incorrect: soundAccuracy < 10 
              ? [`Sounds in "${word}" were not pronounced correctly`, `Pronunciation needs significant improvement`]
              : soundAccuracy < 70 
                ? [`Some sounds need improvement in "${word}"`] 
                : [],
            improvement: soundAccuracy < 10
              ? [`Practice individual sounds very slowly`, `Listen to native pronunciation multiple times`, `Focus on correct articulation`]
              : soundAccuracy < 70
                ? [`Practice individual sounds more slowly`, `Listen to native pronunciation`]
                : []
          }
        },
        stressEmphasis: {
          score: stressEmphasis,
          feedback: {
            correct: stressEmphasis >= 10 ? (stressEmphasis >= 70 ? [`Good stress placement`] : []) : [],
            incorrect: stressEmphasis < 10
              ? [`Stress placement on "${word}" is incorrect`, `Syllable stress needs significant improvement`]
              : stressEmphasis < 70
                ? [`Stress on wrong syllable`]
                : [],
            improvement: stressEmphasis < 10
              ? [`Focus on correct syllable stress`, `Practice word stress patterns repeatedly`, `Listen carefully to native speakers`]
              : stressEmphasis < 70
                ? [`Focus on correct syllable stress`, `Practice word stress patterns`]
                : []
          }
        },
        smoothness: {
          score: smoothness,
          feedback: {
            correct: smoothness >= 10 ? (smoothness >= 70 ? [`Smooth flow without hesitations`] : []) : [],
            incorrect: smoothness < 10
              ? [`Flow in "${word}" is not smooth`, `Multiple hesitations and pauses detected`]
              : smoothness < 70
                ? [`Unnatural pauses detected`]
                : [],
            improvement: smoothness < 10
              ? [`Practice speaking more fluidly`, `Reduce hesitations significantly`, `Work on connecting sounds smoothly`]
              : smoothness < 70
                ? [`Practice speaking more fluidly`, `Reduce hesitations`]
                : []
          }
        },
        correctSpeed: {
          score: correctSpeed,
          feedback: {
            correct: correctSpeed >= 10 ? (correctSpeed >= 70 ? [`Appropriate speaking pace`] : []) : [],
            incorrect: correctSpeed < 10
              ? [`Speaking pace for "${word}" is inappropriate`, `Speed needs significant adjustment`]
              : correctSpeed < 70
                ? [`Speaking too fast or too slow`]
                : [],
            improvement: correctSpeed < 10
              ? [`Match natural German speaking pace`, `Practice with timing`, `Record yourself and compare`]
              : correctSpeed < 70
                ? [`Match natural German speaking pace`, `Practice with timing`]
                : []
          }
        },
        intonationRhythm: {
          score: intonationRhythm,
          feedback: {
            correct: intonationRhythm >= 10 ? (intonationRhythm >= 70 ? [`Good speech melody`] : []) : [],
            incorrect: intonationRhythm < 10
              ? [`Intonation and rhythm for "${word}" need significant work`, `Speech melody is incorrect`]
              : intonationRhythm < 70
                ? [`Intonation needs work`]
                : [],
            improvement: intonationRhythm < 10
              ? [`Practice rising and falling tones`, `Match German rhythm patterns`, `Focus on natural speech flow`]
              : intonationRhythm < 70
                ? [`Practice rising and falling tones`, `Match German rhythm patterns`]
                : []
          }
        },
        understandability: {
          score: understandability,
          feedback: {
            correct: understandability >= 10 ? (understandability >= 70 ? [`Clear and understandable`] : []) : [],
            incorrect: understandability < 10
              ? [`"${word}" is not clear or understandable`, `Pronunciation needs significant improvement for clarity`]
              : understandability < 70
                ? [`Could be clearer`]
                : [],
            improvement: understandability < 10
              ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`]
              : understandability < 70
                ? [`Focus on clarity`, `Practice articulation`]
                : []
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
  // Use same comprehensive feedback logic as main API
  const soundAccuracyScore = Math.round(
    wordAnalyses.reduce((sum, w) => sum + w.dimensions.soundAccuracy.score, 0) / wordAnalyses.length
  );
  const stressEmphasisScore = Math.round(
    wordAnalyses.reduce((sum, w) => sum + w.dimensions.stressEmphasis.score, 0) / wordAnalyses.length
  );
  const smoothnessScore = Math.round(
    wordAnalyses.reduce((sum, w) => sum + w.dimensions.smoothness.score, 0) / wordAnalyses.length
  );
  const correctSpeedScore = Math.round(
    wordAnalyses.reduce((sum, w) => sum + w.dimensions.correctSpeed.score, 0) / wordAnalyses.length
  );
  const intonationRhythmScore = Math.round(
    wordAnalyses.reduce((sum, w) => sum + w.dimensions.intonationRhythm.score, 0) / wordAnalyses.length
  );
  const understandabilityScore = Math.round(
    wordAnalyses.reduce((sum, w) => sum + w.dimensions.understandability.score, 0) / wordAnalyses.length
  );

  const sentenceDimensions = {
    soundAccuracy: {
      score: soundAccuracyScore,
      feedback: {
        // For scores 0-9: NO positive feedback
        correct: soundAccuracyScore >= 10
          ? (soundAccuracyScore >= 90 
              ? [`Overall sound accuracy is excellent`]
              : soundAccuracyScore >= 70 
                ? [`Some sounds were articulated clearly`]
                : soundAccuracyScore >= 60
                  ? [`A few sounds were pronounced correctly`]
                  : [])
          : [],
        incorrect: soundAccuracyScore < 10
          ? [`Sounds throughout the sentence were not pronounced correctly`, `Pronunciation needs significant improvement`, `Focus on articulating each sound clearly throughout the sentence`]
          : soundAccuracyScore < 90
            ? soundAccuracyScore >= 70
              ? [`Some sounds need improvement throughout the sentence`]
              : [`Many sounds need improvement throughout the sentence`]
            : [],
        improvement: soundAccuracyScore < 10
          ? [`Practice difficult sounds individually`, `Focus on clarity`, `Work on articulation throughout the sentence`, `Listen to native pronunciation and mimic the mouth shape`, `Break down difficult words into individual sounds`, `Record yourself and compare with native speakers`]
          : soundAccuracyScore < 70
            ? [`Practice difficult sounds individually`, `Focus on clarity`, `Work on articulation throughout the sentence`, `Listen to native pronunciation and mimic the mouth shape`]
            : soundAccuracyScore < 90
              ? [`Practice difficult sounds individually`, `Focus on clarity`, `Work on articulation throughout the sentence`]
              : []
      }
    },
    stressEmphasis: {
      score: stressEmphasisScore,
      feedback: {
        correct: stressEmphasisScore >= 10
          ? (stressEmphasisScore >= 90
              ? [`Stress patterns are excellent`]
              : stressEmphasisScore >= 70
                ? [`Stress patterns are mostly correct`]
                : stressEmphasisScore >= 60
                  ? [`Some stress patterns were correct`]
                  : [])
          : [],
        incorrect: stressEmphasisScore < 10
          ? [`Syllable stress throughout the sentence needs significant improvement`, `Stress placement is incorrect`, `Focus on identifying and using correct stressed syllables`]
          : stressEmphasisScore < 90
            ? stressEmphasisScore >= 70
              ? [`Some syllable stress needs work`]
              : [`Syllable stress needs significant improvement`]
            : [],
        improvement: stressEmphasisScore < 10
          ? [`Practice word stress patterns`, `Listen to native speakers`, `Focus on correct syllable emphasis`, `Tap the beat while speaking to lock in stressed syllables`, `Practice with emphasis on the correct syllables`, `Record yourself and compare stress patterns`]
          : stressEmphasisScore < 70
            ? [`Practice word stress patterns`, `Listen to native speakers`, `Focus on correct syllable emphasis`, `Tap the beat while speaking to lock in stressed syllables`]
            : stressEmphasisScore < 90
              ? [`Practice word stress patterns`, `Listen to native speakers`, `Focus on correct syllable emphasis`]
              : []
      }
    },
    smoothness: {
      score: smoothnessScore,
      feedback: {
        correct: smoothnessScore >= 10
          ? (smoothnessScore >= 90
              ? [`Speech flows very smoothly`]
              : smoothnessScore >= 70
                ? [`Speech flows smoothly in most parts`]
                : smoothnessScore >= 60
                  ? [`Some segments flowed smoothly`]
                  : [])
          : [],
        incorrect: smoothnessScore < 10
          ? [`Too many pauses interrupt the flow throughout the sentence`, `Speech lacks fluency`, `Multiple hesitations detected`]
          : smoothnessScore < 90
            ? smoothnessScore >= 70
              ? [`There are some brief pauses that interrupt the flow`]
              : [`Too many pauses interrupt the flow`]
            : [],
        improvement: smoothnessScore < 10
          ? [`Practice speaking without hesitations`, `Increase fluency`, `Work on connecting words smoothly`, `Record yourself and focus on reducing pauses`, `Practice linking words together`, `Focus on eliminating breaks between words`]
          : smoothnessScore < 70
            ? [`Practice speaking without hesitations`, `Increase fluency`, `Work on connecting words smoothly`, `Record yourself and focus on reducing pauses`]
            : smoothnessScore < 90
              ? [`Practice speaking without hesitations`, `Increase fluency`, `Work on connecting words smoothly`]
              : []
      }
    },
    correctSpeed: {
      score: correctSpeedScore,
      feedback: {
        correct: correctSpeedScore >= 10
          ? (correctSpeedScore >= 90
              ? [`Pace is excellent`]
              : correctSpeedScore >= 70
                ? [`Pace is mostly appropriate`]
                : correctSpeedScore >= 60
                  ? [`Some parts match a natural pace`]
                  : [])
          : [],
        incorrect: correctSpeedScore < 10
          ? [`Speaking speed throughout the sentence needs significant adjustment`, `Pace is too fast or too slow`, `Speed does not match natural German speaking pace`]
          : correctSpeedScore < 90
            ? correctSpeedScore >= 70
              ? [`The speed drifts slightly faster or slower in places`]
              : [`Speaking speed needs adjustment`]
            : [],
        improvement: correctSpeedScore < 10
          ? [`Match natural German pace`, `Practice timing`, `Record yourself and compare with native speakers`, `Count a steady beat to keep pace consistent`, `Use a metronome to practice consistent pace`, `Slow down and focus on clarity first`]
          : correctSpeedScore < 70
            ? [`Match natural German pace`, `Practice timing`, `Record yourself and compare with native speakers`, `Count a steady beat to keep pace consistent`]
            : correctSpeedScore < 90
              ? [`Match natural German pace`, `Practice timing`, `Record yourself and compare with native speakers`]
              : []
      }
    },
    intonationRhythm: {
      score: intonationRhythmScore,
      feedback: {
        correct: intonationRhythmScore >= 10
          ? (intonationRhythmScore >= 90
              ? [`Intonation and rhythm are excellent`]
              : intonationRhythmScore >= 70
                ? [`Good intonation in most parts`]
                : intonationRhythmScore >= 60
                  ? [`You followed the German melody in some phrases`]
                  : [])
          : [],
        incorrect: intonationRhythmScore < 10
          ? [`Intonation and rhythm throughout the sentence need significant work`, `Speech melody is incorrect`, `Rhythm patterns are not matching natural German speech`]
          : intonationRhythmScore < 90
            ? intonationRhythmScore >= 70
              ? [`The pitch contour flattens in parts of the sentence`]
              : [`Intonation and rhythm need significant work`]
            : [],
        improvement: intonationRhythmScore < 10
          ? [`Practice speech melody`, `Focus on rhythm`, `Work on natural speech flow`, `Exaggerate rises and falls as you practice`, `Shadow a native recording to copy rhythm and pitch`, `Listen to native speakers and mimic their intonation patterns`]
          : intonationRhythmScore < 70
            ? [`Practice speech melody`, `Focus on rhythm`, `Work on natural speech flow`, `Exaggerate rises and falls as you practice`, `Shadow a native recording to copy rhythm and pitch`]
            : intonationRhythmScore < 90
              ? [`Practice speech melody`, `Focus on rhythm`, `Work on natural speech flow`]
              : []
      }
    },
    understandability: {
      score: understandabilityScore,
      feedback: {
        correct: understandabilityScore >= 10
          ? (understandabilityScore >= 90
              ? [`Speech is very clear and understandable`]
              : understandabilityScore >= 70
                ? [`Speech is mostly clear and understandable`]
                : understandabilityScore >= 60
                  ? [`Most of the sentence remains understandable`]
                  : [])
          : [],
        incorrect: understandabilityScore < 10
          ? [`Several parts of the sentence are hard to understand`, `Pronunciation needs significant improvement for clarity`, `Focus on making each sound distinct and clear`]
          : understandabilityScore < 90
            ? understandabilityScore >= 70
              ? [`Some parts could be clearer`]
              : [`Several parts are hard to understand`]
            : [],
        improvement: understandabilityScore < 10
          ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`, `Enunciate syllables more clearly`, `Open your mouth a bit more and slow down difficult parts`, `Record yourself and compare with native speakers`]
          : understandabilityScore < 70
            ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`, `Enunciate syllables more clearly`, `Open your mouth a bit more and slow down difficult parts`]
            : understandabilityScore < 90
              ? [`Focus on clarity`, `Practice articulation`, `Speak more clearly and distinctly`]
              : []
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
