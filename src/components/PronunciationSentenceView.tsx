import React, { useState, useEffect } from 'react';
import { Play, Mic, Volume2, Target, RotateCcw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { PronunciationData, PronunciationWord } from '../lib/analysisStorage';
import { germanTTS } from '../lib/tts';

interface PronunciationSentenceViewProps {
  pronunciationData: PronunciationData;
  sentence: string;
  onRepracticeWord?: (word: string) => void;
  onRepracticeSentence?: () => void;
  onPlayCorrectPronunciation?: () => void;
  onPracticeWord?: (word: string) => void;
  onPracticeSentence?: () => void;
  isRecordingWord?: (word: string) => boolean;
  isRecordingSentence?: boolean;
  onStopRecording?: () => void;
  onAnalyzeWord?: (word: string) => void;
  onAnalyzeSentence?: () => void;
  isWordReadyForAnalysis?: (word: string) => boolean;
  isSentenceReadyForAnalysis?: boolean;
  isWordAnalyzed?: (word: string) => boolean; // Add flag to check if word has been analyzed
}

type DimensionKey = keyof PronunciationWord['dimensions'];

const dimensionNames: Record<DimensionKey, string> = {
  soundAccuracy: 'Sound Accuracy',
  stressEmphasis: 'Stress & Emphasis',
  smoothness: 'Smoothness (Fluency)',
  correctSpeed: 'Correct Speed',
  intonationRhythm: 'Intonation & Rhythm',
  understandability: 'Understandability'
};

const dimensionFeedbackFallbacks: Record<
  DimensionKey,
  {
    positive: string;
    needs: string;
    tips: string[];
  }
> = {
  soundAccuracy: {
    positive: 'Many of the sounds were articulated clearly.',
    needs: 'Some consonants and vowels still need cleaner articulation.',
    tips: [
      'Practice the tricky sounds slowly, then increase speed.',
      'Compare your recording with a native pronunciation and mimic the mouth shape.'
    ]
  },
  stressEmphasis: {
    positive: 'You placed emphasis correctly in parts of the word.',
    needs: 'Stress slips off the target syllable in a few spots.',
    tips: [
      'Tap the beat while speaking to lock in the stressed syllable.',
      'Listen to native speakers and mirror where they add emphasis.'
    ]
  },
  smoothness: {
    positive: 'Several segments flowed smoothly.',
    needs: 'There are brief pauses that interrupt the flow.',
    tips: [
      'Practice linking the syllables without breaks.',
      'Record yourself and focus on reducing hesitations.'
    ]
  },
  correctSpeed: {
    positive: 'Most of the line matches a natural pace.',
    needs: 'The speed drifts slightly faster or slower in places.',
    tips: [
      'Count a steady beat to keep your pace consistent.',
      'Practice with a metronome-style timer to reinforce rhythm.'
    ]
  },
  intonationRhythm: {
    positive: 'You followed the German melody in several phrases.',
    needs: 'The pitch contour flattens in parts of the sentence.',
    tips: [
      'Exaggerate the rises and falls as you practice.',
      'Shadow a native recording to copy the rhythm and pitch.'
    ]
  },
  understandability: {
    positive: 'Most of the word remains understandable.',
    needs: 'A few syllables are hard to catch on the first listen.',
    tips: [
      'Focus on enunciating the less clear syllables.',
      'Open your mouth a bit more and slow down the tough parts first.'
    ]
  }
};

interface WordDetailsProps {
  word: PronunciationWord;
  onRepractice: () => void;
  onClose: () => void;
  onPracticeWord?: (word: string) => void;
  isRecording?: boolean;
  onStopRecording?: () => void;
  onAnalyzeWord?: (word: string) => void;
  isReadyForAnalysis?: boolean;
  hasBeenAnalyzed?: boolean; // Add flag to show Practice button after analysis
}

// Helper function to get RAG color based on score
const getRAGColor = (score: number) => {
  if (score < 70) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      progress: 'bg-red-500'
    };
  }
  if (score >= 70 && score < 90) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-200',
      progress: 'bg-amber-500'
    };
  }
  return {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    progress: 'bg-green-500'
  };
};

const WordDetails: React.FC<WordDetailsProps> = ({ 
  word, 
  onRepractice, 
  onClose,
  onPracticeWord,
  isRecording = false,
  onStopRecording,
  onAnalyzeWord,
  isReadyForAnalysis = false,
  hasBeenAnalyzed = false
}) => {
  const [showDimensions, setShowDimensions] = useState(false);
  const colors = getRAGColor(word.score);

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

      {/* 6 Dimensions - Always show header when dimensions exist */}
      {word.dimensions && (
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
                const dimKey = key as DimensionKey;
                const dimColors = getRAGColor(dimension.score);
                const fallback = dimensionFeedbackFallbacks[dimKey];
                const needsAttention = dimension.score < 90;

                const correctFeedback =
                  dimension.feedback.correct.length > 0
                    ? dimension.feedback.correct
                    : needsAttention
                    ? [fallback.positive]
                    : [];

                const needsFeedback = [...dimension.feedback.incorrect];
                if (needsAttention && needsFeedback.length === 0) {
                  needsFeedback.push(fallback.needs);
                }

                const improvementFeedback =
                  dimension.feedback.improvement.length > 0
                    ? dimension.feedback.improvement
                    : needsAttention
                    ? fallback.tips
                    : [];

                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {dimensionNames[dimKey]}
                      </span>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${dimColors.bg} ${dimColors.text}`}>
                        {dimension.score}/100
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${dimColors.progress}`}
                        style={{ width: `${dimension.score}%` }}
                      />
                    </div>

                    {/* Feedback */}
                    {correctFeedback.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-green-700">✓ Correct:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {correctFeedback.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {needsFeedback.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-red-700">✗ Needs Improvement:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {needsFeedback.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {improvementFeedback.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-blue-700">💡 How to Improve:</span>
                        <ul className="text-xs text-gray-600 mt-1 space-y-1">
                          {improvementFeedback.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Practice/Stop/Analyze buttons inside dimensions section */}
              {onPracticeWord && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  {isRecording ? (
                    <>
                      <div className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium">Recording...</span>
                      </div>
                      <button
                        onClick={onStopRecording}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Stop</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Practice button - Show when not recording, not analyzing, and either analyzed (Practice Again) or no recording yet */}
                      {!isReadyForAnalysis && (
                        <button
                          onClick={() => onPracticeWord(word.word)}
                          className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm"
                        >
                          <Mic className="h-4 w-4" />
                          <span>{hasBeenAnalyzed ? 'Practice Again' : 'Practice'}</span>
                        </button>
                      )}
                      {/* Analyse button - Only show when ready for analysis AND not recording */}
                      {isReadyForAnalysis && onAnalyzeWord && (
                        <button
                          onClick={() => onAnalyzeWord(word.word)}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                        >
                          <Target className="h-4 w-4" />
                          <span>Analyse</span>
                        </button>
                      )}
                      {isReadyForAnalysis && (
                        <div className="text-xs text-gray-500">
                          Recording saved. Click Analyse to update this word’s score.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SentenceDetailsProps {
  pronunciationData: PronunciationData;
  onClose: () => void;
}

const SentenceDetails: React.FC<SentenceDetailsProps> = ({ pronunciationData, onClose }) => {
  const [showDimensions, setShowDimensions] = useState(false);
  
  // Recalculate overall score from dimensions if available to ensure accuracy
  let overallScore = pronunciationData.overallScore;
  if (pronunciationData.sentenceDimensions) {
    const dimensionScores = [
      pronunciationData.sentenceDimensions.soundAccuracy?.score || 0,
      pronunciationData.sentenceDimensions.stressEmphasis?.score || 0,
      pronunciationData.sentenceDimensions.smoothness?.score || 0,
      pronunciationData.sentenceDimensions.correctSpeed?.score || 0,
      pronunciationData.sentenceDimensions.intonationRhythm?.score || 0,
      pronunciationData.sentenceDimensions.understandability?.score || 0
    ];
    const calculatedScore = Math.round(
      dimensionScores.reduce((sum, score) => sum + score, 0) / dimensionScores.length
    );
    // Always use calculated score from dimensions to ensure accuracy
    overallScore = calculatedScore;
    console.log('✅ Using calculated sentence score from dimensions:', {
      calculated: calculatedScore,
      stored: pronunciationData.overallScore,
      dimensions: dimensionScores
    });
  }
  
  const colors = getRAGColor(overallScore);

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
          Overall: {overallScore}/100
        </div>
        <span className="text-sm text-gray-600">
          Sentence Score: {overallScore}/100
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
                const dimKey = key as DimensionKey;
                const dimColors = getRAGColor(dimension.score);
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {dimensionNames[dimKey]}
                      </span>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${dimColors.bg} ${dimColors.text}`}>
                        {dimension.score}/100
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${dimColors.progress}`}
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
  onPlayCorrectPronunciation,
  onPracticeWord,
  onPracticeSentence,
  isRecordingWord = () => false,
  isRecordingSentence = false,
  onStopRecording,
  onAnalyzeWord,
  onAnalyzeSentence,
  isWordReadyForAnalysis = () => false,
  isSentenceReadyForAnalysis = false,
  isWordAnalyzed = () => false
}) => {
  const [selectedWord, setSelectedWord] = useState<PronunciationWord | null>(null);
  const [showSentenceDetails, setShowSentenceDetails] = useState(false);
  
  // Update selectedWord when pronunciationData changes (e.g., after Analyze is clicked)
  useEffect(() => {
    if (selectedWord) {
      const updatedWord = pronunciationData.words.find(w => 
        w.word.toLowerCase() === selectedWord.word.toLowerCase()
      );
      if (updatedWord) {
        setSelectedWord(updatedWord);
      }
    }
  }, [pronunciationData.words, selectedWord]);

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
      // If dimensions section is collapsed, keep it collapsed but ensure word is visible
    } else {
      // If word not found in current data, clear selection
      setSelectedWord(null);
    }
  };

  // Helper to get dimension-level feedback for word click
  const getWordClickFeedback = (word: PronunciationWord) => {
    const rating = word.score >= 90 ? 'Green' : word.score >= 70 ? 'Amber' : 'Red';
    const dimensions = word.dimensions || {};
    
    if (rating === 'Green') {
      // Show acknowledgements for what was done correctly
      const correctDimensions = Object.entries(dimensions)
        .filter(([_, dim]) => dim.score >= 90)
        .map(([key, dim]) => ({
          name: {
            soundAccuracy: 'Sound Accuracy',
            stressEmphasis: 'Stress & Emphasis',
            smoothness: 'Smoothness (Fluency)',
            correctSpeed: 'Correct Speed',
            intonationRhythm: 'Intonation & Rhythm',
            understandability: 'Understandability'
          }[key as keyof typeof dimensions] || key,
          feedback: dim.feedback.correct
        }))
        .filter(d => d.feedback.length > 0);
      
      return { type: 'acknowledgement', dimensions: correctDimensions };
    } else {
      // Show feedback for what could be improved (Amber and Red dimensions)
      // For Amber/Red overall rating, show Amber dimensions (70-89) for improvement
      const amberDimensions = Object.entries(dimensions)
        .filter(([_, dim]) => dim.score >= 70 && dim.score < 90)
        .map(([key, dim]) => ({
          name: {
            soundAccuracy: 'Sound Accuracy',
            stressEmphasis: 'Stress & Emphasis',
            smoothness: 'Smoothness (Fluency)',
            correctSpeed: 'Correct Speed',
            intonationRhythm: 'Intonation & Rhythm',
            understandability: 'Understandability'
          }[key as keyof typeof dimensions] || key,
          feedback: [...dim.feedback.incorrect, ...dim.feedback.improvement]
        }))
        .filter(d => d.feedback.length > 0);
      
      return { type: 'improvement', dimensions: amberDimensions };
    }
  };

  const handleSentenceScoreClick = () => {
    const rating = pronunciationData.overallScore >= 90 ? 'Green' : pronunciationData.overallScore >= 70 ? 'Amber' : 'Red';
    
    // Only show popup for Amber/Red ratings
    if (rating === 'Amber' || rating === 'Red') {
      setShowSentenceDetails(true);
    } else {
      // For Green, just show the details normally
      setShowSentenceDetails(true);
    }
  };

  // Helper to get sentence-level feedback for dimensions with Amber rating
  const getSentenceFeedback = () => {
    if (!pronunciationData.sentenceDimensions) return [];
    
    return Object.entries(pronunciationData.sentenceDimensions)
      .filter(([_, dim]) => dim.score >= 70 && dim.score < 90) // Amber dimensions
      .map(([key, dim]) => ({
        name: {
          soundAccuracy: 'Sound Accuracy',
          stressEmphasis: 'Stress & Emphasis',
          smoothness: 'Smoothness (Fluency)',
          correctSpeed: 'Correct Speed',
          intonationRhythm: 'Intonation & Rhythm',
          understandability: 'Understandability'
        }[key as keyof typeof pronunciationData.sentenceDimensions] || key,
        feedback: [...dim.feedback.incorrect, ...dim.feedback.improvement]
      }))
      .filter(d => d.feedback.length > 0);
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
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSentenceScoreClick}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium hover:shadow-md transition-all ${getRAGColor(pronunciationData.overallScore).bg} ${getRAGColor(pronunciationData.overallScore).text} ${getRAGColor(pronunciationData.overallScore).border}`}
            >
              Overall Sentence Score: {pronunciationData.overallScore}/100 - Click for Details
            </button>
            {onPracticeSentence && (
              <div className="flex items-center gap-2">
                {isRecordingSentence ? (
                  <button
                    onClick={onStopRecording}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <>
                    {!isSentenceReadyForAnalysis && (
                      <button
                        onClick={onPracticeSentence}
                        className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                      >
                        <Mic className="h-4 w-4" />
                        <span>Practice Sentence</span>
                      </button>
                    )}
                    {isSentenceReadyForAnalysis && onAnalyzeSentence && (
                      <button
                        onClick={onAnalyzeSentence}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <Target className="h-4 w-4" />
                        <span>Analyse</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
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
              onPracticeWord={onPracticeWord}
              isRecording={onPracticeWord ? isRecordingWord(selectedWord.word) : false}
              onStopRecording={onStopRecording}
              onAnalyzeWord={onAnalyzeWord}
              isReadyForAnalysis={onAnalyzeWord ? isWordReadyForAnalysis(selectedWord.word) : false}
              hasBeenAnalyzed={isWordAnalyzed(selectedWord.word)}
            />
            {/* Word Click Feedback Modal */}
            {(() => {
              const feedback = getWordClickFeedback(selectedWord);
              if (feedback.dimensions.length === 0) return null;
              
              return (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">
                    {feedback.type === 'acknowledgement' 
                      ? '✓ What You Did Well:' 
                      : '💡 Areas for Improvement:'}
                  </h5>
                  <div className="space-y-3">
                    {feedback.dimensions.map((dim, idx) => (
                      <div key={idx} className="border-l-2 border-primary-200 pl-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">{dim.name}:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {dim.feedback.map((item, itemIdx) => (
                            <li key={itemIdx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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
            {/* Sentence Feedback for Amber/Red ratings */}
            {(() => {
              const rating = pronunciationData.overallScore >= 90 ? 'Green' : pronunciationData.overallScore >= 70 ? 'Amber' : 'Red';
              if (rating === 'Green') return null;
              
              const feedback = getSentenceFeedback();
              if (feedback.length === 0) return null;
              
              return (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-amber-800 mb-3">
                    💡 Areas for Improvement at Sentence Level:
                  </h5>
                  <div className="space-y-3">
                    {feedback.map((dim, idx) => (
                      <div key={idx} className="border-l-2 border-amber-300 pl-3">
                        <p className="text-xs font-medium text-amber-800 mb-1">{dim.name}:</p>
                        <ul className="text-xs text-amber-700 space-y-1">
                          {dim.feedback.map((item, itemIdx) => (
                            <li key={itemIdx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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
