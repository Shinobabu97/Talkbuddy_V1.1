export interface GrammarDetails {
  word: string;
  meaning: string;
  partOfSpeech?: string;
  gender?: string;
  number?: string;
  tense?: string;
  case?: string;
  pronunciationHint?: string;
  context?: string;
}

interface LanguageToolResponse {
  matches: Array<{
    rule: {
      category: {
        id: string;
        name: string;
      };
      id: string;
      description: string;
    };
    message: string;
    shortMessage: string;
    offset: number;
    length: number;
    context: {
      text: string;
      offset: number;
      length: number;
    };
    sentence: string;
    type: {
      typeName: string;
    };
    replacements: Array<{
      value: string;
    }>;
  }>;
  language: {
    name: string;
    code: string;
  };
}

/**
 * Fetches grammar details for a German word using LanguageTool API
 * @param germanWord The German word to analyze
 * @returns Promise with grammar details
 */
export async function fetchGrammarDetails(germanWord: string): Promise<Partial<GrammarDetails>> {
  try {
    console.log('🔍 Fetching grammar details for:', germanWord);
    
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        text: germanWord,
        language: 'de',
        enabledOnly: 'false',
      }),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`);
    }

    const data: LanguageToolResponse = await response.json();
    console.log('📊 LanguageTool response:', data);

    // Extract grammar information from the response
    const grammarDetails: Partial<GrammarDetails> = {};

    // Basic parsing - LanguageTool doesn't provide structured grammar data
    // We need to infer from the word structure and patterns
    
    // Detect gender from article
    if (germanWord.startsWith('der ')) {
      grammarDetails.gender = 'masculine';
      grammarDetails.partOfSpeech = 'noun';
    } else if (germanWord.startsWith('die ')) {
      grammarDetails.gender = 'feminine';
      grammarDetails.partOfSpeech = 'noun';
    } else if (germanWord.startsWith('das ')) {
      grammarDetails.gender = 'neuter';
      grammarDetails.partOfSpeech = 'noun';
    }

    // Detect plural
    if (germanWord.toLowerCase().includes('die') && !germanWord.startsWith('die ')) {
      grammarDetails.number = 'plural';
    } else {
      grammarDetails.number = 'singular';
    }

    // Default case to nominative if noun
    if (grammarDetails.partOfSpeech === 'noun') {
      grammarDetails.case = 'nominative';
    }

    // Generate basic pronunciation hint (simplified)
    grammarDetails.pronunciationHint = generatePronunciationHint(germanWord);

    console.log('✅ Extracted grammar details:', grammarDetails);
    return grammarDetails;

  } catch (error) {
    console.error('❌ Error fetching grammar details:', error);
    // Return empty object on error - word will still be saved with basic info
    return {};
  }
}

/**
 * Generates a basic pronunciation hint for German words
 * @param word The German word
 * @returns Phonetic hint
 */
function generatePronunciationHint(word: string): string {
  // This is a simplified pronunciation guide
  // In production, you'd use a proper phonetic translation API
  
  let hint = word.toLowerCase();
  
  // Basic German pronunciation rules
  hint = hint.replace(/sch/g, 'sh');
  hint = hint.replace(/ch/g, 'kh');
  hint = hint.replace(/ei/g, 'eye');
  hint = hint.replace(/eu/g, 'oy');
  hint = hint.replace(/ie/g, 'ee');
  hint = hint.replace(/ä/g, 'eh');
  hint = hint.replace(/ö/g, 'er');
  hint = hint.replace(/ü/g, 'ue');
  hint = hint.replace(/ß/g, 'ss');
  hint = hint.replace(/z/g, 'ts');
  hint = hint.replace(/v/g, 'f');
  hint = hint.replace(/w/g, 'v');
  
  return hint;
}

/**
 * Analyzes a German word to determine its part of speech
 * @param word The German word
 * @returns Part of speech
 */
export function inferPartOfSpeech(word: string): string {
  const cleanWord = word.replace(/^(der|die|das)\s+/i, '').trim();
  
  // Check for verb endings
  if (cleanWord.match(/en$/)) return 'verb';
  
  // Check for adjective endings
  if (cleanWord.match(/(ig|lich|bar|sam|haft|los)$/)) return 'adjective';
  
  // If starts with article, it's a noun
  if (word.match(/^(der|die|das)\s+/i)) return 'noun';
  
  // Check for capitalization (German nouns are capitalized)
  if (cleanWord[0] === cleanWord[0].toUpperCase()) return 'noun';
  
  return 'unknown';
}

