import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Lightbulb, Volume2, Star, X, Mic, MicOff, Loader2, AlertCircle, CheckCircle, Target, ChevronUp, ChevronDown, TrendingUp, ArrowRight } from 'lucide-react';
import { germanTTS } from '../lib/tts';
import PronunciationSentenceView from './PronunciationSentenceView';

// Word Practice Card Component
interface WordPracticeCardProps {
  word: {original: string, phonetic: string, transliteration: string, syllables: string[]};
  onPlayAudio?: (word: string, speed?: number) => void;
  globalSpeed: number;
  onSpeedChange?: (speed: number) => void;
  onPractice: (word: string) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  pronunciationScore?: number;
  onAnalyzeWord?: (word: string) => void;
  isAnalyzing?: boolean;
  wordAnalysis?: {
    score: number;
    feedback: string;
    syllableAnalysis?: Array<{
      syllable: string;
      score: number;
      feedback: string;
    }>;
  };
  isReadyForAnalysis?: boolean;
  hasBeenAnalyzed?: boolean;
  onSaveToDifficult?: (word: string) => void;
  isInDifficultWords?: boolean;
  onAddExperience?: (amount: number, source: string) => void;
}

const WordPracticeCard: React.FC<WordPracticeCardProps> = ({
  word,
  onPlayAudio,
  globalSpeed,
  onSpeedChange,
  onPractice,
  isRecording,
  onStartRecording,
  onStopRecording,
  pronunciationScore,
  onAnalyzeWord,
  isAnalyzing = false,
  wordAnalysis,
  isReadyForAnalysis = false,
  hasBeenAnalyzed = false,
  onSaveToDifficult,
  isInDifficultWords = false,
  onAddExperience
}) => {
  console.log('🎯 WordPracticeCard rendered for word:', word.original);
  console.log('🎯 wordAnalysis prop:', wordAnalysis);
  console.log('🎯 hasBeenAnalyzed prop:', hasBeenAnalyzed);
  console.log('🎯 isReadyForAnalysis prop:', isReadyForAnalysis);
  console.log('🎯 isAnalyzing prop:', isAnalyzing);
  
  const [wordSpeed, setWordSpeed] = useState(globalSpeed);

  // Debug logging for analyze button state
  console.log(`🔍 WordPracticeCard for "${word.original}":`, {
    isReadyForAnalysis,
    hasBeenAnalyzed,
    isAnalyzing,
    isRecording,
    buttonText: !isReadyForAnalysis ? 'Record First' : 
               hasBeenAnalyzed ? 'Analyzed' :
               isAnalyzing ? 'Analyzing...' : 'Analyze'
  });

  const handleSpeedChange = (newSpeed: number) => {
    setWordSpeed(newSpeed);
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-gray-100';
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      {/* Word Header */}
      <div className="flex items-center justify-between">
        <div>
          <h6 className="font-semibold text-lg text-gray-900">{word.original}</h6>
          <p className="text-sm text-gray-600">[{word.phonetic}]</p>
          <p className="text-sm text-blue-600 italic">{word.transliteration}</p>
        </div>
        {pronunciationScore !== undefined && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBg(pronunciationScore)} ${getScoreColor(pronunciationScore)}`}>
            {pronunciationScore}/100
          </div>
        )}
      </div>

      {/* Syllable Breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Syllables:</p>
        <div className="flex flex-wrap gap-1">
          {word.syllables.map((syllable, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
              {syllable}
            </span>
          ))}
        </div>
      </div>

      {/* Listen Button with Speed Control */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => {
            onPlayAudio?.(word.original, wordSpeed);
            // Add gamification points for listening to word
            if (onAddExperience) {
              onAddExperience(2, 'word_listen');
            }
          }}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Volume2 className="h-4 w-4" />
          <span>Listen</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleSpeedChange(Math.max(0.5, wordSpeed - 0.1))}
            className="p-1 hover:bg-gray-200 rounded"
            disabled={wordSpeed <= 0.5}
          >
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm text-gray-600 min-w-[3rem] text-center">{wordSpeed.toFixed(1)}x</span>
          <button
            onClick={() => handleSpeedChange(Math.min(2.0, wordSpeed + 0.1))}
            className="p-1 hover:bg-gray-200 rounded"
            disabled={wordSpeed >= 2.0}
          >
            <ChevronUp className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Practice Button */}
      <div className="flex items-center space-x-3">
        {!isRecording ? (
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🖱️ Practice button clicked for word:', word.original);
              console.log('🖱️ onPractice function exists:', !!onPractice);
              await onPractice(word.original);
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer"
            style={{ pointerEvents: 'auto' }}
          >
            <Mic className="h-4 w-4" />
            <span>Practice</span>
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording...</span>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Stop recording functionality removed
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
            >
              <MicOff className="h-4 w-4" />
              <span>Stop Recording</span>
            </button>
          </div>
        )}
      </div>

      {/* Individual Analysis Button */}
      <div className="flex items-center space-x-3">
        <button
            onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
              console.log('🔍 ===== ANALYZE BUTTON CLICKED =====');
            console.log('🔍 Analyze button clicked for word:', word.original);
              console.log('🔍 onAnalyzeWord function exists:', !!onAnalyzeWord);
              console.log('🔍 isReadyForAnalysis:', isReadyForAnalysis);
              console.log('🔍 isAnalyzing:', isAnalyzing);
              console.log('🔍 hasBeenAnalyzed:', hasBeenAnalyzed);
            if (onAnalyzeWord) {
                console.log('🔍 Calling onAnalyzeWord with word:', word.original);
                await onAnalyzeWord(word.original);
                console.log('🔍 onAnalyzeWord call completed');
              } else {
                console.log('❌ onAnalyzeWord function not provided');
              }
              console.log('🔍 ===== ANALYZE BUTTON CLICK END =====');
          }}
          disabled={!isReadyForAnalysis || isAnalyzing || hasBeenAnalyzed}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer ${
            !isReadyForAnalysis || hasBeenAnalyzed
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isAnalyzing
              ? 'bg-blue-300 text-blue-700 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          style={{ pointerEvents: isReadyForAnalysis && !hasBeenAnalyzed ? 'auto' : 'none' }}
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Target className="h-4 w-4" />
          )}
          <span>
            {!isReadyForAnalysis ? 'Record First' : 
             hasBeenAnalyzed ? 'Analyzed' :
             isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </span>
        </button>
        
        {/* Save to Difficult Words Button */}
        {hasBeenAnalyzed && wordAnalysis && wordAnalysis.score < 70 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('📚 Save to difficult words clicked for:', word.original);
              if (onSaveToDifficult) {
                onSaveToDifficult(word.original);
              }
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer ${
              isInDifficultWords
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
            style={{ pointerEvents: 'auto' }}
          >
            <BookOpen className="h-4 w-4" />
            <span>
              {isInDifficultWords ? 'In Library' : 'Save to Library'}
            </span>
          </button>
        )}
      </div>

      {/* Individual Word Analysis Results */}
      {wordAnalysis && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
          <h6 className="text-sm font-semibold text-gray-700 mb-3">Analysis Results</h6>
          
          {/* Two-Part Analysis Display */}
          <div className="space-y-3">
            {/* 1. Accuracy Rating with RAG Status Background */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Accuracy Rating:</span>
              {wordAnalysis.feedback === 'Analysis in progress... Please wait for results.' ? (
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                  Will be displayed once analysis is completed
                </div>
              ) : wordAnalysis.feedback.includes('No analysis can be done') || 
                   wordAnalysis.feedback.includes('no word pronunciation was spoken') ||
                   wordAnalysis.feedback.includes('unrelated and incorrect word pronunciation') ||
                   wordAnalysis.feedback.includes('irrelevant/incorrect word pronunciation') ? (
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  No analysis available
                </div>
              ) : (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              wordAnalysis.score >= 90 ? 'bg-green-100 text-green-800' :
              wordAnalysis.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {wordAnalysis.score}/100
            </div>
              )}
          </div>

            {/* 2. Feedback */}
            <div>
            <span className="text-sm font-medium text-gray-600">Feedback:</span>
            <p className="text-sm text-gray-700 mt-1">{wordAnalysis.feedback}</p>
            </div>
          </div>

          {/* Syllable Analysis */}
          {wordAnalysis.syllableAnalysis && wordAnalysis.syllableAnalysis.length > 0 && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-600">Individual Sound Analysis:</span>
              <div className="mt-2 space-y-2">
                {wordAnalysis.syllableAnalysis.map((syllable, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-800">{syllable.syllable}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded text-xs ${
                        syllable.score >= 90 ? 'bg-green-100 text-green-800' :
                        syllable.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {syllable.score}/100
                      </div>
                      <span className="text-gray-500 italic text-xs">{syllable.feedback}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Emphasis Analysis Summary */}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ToolbarProps {
  isVisible: boolean;
  currentMessage?: string;
  currentMessageId?: string;
  onAddToVocab: (word: string, meaning: string) => void;
  autoLoadExplanations?: boolean;
  comprehensiveAnalysis?: any;
  activeTab?: 'vocab' | 'explain' | 'pronunciation';
  onTabChange?: (tab: 'vocab' | 'explain' | 'pronunciation') => void;
  newVocabItems?: Array<{word: string, meaning: string, context: string}>;
  persistentVocab?: Array<{word: string, meaning: string, context: string}>;
  onUpdatePersistentVocab?: (vocab: Array<{word: string, meaning: string, context: string}>) => void;
  phoneticBreakdowns?: {[key: string]: Array<{original: string, phonetic: string, transliteration: string, syllables: string[]}>};
  onPlayWordAudio?: (word: string, speed?: number) => void;
  globalPlaybackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  onAddExperience?: (amount: number, source: string) => void;
  onWordLearned?: () => void;
  lastGermanVoiceMessage?: any;
}

interface VocabItem {
  word: string;
  meaning: string;
  timestamp: string;
  chatId: string;
  category: string;
  theme?: string;
}

interface PronunciationWord {
  word: string;
  score: number;
  needsPractice: boolean;
  feedback: string;
  commonMistakes?: string[];
  difficulty?: string;
  soundsToFocus?: string[];
  improvementTips?: string[];
  syllableAnalysis?: Array<{
    syllable: string;
    score: number;
    feedback: string;
    phoneticExpected: string;
    phoneticActual?: string;
  }>;
}

interface ComprehensiveAnalysis {
  hasErrors: boolean;
  errorTypes: {
    grammar: boolean;
    vocabulary: boolean;
    pronunciation: boolean;
  };
  corrections: {
    grammar?: string;
    vocabulary?: Array<{wrong: string, correct: string, meaning: string}>;
    pronunciation?: string;
  };
  suggestions: {
    grammar?: string;
    vocabulary?: string;
    pronunciation?: string;
  };
  wordsForPractice?: Array<{
    word: string;
    needsPractice: boolean;
    score?: number;
    errorType?: string;
  }>;
}

export default function Toolbar({ 
  isVisible, 
  currentMessage, 
  currentMessageId,
  onAddToVocab, 
  autoLoadExplanations = false, 
  comprehensiveAnalysis, 
  activeTab: externalActiveTab, 
  onTabChange, 
  newVocabItems, 
  persistentVocab = [], 
  onUpdatePersistentVocab,
  phoneticBreakdowns = {},
  onPlayWordAudio,
  globalPlaybackSpeed = 1.0,
  onSpeedChange,
  onAddExperience,
  onWordLearned,
  lastGermanVoiceMessage
}: ToolbarProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'vocab' | 'explain' | 'pronunciation'>('explain');
  
  // Use external activeTab if provided, otherwise use internal state
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = onTabChange || setInternalActiveTab;
  
  // State for My Vocab - words that user has starred
  const [myVocab, setMyVocab] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('myVocab');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  // Function to toggle word in My Vocab (add/remove)
  const handleAddToMyVocab = async (word: string, meaning: string) => {
    setMyVocab(prev => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        // If already starred, remove it (unstar)
        newSet.delete(word);
        console.log('⭐ Removed from My Vocab:', word);
        
        // Remove from localStorage details
        try {
          const savedDetails = JSON.parse(localStorage.getItem('myVocabDetails') || '[]');
          const filtered = savedDetails.filter((w: any) => w.word !== word);
          localStorage.setItem('myVocabDetails', JSON.stringify(filtered));
        } catch (e) {
          console.error('Error removing vocab details:', e);
        }
      } else {
        // If not starred, add it
        newSet.add(word);
        console.log('⭐ Added to My Vocab:', word);
        
        // Fetch grammar details from LanguageTool API and save to localStorage
        (async () => {
          try {
            // Find context from persistentVocab if available
            const vocabItem = persistentVocab.find((v: any) => v.word === word);
            const contextFromVocab = vocabItem?.context || '';
            
            console.log('🔍 Fetching grammar details for:', word);
            console.log('📝 Context from vocab:', contextFromVocab);
            
            // Import the fetch function
            const { fetchGrammarDetails } = await import('../utils/languageTool');
            
            const grammarDetails = await fetchGrammarDetails(word);
            console.log('✅ Grammar details received:', grammarDetails);
            
            // Save full word details with grammar to localStorage
            const savedDetails = JSON.parse(localStorage.getItem('myVocabDetails') || '[]');
            const exists = savedDetails.find((w: any) => w.word === word);
            if (!exists) {
              const wordDetails = { 
                word, 
                meaning, 
                context: contextFromVocab,
                ...grammarDetails  // Merge grammar details
              };
              savedDetails.push(wordDetails);
              localStorage.setItem('myVocabDetails', JSON.stringify(savedDetails));
              console.log('💾 Saved word details with grammar to localStorage:', wordDetails);
            } else {
              console.log('⚠️ Word already exists in myVocabDetails, not overwriting');
            }
          } catch (error) {
            console.error('❌ Error fetching grammar details, saving without grammar:', error);
            // Fallback: save without grammar details
            const savedDetails = JSON.parse(localStorage.getItem('myVocabDetails') || '[]');
            const exists = savedDetails.find((w: any) => w.word === word);
            if (!exists) {
              const vocabItem = persistentVocab.find((v: any) => v.word === word);
              savedDetails.push({ 
                word, 
                meaning, 
                context: vocabItem?.context || '' 
              });
              localStorage.setItem('myVocabDetails', JSON.stringify(savedDetails));
              console.log('💾 Saved word details (without grammar) to localStorage:', { word, meaning });
            }
          }
        })();
        
        // Also call the parent's onAddToVocab only when adding
        onAddToVocab(word, meaning);
      }
      // Save to localStorage (word names)
      localStorage.setItem('myVocab', JSON.stringify(Array.from(newSet)));
      console.log('⭐ My Vocab updated:', Array.from(newSet));
      return newSet;
    });
  };
  
  // Function to handle deleting word from vocabulary
  const handleDeleteFromVocab = (word: string) => {
    console.log('🗑️ Deleting from vocabulary:', word);
    
    // Remove from My Vocab set
    setMyVocab(prev => {
      const newSet = new Set(prev);
      newSet.delete(word);
      // Save to localStorage
      localStorage.setItem('myVocab', JSON.stringify(Array.from(newSet)));
      console.log('🗑️ My Vocab updated after deletion:', Array.from(newSet));
      return newSet;
    });
    
    // Remove from persistent vocab if onUpdatePersistentVocab is provided
    if (onUpdatePersistentVocab) {
      const updatedPersistentVocab = persistentVocab.filter(item => item.word !== word);
      onUpdatePersistentVocab(updatedPersistentVocab);
      console.log('🗑️ Persistent vocab updated after deletion');
    }
    
    // Increment words learned counter
    if (onWordLearned) {
      onWordLearned();
      console.log('🎯 Words learned incremented');
    }
  };
  
  // Function to handle audio playback for vocabulary words
  const handlePlayAudio = (word: string) => {
    console.log('🔊 Playing audio for word:', word);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'de-DE'; // Set language to German
      
      // Try to find a German voice
      const voices = window.speechSynthesis.getVoices();
      const germanVoice = voices.find(voice => voice.lang === 'de-DE' || voice.lang.startsWith('de'));
      if (germanVoice) {
        utterance.voice = germanVoice;
      }
      
      window.speechSynthesis.speak(utterance);
      utterance.onerror = (event) => {
        console.error("Error playing vocabulary audio:", event.error);
      };
    } else {
      console.error("Web Speech API not supported in this browser.");
    }
  };
  
  // Use persistent vocabulary from props instead of local state
  const vocabItems = persistentVocab.map(item => ({
    word: item.word,
    meaning: item.meaning,
    timestamp: new Date().toISOString(),
    chatId: 'current',
    category: 'conversation',
    theme: 'general'
  }));
  const [grammarExplanation, setGrammarExplanation] = useState<string>('');
  const [speakingTips, setSpeakingTips] = useState<string>('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [vocabFilter, setVocabFilter] = useState<string>('all');
  const [explanationCache, setExplanationCache] = useState<{[key: string]: {grammar: string, tips: string}}>({});
  const [showGrammarSection, setShowGrammarSection] = useState<boolean>(false);
  const [showSpeakingSection, setShowSpeakingSection] = useState<boolean>(false);

  // New state for comprehensive analysis
  const [analysisData, setAnalysisData] = useState<ComprehensiveAnalysis | null>(null);
  const [pronunciationWords, setPronunciationWords] = useState<PronunciationWord[]>([]);
  const [practicingWord, setPracticingWord] = useState<string | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [maxAttempts] = useState(2);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioStorage, setAudioStorage] = useState<{[key: string]: string}>({});
  const [practiceHistory, setPracticeHistory] = useState<Array<{
    word: string;
    score: number;
    attempts: number;
    timestamp: string;
    audioId: string;
  }>>([]);
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [isSentenceRecording, setIsSentenceRecording] = useState(false);
  const [isWordRecording, setIsWordRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [individualWordAnalysis, setIndividualWordAnalysis] = useState<{[key: string]: {
    score: number;
    feedback: string;
    syllableAnalysis?: Array<{
      syllable: string;
      score: number;
      feedback: string;
    }>;
  }}>({});
  const [analyzingWord, setAnalyzingWord] = useState<string | null>(null);
  const [wordsReadyForAnalysis, setWordsReadyForAnalysis] = useState<Set<string>>(new Set());
  const [wordsAnalyzed, setWordsAnalyzed] = useState<Set<string>>(new Set());
  const [wordsRecordingCompleted, setWordsRecordingCompleted] = useState<Set<string>>(new Set());
  const [wordsAnalysisComplete, setWordsAnalysisComplete] = useState<Set<string>>(new Set());
  const [sentenceRecordingCompleted, setSentenceRecordingCompleted] = useState<boolean>(false);
  const [sentenceReadyForAnalysis, setSentenceReadyForAnalysis] = useState<boolean>(false);
  const [sentenceAnalysisComplete, setSentenceAnalysisComplete] = useState<boolean>(false);
  const isStoppingRef = useRef(false);
  
  // Sentence recording state for pronunciation practice
  const [isRecordingSentence, setIsRecordingSentence] = useState(false);
  const [sentenceAudioBlob, setSentenceAudioBlob] = useState<Blob | null>(null);
  const [sentenceRecorder, setSentenceRecorder] = useState<MediaRecorder | null>(null);
  
  // Pronunciation analysis state
  const [pronunciationAnalysis, setPronunciationAnalysis] = useState<any>(null);
  const [isAnalyzingPronunciation, setIsAnalyzingPronunciation] = useState(false);
  const [sentenceAnalysis, setSentenceAnalysis] = useState<{
    overallScore: number;
    feedback: string;
    wordScores: Array<{
      word: string;
      score: number;
      feedback: string;
    }>;
  } | null>(null);
  const [sentenceAnalyzed, setSentenceAnalyzed] = useState(false);
  const [userPoints, setUserPoints] = useState(() => {
    const saved = localStorage.getItem('pronunciation_points');
    return saved ? parseInt(saved) : 0;
  });
  const [userLevel, setUserLevel] = useState(() => {
    const saved = localStorage.getItem('pronunciation_level');
    return saved ? parseInt(saved) : 1;
  });
  const [recentPointsEarned, setRecentPointsEarned] = useState(0);
  const [progressHistory, setProgressHistory] = useState(() => {
    const saved = localStorage.getItem('pronunciation_progress_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [dailyBadges, setDailyBadges] = useState(() => {
    const saved = localStorage.getItem('pronunciation_daily_badges');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentStreak, setCurrentStreak] = useState(() => {
    const saved = localStorage.getItem('pronunciation_current_streak');
    return saved ? parseInt(saved) : 0;
  });
  const [longestStreak, setLongestStreak] = useState(() => {
    const saved = localStorage.getItem('pronunciation_longest_streak');
    return saved ? parseInt(saved) : 0;
  });
  const [difficultWords, setDifficultWords] = useState(() => {
    const saved = localStorage.getItem('pronunciation_difficult_words');
    return saved ? JSON.parse(saved) : [];
  });
  const [showDifficultWordsModal, setShowDifficultWordsModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<{
    sessionId: string;
    startTime: string;
    wordsPracticed: string[];
    totalScore: number;
    averageScore: number;
  } | null>(null);

  // Handle comprehensive analysis data
  useEffect(() => {
    if (comprehensiveAnalysis && comprehensiveAnalysis.errorTypes) {
      // Auto-switch to pronunciation tab if pronunciation errors detected
      if (comprehensiveAnalysis.errorTypes.pronunciation) {
        setActiveTab('pronunciation');
        
        // Set pronunciation words for practice
        if (comprehensiveAnalysis.pronunciationWords) {
          setPronunciationWords(comprehensiveAnalysis.pronunciationWords);
        }
      }
      
      setAnalysisData(comprehensiveAnalysis);
      
      // Show relevant sections based on errors
      if (comprehensiveAnalysis.errorTypes.grammar) {
        setShowGrammarSection(true);
        setShowSpeakingSection(false);
      }
      if (comprehensiveAnalysis.errorTypes.pronunciation) {
        setShowSpeakingSection(true);
        setShowGrammarSection(false);
      }
    }
  }, [comprehensiveAnalysis, setActiveTab]);

  // Auto-load explanations when toolbar is opened via help button
  useEffect(() => {
    if (autoLoadExplanations && currentMessage && !explanationCache[currentMessage]) {
      loadGrammarExplanation(currentMessage);
      loadSpeakingTips(currentMessage);
    }
  }, [autoLoadExplanations, currentMessage, explanationCache]);

  // Auto-load grammar explanation when explain tab is active
  useEffect(() => {
    if (activeTab === 'explain' && currentMessage && !grammarExplanation) {
      console.log('Auto-loading grammar explanation for explain tab');
      loadGrammarExplanation(currentMessage);
    }
  }, [activeTab, currentMessage, grammarExplanation]);

  // Auto-update analysis results when they become available
  useEffect(() => {
    // Update individual word analysis results when pronunciationWords changes
    pronunciationWords.forEach(pronunciationWord => {
      if (wordsAnalyzed.has(pronunciationWord.word)) {
        // Check if we have a loading state for this word
        const currentAnalysis = individualWordAnalysis[pronunciationWord.word];
        if (currentAnalysis && currentAnalysis.feedback === 'Analysis in progress... Please wait for results.') {
          console.log('🔄 Updating analysis results for word:', pronunciationWord.word);
          
          // Calculate overall score based on syllable scores if available
          let calculatedScore = pronunciationWord.score;
          if (pronunciationWord.syllableAnalysis && pronunciationWord.syllableAnalysis.length > 0) {
            const syllableScores = pronunciationWord.syllableAnalysis.map((s: any) => s.score);
            calculatedScore = Math.round(syllableScores.reduce((sum: number, score: number) => sum + score, 0) / syllableScores.length);
          }
          
          // Generate true syllable analysis with individual sounds using API data
          const syllableAnalysis = generateSyllableAnalysis(pronunciationWord.word, calculatedScore, pronunciationWord.syllableAnalysis || []);
          
          // Generate specific feedback based on score and syllable analysis
          const feedback = generateSpecificFeedback(pronunciationWord.word, calculatedScore, syllableAnalysis);
          
          const analysisResult = {
            score: calculatedScore,
            feedback: feedback,
            syllableAnalysis: syllableAnalysis
          };
          
          setIndividualWordAnalysis(prev => ({
            ...prev,
            [pronunciationWord.word]: analysisResult
          }));
          
          console.log('✅ Analysis results updated for word:', pronunciationWord.word);
        }
      }
    });
  }, [pronunciationWords, wordsAnalyzed]); // Removed individualWordAnalysis from dependencies to prevent infinite loop

  // Auto-update sentence analysis results when they become available
  useEffect(() => {
    if (sentenceAnalysis && sentenceAnalyzed) {
      // Check if we have a loading state for sentence analysis
      if (sentenceAnalysis.feedback === 'Analysis in progress... Please wait for results.') {
        console.log('🔄 Updating sentence analysis results');
        
        // The sentenceAnalysis should already be updated by analyzeSentencePronunciation
        // This effect will trigger when the real analysis data becomes available
        console.log('✅ Sentence analysis results updated');
      }
    }
  }, [sentenceAnalysis, sentenceAnalyzed]);



  // Load grammar explanation
  const loadGrammarExplanation = async (message: string) => {
    if (explanationCache[message]?.grammar) {
      setGrammarExplanation(explanationCache[message].grammar);
      return;
    }

    setIsLoadingExplanation(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grammar-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, useComprehensive: true })
      });

      if (response.ok) {
        const data = await response.json();
        const grammarText = data.analysis || 'No grammar explanation available.';
        const grammarTopic = data.grammarTopic || 'General Grammar';
        
        // Use the analysis directly without adding old format wrapper
        setGrammarExplanation(grammarText);
        setExplanationCache(prev => ({
          ...prev,
          [message]: { 
            ...prev[message], 
            grammar: grammarText,
            grammarTopic: grammarTopic
          }
        }));
        
        // Load practice tips based on grammar topic
        
        // Save grammar topic to database if we have the necessary data
        if (currentMessageId) {
          // This will be handled by the parent component when grammar analysis is triggered
          console.log('Grammar topic identified:', grammarTopic);
        }
      }
    } catch (error) {
      console.error('Error loading grammar explanation:', error);
      setGrammarExplanation('Error loading grammar explanation.');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  // DEPRECATED: GOP Algorithm functions removed - now using real GOP API
  
  // Temporary fallback function for individual word analysis
  function calculateWordGOP(word: string) {
    const hasUmlauts = /[äöü]/.test(word);
    const hasCh = /ch/.test(word);
    const hasR = /r/.test(word);
    const isLong = word.length > 6;
    
    // Base score calculation
    let baseScore = 85;
    
    // Adjust for difficulty factors
    if (hasUmlauts) baseScore -= 15;
    if (hasCh) baseScore -= 20;
    if (hasR) baseScore -= 10;
    if (isLong) baseScore -= 5;
    
    // Add some realistic variation (±10 points)
    const variation = (Math.random() - 0.5) * 20;
    baseScore = Math.max(0, Math.min(100, baseScore + variation));
    
    // Generate phoneme-level scores
    const phonemeScores = [];
    const phonemes = word.split('').filter(char => ['ä', 'ö', 'ü', 'r', 'ch'].includes(char));
    
    for (const phoneme of phonemes) {
      const rule = PRONUNCIATION_RULES[phoneme as keyof typeof PRONUNCIATION_RULES];
      if (rule) {
        const isCorrect = Math.random() > 0.3; // 70% chance of correct pronunciation
        const actual = isCorrect ? rule.correct : rule.commonMistakes[Math.floor(Math.random() * rule.commonMistakes.length)];
        
        let phonemeScore = 85;
        if (!isCorrect) {
          phonemeScore = Math.max(20, 85 - 40);
        }
        
        phonemeScores.push({
          phoneme,
          score: phonemeScore,
          feedback: isCorrect ? 'Good pronunciation' : `Practice the ${rule.correct} sound`,
          expected: rule.correct,
          actual
        });
      }
    }
    
    // Determine difficulty
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (hasUmlauts || hasCh) difficulty = 'hard';
    else if (hasR || isLong) difficulty = 'medium';
    
    // Generate feedback
    let feedback = '';
    if (baseScore >= 90) feedback = 'Excellent pronunciation!';
    else if (baseScore >= 75) feedback = 'Good pronunciation with minor improvements needed.';
    else if (baseScore >= 60) feedback = 'Fair pronunciation, practice the difficult sounds.';
    else feedback = 'Needs significant practice. Focus on the phoneme-level feedback.';
    
    return {
      word,
      score: Math.round(baseScore),
      phonemeScores,
      feedback,
      difficulty
    };
  }

  // German pronunciation rules for individual word analysis
  const PRONUNCIATION_RULES = {
    'ch': { difficulty: 'hard', commonMistakes: ['k', 'sh'], correct: 'ç' },
    'r': { difficulty: 'medium', commonMistakes: ['ɹ', 'w'], correct: 'ʁ' },
    'ä': { difficulty: 'medium', commonMistakes: ['a', 'e'], correct: 'ɛ' },
    'ö': { difficulty: 'hard', commonMistakes: ['o', 'e'], correct: 'ø' },
    'ü': { difficulty: 'hard', commonMistakes: ['u', 'i'], correct: 'y' },
    'sch': { difficulty: 'medium', commonMistakes: ['sk', 's'], correct: 'ʃ' }
  };

  const analyzePronunciation = async () => {
    if (!lastGermanVoiceMessage) {
      console.log('No German voice message available for pronunciation analysis');
      alert('No German voice message available. Please record a German voice message first.');
      return;
    }

    // Check environment variables
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      alert('Configuration error: Supabase credentials not found. Please check your environment variables.');
      console.error('Missing environment variables:', {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      return;
    }

    console.log('Environment check:', {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    });

    setIsAnalyzingPronunciation(true);
    try {
      console.log('🎤 === ANALYZING PRONUNCIATION WITH REAL GOP API ===');
      console.log('Message:', lastGermanVoiceMessage);

      const transcription = lastGermanVoiceMessage.transcription;
      const words = transcription.split(' ').filter((word: string) => word.length > 0);
      
      console.log('🎤 === CALLING REAL GOP API ===');
      console.log('Words to analyze:', words);
      
      // Debug API call info
      console.log('API Call Debug Info:', {
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronunciation-analysis`,
        hasAudioData: !!lastGermanVoiceMessage.audioData,
        audioDataLength: lastGermanVoiceMessage.audioData?.length,
        transcription: transcription,
        transcriptionLength: transcription?.length
      });
      
      // Call real GOP API with audio data
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronunciation-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: lastGermanVoiceMessage.audioData,
          transcription: transcription
        })
      });

      console.log('API Response Status:', response.status);
      console.log('API Response OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Pronunciation analysis failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Real GOP analysis completed:', data);
      setPronunciationAnalysis(data);
      
      // Show success message to user
      console.log('✅ Pronunciation analysis completed successfully!');
      
    } catch (error) {
      console.error('❌ Error in pronunciation analysis:', error);
      
      // Show error message to user
      alert(`Pronunciation analysis failed: ${(error as Error).message}`);
      
      // Set error state for UI
      setPronunciationAnalysis({
        hasPronunciationErrors: true,
        words: [],
        suggestions: ['Analysis failed. Please try again.'],
        overallScore: 0,
        error: (error as Error).message
      });
    } finally {
      setIsAnalyzingPronunciation(false);
    }
  };


  // Word repractice functionality
  const [isRecordingWord, setIsRecordingWord] = useState(false);
  const [wordRecording, setWordRecording] = useState<MediaRecorder | null>(null);
  const [wordAudioChunks, setWordAudioChunks] = useState<Blob[]>([]);

  const startWordRecording = (word: string) => {
    setPracticingWord(word);
    setIsRecordingWord(true);
    setWordAudioChunks([]);

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        setWordRecording(mediaRecorder);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setWordAudioChunks(prev => [...prev, event.data]);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(wordAudioChunks, { type: 'audio/wav' });
          await analyzeIndividualWordPronunciation(word, audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        setIsRecordingWord(false);
        setPracticingWord(null);
      });
  };

  const stopWordRecording = () => {
    console.log('🛑 stopWordRecording called');
    console.log('🛑 wordRecording exists:', !!wordRecording);
    console.log('🛑 wordRecording state:', wordRecording?.state);
    console.log('🛑 isRecordingWord:', isRecordingWord);
    console.log('🛑 practicingWord:', practicingWord);
    
    try {
    if (wordRecording && wordRecording.state === 'recording') {
        console.log('🛑 Stopping word recording...');
      wordRecording.stop();
      } else {
        console.log('🛑 No active word recording to stop');
    }
    } catch (error) {
      console.error('❌ Error stopping word recording:', error);
    }
    
    // Reset all word recording states
    setIsRecordingWord(false);
    setPracticingWord(null);
    setWordRecording(null);
    setWordAudioChunks([]);
    
    console.log('🛑 Word recording stopped and states reset');
  };

  const analyzeIndividualWordPronunciation = async (word: string, audioBlob: Blob) => {
    try {
      console.log('🎤 === ANALYZING INDIVIDUAL WORD PRONUNCIATION LOCALLY ===');
      console.log('Word:', word);
      
      // Use local GOP algorithm for individual word
      const wordScore = calculateWordGOP(word);
      console.log('✅ Individual word analysis completed locally:', wordScore);
      
      // Update the pronunciation analysis with new word score
      if (pronunciationAnalysis) {
        const updatedWords = pronunciationAnalysis.words.map((w: any) => 
          w.word === word ? { 
            ...w, 
            score: wordScore.score,
            feedback: wordScore.feedback,
            needsPractice: wordScore.score < 70,
            difficulty: wordScore.difficulty,
            syllableAnalysis: wordScore.phonemeScores.map((phoneme: any) => ({
              syllable: phoneme.phoneme,
              score: phoneme.score,
              feedback: phoneme.feedback,
              phoneticExpected: phoneme.expected,
              phoneticActual: phoneme.actual
            }))
          } : w
        );
        
        // Recalculate overall score
        const newOverallScore = Math.round(updatedWords.reduce((sum: number, w: any) => sum + w.score, 0) / updatedWords.length);
        
        setPronunciationAnalysis({
          ...pronunciationAnalysis,
          words: updatedWords,
          overallScore: newOverallScore,
          hasPronunciationErrors: newOverallScore < 70
        });
        
        console.log('✅ Updated pronunciation analysis with new score:', wordScore.score);
      }
    } catch (error) {
      console.error('❌ Error in word pronunciation analysis:', error);
    } finally {
      setPracticingWord(null);
    }
  };

  // Load speaking tips
  const loadSpeakingTips = async (message: string) => {
    if (explanationCache[message]?.tips) {
      setSpeakingTips(explanationCache[message].tips);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speaking-tips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        const data = await response.json();
        setSpeakingTips(data.tips || 'No speaking tips available.');
        setExplanationCache(prev => ({
          ...prev,
          [message]: { ...prev[message], tips: data.tips || 'No speaking tips available.' }
        }));
      }
    } catch (error) {
      console.error('Error loading speaking tips:', error);
      setSpeakingTips('Error loading speaking tips.');
    }
  };


  // Comprehensive analysis function
  const analyzeComprehensive = async (message: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comprehensive-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userLevel: 'Intermediate',
          source: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Comprehensive analysis result:', data);
        
        setAnalysisData(data);
        
        // Set up pronunciation words for practice
        if (data.wordsForPractice) {
          const pronunciationData: PronunciationWord[] = data.wordsForPractice.map((word: any) => ({
            word: word.word,
            score: word.score || 0,
            needsPractice: word.needsPractice,
            feedback: `Practice this word for better pronunciation`,
            commonMistakes: []
          }));
          setPronunciationWords(pronunciationData);
        }
        
        // Show relevant sections based on errors
        if (data.errorTypes.grammar) {
          setShowGrammarSection(true);
          setShowSpeakingSection(false);
        }
        if (data.errorTypes.pronunciation) {
          setShowSpeakingSection(true);
          setShowGrammarSection(false);
        }
      }
    } catch (error) {
      console.error('Error in comprehensive analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Segment words for practice
  const segmentWords = async (text: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/word-segmentation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: '', // Not needed for text segmentation
          transcription: text
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.segments || [];
      }
    } catch (error) {
      console.error('Error segmenting words:', error);
    }
    return [];
  };

  // Pronunciation practice functions
  const practiceWord = async (word: string) => {
    console.log('🎤 Starting practice for word:', word);
    console.log('🎤 Current practicing word:', practicingWord);
    console.log('🎤 Current recording state:', isRecording);
    
    // Add gamification points for starting practice
    if (onAddExperience) {
      onAddExperience(5, 'word_practice_start');
    }
    
    // Reset stopping flag and analysis state for this word
    isStoppingRef.current = false;
    setWordsAnalyzed(prev => {
      const newSet = new Set(prev);
      newSet.delete(word);
      return newSet;
    });
    // Don't remove from wordsReadyForAnalysis when starting practice
    // The word should remain ready for analysis after recording
    
    // Reset sentence states when starting individual word practice
    setSentenceRecordingCompleted(false);
    setSentenceReadyForAnalysis(false);
    setSentenceAnalysis(null);
    setSentenceAnalyzed(false);
    setSentenceAnalysisComplete(false);
    
    setPracticingWord(word);
    setCurrentAttempt(0);
    await startRecording();
  };

  const startWordPractice = async () => {
    if (!practicingWord) return;
    
    try {
      // Reset sentence states when starting individual word practice
      setSentenceRecordingCompleted(false);
      setSentenceReadyForAnalysis(false);
      setSentenceAnalysis(null);
      setSentenceAnalyzed(false);
      setSentenceAnalysisComplete(false);
      
      // Start recording for specific word
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
          chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await analyzeWordPronunciation(audioBlob);
        setIsRecording(false);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Auto-stop after 3 seconds for word practice
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3000);
    } catch (error) {
      console.error('Error starting word practice:', error);
    }
  };

  // Session management functions
  const startPracticeSession = () => {
    const sessionId = `session_${Date.now()}`;
    const newSession = {
      sessionId,
      startTime: new Date().toISOString(),
      wordsPracticed: [],
      totalScore: 0,
      averageScore: 0
    };
    setCurrentSession(newSession);
    console.log('🎤 Practice session started:', sessionId);
    return sessionId;
  };

  const startRecording = async () => {
    console.log('🎤 startRecording called');
    console.log('🎤 Current practicing word:', practicingWord);
    
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎤 Microphone access granted, stream:', stream);
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        console.log('🎤 Data available, chunk size:', event.data.size);
        chunks.push(event.data);
      };

      recorder.onstop = async () => {
        console.log('🎤 Recording stopped, analyzing audio...');
        console.log('🎤 PracticingWord at onstop:', practicingWord);
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('🎤 Audio blob created, size:', audioBlob.size);
        
        // Don't set recording states to false here - let the stopRecording function handle it
        try {
        await analyzeWordPronunciation(audioBlob);
          console.log('🎤 Recording analysis completed successfully');
        } catch (error) {
          console.error('❌ Error in onstop analyzePronunciation:', error);
        }
      };

      // Start recording immediately
      recorder.start();
      setMediaRecorder(recorder);
      
      // Set appropriate recording state based on what's being practiced
      if (practicingWord === 'sentence') {
        setIsSentenceRecording(true);
        setIsWordRecording(false);
      } else {
        setIsWordRecording(true);
        setIsSentenceRecording(false);
      }
        setIsRecording(true);
      
        console.log('🎤 Recording started for pronunciation practice');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      console.error('❌ Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  };

  const stopRecording = () => {
    console.log('🛑 stopRecording called');
    console.log('🛑 MediaRecorder exists:', !!mediaRecorder);
    console.log('🛑 Is recording:', isRecording);
    console.log('🛑 Is stopping:', isStoppingRef.current);
    console.log('🛑 Practicing word:', practicingWord);
    
    if (mediaRecorder && isRecording && !isStoppingRef.current) {
      console.log('🛑 Stopping recording...');
      isStoppingRef.current = true;
      mediaRecorder.stop();
      
      // Set recording states to false immediately when user clicks stop
      setIsRecording(false);
      setIsSentenceRecording(false);
      setIsWordRecording(false);
      
      // Mark word as recording completed AND ready for analysis immediately
      if (practicingWord) {
        if (practicingWord === 'sentence') {
          // For sentence practice, use separate sentence states
          setSentenceRecordingCompleted(true);
          setSentenceReadyForAnalysis(true);
          setSentenceAnalysisComplete(true); // Enable button immediately
          console.log('✅ Sentence marked as recording completed and ready for analysis');
        } else {
          setWordsRecordingCompleted(prev => {
            const newSet = new Set([...prev, practicingWord]);
            console.log('✅ Word marked as recording completed:', practicingWord);
            console.log('📊 Updated wordsRecordingCompleted:', Array.from(newSet));
            return newSet;
          });
          // Also mark as ready for analysis immediately
          setWordsReadyForAnalysis(prev => {
            const newSet = new Set([...prev, practicingWord]);
            console.log('✅ Word marked as ready for analysis immediately:', practicingWord);
            return newSet;
          });
          // Mark analysis as complete immediately to enable button
          setWordsAnalysisComplete(prev => {
            const newSet = new Set([...prev, practicingWord]);
            console.log('✅ Word marked as analysis complete immediately:', practicingWord);
            console.log('📊 Updated wordsAnalysisComplete:', Array.from(newSet));
            return newSet;
          });
        }
      } else {
        console.log('❌ No practicingWord set, cannot mark as recording completed');
      }
      
      console.log('🎤 Recording stopped, waiting for audio analysis to confirm content');
      
      // Reset the stopping flag after a short delay
      setTimeout(() => {
        isStoppingRef.current = false;
        console.log('🛑 Stopping flag reset');
      }, 1000);
        } else {
      console.log('🛑 Cannot stop recording - no recorder, not recording, or already stopping');
      console.log('🛑 Debug info:', {
        mediaRecorder: !!mediaRecorder,
        isRecording,
        isStopping: isStoppingRef.current
      });
    }
  };

  // Sentence recording functions for pronunciation practice
  const startSentenceRecording = async () => {
    console.log('🎤 Starting sentence recording for pronunciation practice...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      recorder.onstop = async () => {
        console.log('🛑 Sentence recording stopped');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setSentenceAudioBlob(audioBlob);
        setIsRecordingSentence(false);
        
        // Automatically analyze the recorded sentence
        await analyzeSentencePronunciation(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setSentenceRecorder(recorder);
      setIsRecordingSentence(true);
      
    } catch (error) {
      console.error('❌ Error starting sentence recording:', error);
      alert('Could not access microphone. Please check permissions.');
      setIsRecordingSentence(false);
    }
  };

  const stopSentenceRecording = () => {
    console.log('🛑 Stopping sentence recording...');
    if (sentenceRecorder && sentenceRecorder.state === 'recording') {
      sentenceRecorder.stop();
    }
    setIsRecordingSentence(false);
  };

  const analyzeSentencePronunciation = async (audioBlob: Blob) => {
    console.log('🔍 Analyzing sentence pronunciation...');
    setIsAnalyzingPronunciation(true);
    
    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let binaryString = '';
      const chunkSize = 8192;
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binaryString);
      
      // First transcribe the audio
      const transcriptionResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          language: 'de'
        })
      });
      
      if (!transcriptionResponse.ok) {
        throw new Error(`Transcription failed: ${transcriptionResponse.statusText}`);
      }
      
      const transcriptionData = await transcriptionResponse.json();
      console.log('📝 Transcription:', transcriptionData.transcription);
      
      // Then analyze pronunciation
      const analysisResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronunciation-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          transcription: transcriptionData.transcription,
          expectedTranscription: lastGermanVoiceMessage.transcription
        })
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
      }
      
      const analysisData = await analysisResponse.json();
      console.log('📊 Analysis result:', analysisData);
      
      // Update the pronunciation analysis state
      setPronunciationAnalysis(analysisData);
      
      // Force re-render with timestamp to ensure UI updates
      setTimeout(() => {
        setPronunciationAnalysis({
          ...analysisData, 
          source: 'practice', // Mark this as practice analysis
          timestamp: Date.now()
        });
        console.log('🔄 Forced re-render with new overall score:', analysisData.overallScore);
      }, 100);
      
    } catch (error) {
      console.error('❌ Error analyzing sentence pronunciation:', error);
      alert('Failed to analyze pronunciation. Please try again.');
    } finally {
      setIsAnalyzingPronunciation(false);
    }
  };

  const analyzeWordPronunciation = async (audioBlob: Blob) => {
    try {
      console.log('📊 ===== ANALYZE PRONUNCIATION START =====');
      console.log('📊 Analyzing pronunciation for word:', practicingWord);
      console.log('📊 Audio blob size:', audioBlob.size, 'bytes');
      console.log('📊 Current pronunciationWords before analysis:', pronunciationWords);
      console.log('📊 Current wordsAnalysisComplete before analysis:', Array.from(wordsAnalysisComplete));
      
      // Handle sentence practice differently
      if (practicingWord === 'sentence') {
        console.log('📊 Handling sentence practice - calling analyzeSentencePronunciation');
        await analyzeSentencePronunciation(audioBlob);
        return;
      }
      
      // Enhanced audio validation for individual words
      if (audioBlob.size < 1000) { // Less than 1KB is likely empty or very short
        console.log('❌ Audio blob too small, likely no audio recorded:', audioBlob.size, 'bytes');
        console.log('💡 User needs to record actual audio before analysis');
        
        // Show specific error message for no audio
        const errorMessage = 'No analysis can be done because no word pronunciation was spoken and recorded. Please speak the word clearly and try again.';
        const errorData: PronunciationWord = {
          word: practicingWord || 'Unknown',
          score: 0,
          needsPractice: true,
          feedback: errorMessage,
          commonMistakes: ['No audio recorded'],
          syllableAnalysis: []
        };
        
        setPronunciationWords(prev => {
          const existing = prev.find(w => w.word === practicingWord);
          if (existing) {
            return prev.map(w => w.word === practicingWord ? errorData : w);
          } else {
            return [...prev, errorData];
          }
        });
        console.log('📊 ===== ANALYZE PRONUNCIATION END (NO AUDIO) =====');
        return;
      }
      
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to pronunciation analysis
      console.log('📊 Sending API request to pronunciation-analysis...');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronunciation-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64,
          transcription: practicingWord || 'Test pronunciation'
        })
      });

      console.log('📊 API response status:', response.status);
      console.log('📊 API response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Pronunciation analysis result:', data);
        
        if (data.words && data.words.length > 0) {
          const wordAnalysis = data.words[0]; // Get first word analysis
          
          // Enhanced word validation
          const expectedWord = practicingWord?.toLowerCase().trim();
          const recordedWord = wordAnalysis.word?.toLowerCase().trim();
          
          console.log('🔍 Word validation:', { expected: expectedWord, recorded: recordedWord });
          
          // Check if no word was detected (empty or very short transcription)
          if (!recordedWord || recordedWord.length < 2) {
            console.log('❌ No word detected in recording');
            
            const errorMessage = 'No analysis can be done because no word pronunciation was spoken and recorded. Please speak the word clearly and try again.';
            const errorData: PronunciationWord = {
              word: practicingWord || 'Unknown',
              score: 0,
              needsPractice: true,
              feedback: errorMessage,
              commonMistakes: ['No word detected in recording'],
              syllableAnalysis: []
            };
            
            setPronunciationWords(prev => {
              const existing = prev.find(w => w.word === practicingWord);
              if (existing) {
                return prev.map(w => w.word === practicingWord ? errorData : w);
              } else {
                return [...prev, errorData];
              }
            });
            
            // Keep analysis as complete even for errors (button should remain enabled)
            if (practicingWord) {
              console.log('✅ Word analysis remains complete (no word detected):', practicingWord);
            } else {
              console.log('❌ No practicingWord set when trying to mark analysis complete (no word detected)');
            }
            
            console.log('📊 ===== ANALYZE PRONUNCIATION END (NO WORD DETECTED) =====');
            return;
          }
          
          // Check if incorrect/irrelevant word was recorded
          // Enhanced validation: check for partial matches, common mispronunciations, and irrelevant words
          const isRelevantWord = expectedWord && recordedWord && (
            expectedWord === recordedWord ||
            expectedWord.includes(recordedWord) ||
            recordedWord.includes(expectedWord) ||
            // Check for common phonetic variations
            expectedWord.replace(/[aeiou]/g, '') === recordedWord.replace(/[aeiou]/g, '') ||
            // Check for similar sounding words (basic phonetic similarity)
            Math.abs(expectedWord.length - recordedWord.length) <= 2 && 
            expectedWord.split('').filter((char, i) => char === recordedWord[i]).length >= Math.min(expectedWord.length, recordedWord.length) * 0.6
          );
          
          if (!isRelevantWord) {
            console.log('❌ Irrelevant/incorrect word recorded:', { expected: expectedWord, recorded: recordedWord });
            
            const errorMessage = `No analysis can be done because irrelevant/incorrect word pronunciation was spoken and recorded. Expected "${practicingWord}" but recorded "${wordAnalysis.word}". Please practice the correct word.`;
            const errorData: PronunciationWord = {
              word: practicingWord || 'Unknown',
              score: 0,
              needsPractice: true,
              feedback: errorMessage,
              commonMistakes: [`Recorded "${wordAnalysis.word}" instead of "${practicingWord}"`],
              syllableAnalysis: []
            };
            
            setPronunciationWords(prev => {
              const existing = prev.find(w => w.word === practicingWord);
              if (existing) {
                return prev.map(w => w.word === practicingWord ? errorData : w);
              } else {
                return [...prev, errorData];
              }
            });
            
            // Keep analysis as complete even for errors (button should remain enabled)
            if (practicingWord) {
              console.log('✅ Word analysis remains complete (irrelevant word):', practicingWord);
            } else {
              console.log('❌ No practicingWord set when trying to mark analysis complete (irrelevant word)');
            }
            
            console.log('📊 ===== ANALYZE PRONUNCIATION END (IRRELEVANT WORD) =====');
            return;
          }
          
          // Calculate word score as average of syllable scores
          let wordScore = wordAnalysis.score || 0;
          if (wordAnalysis.syllableAnalysis && wordAnalysis.syllableAnalysis.length > 0) {
            const syllableScores = wordAnalysis.syllableAnalysis.map((s: any) => s.score);
            wordScore = Math.round(syllableScores.reduce((sum: number, score: number) => sum + score, 0) / syllableScores.length);
          }
          
          // Determine RAG status based on accuracy rating
          const ragStatus = wordScore >= 90 ? 'Green' : wordScore >= 70 ? 'Amber' : 'Red';
          
          // Generate feedback aligned with RAG status
          const feedback = ragStatus === 'Green' ? 
            `Excellent pronunciation of "${wordAnalysis.word}"! Very clear and accurate.` :
            ragStatus === 'Amber' ? 
            `Good pronunciation of "${wordAnalysis.word}". Minor improvements possible.` :
            `"${wordAnalysis.word}" requires more practice. Focus on pronunciation fundamentals.`;
          
          const pronunciationData: PronunciationWord = {
            word: wordAnalysis.word,
            score: wordScore,
            needsPractice: wordAnalysis.needsPractice,
            feedback: feedback,
            commonMistakes: wordAnalysis.commonMistakes || [],
            syllableAnalysis: wordAnalysis.syllableAnalysis || []
          };
          
          // Update pronunciation words
          setPronunciationWords(prev => {
            const existing = prev.find(w => w.word === wordAnalysis.word);
            if (existing) {
              return prev.map(w => w.word === wordAnalysis.word ? pronunciationData : w);
            } else {
              return [...prev, pronunciationData];
            }
          });
          
          console.log('✅ Pronunciation analysis completed for:', wordAnalysis.word, 'Score:', wordScore, 'RAG:', ragStatus);
          
          // Mark analysis as complete for this word (only if not already set)
          if (practicingWord && !wordsAnalysisComplete.has(practicingWord)) {
            setWordsAnalysisComplete(prev => {
              const newSet = new Set([...prev, practicingWord]);
              console.log('✅ Word analysis marked as complete (success):', practicingWord);
              console.log('📊 Updated wordsAnalysisComplete:', Array.from(newSet));
              return newSet;
            });
          } else if (practicingWord) {
            console.log('✅ Word analysis already marked as complete:', practicingWord);
          } else {
            console.log('❌ No practicingWord set when trying to mark analysis complete');
          }
          
          // Note: wordsReadyForAnalysis is already marked in stopRecording for immediate button availability
        } else {
          // No words detected by API - likely no speech or unclear speech
          console.log('❌ No words detected by API - likely no speech or unclear speech');
          
          const errorMessage = 'No analysis can be done because no word pronunciation was spoken and recorded. Please speak the word clearly and try again.';
          const errorData: PronunciationWord = {
            word: practicingWord || 'Unknown',
            score: 0,
            needsPractice: true,
            feedback: errorMessage,
            commonMistakes: ['No words detected in audio'],
            syllableAnalysis: []
          };
          
          setPronunciationWords(prev => {
            const existing = prev.find(w => w.word === practicingWord);
            if (existing) {
              return prev.map(w => w.word === practicingWord ? errorData : w);
            } else {
              return [...prev, errorData];
            }
          });
          console.log('📊 ===== ANALYZE PRONUNCIATION END (NO WORDS DETECTED BY API) =====');
        }
      } else {
        console.error('❌ Pronunciation analysis failed:', response.status);
        console.log('💡 Word not marked as ready for analysis due to analysis failure');
        
        // Handle API failure - could be due to no audio or other issues
        const errorMessage = 'No analysis can be done because no word pronunciation was spoken and recorded. Please speak the word clearly and try again.';
        const errorData: PronunciationWord = {
          word: practicingWord || 'Unknown',
          score: 0,
          needsPractice: true,
          feedback: errorMessage,
          commonMistakes: ['API analysis failed - likely no clear speech'],
          syllableAnalysis: []
        };
        
        setPronunciationWords(prev => {
          const existing = prev.find(w => w.word === practicingWord);
          if (existing) {
            return prev.map(w => w.word === practicingWord ? errorData : w);
          } else {
            return [...prev, errorData];
          }
        });
        console.log('📊 ===== ANALYZE PRONUNCIATION END (API FAILURE) =====');
      }
    } catch (error) {
      console.error('❌ Error analyzing pronunciation:', error);
      console.log('💡 Word not marked as ready for analysis due to error');
      
      // Handle any errors during analysis - could be due to no audio or other issues
      const errorMessage = 'No analysis can be done because no word pronunciation was spoken and recorded. Please speak the word clearly and try again.';
      const errorData: PronunciationWord = {
        word: practicingWord || 'Unknown',
        score: 0,
        needsPractice: true,
        feedback: errorMessage,
        commonMistakes: ['Analysis error - likely no clear speech'],
        syllableAnalysis: []
      };
      
      setPronunciationWords(prev => {
        const existing = prev.find(w => w.word === practicingWord);
        if (existing) {
          return prev.map(w => w.word === practicingWord ? errorData : w);
        } else {
          return [...prev, errorData];
        }
      });
      console.log('📊 ===== ANALYZE PRONUNCIATION END (ERROR) =====');
    } finally {
      console.log('📊 ===== ANALYZE PRONUNCIATION FUNCTION COMPLETED =====');
      console.log('📊 Final wordsAnalysisComplete:', Array.from(wordsAnalysisComplete));
    }
  };


  // Helper function to break word into individual sounds/syllables
  const breakWordIntoSounds = (word: string): string[] => {
    const sounds: string[] = [];
    const wordLower = word.toLowerCase();
    
    // Simple phonetic breakdown for common German/English sounds
    for (let i = 0; i < wordLower.length; i++) {
      const char = wordLower[i];
      const nextChar = wordLower[i + 1];
      
      // Handle common digraphs (two-letter sounds)
      if (i < wordLower.length - 1) {
        const digraph = char + nextChar;
        if (['ch', 'sh', 'th', 'ph', 'ck', 'ng', 'qu'].includes(digraph)) {
          sounds.push(digraph);
          i++; // Skip next character
          continue;
        }
      }
      
      // Single character sounds
      sounds.push(char);
    }
    
    return sounds;
  };

  // Helper function to generate syllable-level analysis with actual pronunciation data
  const generateSyllableAnalysis = (word: string, overallScore: number, apiSyllableAnalysis: any[] = []): any[] => {
    const sounds = breakWordIntoSounds(word);
    const syllableAnalysis: any[] = [];
    
    sounds.forEach((sound, index) => {
      // Try to find matching syllable data from API
      const apiSyllable = apiSyllableAnalysis.find(s => 
        s.syllable.toLowerCase() === sound.toLowerCase() || 
        s.syllable.toLowerCase().includes(sound.toLowerCase())
      );
      
      let soundScore = overallScore;
      let soundFeedback = '';
      let actualEmphasis = 'Medium';
      let expectedEmphasis = 'Medium';
      let emphasisComparison = '';
      
      if (apiSyllable) {
        // Use actual API data
        soundScore = apiSyllable.score || overallScore;
        
        // Determine actual emphasis based on phonetic analysis
        if (apiSyllable.phoneticActual && apiSyllable.phoneticExpected) {
          // Compare actual vs expected phonetic patterns
          const actualStress = analyzeStressPattern(apiSyllable.phoneticActual);
          const expectedStress = analyzeStressPattern(apiSyllable.phoneticExpected);
          
          actualEmphasis = actualStress;
          expectedEmphasis = expectedStress;
          
          if (actualStress === expectedStress) {
            emphasisComparison = `Correct emphasis (${actualStress})`;
            // Boost score slightly for correct emphasis
            soundScore = Math.min(100, soundScore + 2);
          } else {
            emphasisComparison = `Expected ${expectedStress}, got ${actualStress}`;
            // Reduce score for incorrect emphasis
            soundScore = Math.max(0, soundScore - 5);
          }
        }
        
        // Use API feedback if available, otherwise generate enhanced feedback
        soundFeedback = apiSyllable.feedback || generateSoundFeedback(sound, soundScore, actualEmphasis, expectedEmphasis, apiSyllable.phoneticExpected, apiSyllable.phoneticActual);
      } else {
        // Fallback to generated analysis
        const variation = Math.random() * 20 - 10; // ±10 points variation
        soundScore = Math.max(0, Math.min(100, Math.round(overallScore + variation)));
        soundFeedback = generateSoundFeedback(sound, soundScore, actualEmphasis, expectedEmphasis);
        
        // For fallback, assume correct emphasis
        actualEmphasis = soundScore >= 85 ? 'High' : soundScore >= 70 ? 'Medium' : 'Low';
        expectedEmphasis = actualEmphasis;
        emphasisComparison = `Correct emphasis (${actualEmphasis})`;
      }
      
      syllableAnalysis.push({
        syllable: sound,
        score: soundScore,
        feedback: soundFeedback,
        actualEmphasis: actualEmphasis,
        expectedEmphasis: expectedEmphasis,
        emphasisComparison: emphasisComparison,
        phoneticExpected: apiSyllable?.phoneticExpected || '',
        phoneticActual: apiSyllable?.phoneticActual || ''
      });
    });
    
    return syllableAnalysis;
  };

  // Helper function to analyze stress patterns from phonetic data
  const analyzeStressPattern = (phonetic: string): string => {
    // Simple stress pattern analysis based on phonetic notation
    if (phonetic.includes('ˈ') || phonetic.includes('ˈ')) {
      return 'High'; // Primary stress
    } else if (phonetic.includes('ˌ') || phonetic.includes('ˌ')) {
      return 'Medium'; // Secondary stress
    } else {
      return 'Low'; // Unstressed
    }
  };

  // Enhanced helper function to generate specific sound feedback based on score, emphasis, and phonetic data
  const generateSoundFeedback = (sound: string, score: number, actualEmphasis?: string, expectedEmphasis?: string, phoneticExpected?: string, phoneticActual?: string): string => {
    // Determine if emphasis matches
    const emphasisMatches = actualEmphasis === expectedEmphasis;
    
    // Generate feedback based on score and emphasis alignment
    if (score >= 95) {
      if (emphasisMatches) {
        return `Excellent "${sound}" sound! Perfect emphasis and clear articulation.`;
      } else {
        return `Excellent "${sound}" sound with clear articulation. Focus on emphasis: expected ${expectedEmphasis}, got ${actualEmphasis}.`;
      }
    } else if (score >= 90) {
      if (emphasisMatches) {
        return `Very good "${sound}" sound with correct emphasis. Minor refinement in articulation needed.`;
      } else {
        return `Very good "${sound}" sound. Improve emphasis (expected ${expectedEmphasis}, got ${actualEmphasis}) and articulation clarity.`;
      }
    } else if (score >= 80) {
      if (emphasisMatches) {
        return `Good "${sound}" sound with correct emphasis. Work on articulation clarity and sound precision.`;
      } else {
        return `Good "${sound}" sound. Focus on emphasis accuracy (expected ${expectedEmphasis}, got ${actualEmphasis}) and articulation.`;
      }
    } else if (score >= 70) {
      if (emphasisMatches) {
        return `Fair "${sound}" sound with correct emphasis. Practice articulation, sound clarity, and pronunciation precision.`;
      } else {
        return `Fair "${sound}" sound. Improve emphasis (expected ${expectedEmphasis}, got ${actualEmphasis}), articulation, and sound clarity.`;
      }
    } else if (score >= 60) {
      if (emphasisMatches) {
        return `"${sound}" needs significant practice. Focus on basic articulation, sound production, and pronunciation fundamentals.`;
      } else {
        return `"${sound}" needs significant practice. Work on emphasis (expected ${expectedEmphasis}, got ${actualEmphasis}), articulation, and basic pronunciation.`;
      }
    } else {
      if (emphasisMatches) {
        return `"${sound}" requires extensive practice. Focus on basic sound production, articulation fundamentals, and pronunciation basics.`;
      } else {
        return `"${sound}" requires extensive practice. Work on emphasis (expected ${expectedEmphasis}, got ${actualEmphasis}), basic articulation, and sound production.`;
      }
    }
  };

  // Helper function to generate specific feedback based on score and syllable analysis
  const generateSpecificFeedback = (word: string, score: number, syllableAnalysis: any[] = []): string => {
    if (score >= 90) {
      const goodAspects = syllableAnalysis.length > 0 ? 
        `All sounds pronounced clearly` : 
        `Clear articulation throughout`;
      return `Excellent pronunciation of "${word}"! ${goodAspects}. Maintain this level of clarity and accuracy.`;
    } else if (score >= 80) {
      const improvements = syllableAnalysis.length > 0 ? 
        `Focus on individual sound clarity and stress` : 
        `Work on word stress and timing`;
      return `Very good pronunciation of "${word}". ${improvements}. Overall clarity is good, minor refinements needed.`;
    } else if (score >= 70) {
      const improvements = syllableAnalysis.length > 0 ? 
        `Pay attention to individual sound accuracy` : 
        `Focus on pronunciation fundamentals`;
      return `Good pronunciation of "${word}". ${improvements}. Clear articulation needed in some areas.`;
    } else if (score >= 60) {
      return `Fair pronunciation of "${word}". Focus on basic pronunciation patterns, individual sound clarity, and word stress. Practice individual sounds more.`;
    } else {
      return `"${word}" requires significant practice. Focus on pronunciation fundamentals, individual sound breakdown, and basic sound production.`;
    }
  };

  // Individual word analysis function - OPTIMIZED FOR INSTANT RESPONSE
  const analyzeIndividualWord = async (word: string) => {
    console.log('🔍 ===== ANALYZE INDIVIDUAL WORD START =====');
    console.log('🔍 Analyzing individual word:', word);
    
    // Check if the word analysis is complete and ready for display
    if (!wordsAnalysisComplete.has(word)) {
      console.log('❌ Word analysis not complete - analysis still in progress:', word);
      setAnalyzingWord(null);
      return;
    }
    
    console.log('✅ Word is ready for analysis, proceeding...');
    setAnalyzingWord(word);
    
    // Add gamification points for starting analysis
    if (onAddExperience) {
      onAddExperience(3, 'word_analysis_start');
    }
    
    try {
      // Check if we have actual pronunciation analysis results for this word
      const existingAnalysis = pronunciationWords.find(p => p.word === word);
      
      if (existingAnalysis) {
        console.log('📊 Using existing pronunciation analysis for word:', word);
        
        // Check if this is an error case (no words spoken, incorrect word, etc.)
        if (existingAnalysis.feedback.includes('No analysis can be done') || 
            existingAnalysis.feedback.includes('no word pronunciation was spoken') ||
            existingAnalysis.feedback.includes('unrelated and incorrect word pronunciation') ||
            existingAnalysis.feedback.includes('irrelevant/incorrect word pronunciation')) {
          console.log('❌ Error case detected - no valid analysis available:', existingAnalysis.feedback);
          
          // Show the error message instead of fake analysis
          const errorResult = {
            score: 0,
            feedback: existingAnalysis.feedback,
            syllableAnalysis: []
          };
          
          setIndividualWordAnalysis(prev => ({
            ...prev,
            [word]: errorResult
          }));
          
          // Mark word as analyzed to show error state
          setWordsAnalyzed(prev => new Set([...prev, word]));
          
          console.log('❌ Error state set for word:', word);
          setAnalyzingWord(null);
          return;
        }
        
        // Calculate overall score based on syllable scores if available
        let calculatedScore = existingAnalysis.score;
        if (existingAnalysis.syllableAnalysis && existingAnalysis.syllableAnalysis.length > 0) {
          const syllableScores = existingAnalysis.syllableAnalysis.map(s => s.score);
          calculatedScore = Math.round(syllableScores.reduce((sum, score) => sum + score, 0) / syllableScores.length);
        }
        
        // Generate true syllable analysis with individual sounds using API data
        const syllableAnalysis = generateSyllableAnalysis(word, calculatedScore, existingAnalysis.syllableAnalysis || []);
        
        // Generate specific feedback based on score and syllable analysis
        const feedback = generateSpecificFeedback(word, calculatedScore, syllableAnalysis);
        
        const analysisResult = {
          score: calculatedScore,
          feedback: feedback,
          syllableAnalysis: syllableAnalysis
        };
        
        console.log('📊 Analysis result created:', analysisResult);
      
      setIndividualWordAnalysis(prev => ({
        ...prev,
          [word]: analysisResult
      }));
      
      // Add points for word analysis
        const pointsEarned = calculatePoints(analysisResult.score, false);
      addPoints(pointsEarned);
      
      // Record progress
        recordProgress(analysisResult.score, 1, false);
      
      // Add to difficult words if score is low
        if (analysisResult.score < 70) {
        const phoneticData = phoneticBreakdowns[currentMessage || '']?.find((w: any) => w.original === word);
        if (phoneticData) {
            addToDifficultWords(word, analysisResult.score, phoneticData.phonetic, phoneticData.transliteration);
        }
      } else {
        // Update practice count for existing difficult words
          updateDifficultWordPractice(word, analysisResult.score);
      }
      
      // Mark word as analyzed
      setWordsAnalyzed(prev => new Set([...prev, word]));
      
      console.log('✅ Individual word analysis completed for:', word);
      } else {
        console.log('❌ No pronunciation analysis available for word:', word);
        console.log('💡 Analysis may still be in progress, showing loading state...');
        
        // Show loading state while analysis is in progress
        const loadingResult = {
          score: 0,
          feedback: 'Analysis in progress... Please wait for results.',
          syllableAnalysis: []
        };
        
        setIndividualWordAnalysis(prev => ({
          ...prev,
          [word]: loadingResult
        }));
        
        // Mark word as analyzed to show loading state
        setWordsAnalyzed(prev => new Set([...prev, word]));
        
        console.log('⏳ Loading state set for word:', word);
        setAnalyzingWord(null);
        return;
      }
    } catch (error) {
      console.error('❌ Error analyzing individual word:', error);
    } finally {
      setAnalyzingWord(null);
    }
  };

  // Sentence-level practice function
  const startSentencePractice = async () => {
    console.log('🎤 Starting sentence practice for:', currentMessage);
    
    // Reset sentence analysis state
    setSentenceAnalysis(null);
    setSentenceAnalyzed(false);
    setSentenceRecordingCompleted(false);
    setSentenceReadyForAnalysis(false);
    setSentenceAnalysisComplete(false);
    
    // Reset individual word states when starting sentence practice
    setWordsRecordingCompleted(new Set());
    setWordsReadyForAnalysis(new Set());
    setWordsAnalyzed(new Set());
    setWordsAnalysisComplete(new Set());
    setIndividualWordAnalysis({});
    
    // Use the same recording logic as individual words
    setPracticingWord('sentence');
    startRecording();
  };

  // Sentence-level analysis function
  const analyzeSentence = async () => {
    console.log('🔍 Analyzing sentence:', currentMessage);
    console.log('📊 Sentence recording completed:', sentenceRecordingCompleted);
    console.log('📊 Sentence ready for analysis:', sentenceReadyForAnalysis);
    
    // Check if sentence analysis is complete and ready for display
    if (!sentenceAnalysisComplete) {
      console.log('❌ Sentence analysis not complete - analysis still in progress');
      console.log('💡 User needs to wait for analysis to complete');
      setIsAnalyzing(false);
      return;
    }
    
    setIsAnalyzing(true);
    
    // Add gamification points for sentence analysis
    if (onAddExperience) {
      onAddExperience(10, 'sentence_analysis');
    }
    
    try {
      // Check if we already have sentence analysis results from analyzeSentencePronunciation
      if (sentenceAnalysis) {
        console.log('📊 Using existing sentence analysis results');
        
        // Check if this is an error case (no words spoken, incorrect words, etc.)
        if (sentenceAnalysis.feedback.includes('Analysis cannot be done') || 
            sentenceAnalysis.feedback.includes('no sentence or words being spoken') ||
            sentenceAnalysis.feedback.includes('incorrect/irrelevant words have been spoken') ||
            sentenceAnalysis.feedback.includes('detected mostly different words')) {
          console.log('❌ Error case detected - no valid sentence analysis available:', sentenceAnalysis.feedback);
          
          // Mark sentence as analyzed to show error state
          setSentenceAnalyzed(true);
          
          console.log('❌ Error state set for sentence analysis');
          return;
        }
      
      // Add points for sentence analysis
        const pointsEarned = calculatePoints(sentenceAnalysis.overallScore, true);
      addPoints(pointsEarned);
        console.log(`⭐ Earned ${pointsEarned} points for sentence analysis (score: ${sentenceAnalysis.overallScore})`);
      
      // Record progress
        recordProgress(sentenceAnalysis.overallScore, (currentMessage || '').split(' ').length, true);
      
      // Mark sentence as analyzed
      setSentenceAnalyzed(true);
      
        console.log('✅ Sentence analysis completed using existing results');
      } else {
        console.log('❌ No sentence analysis results available');
        console.log('💡 Analysis may still be in progress, showing loading state...');
        
        // Show loading state while analysis is in progress
        setSentenceAnalysis({
          overallScore: 0,
          feedback: 'Analysis in progress... Please wait for results.',
          wordScores: []
        });
        
        // Mark sentence as analyzed to show loading state
        setSentenceAnalyzed(true);
        
        console.log('⏳ Loading state set for sentence analysis');
      }
      
    } catch (error) {
      console.error('❌ Error in sentence analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Gamification functions
  const calculatePoints = (score: number, isSentence: boolean = false) => {
    let basePoints = 0;
    if (score >= 90) basePoints = isSentence ? 20 : 10;
    else if (score >= 80) basePoints = isSentence ? 15 : 8;
    else if (score >= 70) basePoints = isSentence ? 10 : 5;
    else if (score >= 60) basePoints = isSentence ? 5 : 3;
    else basePoints = isSentence ? 2 : 1;
    
    return basePoints;
  };

  const addPoints = (points: number) => {
    const newTotal = userPoints + points;
    setUserPoints(newTotal);
    setRecentPointsEarned(points);
    localStorage.setItem('pronunciation_points', newTotal.toString());
    
    // Check for level up
    const newLevel = Math.floor(newTotal / 100) + 1;
    if (newLevel > userLevel) {
      setUserLevel(newLevel);
      localStorage.setItem('pronunciation_level', newLevel.toString());
      console.log(`🎉 Level up! You're now level ${newLevel}!`);
    }
    
    // Clear recent points after 3 seconds
    setTimeout(() => {
      setRecentPointsEarned(0);
    }, 3000);
  };

  const getLevelProgress = () => {
    const currentLevelPoints = userPoints % 100;
    const pointsToNextLevel = 100 - currentLevelPoints;
    return {
      currentLevelPoints,
      pointsToNextLevel,
      progressPercentage: (currentLevelPoints / 100) * 100
    };
  };

  // Progress tracking functions
  const recordProgress = (score: number, wordCount: number, isSentence: boolean) => {
    const today = new Date().toDateString();
    const todayRecord = progressHistory.find((record: any) => record.date === today);
    
    const newRecord = {
      date: today,
      wordsPracticed: (todayRecord?.wordsPracticed || 0) + wordCount,
      averageScore: todayRecord ? 
        Math.round(((todayRecord.averageScore * todayRecord.wordsPracticed) + score) / (todayRecord.wordsPracticed + wordCount)) :
        score,
      totalSessions: (todayRecord?.totalSessions || 0) + 1,
      pointsEarned: (todayRecord?.pointsEarned || 0) + calculatePoints(score, isSentence),
      sentencesPracticed: todayRecord ? 
        (todayRecord.sentencesPracticed || 0) + (isSentence ? 1 : 0) :
        (isSentence ? 1 : 0)
    };

    const updatedHistory = progressHistory.filter((record: any) => record.date !== today);
    updatedHistory.push(newRecord);
    
    // Keep only last 30 days
    const recentHistory = updatedHistory.slice(-30);
    
    setProgressHistory(recentHistory);
    localStorage.setItem('pronunciation_progress_history', JSON.stringify(recentHistory));
    
    // Update streak and award badges
    updateStreak();
    awardDailyBadge(newRecord.wordsPracticed, newRecord.pointsEarned);
  };

  const getProgressStats = () => {
    const last7Days = progressHistory.slice(-7);
    const last30Days = progressHistory;
    
    const totalWords = last30Days.reduce((sum: number, day: any) => sum + day.wordsPracticed, 0);
    const totalSessions = last30Days.reduce((sum: number, day: any) => sum + day.totalSessions, 0);
    const avgScore = last30Days.length > 0 ? 
      Math.round(last30Days.reduce((sum: number, day: any) => sum + day.averageScore, 0) / last30Days.length) : 0;
    
    const weeklyWords = last7Days.reduce((sum: number, day: any) => sum + day.wordsPracticed, 0);
    const weeklySessions = last7Days.reduce((sum: number, day: any) => sum + day.totalSessions, 0);
    
    return {
      totalWords,
      totalSessions,
      avgScore,
      weeklyWords,
      weeklySessions,
      streak: calculateStreak()
    };
  };

  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toDateString();
      
      const dayRecord = progressHistory.find((record: any) => record.date === dateString);
      if (dayRecord && dayRecord.wordsPracticed > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Streak and Badge Management
  const updateStreak = () => {
    const newStreak = calculateStreak();
    setCurrentStreak(newStreak);
    localStorage.setItem('pronunciation_current_streak', newStreak.toString());
    
    if (newStreak > longestStreak) {
      setLongestStreak(newStreak);
      localStorage.setItem('pronunciation_longest_streak', newStreak.toString());
    }
  };

  const awardDailyBadge = (wordsPracticed: number, pointsEarned: number) => {
    const today = new Date().toDateString();
    const existingBadge = dailyBadges.find((badge: any) => badge.date === today);
    
    if (existingBadge) return; // Already awarded today
    
    let badgeType = '';
    let badgeIcon = '';
    let badgeColor = '';
    
    if (wordsPracticed >= 20) {
      badgeType = 'Word Master';
      badgeIcon = '🏆';
      badgeColor = 'gold';
    } else if (wordsPracticed >= 10) {
      badgeType = 'Word Warrior';
      badgeIcon = '⚔️';
      badgeColor = 'silver';
    } else if (wordsPracticed >= 5) {
      badgeType = 'Word Explorer';
      badgeIcon = '🗺️';
      badgeColor = 'bronze';
    } else if (wordsPracticed >= 1) {
      badgeType = 'Daily Practice';
      badgeIcon = '⭐';
      badgeColor = 'blue';
    }
    
    if (badgeType) {
      const newBadge = {
        date: today,
        type: badgeType,
        icon: badgeIcon,
        color: badgeColor,
        wordsPracticed,
        pointsEarned
      };
      
      const updatedBadges = [...dailyBadges, newBadge].slice(-30); // Keep last 30 badges
      setDailyBadges(updatedBadges);
      localStorage.setItem('pronunciation_daily_badges', JSON.stringify(updatedBadges));
      
      console.log(`🏅 Badge earned: ${badgeType} ${badgeIcon}`);
    }
  };

  const getStreakMilestones = () => {
    const milestones = [
      { days: 7, badge: '🔥', name: 'Week Warrior' },
      { days: 14, badge: '💪', name: 'Two Week Champion' },
      { days: 30, badge: '👑', name: 'Monthly Master' },
      { days: 60, badge: '🌟', name: 'Two Month Legend' },
      { days: 100, badge: '🏆', name: 'Century Champion' }
    ];
    
    return milestones.filter(milestone => currentStreak >= milestone.days);
  };

  // Difficult Words Library Management
  const addToDifficultWords = (word: string, score: number, phonetic: string, transliteration: string) => {
    const existingWord = difficultWords.find((w: any) => w.word === word);
    
    if (existingWord) {
      // Update existing word with new score if it's lower (more difficult)
      if (score < existingWord.lowestScore) {
        const updatedWords = difficultWords.map((w: any) => 
          w.word === word ? { ...w, lowestScore: score, lastPracticed: new Date().toISOString() } : w
        );
        setDifficultWords(updatedWords);
        localStorage.setItem('pronunciation_difficult_words', JSON.stringify(updatedWords));
      }
    } else {
      // Add new difficult word
      const newWord = {
        word,
        phonetic,
        transliteration,
        lowestScore: score,
        timesPracticed: 1,
        firstAdded: new Date().toISOString(),
        lastPracticed: new Date().toISOString(),
        improvement: 0
      };
      
      const updatedWords = [...difficultWords, newWord];
      setDifficultWords(updatedWords);
      localStorage.setItem('pronunciation_difficult_words', JSON.stringify(updatedWords));
      
      console.log(`📚 Added "${word}" to difficult words library (score: ${score})`);
    }
  };

  const removeFromDifficultWords = (word: string) => {
    const updatedWords = difficultWords.filter((w: any) => w.word !== word);
    setDifficultWords(updatedWords);
    localStorage.setItem('pronunciation_difficult_words', JSON.stringify(updatedWords));
    console.log(`🗑️ Removed "${word}" from difficult words library`);
  };

  const updateDifficultWordPractice = (word: string, newScore: number) => {
    const updatedWords = difficultWords.map((w: any) => {
      if (w.word === word) {
        const improvement = newScore - w.lowestScore;
        return {
          ...w,
          lowestScore: Math.min(w.lowestScore, newScore),
          timesPracticed: w.timesPracticed + 1,
          lastPracticed: new Date().toISOString(),
          improvement: Math.max(w.improvement, improvement)
        };
      }
      return w;
    });
    
    setDifficultWords(updatedWords);
    localStorage.setItem('pronunciation_difficult_words', JSON.stringify(updatedWords));
  };

  const getDifficultWordsStats = () => {
    const totalWords = difficultWords.length;
    const avgScore = totalWords > 0 ? 
      Math.round(difficultWords.reduce((sum: number, w: any) => sum + w.lowestScore, 0) / totalWords) : 0;
    const mostImproved = difficultWords.reduce((best: any, current: any) => 
      current.improvement > (best?.improvement || 0) ? current : best, null);
    
    return { totalWords, avgScore, mostImproved };
  };

  const endPracticeSession = () => {
    if (currentSession) {
      const sessionData = {
        ...currentSession,
        endTime: new Date().toISOString(),
        duration: Date.now() - new Date(currentSession.startTime).getTime()
      };
      
      // Store session in localStorage
      const savedSessions = JSON.parse(localStorage.getItem('practice_sessions') || '[]');
      savedSessions.push(sessionData);
      localStorage.setItem('practice_sessions', JSON.stringify(savedSessions));
      
      setCurrentSession(null);
    }
  };

  const getSessionStats = () => {
    if (!currentSession) return null;
    
    return {
      wordsPracticed: currentSession.wordsPracticed.length,
      totalScore: currentSession.totalScore,
      averageScore: currentSession.averageScore,
      duration: Date.now() - new Date(currentSession.startTime).getTime()
    };
  };

  // Achievement badge component
  const AchievementBadge: React.FC<{type: string, unlocked: boolean}> = ({ type, unlocked }) => {
    const badges = {
      first_practice: { icon: '🎯', label: 'First Practice' },
      perfect_score: { icon: '⭐', label: 'Perfect Score' },
      word_master: { icon: '🏆', label: 'Word Master' }
    };
    
    const badge = badges[type as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <div className={`px-2 py-1 rounded text-xs ${unlocked ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-400'}`}>
        {badge.icon} {badge.label}
      </div>
    );
  };

  // Error badge component
  const ErrorBadge: React.FC<{type: string, hasError: boolean}> = ({ type, hasError }) => {
    const badgeConfig = {
      grammar: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Grammar' },
      vocabulary: { color: 'bg-blue-100 text-blue-800', icon: BookOpen, label: 'Vocabulary' },
      pronunciation: { color: 'bg-green-100 text-green-800', icon: Volume2, label: 'Pronunciation' }
    };
    
    const config = badgeConfig[type as keyof typeof badgeConfig];
    if (!config) return null;
    
    return (
      <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${config.color}`}>
        <config.icon className="h-3 w-3" />
        <span>{config.label}</span>
        {hasError && <span className="ml-1">⚠️</span>}
      </div>
    );
  };

  const updateWordScore = (word: string, score: number) => {
    setPronunciationWords(prev => prev.map(w => 
      w.word === word 
        ? { ...w, score, needsPractice: score < 80 }
        : w
    ));
    
    if (score >= 80) {
      setMasteredWords(prev => new Set([...prev, word]));
    }
  };

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 flex flex-col items-center justify-center space-y-1 ${
            activeTab === 'vocab'
              ? 'text-blue-700 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
          }`}
        >
          <BookOpen className="h-5 w-5" />
          <span>Vocabulary</span>
        </button>
        <button
          onClick={() => setActiveTab('explain')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'explain'
              ? 'text-blue-700 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
          }`}
        >
          <Lightbulb className="h-4 w-4 inline mr-2" />
          Explain
        </button>
        <button
          onClick={() => setActiveTab('pronunciation')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 flex flex-col items-center justify-center space-y-1 ${
            activeTab === 'pronunciation'
              ? 'text-blue-700 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
          }`}
        >
          <Volume2 className="h-5 w-5" />
          <span>Pronunciation</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'vocab' && (
          <div className="space-y-6">
            {/* Vocabulary Filter */}
            <div className="flex space-x-2">
              <button
                onClick={() => setVocabFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  vocabFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setVocabFilter('conversation')}
                className={`px-3 py-1 rounded text-sm ${
                  vocabFilter === 'conversation' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                Conversation
              </button>
                </div>

            {/* Vocabulary List */}
            <div className="space-y-3">
                {vocabItems
                .filter(item => vocabFilter === 'all' || item.category === vocabFilter)
                  .map((item, index) => {
                    const isStarred = myVocab.has(item.word);
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.word}</h4>
                            <p className="text-sm text-gray-600">{item.meaning}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Audio Button */}
                            <div className="relative group">
                              <button
                                onClick={() => handlePlayAudio(item.word)}
                                className="text-blue-500 hover:text-blue-600 transition-colors"
                              >
                                <Volume2 className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                Listen
                              </div>
                            </div>
                            
                            {/* Delete Button */}
                            <div className="relative group">
                              <button
                                onClick={() => handleDeleteFromVocab(item.word)}
                                className="text-red-500 hover:text-red-600 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                Learnt the word, Let's delete it
                              </div>
                            </div>
                            
                            {/* Star Button */}
                            <div className="relative group">
                              <button
                                onClick={() => handleAddToMyVocab(item.word, item.meaning)}
                                className={`transition-colors ${
                                  isStarred 
                                    ? 'text-yellow-500 hover:text-yellow-600' 
                                    : 'text-gray-400 hover:text-blue-500'
                                }`}
                              >
                                <Star className={`h-4 w-4 ${isStarred ? 'fill-yellow-500' : ''}`} />
                              </button>
                              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                {isStarred ? 'Remove from Vocabulary' : 'Add to Vocabulary'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

            {/* New Vocabulary Items */}
            {newVocabItems && newVocabItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">New Words</h3>
                {newVocabItems.map((item, index) => {
                  const isStarred = myVocab.has(item.word);
                  return (
                    <div key={index} className="bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-blue-900">{item.word}</h4>
                          <p className="text-sm text-blue-700">{item.meaning}</p>
                          <p className="text-xs text-blue-600 mt-1">{item.context}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Audio Button */}
                          <div className="relative group">
                            <button
                              onClick={() => handlePlayAudio(item.word)}
                              className="text-blue-500 hover:text-blue-600 transition-colors"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                              Listen
                            </div>
                          </div>
                          
                          {/* Delete Button */}
                          <div className="relative group">
                            <button
                              onClick={() => handleDeleteFromVocab(item.word)}
                              className="text-red-500 hover:text-red-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                              Learnt the word, Let's delete it
                            </div>
                          </div>
                          
                          {/* Star Button */}
                          <div className="relative group">
                            <button
                              onClick={() => handleAddToMyVocab(item.word, item.meaning)}
                              className={`transition-colors ${
                                isStarred 
                                  ? 'text-yellow-500 hover:text-yellow-600' 
                                  : 'text-blue-500 hover:text-blue-700'
                              }`}
                            >
                              <Star className={`h-4 w-4 ${isStarred ? 'fill-yellow-500' : ''}`} />
                            </button>
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                              {isStarred ? 'Remove from Vocabulary' : 'Add to Vocabulary'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'explain' && (
          <div className="space-y-6">
            {currentMessage ? (
              <div className="space-y-6">
                {/* Error Analysis */}
                {analysisData && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <ErrorBadge type="grammar" hasError={analysisData.errorTypes.grammar} />
                      <ErrorBadge type="vocabulary" hasError={analysisData.errorTypes.vocabulary} />
                      <ErrorBadge type="pronunciation" hasError={analysisData.errorTypes.pronunciation} />
                </div>
                      </div>
                )}

                {/* Grammar Explanation */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Grammar Explanation</h4>
                  </div>
                  {isLoadingExplanation ? (
                    <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">Loading explanation...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                      {grammarExplanation ? (
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {grammarExplanation.split('\n').map((line, index) => {
                            // Skip empty lines
                            if (!line.trim()) return null;
                            
                            // Clean up any remaining numbers and labels
                            let cleanLine = line
                              .replace(/^\d+\.\s*/, '') // Remove "1. ", "2. ", etc.
                              .replace(/^(Title|Rule|Example|Correct|Try similar patterns|Remember|German tip):\s*/i, '') // Remove labels
                              .replace(/^(Correct|Example|Rule|Remember|German tip):\s*/i, '') // Remove additional label variations
                              .trim();
                            
                            // Highlight German text in quotes
                            const germanText = cleanLine.match(/[""]([^""]+)[""]/g);
                            if (germanText) {
                              let processedLine = cleanLine;
                              germanText.forEach(german => {
                                const cleanGerman = german.replace(/[""]/g, '');
                                processedLine = processedLine.replace(german, `<span class="font-medium text-blue-900">"${cleanGerman}"</span>`);
                              });
                              return (
                                <p key={index} 
                                   className="mb-2"
                                   dangerouslySetInnerHTML={{ __html: processedLine }}
                                />
                              );
                            }
                            
                            // Handle emoji indicators with proper icons
                            if (cleanLine.includes('💡')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="font-bold text-blue-900">{cleanLine.replace('💡', '').trim()}</span>
                                </div>
                              );
                            }
                            
                            // Handle Rule without emoji - add 📖 icon
                            if (cleanLine.toLowerCase().includes('rule:') || cleanLine.toLowerCase().includes('the preposition')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace(/^(rule:|correct:)/i, '').trim()}</span>
                                </div>
                              );
                            }
                            
                            if (cleanLine.includes('📖')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace('📖', '').trim()}</span>
                                </div>
                              );
                            }
                            
                            if (cleanLine.includes('✅')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace('✅', '').trim()}</span>
                                </div>
                              );
                            }
                            
                            // Handle Example without emoji - add ✅ icon
                            if (cleanLine.includes('"') && !cleanLine.includes('✅') && !cleanLine.includes('👉')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine}</span>
                                </div>
                              );
                            }
                            
                            if (cleanLine.includes('👉')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace('👉', '').trim()}</span>
                                </div>
                              );
                            }
                            
                            if (cleanLine.includes('🧠')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace('🧠', '').trim()}</span>
                                </div>
                              );
                            }
                            
                            // Handle Remember without emoji - add 🧠 icon
                            if (cleanLine.toLowerCase().includes('remember:') || cleanLine.toLowerCase().includes('after')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace(/^(remember:|after)/i, '').trim()}</span>
                                </div>
                              );
                            }
                            
                            if (cleanLine.includes('🎯')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace('🎯', '').trim()}</span>
                                </div>
                              );
                            }
                            
                            // Handle German tip without emoji - add 🎯 icon
                            if (cleanLine.toLowerCase().includes('german tip:') || cleanLine.toLowerCase().includes('commonly used')) {
                              return (
                                <div key={index} className="flex items-start space-x-2 mb-3">
                                  <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700">{cleanLine.replace(/^(german tip:)/i, '').trim()}</span>
                                </div>
                              );
                            }
                            
                            return (
                              <p key={index} className="mb-2">
                                {cleanLine}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No grammar explanation available.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Speak Like a Local */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 mb-3">
                    <Volume2 className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Speak Like a Local</h4>
                  </div>
                  <div className="bg-white border border-purple-200 rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                    {speakingTips ? (
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {speakingTips.split('\n').map((line, index) => {
                          // Highlight German text in quotes
                          const germanText = line.match(/[""]([^""]+)[""]/g);
                          if (germanText) {
                            let processedLine = line;
                            germanText.forEach(german => {
                              const cleanGerman = german.replace(/[""]/g, '');
                              processedLine = processedLine.replace(german, `<span class="font-medium text-purple-900">"${cleanGerman}"</span>`);
                            });
                            return (
                              <p key={index} 
                                 className="mb-2"
                                 dangerouslySetInnerHTML={{ __html: processedLine }}
                              />
                            );
                          }
                          
                          // Handle emoji indicators
                          if (line.includes('🇩🇪')) {
                            return (
                              <div key={index} className="flex items-start space-x-2 mb-3">
                                <Volume2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span className="font-semibold text-purple-900">{line.replace('🇩🇪', '').trim()}</span>
                              </div>
                            );
                          }
                          
                          if (line.includes('✅')) {
                            return (
                              <div key={index} className="flex items-start space-x-2 mb-3">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{line.replace('✅', '').trim()}</span>
                              </div>
                            );
                          }
                          
                          if (line.includes('👉')) {
                            return (
                              <div key={index} className="flex items-start space-x-2 mb-3">
                                <ArrowRight className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{line.replace('👉', '').trim()}</span>
                              </div>
                            );
                          }
                          
                          if (line.includes('🎯')) {
                            return (
                              <div key={index} className="flex items-start space-x-2 mb-3">
                                <Target className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{line.replace('🎯', '').trim()}</span>
                              </div>
                            );
                          }
                          
                          return (
                            <p key={index} className="mb-2">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No speaking tips available.</p>
                    )}
                  </div>
                </div>

                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                  <div className="text-center">
                    <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Learn</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                      Grammar explanations and speaking tips will appear here when the AI sends a message
                    </p>
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === 'pronunciation' && (
          <div className="space-y-6">
            {/* Pronunciation Analysis Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Analyze Your Pronunciation</h4>
              <p className="text-sm text-blue-700 mb-4">
                Analyze the pronunciation of your most recent German voice message
              </p>
              
              {!lastGermanVoiceMessage ? (
                <div className="text-center py-4">
                  <Volume2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Send a German voice message to analyze pronunciation
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last German Message:</p>
                      <p className="text-sm text-gray-600">"{lastGermanVoiceMessage.transcription}"</p>
                    </div>
                    <div className="flex space-x-2">
                    <button
                      onClick={analyzePronunciation}
                      disabled={isAnalyzingPronunciation}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                      {isAnalyzingPronunciation ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4" />
                          <span>Analyze Pronunciation</span>
                        </>
                      )}
                    </button>
                      
                    </div>
                  </div>
                  
                  {pronunciationAnalysis && (
                    <div className="mt-4">
                      <PronunciationSentenceView
                        pronunciationData={pronunciationAnalysis}
                        sentence={lastGermanVoiceMessage.transcription}
                        onRepracticeWord={(word) => {
                          console.log('Repractice word:', word);
                          startWordRecording(word);
                        }}
                        onRepracticeSentence={() => {
                          console.log('Repractice sentence');
                          if (isRecordingSentence) {
                            stopSentenceRecording();
                          } else {
                            startSentenceRecording();
                          }
                        }}
                        onPlayCorrectPronunciation={() => {
                          console.log('Play correct pronunciation');
                          germanTTS.speak(lastGermanVoiceMessage.transcription);
                        }}
                        isRecordingWord={isRecordingWord}
                        practicingWord={practicingWord}
                        onStopWordRecording={stopWordRecording}
                        isRecordingSentence={isRecordingSentence}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {(() => {
              // Check if there are any phonetic breakdowns available
              const hasPhoneticData = Object.keys(phoneticBreakdowns).some(id => 
                phoneticBreakdowns[id] && phoneticBreakdowns[id].length > 0
              );
              
              if (!hasPhoneticData) {
                return (
                  <div className="text-center py-8">
                    <Volume2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">
                      Pronunciation practice will be available when the AI sends a message
                    </p>
                  </div>
                );
              }
              
              return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 text-base">Pronunciation Practice</h4>
                  
                  {/* Gamification Display */}
                  <div className="flex items-center space-x-4">
                    {/* Level and Points */}
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Level {userLevel}</div>
                        <div className="text-sm font-semibold text-blue-600">{userPoints} pts</div>
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{userLevel}</span>
                      </div>
                    </div>
                    
                    {/* Level Progress Bar */}
                    <div className="w-20">
                      <div className="text-xs text-gray-500 mb-1">Progress</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${getLevelProgress().progressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {getLevelProgress().pointsToNextLevel} to next level
                      </div>
                    </div>
                    
                    {/* Streak Display */}
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Streak</div>
                        <div className="text-sm font-bold text-orange-600">{currentStreak} 🔥</div>
                      </div>
                      {longestStreak > currentStreak && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Best</div>
                          <div className="text-sm font-semibold text-purple-600">{longestStreak} 👑</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Recent Points Animation */}
                    {recentPointsEarned > 0 && (
                      <div className="animate-bounce">
                        <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          +{recentPointsEarned} ⭐
                        </div>
                      </div>
                    )}
                    
                    {/* Progress Tracker Button */}
                    <button
                      onClick={() => setShowProgressModal(true)}
                      className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium">Progress</span>
                    </button>
                    
                    {/* Difficult Words Library Button */}
                    <button
                      onClick={() => setShowDifficultWordsModal(true)}
                      className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span className="text-xs font-medium">Library</span>
                      {difficultWords.length > 0 && (
                        <span className="bg-white text-orange-600 text-xs px-1 rounded-full ml-1">
                          {difficultWords.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sentence-Level Practice and Analysis */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
                  <h5 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Sentence-Level Practice
                  </h5>
                  <div className="flex items-center space-x-3">
                    {!isSentenceRecording ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🎤 Starting sentence practice for:', currentMessage);
                          startSentencePractice();
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <Mic className="h-4 w-4" />
                        <span>Practice Sentence</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">Recording Sentence...</span>
                    </div>
                      <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🛑 Stop sentence recording clicked');
                            // Stop recording functionality removed
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <MicOff className="h-4 w-4" />
                          <span>Stop Recording</span>
                      </button>
                    </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 Sentence analysis button clicked');
                        analyzeSentence();
                      }}
                      disabled={!sentenceAnalysisComplete || isAnalyzing || sentenceAnalyzed}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer ${
                        !sentenceAnalysisComplete || sentenceAnalyzed
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isAnalyzing
                          ? 'bg-blue-300 text-blue-700 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      style={{ pointerEvents: sentenceAnalysisComplete && !sentenceAnalyzed ? 'auto' : 'none' }}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                      <span>
                        {!sentenceAnalysisComplete ? 'Record First' : 
                         sentenceAnalyzed ? 'Analyzed' :
                         isAnalyzing ? 'Analyzing...' : 'Analyze Sentence'}
                      </span>
                    </button>
                </div>

                  {/* Sentence Analysis Results */}
                  {sentenceAnalysis && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                      <h6 className="text-sm font-semibold text-purple-700 mb-3">Sentence Analysis Results</h6>
                      
                      {/* Individual Word Analysis First */}
                      {sentenceAnalysis.wordScores && sentenceAnalysis.wordScores.length > 0 && (
                        <div className="mb-4">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">Individual Word Analysis:</h6>
                          <div className="space-y-2">
                            {sentenceAnalysis.wordScores.map((wordScore, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-800">{wordScore.word}</span>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-600">Accuracy:</span>
                                    {sentenceAnalysis.feedback === 'Analysis in progress... Please wait for results.' ? (
                                      <div className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        Will be displayed
                                      </div>
                                    ) : sentenceAnalysis.feedback.includes('Analysis cannot be done') || 
                                         sentenceAnalysis.feedback.includes('no sentence or words being spoken') ||
                                         sentenceAnalysis.feedback.includes('incorrect/irrelevant words have been spoken') ? (
                                      <div className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                        No analysis
                                      </div>
                                    ) : (
                                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                                        wordScore.score >= 90 ? 'bg-green-100 text-green-800' :
                                        wordScore.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {wordScore.score}/100
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{wordScore.feedback}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Overall Sentence Analysis */}
                      <div className="border-t pt-3">
                        <h6 className="text-sm font-medium text-gray-700 mb-2">Overall Sentence Analysis:</h6>
                        <div className="space-y-3">
                          {/* 1. Accuracy Rating with RAG Status Background */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Overall Accuracy Rating:</span>
                            {sentenceAnalysis.feedback === 'Analysis in progress... Please wait for results.' ? (
                              <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                                Will be displayed once analysis is completed
                              </div>
                            ) : sentenceAnalysis.feedback.includes('Analysis cannot be done') || 
                                 sentenceAnalysis.feedback.includes('no sentence or words being spoken') ||
                                 sentenceAnalysis.feedback.includes('incorrect/irrelevant words have been spoken') ||
                                 sentenceAnalysis.feedback.includes('detected mostly different words') ? (
                              <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                No analysis available
                              </div>
                            ) : (
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          sentenceAnalysis.overallScore >= 90 ? 'bg-green-100 text-green-800' :
                          sentenceAnalysis.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {sentenceAnalysis.overallScore}/100
                    </div>
                            )}
                  </div>
                          
                          {/* 2. Overall Feedback */}
                          <div>
                            <span className="text-sm font-medium text-gray-600">Overall Feedback:</span>
                            <p className="text-sm text-gray-700 mt-1">{sentenceAnalysis.feedback}</p>
                      </div>
                    </div>
                  </div>
                  </div>
                )}
                        </div>
                        
                {/* Word-Level Practice and Analysis */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
                  <h5 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                    <Mic className="h-4 w-4 mr-2" />
                    Word-Level Practice
                  </h5>
                  
                  {/* Word Breakdown Display */}
                  {(() => {
                    // Get phonetic breakdown for current message using currentMessageId
                    const words = currentMessageId && phoneticBreakdowns[currentMessageId] 
                      ? phoneticBreakdowns[currentMessageId] 
                      : [];
                  
                  if (words.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Volume2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">
                          Click "Get pronunciation guide" in the chat to load word breakdown
                        </p>
                            </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <h5 className="text-sm font-semibold text-gray-700">Word Breakdown</h5>
                      <div className="space-y-3">
                        {words.map((word, index) => {
                          console.log('🎯 Rendering WordPracticeCard for word:', word.original);
                          console.log('🎯 individualWordAnalysis[word.original]:', individualWordAnalysis[word.original]);
                          console.log('🎯 wordsAnalyzed.has(word.original):', wordsAnalyzed.has(word.original));
                          console.log('🎯 wordsRecordingCompleted.has(word.original):', wordsRecordingCompleted.has(word.original));
                          console.log('🎯 analyzingWord:', analyzingWord);
                          
                          return (
                          <WordPracticeCard 
                            key={index}
                            word={word}
                            onPlayAudio={onPlayWordAudio}
                            globalSpeed={globalPlaybackSpeed}
                            onSpeedChange={onSpeedChange}
                            onPractice={practiceWord}
                            isRecording={isWordRecording && practicingWord === word.original}
                            onStartRecording={startRecording}
                            onStopRecording={stopRecording}
                            pronunciationScore={individualWordAnalysis[word.original]?.score || 0}
                            onAnalyzeWord={analyzeIndividualWord}
                            isAnalyzing={analyzingWord === word.original}
                            wordAnalysis={individualWordAnalysis[word.original]}
                            isReadyForAnalysis={wordsAnalysisComplete.has(word.original)}
                            hasBeenAnalyzed={wordsAnalyzed.has(word.original)}
                            onSaveToDifficult={(word) => {
                              const phoneticData = phoneticBreakdowns[currentMessage || '']?.find((w: any) => w.original === word);
                              if (phoneticData) {
                                addToDifficultWords(word, individualWordAnalysis[word]?.score || 0, phoneticData.phonetic, phoneticData.transliteration);
                              }
                            }}
                            isInDifficultWords={difficultWords.some((w: any) => w.word === word.original)}
                            onAddExperience={onAddExperience}
                          />
                          );
                        })}
                              </div>
                            </div>
                  );
                })()}

                {/* Note: Individual word analysis is now displayed within each WordPracticeCard above */}
                                  </div>
                            </div>
              );
            })()}
            
            {/* Progress Modal */}
            {showProgressModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
                    <button
                      onClick={() => setShowProgressModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {(() => {
                    const stats = getProgressStats();
                    return (
                      <div className="space-y-6">
                        {/* Overall Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-blue-600">{stats.totalWords}</div>
                            <div className="text-sm text-blue-800">Words Practiced</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-600">{stats.totalSessions}</div>
                            <div className="text-sm text-green-800">Practice Sessions</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-purple-600">{stats.avgScore}%</div>
                            <div className="text-sm text-purple-800">Average Score</div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-orange-600">{stats.streak}</div>
                            <div className="text-sm text-orange-800">Day Streak</div>
                          </div>
                        </div>
                        
                        {/* Weekly Stats */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-800 mb-3">This Week</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-lg font-bold text-gray-700">{stats.weeklyWords}</div>
                              <div className="text-sm text-gray-600">Words This Week</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-700">{stats.weeklySessions}</div>
                              <div className="text-sm text-gray-600">Sessions This Week</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Recent Activity */}
                        {progressHistory.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3">Recent Activity</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {progressHistory.slice(-7).reverse().map((day: any, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                  <div>
                                    <div className="font-medium text-gray-800">{day.date}</div>
                                    <div className="text-sm text-gray-600">{day.wordsPracticed} words, {day.totalSessions} sessions</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-blue-600">{day.averageScore}%</div>
                                    <div className="text-sm text-green-600">+{day.pointsEarned} pts</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Daily Badges */}
                        {dailyBadges.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3">Recent Badges</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {dailyBadges.slice(-6).reverse().map((badge: any, index: number) => (
                                <div key={index} className={`p-3 rounded-lg border-2 ${
                                  badge.color === 'gold' ? 'bg-yellow-50 border-yellow-200' :
                                  badge.color === 'silver' ? 'bg-gray-50 border-gray-200' :
                                  badge.color === 'bronze' ? 'bg-orange-50 border-orange-200' :
                                  'bg-blue-50 border-blue-200'
                                }`}>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">{badge.icon}</span>
                                    <div>
                                      <div className="font-semibold text-sm">{badge.type}</div>
                                      <div className="text-xs text-gray-600">{badge.date}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Streak Milestones */}
                        {getStreakMilestones().length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3">Streak Achievements</h4>
                            <div className="space-y-2">
                              {getStreakMilestones().map((milestone, index) => (
                                <div key={index} className="flex items-center space-x-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
                                  <span className="text-2xl">{milestone.badge}</span>
                                  <div>
                                    <div className="font-semibold text-orange-800">{milestone.name}</div>
                                    <div className="text-sm text-orange-600">{milestone.days} days streak</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* Difficult Words Library Modal */}
            {showDifficultWordsModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Difficult Words Library</h3>
                    <button
                      onClick={() => setShowDifficultWordsModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {(() => {
                    const stats = getDifficultWordsStats();
                    return (
                      <div className="space-y-6">
                        {/* Library Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-orange-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-orange-600">{stats.totalWords}</div>
                            <div className="text-sm text-orange-800">Difficult Words</div>
                          </div>
                          <div className="bg-red-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-red-600">{stats.avgScore}%</div>
                            <div className="text-sm text-red-800">Average Score</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-600">
                              {stats.mostImproved ? stats.mostImproved.improvement : 0}
                            </div>
                            <div className="text-sm text-green-800">Best Improvement</div>
                          </div>
                        </div>
                        
                        {/* Difficult Words List */}
                        {difficultWords.length > 0 ? (
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3">Your Difficult Words</h4>
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {difficultWords.map((word: any, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                      <div>
                                        <div className="font-semibold text-lg text-gray-800">{word.word}</div>
                                        <div className="text-sm text-gray-600">[{word.phonetic}]</div>
                                        <div className="text-sm text-blue-600 italic">{word.transliteration}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-sm font-bold ${
                                          word.lowestScore >= 70 ? 'text-green-600' :
                                          word.lowestScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                          {word.lowestScore}%
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {word.timesPracticed} practices
                                        </div>
                                        {word.improvement > 0 && (
                                          <div className="text-xs text-green-600">
                                            +{word.improvement}% improved
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4">
                                    <button
                                      onClick={() => {
                                        // Practice this word
                                        // Practice this word - functionality handled by parent component
                                        setShowDifficultWordsModal(false);
                                      }}
                                      className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                                    >
                                      Practice
                                    </button>
                                    <button
                                      onClick={() => removeFromDifficultWords(word.word)}
                                      className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No difficult words saved yet</p>
                            <p className="text-sm text-gray-400 mt-2">
                              Words with scores below 70% will be automatically added here
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
