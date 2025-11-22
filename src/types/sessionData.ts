export interface SessionData {
  sessionId: string;
  startTime: string;
  endTime?: string;
  
  // Vocabulary tracking
  wordsLearned: string[]; // Words added to vocabulary
  wordsDeleted: string[]; // Words marked as learned (deleted)
  vocabularyTests: {
    testId: string;
    timestamp: string;
    totalWords: number;
    correctWords: number;
    incorrectWords: string[];
    score: number; // percentage
  }[];
  wordsLearnedFromTests: number;
  
  // Pronunciation tracking
  pronunciationAttempts: {
    word: string;
    score: number;
    timestamp: string;
    isSuccess: boolean; // score >= 70
  }[];
  sentencePronunciationScores: {
    sentence: string;
    score: number;
    timestamp: string;
  }[];
  lastSentencePronunciationScore: number | null;
   
  // Grammar tracking
  grammarMistakes: {
    incorrectPhrase: string;
    correctedPhrase: string;
    errorType: string;
    timestamp: string;
  }[];
  
  // General interaction tracking
  correctResponses: number;
  totalMessages: number;
  conversationTopic?: string;
}

