import React, { useState } from 'react';
import { Play, Mic, Volume2, Target, RotateCcw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { PronunciationData, PronunciationWord } from '../lib/analysisStorage';
import { germanTTS } from '../lib/tts';

interface PronunciationSentenceViewProps {
  pronunciationData: PronunciationData;
  sentence: string;
  onRepracticeWord?: (word: string) => void;
  onRepracticeSentence?: () => void;
  onPlayCorrectPronunciation?: () => void;
}

interface WordDetailsProps {
  word: PronunciationWord;
  onRepractice: () => void;
  onClose: () => void;
}

// Helper function to get RAG color based on score
const getRAGColor = (score: number) => {
  if (score < 70) return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
  if (score >= 70 && score < 90) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' };
  return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
};

const WordDetails: React.FC<WordDetailsProps> = ({ word, onRepractice, onClose }) => {
  const [showDimensions, setShowDimensions] = useState(true);
  const colors = getRAGColor(word.score);

  const dimensionNames = {
    soundAccuracy: 'Sound Accuracy',
    stressEmphasis: 'Stress & Emphasis',
    smoothness: 'Smoothness (Fluency)',
    correctSpeed: 'Correct Speed',
    intonationRhythm: 'Intonation & Rhythm',
    understandability: 'Understandability'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h4 className="text-lg font-semibold text-gray-800">{word.word}</h4>
          <button
            onClick={() => germanTTS.speak(word.word)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="Listen to pronunciation"
          >
            <Volume2 className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      {/* Overall Score */}
      <div className="flex items-center space-x-3 mb-4">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
          {word.score}/100
        </div>
        <span className="text-sm text-gray-600">
          {word.score >= 90 ? 'Excellent' : word.score >= 70 ? 'Good' : 'Needs Practice'}
        </span>
      </div>

      {/* Overall Feedback */}
      <div className="mb-4">
        <p className="text-sm text-gray-700">{word.feedback}</p>
      </div>

      {/* 6 Dimensions */}
      {showDimensions && word.dimensions && (
        <div className="space-y-3 mb-4">
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className="flex items-center space-x-2 text-sm font-medium text-primary-600 hover:text-primary-800 w-full text-left"
          >
            {showDimensions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Assessment Dimensions</span>
          </button>
          
          {showDimensions && (
            <div className="space-y-3 pl-4">
              {Object.entries(word.dimensions).map(([key, dimension]) => {
                const dimColors = getRAGColor(dimension.score);
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {dimensionNames[key as keyof typeof dimensionNames]}
                      </span>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${dimColors.bg} ${dimColors.text}`}>
                        {dimension.score}/100
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${dimColors.bg.replace('100', '500')}`}
                        style={{ width: `${dimension.score}%` }}
                      />
                    </div>

                    {/* Feedback */}
                    {dimension.feedback.correct.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-green-700">✓ Correct:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {dimension.feedback.correct.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {dimension.feedback.incorrect.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-red-700">✗ Needs Improvement:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {dimension.feedback.incorrect.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {dimension.feedback.improvement.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-blue-700">💡 How to Improve:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {dimension.feedback.improvement.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Practice Button */}
      <button
        onClick={onRepractice}
        className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Practice Again</span>
      </button>
    </div>
  );
};

interface SentenceDetailsProps {
  pronunciationData: PronunciationData;
  onClose: () => void;
}

const SentenceDetails: React.FC<SentenceDetailsProps> = ({ pronunciationData, onClose }) => {
  const [showDimensions, setShowDimensions] = useState(true);
  const colors = getRAGColor(pronunciationData.overallScore);

  const dimensionNames = {
    soundAccuracy: 'Sound Accuracy',
    stressEmphasis: 'Stress & Emphasis',
    smoothness: 'Smoothness (Fluency)',
    correctSpeed: 'Correct Speed',
    intonationRhythm: 'Intonation & Rhythm',
    understandability: 'Understandability'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Sentence-Level Assessment</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      {/* Overall Score */}
      <div className="flex items-center space-x-3 mb-4">
        <div className={`px-4 py-2 rounded-full text-lg font-medium ${colors.bg} ${colors.text}`}>
          Overall: {pronunciationData.overallScore}/100
        </div>
        <span className="text-sm text-gray-600">
          Sentence Score: {pronunciationData.sentenceScore}/100
        </span>
      </div>

      {/* Sentence-Level Dimensions */}
      {pronunciationData.sentenceDimensions && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className="flex items-center space-x-2 text-sm font-medium text-primary-600 hover:text-primary-800 w-full text-left"
          >
            {showDimensions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Assessment Dimensions</span>
          </button>
          
          {showDimensions && (
            <div className="space-y-3">
              {Object.entries(pronunciationData.sentenceDimensions).map(([key, dimension]) => {
                const dimColors = getRAGColor(dimension.score);
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {dimensionNames[key as keyof typeof dimensionNames]}
                      </span>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${dimColors.bg} ${dimColors.text}`}>
                        {dimension.score}/100
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${dimColors.bg.replace('100', '500')}`}
                        style={{ width: `${dimension.score}%` }}
                      />
                    </div>

                    {/* Feedback */}
                    {dimension.feedback.correct.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-green-700">✓ Correct:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {dimension.feedback.correct.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {dimension.feedback.incorrect.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-red-700">✗ Needs Improvement:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {dimension.feedback.incorrect.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {dimension.feedback.improvement.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-blue-700">💡 How to Improve:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {dimension.feedback.improvement.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-4 w-full py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
      >
        Close
      </button>
    </div>
  );
};

const PronunciationSentenceView: React.FC<PronunciationSentenceViewProps> = ({
  pronunciationData,
  sentence,
  onRepracticeWord,
  onRepracticeSentence,
  onPlayCorrectPronunciation
}) => {
  const [selectedWord, setSelectedWord] = useState<PronunciationWord | null>(null);
  const [showSentenceDetails, setShowSentenceDetails] = useState(false);

  const words = sentence.split(' ').filter(word => word.length > 0);

  const getWordScore = (wordText: string): number => {
    const wordData = pronunciationData.words.find(w => 
      w.word.toLowerCase() === wordText.toLowerCase().replace(/[.,!?;:]/, '')
    );
    return wordData?.score || 0;
  };

  const handleWordClick = (wordText: string) => {
    const cleanWord = wordText.replace(/[.,!?;:]/, '');
    const wordData = pronunciationData.words.find(w => 
      w.word.toLowerCase() === cleanWord.toLowerCase()
    );
    if (wordData) {
      setSelectedWord(wordData);
    }
  };

  const handleSentenceScoreClick = () => {
    setShowSentenceDetails(true);
  };

  return (
    <div className="bg-white border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-700">Pronunciation Analysis</h3>
      </div>

      <div className="flex gap-4">
        {/* Sentence Display */}
        <div className="flex-1">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Click on any word to see detailed analysis:</p>
            <div className="flex flex-wrap gap-1">
              {words.map((word, index) => {
                const cleanWord = word.replace(/[.,!?;:]/, '');
                const score = getWordScore(cleanWord);
                const colors = getRAGColor(score);
                return (
                  <div key={index} className="flex items-center gap-1">
                    <button
                      onClick={() => handleWordClick(cleanWord)}
                      className={`px-3 py-1 rounded-lg border text-sm font-medium hover:shadow-md transition-all ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {word}
                      {score > 0 && (
                        <span className="ml-1 text-xs">
                          ({score})
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Sentence Score */}
          <div className="mb-4">
            <button
              onClick={handleSentenceScoreClick}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium hover:shadow-md transition-all ${getRAGColor(pronunciationData.overallScore).bg} ${getRAGColor(pronunciationData.overallScore).text} ${getRAGColor(pronunciationData.overallScore).border}`}
            >
              Overall Sentence Score: {pronunciationData.overallScore}/100 - Click for Details
            </button>
          </div>

          {/* Practice Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onPlayCorrectPronunciation}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Volume2 className="h-4 w-4" />
              <span>Hear correct pronunciation</span>
            </button>
            
            {onRepracticeSentence && (
              <button
                onClick={onRepracticeSentence}
                className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
              >
                <Mic className="h-4 w-4" />
                <span>Practice sentence</span>
              </button>
            )}
          </div>
        </div>

        {/* Word Details Sidebar */}
        {selectedWord && (
          <div className="w-80">
            <WordDetails
              word={selectedWord}
              onRepractice={() => {
                if (onRepracticeWord) {
                  onRepracticeWord(selectedWord.word);
                }
                setSelectedWord(null);
              }}
              onClose={() => setSelectedWord(null)}
            />
          </div>
        )}
      </div>

      {/* Sentence Details Modal */}
      {showSentenceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <SentenceDetails
              pronunciationData={pronunciationData}
              onClose={() => setShowSentenceDetails(false)}
            />
          </div>
        </div>
      )}

      {/* Suggestions */}
      {pronunciationData.suggestions && pronunciationData.suggestions.length > 0 && (
        <div className="mt-4 p-3 bg-primary-50 rounded-lg">
          <h4 className="text-sm font-medium text-primary-700 mb-2">Suggestions:</h4>
          <ul className="text-sm text-primary-600 space-y-1">
            {pronunciationData.suggestions.map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PronunciationSentenceView;
