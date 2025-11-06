import React, { useState } from 'react';
import { Volume2, Languages, Mic, MicOff, Loader2 } from 'lucide-react';
import { germanTTS } from '../lib/tts';

interface SuggestedResponseCardProps {
  response: string;
  translation: string;
  responseId: string;
  onPractice: (responseId: string, response: string) => void;
  onStop?: (responseId: string, response: string) => void;
  isRecording?: boolean;
  isAnalyzing?: boolean;
  showAnalyze?: boolean;
  hasBeenAnalyzed?: boolean; // Add flag to show Practice button after analysis
  onAnalyze?: (responseId: string, response: string) => void;
}

export default function SuggestedResponseCard({
  response,
  translation,
  responseId,
  onPractice,
  onStop,
  isRecording = false,
  isAnalyzing = false,
  showAnalyze = false,
  hasBeenAnalyzed = false,
  onAnalyze
}: SuggestedResponseCardProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Debug logging for button visibility
  React.useEffect(() => {
    console.log(`🔍 [${responseId}] Button State:`, {
      isRecording,
      isAnalyzing,
      showAnalyze,
      hasBeenAnalyzed,
      practiceButtonShouldShow: !isRecording && !isAnalyzing && (hasBeenAnalyzed || !showAnalyze),
      analyzeButtonShouldShow: showAnalyze && !isRecording
    });
  }, [responseId, isRecording, isAnalyzing, showAnalyze, hasBeenAnalyzed]);

  const handleListen = async () => {
    setIsPlaying(true);
    try {
      // Use moderate pace (0.8) for clarity when playing suggested responses
      await germanTTS.speak(response, { rate: 0.8 });
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handlePractice = () => {
    onPractice(responseId, response);
  };

  const handleStop = () => {
    if (onStop) {
      onStop(responseId, response);
    } else {
      // Fallback: if onStop not provided, use onPractice (which handles stop case)
      onPractice(responseId, response);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-800 font-medium flex-1">{response}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Translate Button */}
        <button
          onClick={() => setShowTranslation(!showTranslation)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showTranslation
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          <span>{showTranslation ? 'Hide Translation' : 'Translate'}</span>
        </button>

        {/* Listen Button */}
        <button
          onClick={handleListen}
          disabled={isPlaying}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPlaying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
          <span>Listen</span>
        </button>

        {/* Practice Button - Show when not recording, not analyzing, and either analyzed (Practice Again) or no recording yet */}
        {!isRecording && !isAnalyzing && (hasBeenAnalyzed || !showAnalyze) && (
          <button
            onClick={handlePractice}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Mic className="h-3.5 w-3.5" />
            <span>{hasBeenAnalyzed ? 'Practice Again' : 'Practice'}</span>
          </button>
        )}

        {/* Recording State */}
        {isRecording && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium">Recording...</span>
          </div>
        )}

        {/* Stop Recording Button */}
        {isRecording && (
          <button
            onClick={handleStop}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            <MicOff className="h-3.5 w-3.5" />
            <span>Stop</span>
          </button>
        )}

        {/* Analyze Button - Only show when showAnalyze is true AND not recording */}
        {showAnalyze && !isRecording && (
          <button
            onClick={() => onAnalyze && onAnalyze(responseId, response)}
            disabled={isAnalyzing || hasBeenAnalyzed}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isAnalyzing || hasBeenAnalyzed
                ? 'bg-primary-300 text-primary-700 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        )}
      </div>

      {/* Translation Display */}
      {showTranslation && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 italic">{translation}</p>
        </div>
      )}
    </div>
  );
}

