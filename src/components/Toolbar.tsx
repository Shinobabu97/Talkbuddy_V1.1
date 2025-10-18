import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Lightbulb, Volume2, Star, X, Play, Mic, MicOff, Loader2, AlertCircle, CheckCircle, Target, Trophy, ChevronUp, ChevronDown, TrendingUp } from 'lucide-react';
import { germanTTS } from '../lib/tts';

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
  hasBeenAnalyzed = false
}) => {
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
          onClick={() => onPlayAudio?.(word.original, wordSpeed)}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🖱️ Practice button clicked for word:', word.original);
              console.log('🖱️ onPractice function exists:', !!onPractice);
              onPractice(word.original);
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
                console.log('🛑 Stop recording button clicked');
                onStopRecording();
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔍 Analyze button clicked for word:', word.original);
            if (onAnalyzeWord) {
              onAnalyzeWord(word.original);
            }
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
      </div>

      {/* Individual Word Analysis Results */}
      {wordAnalysis && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
          <h6 className="text-sm font-semibold text-gray-700 mb-2">Analysis Results</h6>
          
          {/* Overall Score */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Overall Score:</span>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              wordAnalysis.score >= 90 ? 'bg-green-100 text-green-800' :
              wordAnalysis.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {wordAnalysis.score}/100
            </div>
          </div>

          {/* Feedback */}
          <div className="mb-3">
            <span className="text-sm font-medium text-gray-600">Feedback:</span>
            <p className="text-sm text-gray-700 mt-1">{wordAnalysis.feedback}</p>
          </div>

          {/* Syllable Analysis */}
          {wordAnalysis.syllableAnalysis && wordAnalysis.syllableAnalysis.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">Syllable Breakdown:</span>
              <div className="mt-2 space-y-2">
                {wordAnalysis.syllableAnalysis.map((syllable, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{syllable.syllable}</span>
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
  onSpeedChange
}: ToolbarProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'vocab' | 'explain' | 'pronunciation'>('explain');
  
  // Use external activeTab if provided, otherwise use internal state
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = onTabChange || setInternalActiveTab;
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
  const isStoppingRef = useRef(false);
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
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        const data = await response.json();
        setGrammarExplanation(data.explanation || 'No grammar explanation available.');
        setExplanationCache(prev => ({
          ...prev,
          [message]: { ...prev[message], grammar: data.explanation || 'No grammar explanation available.' }
        }));
      }
    } catch (error) {
      console.error('Error loading grammar explanation:', error);
      setGrammarExplanation('Error loading grammar explanation.');
    } finally {
      setIsLoadingExplanation(false);
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
  const practiceWord = (word: string) => {
    console.log('🎤 Starting practice for word:', word);
    console.log('🎤 Current practicing word:', practicingWord);
    console.log('🎤 Current recording state:', isRecording);
    
    // Reset stopping flag and analysis state for this word
    isStoppingRef.current = false;
    setWordsAnalyzed(prev => {
      const newSet = new Set(prev);
      newSet.delete(word);
      return newSet;
    });
    setWordsReadyForAnalysis(prev => {
      const newSet = new Set(prev);
      newSet.delete(word);
      return newSet;
    });
    
    setPracticingWord(word);
    setCurrentAttempt(0);
    startRecording();
  };

  const startWordPractice = async () => {
    if (!practicingWord) return;
    
    try {
      // Start recording for specific word
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
          chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await analyzePronunciation(audioBlob);
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
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('🎤 Audio blob created, size:', audioBlob.size);
        
        // Don't set isRecording to false here - let the stopRecording function handle it
        await analyzePronunciation(audioBlob);
        
        console.log('🎤 Recording analysis completed');
      };

      // Start recording immediately
      recorder.start();
      setMediaRecorder(recorder);
      
      // Set recording state after a small delay to ensure recorder is ready
      setTimeout(() => {
        setIsRecording(true);
        console.log('🎤 Recording started for pronunciation practice');
        console.log('🎤 Recording state set to true');
      }, 100);
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  };

  const stopRecording = () => {
    console.log('🛑 stopRecording called');
    console.log('🛑 MediaRecorder exists:', !!mediaRecorder);
    console.log('🛑 Is recording:', isRecording);
    console.log('🛑 Is stopping:', isStoppingRef.current);
    
    if (mediaRecorder && isRecording && !isStoppingRef.current) {
      console.log('🛑 Stopping recording...');
      isStoppingRef.current = true;
      mediaRecorder.stop();
      
      // Set recording state to false immediately when user clicks stop
      setIsRecording(false);
      
      // Mark word as ready for analysis immediately
      if (practicingWord) {
        if (practicingWord === 'sentence') {
          // For sentence practice, mark all words as ready for analysis
          const words = currentMessage?.split(' ') || [];
          setWordsReadyForAnalysis(prev => new Set([...prev, ...words]));
          console.log('✅ All words marked as ready for sentence analysis:', words);
        } else {
          setWordsReadyForAnalysis(prev => new Set([...prev, practicingWord]));
          console.log('✅ Word marked as ready for analysis:', practicingWord);
        }
      }
      
      console.log('🎤 Recording stopped and state set to false');
      
      // Reset the stopping flag after a short delay
      setTimeout(() => {
        isStoppingRef.current = false;
        console.log('🛑 Stopping flag reset');
      }, 1000);
        } else {
      console.log('🛑 Cannot stop recording - no recorder, not recording, or already stopping');
    }
  };

  const analyzePronunciation = async (audioBlob: Blob) => {
    try {
      console.log('📊 Analyzing pronunciation for word:', practicingWord);
      
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Send to pronunciation analysis
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

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Pronunciation analysis result:', data);
        
        if (data.words && data.words.length > 0) {
          const wordAnalysis = data.words[0]; // Get first word analysis
          const pronunciationData: PronunciationWord = {
            word: wordAnalysis.word,
            score: wordAnalysis.score || 0,
            needsPractice: wordAnalysis.needsPractice,
            feedback: wordAnalysis.feedback || 'Practice this word',
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
          
          console.log('✅ Pronunciation analysis completed for:', wordAnalysis.word, 'Score:', wordAnalysis.score);
        }
      } else {
        console.error('❌ Pronunciation analysis failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Error analyzing pronunciation:', error);
    }
  };

  // Individual word analysis function
  const analyzeIndividualWord = async (word: string) => {
    console.log('🔍 Analyzing individual word:', word);
    setAnalyzingWord(word);
    
    try {
      // For now, create mock analysis data
      const mockAnalysis = {
        score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
        feedback: `Good pronunciation of "${word}". Focus on the vowel sounds for better accuracy.`,
        syllableAnalysis: word.split('').map((char, index) => ({
          syllable: char,
          score: Math.floor(Math.random() * 30) + 70,
          feedback: `Good pronunciation of "${char}"`
        }))
      };
      
      console.log('📊 Mock analysis for word:', word, mockAnalysis);
      
      setIndividualWordAnalysis(prev => ({
        ...prev,
        [word]: mockAnalysis
      }));
      
      // Add points for word analysis
      const pointsEarned = calculatePoints(mockAnalysis.score, false);
      addPoints(pointsEarned);
      console.log(`⭐ Earned ${pointsEarned} points for "${word}" (score: ${mockAnalysis.score})`);
      
      // Record progress
      recordProgress(mockAnalysis.score, 1, false);
      
      // Mark word as analyzed
      setWordsAnalyzed(prev => new Set([...prev, word]));
      setWordsReadyForAnalysis(prev => {
        const newSet = new Set(prev);
        newSet.delete(word);
        return newSet;
      });
      
      console.log('✅ Individual word analysis completed for:', word);
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
    
    // Use the same recording logic as individual words
    setPracticingWord('sentence');
    startRecording();
  };

  // Sentence-level analysis function
  const analyzeSentence = async () => {
    console.log('🔍 Analyzing sentence:', currentMessage);
    setIsAnalyzing(true);
    
    try {
      // For now, create mock sentence analysis data
      const words = currentMessage?.split(' ') || [];
      const mockSentenceAnalysis = {
        overallScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
        feedback: `Good overall pronunciation of the sentence. Pay attention to word stress and rhythm.`,
        wordScores: words.map(word => ({
          word: word,
          score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
          feedback: `Good pronunciation of "${word}"`
        }))
      };
      
      console.log('📊 Mock sentence analysis:', mockSentenceAnalysis);
      
      setSentenceAnalysis(mockSentenceAnalysis);
      
      // Add points for sentence analysis
      const pointsEarned = calculatePoints(mockSentenceAnalysis.overallScore, true);
      addPoints(pointsEarned);
      console.log(`⭐ Earned ${pointsEarned} points for sentence analysis (score: ${mockSentenceAnalysis.overallScore})`);
      
      // Record progress
      recordProgress(mockSentenceAnalysis.overallScore, currentMessage.split(' ').length, true);
      
      // Mark sentence as analyzed
      setSentenceAnalyzed(true);
      
      console.log('✅ Sentence analysis completed');
    } catch (error) {
      console.error('❌ Error analyzing sentence:', error);
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

  // Progress tracking functions
  const getProgressStats = () => {
    const sessions = JSON.parse(localStorage.getItem('practice_sessions') || '[]');
    const totalWordsPracticed = sessions.reduce((total: number, session: any) => total + session.wordsPracticed.length, 0);
    const totalScore = sessions.reduce((total: number, session: any) => total + session.totalScore, 0);
    const averageScore = sessions.length > 0 ? totalScore / sessions.length : 0;
    
    return {
      level: Math.floor(totalWordsPracticed / 10) + 1,
      xp: totalWordsPracticed * 10,
      xpToNextLevel: 10 - (totalWordsPracticed % 10),
      totalWordsMastered: masteredWords.size,
      streak: sessions.length,
      achievements: ['first_practice', 'perfect_score', 'word_master']
    };
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
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'vocab'
              ? 'text-blue-700 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
          }`}
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Vocabulary
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
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'pronunciation'
              ? 'text-blue-700 border-b-2 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
              : 'text-slate-600 hover:text-slate-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
          }`}
        >
          <Volume2 className="h-4 w-4 inline mr-2" />
          Pronunciation
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
                  .map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.word}</h4>
                        <p className="text-sm text-gray-600">{item.meaning}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                        </div>
                        <button
                        onClick={() => onAddToVocab(item.word, item.meaning)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Star className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

            {/* New Vocabulary Items */}
            {newVocabItems && newVocabItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">New Words</h3>
                {newVocabItems.map((item, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-blue-900">{item.word}</h4>
                        <p className="text-sm text-blue-700">{item.meaning}</p>
                        <p className="text-xs text-blue-600 mt-1">{item.context}</p>
                </div>
                      <button
                        onClick={() => onAddToVocab(item.word, item.meaning)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                </div>
                  </div>
                ))}
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
                  <h4 className="font-semibold text-gray-900">Grammar Explanation</h4>
                  {isLoadingExplanation ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Loading explanation...</span>
                        </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{grammarExplanation || 'No grammar explanation available.'}</p>
                    </div>
                  )}
                </div>

                  {/* Speaking Tips */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Speaking Tips</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{speakingTips || 'No speaking tips available.'}</p>
                    </div>
                </div>

                {/* Practice Tips */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Practice Tips</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Listen to the pronunciation first
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Repeat the sentence slowly
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Focus on difficult sounds
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        Practice with rhythm and intonation
                      </li>
                    </ul>
                  </div>
                </div>
                </div>
              ) : (
                <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Grammar explanations will be available when the AI sends a message
                </p>
                </div>
              )}
          </div>
        )}

        {activeTab === 'pronunciation' && (
          <div className="space-y-6">
            {currentMessage ? (
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
                  </div>
                </div>

                {/* Sentence-Level Practice and Analysis */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
                  <h5 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Sentence-Level Practice
                  </h5>
                  <div className="flex items-center space-x-3">
                    {!isRecording ? (
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
                            stopRecording();
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
                      disabled={!wordsReadyForAnalysis.size || isAnalyzing || sentenceAnalyzed}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer ${
                        !wordsReadyForAnalysis.size || sentenceAnalyzed
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isAnalyzing
                          ? 'bg-blue-300 text-blue-700 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      style={{ pointerEvents: wordsReadyForAnalysis.size && !sentenceAnalyzed ? 'auto' : 'none' }}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                      <span>
                        {!wordsReadyForAnalysis.size ? 'Record First' : 
                         sentenceAnalyzed ? 'Analyzed' :
                         isAnalyzing ? 'Analyzing...' : 'Analyze Sentence'}
                      </span>
                    </button>
                </div>

                  {/* Sentence Analysis Results */}
                  {sentenceAnalysis && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                      <h6 className="text-sm font-semibold text-purple-700 mb-2">Sentence Analysis Results</h6>
                      
                      {/* Overall Sentence Score */}
                        <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">Overall Sentence Score:</span>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          sentenceAnalysis.overallScore >= 90 ? 'bg-green-100 text-green-800' :
                          sentenceAnalysis.overallScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {sentenceAnalysis.overallScore}/100
                    </div>
                  </div>
                  
                      {/* Sentence Feedback */}
                        <div className="mb-3">
                        <span className="text-sm font-medium text-gray-600">Feedback:</span>
                        <p className="text-sm text-gray-700 mt-1">{sentenceAnalysis.feedback}</p>
                </div>

                      {/* Word-by-Word Analysis */}
                      {sentenceAnalysis.wordScores && sentenceAnalysis.wordScores.length > 0 && (
                      <div>
                          <span className="text-sm font-medium text-gray-600">Word-by-Word Analysis:</span>
                          <div className="mt-2 space-y-1">
                            {sentenceAnalysis.wordScores.map((wordScore, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-800">{wordScore.word}</span>
                            <div className="flex items-center space-x-2">
                                  <div className={`px-2 py-1 rounded text-xs ${
                                    wordScore.score >= 90 ? 'bg-green-100 text-green-800' :
                                    wordScore.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                    {wordScore.score}/100
                      </div>
                                  <span className="text-gray-500 italic text-xs">{wordScore.feedback}</span>
                      </div>
                      </div>
                                ))}
                    </div>
                  </div>
                )}
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
                    // Get phonetic breakdown for current message
                    const messageId = Object.keys(phoneticBreakdowns).find(id => 
                      phoneticBreakdowns[id] && phoneticBreakdowns[id].length > 0
                    );
                    const words = messageId ? phoneticBreakdowns[messageId] : [];
                  
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
                        {words.map((word, index) => (
                          <WordPracticeCard 
                            key={index}
                            word={word}
                            onPlayAudio={onPlayWordAudio}
                            globalSpeed={globalPlaybackSpeed}
                            onSpeedChange={onSpeedChange}
                            onPractice={practiceWord}
                            isRecording={isRecording && practicingWord === word.original}
                            onStartRecording={startRecording}
                            onStopRecording={stopRecording}
                            pronunciationScore={pronunciationWords.find(w => w.word === word.original)?.score}
                            onAnalyzeWord={analyzeIndividualWord}
                            isAnalyzing={analyzingWord === word.original}
                            wordAnalysis={individualWordAnalysis[word.original]}
                            isReadyForAnalysis={wordsReadyForAnalysis.has(word.original)}
                            hasBeenAnalyzed={wordsAnalyzed.has(word.original)}
                          />
                                ))}
                              </div>
                            </div>
                  );
                })()}

                {/* Analysis Results */}
                {pronunciationWords.length > 0 && (
                  <div className="space-y-4">
                    <h5 className="text-sm font-semibold text-gray-700">Analysis Results</h5>
                    <div className="space-y-3">
                    {pronunciationWords.map((wordData, index) => (
                        <div key={index} className={`rounded-xl p-4 ${
                          wordData.score >= 90 ? 'bg-green-50 border border-green-200' :
                          wordData.score >= 70 ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-red-50 border border-red-200'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-semibold">{wordData.word}</span>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              wordData.score >= 90 ? 'bg-green-100 text-green-800' :
                              wordData.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                              {wordData.score}/100
                                  </div>
                            </div>
                          <p className="text-sm text-gray-600">{wordData.feedback}</p>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Volume2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Pronunciation practice will be available when the AI sends a message
                </p>
              </div>
            )}
            
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