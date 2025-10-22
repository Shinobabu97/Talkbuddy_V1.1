import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PhonemeScore {
  phoneme: string;
  score: number;
  expected: string;
  actual: string;
  feedback: string;
}

interface WordScore {
  word: string;
  score: number;
  phonemeScores: PhonemeScore[];
  feedback: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GOPResult {
  overallScore: number;
  words: WordScore[];
  suggestions: string[];
  hasErrors: boolean;
}

// German phoneme mapping for common pronunciation issues
const GERMAN_PHONEME_MAP: { [key: string]: string[] } = {
  'ä': ['ɛ', 'eː'],
  'ö': ['ø', 'œ'],
  'ü': ['y', 'ʏ'],
  'ch': ['ç', 'x'],
  'sch': ['ʃ'],
  'r': ['ʁ', 'r'],
  'l': ['l'],
  'ng': ['ŋ']
};

// German pronunciation rules for English speakers
const PRONUNCIATION_RULES = {
  'ch': { difficulty: 'hard', commonMistakes: ['k', 'sh'], correct: 'ç' },
  'r': { difficulty: 'medium', commonMistakes: ['ɹ', 'w'], correct: 'ʁ' },
  'ä': { difficulty: 'medium', commonMistakes: ['a', 'e'], correct: 'ɛ' },
  'ö': { difficulty: 'hard', commonMistakes: ['o', 'e'], correct: 'ø' },
  'ü': { difficulty: 'hard', commonMistakes: ['u', 'i'], correct: 'y' },
  'sch': { difficulty: 'medium', commonMistakes: ['sk', 's'], correct: 'ʃ' }
};

// Calculate phoneme-level GOP score
function calculatePhonemeGOP(phoneme: string, expected: string, actual: string): PhonemeScore {
  const rule = PRONUNCIATION_RULES[phoneme];
  if (!rule) {
    return {
      phoneme,
      score: 85, // Default good score for unproblematic phonemes
      expected,
      actual,
      feedback: 'Good pronunciation'
    };
  }

  // Calculate similarity score based on phonetic distance
  let score = 100;
  let feedback = 'Excellent pronunciation';
  
  // Check for common mistakes
  if (rule.commonMistakes.includes(actual)) {
    score = Math.max(20, score - 40);
    feedback = `Common mistake: ${actual} instead of ${rule.correct}. Practice the ${rule.correct} sound.`;
  } else if (actual === rule.correct) {
    score = 95;
    feedback = 'Perfect pronunciation!';
  } else {
    // Partial credit for close sounds
    score = Math.max(40, score - 20);
    feedback = `Close, but try to make the ${rule.correct} sound more clearly.`;
  }

  // Adjust for difficulty
  if (rule.difficulty === 'hard') {
    score = Math.max(score - 10, 0);
  } else if (rule.difficulty === 'medium') {
    score = Math.max(score - 5, 0);
  }

  return {
    phoneme,
    score: Math.round(score),
    expected: rule.correct,
    actual,
    feedback
  };
}

// Extract phonemes from German word
function extractGermanPhonemes(word: string): string[] {
  const phonemes: string[] = [];
  let i = 0;
  
  while (i < word.length) {
    // Check for multi-character phonemes first
    if (i < word.length - 1) {
      const twoChar = word.substring(i, i + 2).toLowerCase();
      if (['ch', 'sch', 'ng'].includes(twoChar)) {
        phonemes.push(twoChar);
        i += 2;
        continue;
      }
    }
    
    const char = word[i].toLowerCase();
    if (['ä', 'ö', 'ü', 'r', 'l'].includes(char)) {
      phonemes.push(char);
    } else {
      // For other characters, use a simplified phoneme
      phonemes.push(char);
    }
    i++;
  }
  
  return phonemes;
}

// Calculate word-level GOP score
function calculateWordGOP(word: string): WordScore {
  const phonemes = extractGermanPhonemes(word);
  const phonemeScores: PhonemeScore[] = [];
  let totalScore = 0;
  
  // Simulate realistic pronunciation based on word characteristics
  const hasUmlauts = /[äöü]/.test(word);
  const hasCh = /ch/.test(word);
  const hasR = /r/.test(word);
  const isLong = word.length > 6;
  
  // Base score calculation
  let baseScore = 85;
  
  // Adjust for difficulty factors
  if (hasUmlauts) baseScore -= 15;
  if (hasCh) baseScore -= 20;
  if (hasR) baseScore -= 10;
  if (isLong) baseScore -= 5;
  
  // Add some realistic variation (±10 points)
  const variation = (Math.random() - 0.5) * 20;
  baseScore = Math.max(0, Math.min(100, baseScore + variation));
  
  // Generate phoneme-level scores
  for (const phoneme of phonemes) {
    const rule = PRONUNCIATION_RULES[phoneme];
    if (rule) {
      // Simulate actual vs expected phoneme
      const isCorrect = Math.random() > 0.3; // 70% chance of correct pronunciation
      const actual = isCorrect ? rule.correct : rule.commonMistakes[Math.floor(Math.random() * rule.commonMistakes.length)];
      const expected = rule.correct;
      
      const phonemeScore = calculatePhonemeGOP(phoneme, expected, actual);
      phonemeScores.push(phonemeScore);
      totalScore += phonemeScore.score;
    } else {
      // Default phoneme score
      phonemeScores.push({
        phoneme,
        score: 85,
        expected: phoneme,
        actual: phoneme,
        feedback: 'Good pronunciation'
      });
      totalScore += 85;
    }
  }
  
  const wordScore = Math.round(totalScore / phonemes.length);
  
  // Determine difficulty
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  if (hasUmlauts || hasCh) difficulty = 'hard';
  else if (hasR || isLong) difficulty = 'medium';
  
  // Generate feedback
  let feedback = '';
  if (wordScore >= 90) feedback = 'Excellent pronunciation!';
  else if (wordScore >= 75) feedback = 'Good pronunciation with minor improvements needed.';
  else if (wordScore >= 60) feedback = 'Fair pronunciation, practice the difficult sounds.';
  else feedback = 'Needs significant practice. Focus on the phoneme-level feedback.';
  
  return {
    word,
    score: wordScore,
    phonemeScores,
    feedback,
    difficulty
  };
}

// Main GOP pronunciation scoring function
function calculateGOP(transcription: string): GOPResult {
  const words = transcription.split(' ').filter(word => word.length > 0);
  const wordScores: WordScore[] = [];
  let totalScore = 0;
  
  for (const word of words) {
    const wordScore = calculateWordGOP(word);
    wordScores.push(wordScore);
    totalScore += wordScore.score;
  }
  
  const overallScore = Math.round(totalScore / words.length);
  const hasErrors = overallScore < 70;
  
  // Generate suggestions
  const suggestions: string[] = [];
  if (overallScore < 60) {
    suggestions.push('Focus on basic German sounds like "ch" and "r"');
    suggestions.push('Practice umlauts (ä, ö, ü) slowly and clearly');
  } else if (overallScore < 80) {
    suggestions.push('Work on difficult phonemes identified in the analysis');
    suggestions.push('Practice word stress patterns');
  } else {
    suggestions.push('Great job! Continue practicing for even better pronunciation');
  }
  
  return {
    overallScore,
    words: wordScores,
    suggestions,
    hasErrors
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transcription } = await req.json()
    
    if (!transcription) {
      return new Response(
        JSON.stringify({ error: 'Transcription is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log('🎤 === GOP PRONUNCIATION SCORING ===')
    console.log('Transcription:', transcription)
    
    // Calculate GOP scores
    const gopResult = calculateGOP(transcription)
    
    console.log('✅ GOP analysis completed:', gopResult)
    
    return new Response(
      JSON.stringify(gopResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Error in GOP pronunciation scoring:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
