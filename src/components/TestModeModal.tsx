import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Award } from 'lucide-react';

interface WordDetails {
  word: string;
  meaning: string;
  context?: string;
}

interface TestModeModalProps {
  words: WordDetails[];
  onClose: () => void;
  onReturnToFlashcards: (incorrectWords?: WordDetails[]) => void;
}

interface Question {
  word: string;
  correctAnswer: string;
  options: string[];
}

const TestModeModal: React.FC<TestModeModalProps> = ({
  words,
  onClose,
  onReturnToFlashcards
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<boolean[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState({ correct: 0, total: 0, percentage: 0 });
  const [incorrectWords, setIncorrectWords] = useState<WordDetails[]>([]);

  // Generate questions only once on mount
  useEffect(() => {
    if (questions.length === 0) {
      generateQuestions();
    }
  }, []); // Empty dependency array - only run once

  const generateQuestions = () => {
    const newQuestions: Question[] = words.map(word => {
      // Get incorrect options from other words
      const otherMeanings = words
        .filter(w => w.word !== word.word)
        .map(w => w.meaning);
      
      // Shuffle and take 3 incorrect options
      const shuffledIncorrect = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);
      
      // Combine correct answer with incorrect options
      const allOptions = [word.meaning, ...shuffledIncorrect];
      
      // Shuffle all options
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

      return {
        word: word.word,
        correctAnswer: word.meaning,
        options: shuffledOptions
      };
    });

    setQuestions(newQuestions);
    setAnsweredQuestions(new Array(newQuestions.length).fill(false));
    setCorrectAnswers(new Array(newQuestions.length).fill(false));
  };

  const handleAnswerSelect = (answer: string) => {
    if (answeredQuestions[currentQuestionIndex]) return; // Already answered

    setSelectedAnswer(answer);
    const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
    
    console.log('✅ Answer Selected:', {
      question: questions[currentQuestionIndex].word,
      selected: answer,
      correct: questions[currentQuestionIndex].correctAnswer,
      isCorrect,
      questionIndex: currentQuestionIndex
    });

    // Update answered and correct arrays
    const newAnswered = [...answeredQuestions];
    newAnswered[currentQuestionIndex] = true;
    setAnsweredQuestions(newAnswered);

    const newCorrect = [...correctAnswers];
    newCorrect[currentQuestionIndex] = isCorrect;
    setCorrectAnswers(newCorrect);
    
    console.log('📝 Updated Arrays:', {
      answeredQuestions: newAnswered,
      correctAnswers: newCorrect
    });

    // Auto-advance after a delay
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
      } else {
        // Calculate final score before showing results
        const correct = newCorrect.filter(Boolean).length;
        const total = questions.length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        console.log('🏁 Test Complete - Final Score:', {
          correctAnswers: newCorrect,
          correct,
          total,
          percentage
        });
        
        const scoreData = { correct, total, percentage };
        setFinalScore(scoreData);
        
        // Calculate incorrect words for review
        const wrongWords: WordDetails[] = [];
        newCorrect.forEach((isCorrect, index) => {
          if (!isCorrect && questions[index]) {
            const word = words.find(w => w.word === questions[index].word);
            if (word) {
              wrongWords.push(word);
            }
          }
        });
        setIncorrectWords(wrongWords);
        console.log('❌ Incorrect words for review:', wrongWords);
        
        // Save score to localStorage with timestamp
        const testResult = {
          ...scoreData,
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString()
        };
        localStorage.setItem('lastTestScore', JSON.stringify(testResult));
        console.log('💾 Test score saved to localStorage:', testResult);
        
        setShowResults(true);
      }
    }, 1500);
  };

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = answeredQuestions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Award className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">Vocabulary Test</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        {!showResults ? (
          <div className="p-8">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{correctAnswers.filter(Boolean).length} correct</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="mb-8 text-center">
              <p className="text-lg text-gray-600 mb-4">What does this word mean?</p>
              <h3 className="text-5xl font-bold text-gray-900 mb-8">{currentQuestion.word}</h3>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                const showResult = isAnswered;

                let buttonClass = "w-full p-4 text-left rounded-lg border-2 transition-all ";
                
                if (showResult) {
                  if (isCorrect) {
                    buttonClass += "border-green-500 bg-green-50 ";
                  } else if (isSelected && !isCorrect) {
                    buttonClass += "border-red-500 bg-red-50 ";
                  } else {
                    buttonClass += "border-gray-200 bg-gray-50 ";
                  }
                } else {
                  buttonClass += "border-gray-300 bg-white hover:border-blue-500 hover:bg-blue-50 cursor-pointer ";
                }

                return (
                  <button
                    key={`${currentQuestionIndex}-${option}`}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg text-gray-900">{option}</span>
                      {showResult && isCorrect && (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Results Screen */
          <div className="p-8">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
                <Award className="h-12 w-12 text-white" />
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900">Test Complete!</h3>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8 space-y-4">
                <p className="text-lg text-gray-700">Your Score</p>
                <p className="text-6xl font-bold text-blue-600">{finalScore.percentage}%</p>
                <p className="text-xl text-gray-700">
                  {finalScore.correct} out of {finalScore.total} correct
                </p>
              </div>

              {/* Motivational Message */}
              <div className="pt-4">
                {finalScore.percentage === 100 && (
                  <p className="text-lg text-green-600 font-semibold">🎉 Perfect score! You're amazing! Ausgezeichnet!</p>
                )}
                {finalScore.percentage >= 90 && finalScore.percentage < 100 && (
                  <p className="text-lg text-blue-600 font-semibold">⭐ Fantastic! You're mastering German vocabulary!</p>
                )}
                {finalScore.percentage >= 80 && finalScore.percentage < 90 && (
                  <p className="text-lg text-blue-600 font-semibold">👏 Great job! You're doing really well!</p>
                )}
                {finalScore.percentage >= 70 && finalScore.percentage < 80 && (
                  <p className="text-lg text-yellow-600 font-semibold">💪 Good work! Keep it up and you'll be fluent soon!</p>
                )}
                {finalScore.percentage >= 60 && finalScore.percentage < 70 && (
                  <p className="text-lg text-yellow-600 font-semibold">📚 Nice effort! Review and try again to improve!</p>
                )}
                {finalScore.percentage >= 50 && finalScore.percentage < 60 && (
                  <p className="text-lg text-orange-600 font-semibold">🔄 Keep practicing! Every word brings you closer!</p>
                )}
                {finalScore.percentage < 50 && (
                  <p className="text-lg text-orange-600 font-semibold">💡 Don't give up! Review the flashcards and try again!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {showResults ? (
            <div className="flex gap-4">
              <button
                onClick={() => onReturnToFlashcards(incorrectWords.length > 0 ? incorrectWords : undefined)}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-all shadow-md hover:shadow-lg"
              >
                {incorrectWords.length > 0 
                  ? `Review ${incorrectWords.length} Incorrect Word${incorrectWords.length !== 1 ? 's' : ''}`
                  : 'Review Flashcards'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Return to Vocabulary Builder
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Return to Vocabulary Builder
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestModeModal;

