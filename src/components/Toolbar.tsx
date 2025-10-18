import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Lightbulb, Volume2, Star, X, Play, Mic, MicOff, Loader2, AlertCircle, CheckCircle, Target, Trophy, ChevronUp, ChevronDown } from 'lucide-react';
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
  pronunciationScore
}) => {
  const [wordSpeed, setWordSpeed] = useState(globalSpeed);

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
        <button
          onClick={() => onPractice(word.original)}
          className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          <Mic className="h-4 w-4" />
          <span>Practice</span>
        </button>
        
        {isRecording && (
          <button
            onClick={onStopRecording}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <MicOff className="h-4 w-4" />
            <span>Stop Recording</span>
          </button>
        )}
      </div>
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
    try {
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
      console.log('🎤 Recording started for pronunciation practice');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      console.log('🎤 Recording stopped');
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
                  <div className="flex space-x-2">
                    <button
                      onClick={() => analyzeComprehensive(currentMessage)}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      <span>Analyze</span>
                    </button>
                  </div>
                </div>

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
            ) : (
              <div className="text-center py-8">
                <Volume2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Pronunciation practice will be available when the AI sends a message
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}