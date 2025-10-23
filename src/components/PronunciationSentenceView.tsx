import React, { useState, useRef } from 'react';
import { Play, Mic, Volume2, Target, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { PronunciationData, PronunciationWord } from '../lib/analysisStorage';
import { germanTTS } from '../lib/tts';

interface PronunciationSentenceViewProps {
  pronunciationData: PronunciationData;
  sentence: string;
  onRepracticeWord?: (word: string) => void;
  onRepracticeSentence?: () => void;
  onPlayCorrectPronunciation?: () => void;
  isRecordingWord?: boolean;
  practicingWord?: string | null;
  onStopWordRecording?: () => void;
  isRecordingSentence?: boolean;
  globalPlaybackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

interface WordDetailsProps {
  word: PronunciationWord;
  onRepractice: () => void;
  onClose: () => void;
  isRecording?: boolean;
  onStopWordRecording?: () => void;
}

const WordDetails: React.FC<WordDetailsProps> = ({ word, onRepractice, onClose, isRecording = false, onStopWordRecording }) => {
  const [showSyllables, setShowSyllables] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h4 className="text-lg font-semibold text-gray-800">{word.word}</h4>
          <button
            onClick={() => germanTTS.speak(word.word)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
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

      {/* Score Display */}
      <div className="flex items-center space-x-3 mb-4">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(word.score)} ${getScoreColor(word.score)}`}>
          {word.score}/100
        </div>
        <span className="text-sm text-gray-600">
          {word.score >= 90 ? 'Excellent' : word.score >= 70 ? 'Good' : 'Needs Practice'}
        </span>
      </div>

      {/* Feedback */}
      <div className="mb-4">
        <p className="text-sm text-gray-700">{word.feedback}</p>
      </div>

      {/* Syllable Analysis */}
      {word.syllableAnalysis && word.syllableAnalysis.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowSyllables(!showSyllables)}
            className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showSyllables ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Syllable Analysis</span>
          </button>
          
          {showSyllables && (
            <div className="mt-2 space-y-2">
              {word.syllableAnalysis.map((syllable, index) => (
                <div key={index} className="bg-gray-50 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{syllable.syllable}</span>
                    <div className={`px-2 py-1 rounded text-xs ${getScoreBg(syllable.score)} ${getScoreColor(syllable.score)}`}>
                      {syllable.score}/100
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{syllable.feedback}</p>
                  {syllable.phoneticExpected && (
                    <div className="text-xs text-gray-500 mt-1">
                      Expected: {syllable.phoneticExpected}
                      {syllable.phoneticActual && (
                        <span> | Actual: {syllable.phoneticActual}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Improvement Tips */}
      {(word.improvementTips && word.improvementTips.length > 0) && (
        <div className="mb-4">
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center space-x-2 text-sm font-medium text-green-600 hover:text-green-800"
          >
            {showTips ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Improvement Tips</span>
          </button>
          
          {showTips && (
            <div className="mt-2 space-y-1">
              {word.improvementTips.map((tip, index) => (
                <div key={index} className="text-sm text-gray-700 bg-green-50 rounded p-2">
                  • {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Common Mistakes */}
      {word.commonMistakes && word.commonMistakes.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Common Mistakes:</h5>
          <div className="space-y-1">
            {word.commonMistakes.map((mistake, index) => (
              <div key={index} className="text-sm text-red-600 bg-red-50 rounded p-2">
                • {mistake}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sounds to Focus */}
      {word.soundsToFocus && word.soundsToFocus.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Focus on these sounds:</h5>
          <div className="flex flex-wrap gap-1">
            {word.soundsToFocus.map((sound, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {sound}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Repractice Button */}
      <button
        onClick={isRecording ? onStopWordRecording : onRepractice}
        className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isRecording ? (
          <>
            <Mic className="h-4 w-4" />
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4" />
            <span>Repractice this word</span>
          </>
        )}
      </button>
    </div>
  );
};

const PronunciationSentenceView: React.FC<PronunciationSentenceViewProps> = ({
  pronunciationData,
  sentence,
  onRepracticeWord,
  onRepracticeSentence,
  onPlayCorrectPronunciation,
  isRecordingWord = false,
  practicingWord,
  onStopWordRecording,
  isRecordingSentence = false,
  globalPlaybackSpeed = 1.0,
  onSpeedChange
}) => {
  const [selectedWord, setSelectedWord] = useState<PronunciationWord | null>(null);
  const [sentenceSpeed, setSentenceSpeed] = useState(globalPlaybackSpeed);

  // Check if this is a practice analysis
  const isPracticeAnalysis = pronunciationData.source === 'practice';

  const getWordColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getWordScore = (word: string): number => {
    // Try exact match first
    let wordData = pronunciationData.words.find(w => w.word === word);
    
    // If no exact match, try case-insensitive match
    if (!wordData) {
      wordData = pronunciationData.words.find(w => w.word.toLowerCase() === word.toLowerCase());
    }
    
    // If still no match, try removing punctuation
    if (!wordData) {
      const cleanWord = word.replace(/[.,!?;:]/, '');
      wordData = pronunciationData.words.find(w => w.word === cleanWord);
    }
    
    console.log(`Word: "${word}", Found: ${!!wordData}, Score: ${wordData?.score || 0}`);
    return wordData?.score || 0;
  };

  const handleWordClick = (word: string) => {
    const wordData = pronunciationData.words.find(w => w.word === word);
    if (wordData) {
      setSelectedWord(wordData);
    }
  };

  const handleRepracticeWord = () => {
    if (selectedWord && onRepracticeWord) {
      onRepracticeWord(selectedWord.word);
    }
    setSelectedWord(null);
  };

  const handleRepracticeSentence = () => {
    if (onRepracticeSentence) {
      onRepracticeSentence();
    }
  };

  const handlePlayCorrect = () => {
    if (onPlayCorrectPronunciation) {
      onPlayCorrectPronunciation();
    } else {
      // Fallback: use TTS directly
      germanTTS.speak(sentence);
    }
  };

  const handlePlayWord = async (word: string) => {
    try {
      await germanTTS.speak(word);
    } catch (error) {
      console.error('Error playing word:', error);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSentenceSpeed(newSpeed);
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
  };

  // Split sentence into words for display
  const words = sentence.split(' ').filter(word => word.length > 0);

  return (
    <div className="bg-white border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-700">Pronunciation Analysis</h3>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            pronunciationData.overallScore >= 90 ? 'bg-green-100 text-green-800' :
            pronunciationData.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            Overall: {pronunciationData.overallScore}/100
            {isPracticeAnalysis && <span className="ml-1 text-xs opacity-75">(Practice)</span>}
          </div>
        </div>
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
                return (
                  <div key={index} className="flex items-center gap-1">
                    <button
                      onClick={() => handleWordClick(cleanWord)}
                      className={`px-3 py-1 rounded-lg border text-sm font-medium hover:shadow-md transition-all ${getWordColor(score)}`}
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

          {/* Practice Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePlayCorrect}
              className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Volume2 className="h-4 w-4" />
              <span>Hear correct pronunciation</span>
            </button>
            
            <button
              onClick={handleRepracticeSentence}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                isRecordingSentence
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Mic className="h-4 w-4" />
              <span>{isRecordingSentence ? 'Stop Recording' : 'Practice sentence'}</span>
            </button>
          </div>

          {/* Speed Control */}
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-sm text-gray-600">Playback Speed:</span>
            <div className="flex items-center space-x-1">
              {[0.5, 0.75, 1.0, 1.25, 1.5].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-1 text-xs rounded ${
                    sentenceSpeed === speed
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Word Details Sidebar */}
        {selectedWord && (
          <div className="w-80">
            <WordDetails
              word={selectedWord}
              onRepractice={handleRepracticeWord}
              onClose={() => setSelectedWord(null)}
              isRecording={isRecordingWord && practicingWord === selectedWord.word}
              onStopRecording={onStopWordRecording}
            />
          </div>
        )}
      </div>

      {/* Suggestions */}
      {pronunciationData.suggestions && pronunciationData.suggestions.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 mb-2">Suggestions:</h4>
          <ul className="text-sm text-blue-600 space-y-1">
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
