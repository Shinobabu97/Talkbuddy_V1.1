import { SessionData } from '../types/sessionData';

export interface ConversationSummary {
  praise: string;
  vocabularyFeedback: string;
  pronunciationFeedback: string;
  grammarFeedback: string;
  testFeedback: string;
  encouragement: string;
  stats: {
    wordsLearned: number;
    wordsDeleted: number;
    testsCompleted: number;
    averageTestScore: number;
    pronunciationAttempts: number;
    pronunciationSuccessRate: number;
    averageSentenceScore: number;
    grammarMistakes: number;
    correctResponses: number;
    totalMessages: number;
  };
}

export function generateConversationSummary(sessionData: SessionData): ConversationSummary {
  // Calculate stats
  const wordsLearnedCount = sessionData.wordsLearned.length;
  const wordsDeletedCount = sessionData.wordsDeleted.length;
  const testsCompleted = sessionData.vocabularyTests.length;
  const averageTestScore = testsCompleted > 0
    ? Math.round(sessionData.vocabularyTests.reduce((sum, test) => sum + test.score, 0) / testsCompleted)
    : 0;
  const pronunciationAttempts = sessionData.pronunciationAttempts.length;
  const sentenceAttempts = sessionData.pronunciationAttempts.filter(a => a.type === 'sentence');
  const wordAttempts = sessionData.pronunciationAttempts.filter(a => a.type === 'word');

  const fallbackSentenceScore = sentenceAttempts.length > 0
    ? Math.round(sentenceAttempts[sentenceAttempts.length - 1].score)
    : 0;

  const lastSentenceScore = sessionData.lastSentenceScore ?? fallbackSentenceScore;
  const averageSentenceScore = lastSentenceScore;
  const latestSentenceScore = lastSentenceScore;

  const grammarMistakesCount = sessionData.grammarMistakes.length;
  const correctResponsesCount = sessionData.correctResponses;
  const totalMessagesCount = sessionData.totalMessages;

  // Generate praise
  const praise = correctResponsesCount > 0
    ? `Fantastic work! You had ${correctResponsesCount} correct ${correctResponsesCount === 1 ? 'response' : 'responses'} during this conversation. 🎉`
    : "Great effort in practicing German today!";

  // Vocabulary feedback
  let vocabularyFeedback = "";
  if (wordsLearnedCount > 0) {
    vocabularyFeedback = `You added ${wordsLearnedCount} new ${wordsLearnedCount === 1 ? 'word' : 'words'} to your vocabulary! `;
  }
  if (wordsDeletedCount > 0) {
    vocabularyFeedback += `You mastered ${wordsDeletedCount} ${wordsDeletedCount === 1 ? 'word' : 'words'} - amazing progress! 📚`;
  }
  if (!vocabularyFeedback) {
    vocabularyFeedback = "Try adding new words to your vocabulary to expand your German fluency.";
  }

  // Test feedback
  let testFeedback = "";
  if (testsCompleted > 0) {
    const lastTest = sessionData.vocabularyTests[sessionData.vocabularyTests.length - 1];
    testFeedback = `You completed ${testsCompleted} vocabulary ${testsCompleted === 1 ? 'test' : 'tests'} with an average score of ${averageTestScore}%! `;
    
    if (lastTest.incorrectWords.length > 0) {
      testFeedback += `Practice these words: ${lastTest.incorrectWords.slice(0, 3).join(", ")}${lastTest.incorrectWords.length > 3 ? '...' : ''}. 📝`;
    } else {
      testFeedback += "Perfect scores - you're mastering German vocabulary! 🌟";
    }
  } else {
    testFeedback = "Try testing your vocabulary knowledge with the Test Mode in the Vocab List!";
  }

  // Pronunciation feedback
  let pronunciationFeedback = "";
  const improvementThreshold = 65;
  const needsImprovementWords = Array.from(new Set(
    wordAttempts
      .filter(a => a.score < improvementThreshold)
      .map(a => a.word)
  ));

  const perfectedWords = Array.from(new Set(
    wordAttempts
      .filter(a => a.score >= improvementThreshold)
      .map(a => a.word)
  ));

  if (pronunciationAttempts > 0) {
    const sentenceSummaryPart = sentenceAttempts.length > 0
      ? `Your latest sentence scored ${latestSentenceScore}/100 and your sentence average is ${averageSentenceScore}/100.`
      : "Great job practicing pronunciation exercises.";

    pronunciationFeedback = sentenceSummaryPart;

    if (needsImprovementWords.length > 0) {
      const focusList = needsImprovementWords.slice(0, 5).join(', ');
      pronunciationFeedback += ` Focus on improving these words (<65%): ${focusList}.`;
    }

    if (perfectedWords.length > 0) {
      const masteredList = perfectedWords.slice(0, 5).join(', ');
      pronunciationFeedback += ` Fantastic work on these words (≥65%): ${masteredList}.`;
    }

    if (needsImprovementWords.length === 0 && perfectedWords.length === 0 && sentenceAttempts.length === 0) {
      pronunciationFeedback += " Keep using the word practice cards to see targeted tips.";
    }
  } else {
    pronunciationFeedback = "Try the pronunciation practice feature to improve your German accent!";
  }

  // Grammar feedback
  let grammarFeedback = "";
  if (grammarMistakesCount === 0) {
    grammarFeedback = "Your grammar is looking great! No mistakes detected. ✅";
  } else if (grammarMistakesCount <= 2) {
    grammarFeedback = `You had ${grammarMistakesCount} minor grammar ${grammarMistakesCount === 1 ? 'correction' : 'corrections'}. Review the suggestions to improve!`;
  } else {
    const commonMistakes = sessionData.grammarMistakes.slice(0, 2);
    grammarFeedback = `Work on these grammar points: ${commonMistakes.map(m => m.errorType).join(", ")}. Practice will make them second nature!`;
  }

  // Encouragement
  const encouragement = "You're making wonderful progress! Keep practicing, and you'll be fluent in no time. See you in your next conversation! 🚀";

  return {
    praise,
    vocabularyFeedback,
    pronunciationFeedback,
    grammarFeedback,
    testFeedback,
    encouragement,
    stats: {
      wordsLearned: wordsLearnedCount,
      wordsDeleted: wordsDeletedCount,
      testsCompleted,
      averageTestScore,
      pronunciationAttempts,
      pronunciationSuccessRate: latestSentenceScore,
      averageSentenceScore,
      grammarMistakes: grammarMistakesCount,
      correctResponses: correctResponsesCount,
      totalMessages: totalMessagesCount
    }
  };
}

