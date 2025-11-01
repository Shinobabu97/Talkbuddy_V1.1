import React from 'react';
import { X, BookOpen, Mic, CheckCircle, Award, TrendingUp } from 'lucide-react';
import { ConversationSummary } from '../utils/summaryGenerator';

interface ConversationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ConversationSummary;
}

const ConversationSummaryModal: React.FC<ConversationSummaryModalProps> = ({
  isOpen,
  onClose,
  summary
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Conversation Summary</h2>
              <p className="text-sm text-gray-600 mt-1">Great job on your German practice!</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Praise Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-start space-x-3">
              <Award className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-gray-800 font-medium">{summary.praise}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Vocabulary</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">{summary.stats.wordsLearned + summary.stats.wordsDeleted}</p>
              <p className="text-xs text-gray-600">words practiced</p>
            </div>

            {summary.stats.testsCompleted > 0 && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Tests</h3>
                </div>
                <p className="text-2xl font-bold text-purple-600">{summary.stats.averageTestScore}%</p>
                <p className="text-xs text-gray-600">average score</p>
              </div>
            )}

            {summary.stats.pronunciationAttempts > 0 && (
              <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Mic className="h-5 w-5 text-pink-600" />
                  <h3 className="font-semibold text-gray-900">Pronunciation</h3>
                </div>
                <p className="text-2xl font-bold text-pink-600">{summary.stats.pronunciationSuccessRate}%</p>
                <p className="text-xs text-gray-600">accuracy</p>
              </div>
            )}

            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Overall Accuracy</h3>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {summary.stats.pronunciationAttempts > 0
                  ? `${summary.stats.pronunciationSuccessRate}/100`
                  : '0/100'}
              </p>
              <p className="text-xs text-gray-600">pronunciation score</p>
            </div>
          </div>

          {/* Feedback Sections */}
          <div className="space-y-4">
            {/* Vocabulary Feedback */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                Vocabulary Progress
              </h3>
              <p className="text-sm text-gray-700">{summary.vocabularyFeedback}</p>
            </div>

            {/* Test Feedback */}
            {summary.stats.testsCompleted > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-purple-600" />
                  Test Results
                </h3>
                <p className="text-sm text-gray-700">{summary.testFeedback}</p>
              </div>
            )}

            {/* Pronunciation Feedback */}
            {summary.stats.pronunciationAttempts > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Mic className="h-4 w-4 mr-2 text-pink-600" />
                  Pronunciation
                </h3>
                <p className="text-sm text-gray-700">{summary.pronunciationFeedback}</p>
              </div>
            )}

            {/* Grammar Feedback */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Grammar
              </h3>
              <p className="text-sm text-gray-700">{summary.grammarFeedback}</p>
            </div>
          </div>

          {/* Encouragement */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-gray-800 font-medium text-center">{summary.encouragement}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            Start New Conversation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationSummaryModal;

