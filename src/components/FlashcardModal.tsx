import React, { useState } from 'react';
import { X, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';

interface WordDetails {
  word: string;
  meaning: string;
  context?: string;
  partOfSpeech?: string;
  gender?: string;
  number?: string;
  tense?: string;
  case?: string;
  pronunciationHint?: string;
}

interface FlashcardModalProps {
  words: WordDetails[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTestMode: () => void;
  onPlayAudio: (word: string) => void;
}

const FlashcardModal: React.FC<FlashcardModalProps> = ({
  words,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onTestMode,
  onPlayAudio
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const currentWord = words[currentIndex];
  const isLastWord = currentIndex === words.length - 1;
  const isFirstWord = currentIndex === 0;

  // Debug: Log current word details
  console.log('🃏 Flashcard current word (FULL OBJECT):', JSON.stringify(currentWord, null, 2));
  console.log('🃏 Grammar field check:', {
    hasPartOfSpeech: !!currentWord?.partOfSpeech,
    hasGender: !!currentWord?.gender,
    hasNumber: !!currentWord?.number,
    hasTense: !!currentWord?.tense,
    hasCase: !!currentWord?.case,
    hasPronunciation: !!currentWord?.pronunciationHint,
    actualPartOfSpeech: currentWord?.partOfSpeech,
    actualGender: currentWord?.gender,
    actualCase: currentWord?.case
  });

  // Safety check - if no current word, show error
  if (!currentWord || words.length === 0) {
    console.error('❌ FlashcardModal: No current word!', { currentWord, wordsLength: words.length, currentIndex });
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-display text-slate-800">Flashcards</span>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">No words available</p>
              <p className="text-sm">Add words to your vocabulary to practice with flashcards.</p>
              <p className="text-xs mt-4 text-red-500">Debug: words={words.length}, index={currentIndex}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    setIsFlipped(false);
    onNext();
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    onPrevious();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-display text-slate-800">
              Word {currentIndex + 1} of {words.length}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Flashcard Content */}
        <div className="flex-1 p-6 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-xs">
            {/* Flashcard - Taller than wide like a real card */}
            <div
              onClick={handleFlip}
              className="relative w-full cursor-pointer"
              style={{ aspectRatio: '2/3' }}
            >
              {!isFlipped ? (
                // Front of Card - German Word
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-center space-y-6">
                    <h2 className="text-4xl font-bold text-white drop-shadow-lg">{currentWord.word}</h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayAudio(currentWord.word);
                      }}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors shadow-lg border border-white/30"
                    >
                      <Volume2 className="h-5 w-5" />
                      <span>Listen</span>
                    </button>
                  </div>
                  <p className="text-sm text-white/80 mt-8 absolute bottom-6">Tap to see meaning</p>
                </div>
              ) : (
                // Back of Card - Translation with Grammar Details
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-400 to-cyan-500 rounded-2xl shadow-2xl p-6 flex flex-col overflow-y-auto transform transition-all duration-300">
                  <div className="space-y-3 flex-1">
                    <h2 className="text-2xl font-bold text-white text-center mb-4">{currentWord.word}</h2>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-2 text-white text-left">
                      <div className="pb-2 border-b border-white/20">
                        <strong className="text-sm">English Translation:</strong>
                        <p className="text-lg font-semibold mt-1">{currentWord.meaning}</p>
                      </div>
                      
                      {currentWord.partOfSpeech && (
                        <div>
                          <strong className="text-sm">Part of Speech:</strong>
                          <p className="text-base mt-1 capitalize">{currentWord.partOfSpeech}</p>
                        </div>
                      )}
                      
                      {currentWord.gender && (
                        <div>
                          <strong className="text-sm">Gender:</strong>
                          <p className="text-base mt-1 capitalize">{currentWord.gender}</p>
                        </div>
                      )}
                      
                      {currentWord.number && (
                        <div>
                          <strong className="text-sm">Number:</strong>
                          <p className="text-base mt-1 capitalize">{currentWord.number}</p>
                        </div>
                      )}
                      
                      {currentWord.tense && (
                        <div>
                          <strong className="text-sm">Tense:</strong>
                          <p className="text-base mt-1 capitalize">{currentWord.tense}</p>
                        </div>
                      )}
                      
                      {currentWord.case && (
                        <div>
                          <strong className="text-sm">Case:</strong>
                          <p className="text-base mt-1 capitalize">{currentWord.case}</p>
                        </div>
                      )}
                      
                      {currentWord.pronunciationHint && (
                        <div>
                          <strong className="text-sm">Pronunciation:</strong>
                          <p className="text-base mt-1 font-mono">{currentWord.pronunciationHint}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white/80 mt-4 text-center">Tap to flip back</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-slate-200 p-4 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between gap-2">
            {/* Previous Button */}
            <button
              onClick={handlePrevious}
              disabled={isFirstWord}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                isFirstWord
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            {/* Next or Test Button */}
            {isLastWord ? (
              <button
                onClick={onTestMode}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 text-sm font-semibold transition-all shadow-md"
              >
                <span>Take Test</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 text-sm font-semibold transition-all shadow-md"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardModal;

