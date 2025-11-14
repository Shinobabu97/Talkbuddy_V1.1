import React, { useState, useRef, useEffect } from 'react';
import { germanTTS } from '../lib/tts';
import { saveMessageAnalysis, PronunciationData } from '../lib/analysisStorage';
import {
  Mic,
  MicOff,
  LogOut,
  Search,
  Plus,
  Settings,
  Loader2,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Lock,
  Send,
  Play,
  BookOpen,
  BarChart3,
  MessageCircle,
  Volume2,
  Bot,
  Trash2,
  X,
  Menu,
  Sparkles,
  Target,
} from 'lucide-react';
import { supabase, AuthUser } from '../lib/supabase';
import OnboardingFlow from './OnboardingFlow';
import OnboardingHints, { dashboardHints, chatBubbleHints } from './OnboardingHints';
import ProfilePictureModal from './ProfilePictureModal';
import Toolbar from './Toolbar';
import VocabularyBuilderModal from './VocabularyBuilderModal';
import PodcastsPanel from './PodcastsPanel';
import ConversationSummaryModal from './ConversationSummaryModal';
import SuggestedResponseCard from './SuggestedResponseCard';
import { SessionData } from '../types/sessionData';
import { generateConversationSummary, ConversationSummary } from '../utils/summaryGenerator';

interface DashboardProps {
  user: AuthUser;
}

// German names list
const GERMAN_NAMES = [
  'Anna', 'Max', 'Sophie', 'Felix', 'Emma', 'Lukas', 'Hannah', 'Jonas',
  'Lena', 'Tim', 'Marie', 'Ben', 'Lisa', 'Tom', 'Sarah', 'Paul',
  'Julia', 'Leon', 'Laura', 'Finn', 'Mia', 'Noah', 'Emilia', 'Liam',
  'Clara', 'Elias', 'Lina', 'Henry', 'Amelie', 'Theo', 'Luisa', 'Anton'
];

// Helper function to get random German name
const getRandomGermanName = () => {
  return GERMAN_NAMES[Math.floor(Math.random() * GERMAN_NAMES.length)];
};

// Helper function to get random last seen time
const getRandomLastSeen = () => {
  const times = [
    'just now', '2 minutes ago', '5 minutes ago', '10 minutes ago',
    '15 minutes ago', '30 minutes ago', '1 hour ago', '2 hours ago'
  ];
  return times[Math.floor(Math.random() * times.length)];
};

interface OnboardingData {
  profilePictureUrl?: string;
  learningLanguage?: string;
  nativeLanguage?: string;
  focusGroup?: 'travelers' | 'business';
  // Keep old fields for backward compatibility
  motivations?: string[];
  customMotivation?: string;
  hobbies?: string[];
  customHobbies?: string[];
  hasWork?: boolean;
  workDomain?: string;
  germanLevel?: string;
  speakingFears?: string[];
  customFears?: string[];
  timeline?: string;
  goals?: string[];
  personalityTraits?: string[];
  secretDetails?: string;
  conversationTopics?: string[];
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  context_level: string;
  difficulty_level: string;
  context_locked: boolean;
  difficulty_locked: boolean;
  conversation_context?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioUrl?: string; // For voice messages
  isAudio?: boolean; // Flag for audio messages
  isTranscribing?: boolean; // Flag for messages being transcribed
  showTryAgain?: boolean; // Flag to show "Try it again" button
  pronunciationData?: PronunciationData; // Pronunciation analysis data for German voice messages
}

type MessageStatus = 'checking' | 'needs_correction' | 'mismatch' | 'error';
export default function Dashboard({ user }: DashboardProps) {
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [onboardingData, setOnboardingData] = React.useState<OnboardingData | null>(null);
  const [isNewUser, setIsNewUser] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [currentProfilePicture, setCurrentProfilePicture] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Hints system state
  const [showHints, setShowHints] = useState(false);
  const [showChatHints, setShowChatHints] = useState(false);
  const [hintsDismissed, setHintsDismissed] = useState(false);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  // 🎮 GAMIFICATION STATE
  const STREAK_STORAGE_KEY = 'lingoStreak';

  interface StreakStorage {
    current: number;
    longest: number;
    lastActiveDate: string | null;
    lastActivityTimestamp: number | null;
    weeklyStreakEarned: boolean;
    monthlyStreakEarned: boolean;
    monthDaysTarget: number;
  }

  const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const calculateDayDiff = (from: string, to: string) => {
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);
    const diff = toDate.getTime() - fromDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const loadStreakData = (): StreakStorage => {
    const defaultData = () => ({
      current: 0,
      longest: 0,
      lastActiveDate: null,
      lastActivityTimestamp: null,
      weeklyStreakEarned: false,
      monthlyStreakEarned: false,
      monthDaysTarget: getDaysInMonth(new Date())
    });

    if (typeof window === 'undefined') {
      return defaultData();
    }

    try {
      const raw = localStorage.getItem(STREAK_STORAGE_KEY);
      if (!raw) {
        return defaultData();
      }
      const parsed = JSON.parse(raw) as Partial<StreakStorage>;
      return {
        current: Number(parsed.current) || 0,
        longest: Number(parsed.longest) || 0,
        lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : null,
        lastActivityTimestamp: Number(parsed.lastActivityTimestamp) || null,
        weeklyStreakEarned: Boolean(parsed.weeklyStreakEarned),
        monthlyStreakEarned: Boolean(parsed.monthlyStreakEarned),
        monthDaysTarget: Number(parsed.monthDaysTarget) || getDaysInMonth(new Date())
      };
    } catch (error) {
      console.warn('Unable to load streak data from storage', error);
      return defaultData();
    }
  };

  const persistStreakData = (data: StreakStorage) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Unable to persist streak data', error);
    }
  };

  const [playerStats, setPlayerStats] = React.useState({
    level: 1,
    experience: 0,
    experienceToNext: 100,
    totalPoints: 0,
    streak: 0,
    conversationsCompleted: 0,
    wordsLearned: 0,
    speakingTime: 0, // in minutes
    achievements: [] as string[],
    badges: [] as string[],
    currentStreak: 0,
    longestStreak: 0,
    perfectConversations: 0,
    vocabularyMaster: 0,
    pronunciationChampion: 0
  });

  const streakDataRef = React.useRef<StreakStorage>(loadStreakData());

  React.useEffect(() => {
    const stored = streakDataRef.current;
    const today = new Date();
    const todayKey = getDateKey(today);

    if (stored.lastActiveDate) {
      const diff = calculateDayDiff(stored.lastActiveDate, todayKey);
      if (diff > 1) {
        const reset: StreakStorage = {
          ...stored,
          current: 0,
          lastActiveDate: stored.lastActiveDate,
          lastActivityTimestamp: stored.lastActivityTimestamp,
          weeklyStreakEarned: false,
          monthlyStreakEarned: false,
          monthDaysTarget: getDaysInMonth(today)
        };
        streakDataRef.current = reset;
        persistStreakData(reset);
      }
    } else {
      streakDataRef.current = {
        ...stored,
        lastActiveDate: null,
        lastActivityTimestamp: null,
        weeklyStreakEarned: false,
        monthlyStreakEarned: false,
        monthDaysTarget: getDaysInMonth(today)
      };
      persistStreakData(streakDataRef.current);
    }

    setPlayerStats(prev => ({
      ...prev,
      currentStreak: streakDataRef.current.current,
      longestStreak: streakDataRef.current.longest
    }));
  }, []);

  const updateStreakOnActivity = React.useCallback((): StreakStorage => {
    const now = new Date();
    const todayKey = getDateKey(now);
    const stored = streakDataRef.current;

    if (stored.lastActiveDate === todayKey) {
      return stored;
    }

    let current = stored.current;

    const lastActivityTimestamp = stored.lastActivityTimestamp ?? 0;
    const nowTimestamp = now.getTime();
    let diffDays = 0;

    if (stored.lastActiveDate) {
      diffDays = calculateDayDiff(stored.lastActiveDate, todayKey);
    }

    if (!stored.lastActiveDate || !stored.lastActivityTimestamp) {
      current = 1;
    } else if (diffDays === 0) {
      const diffMs = nowTimestamp - lastActivityTimestamp;
      if (diffMs >= 24 * 60 * 60 * 1000) {
        current = stored.current + 1;
      } else {
        return stored;
      }
    } else if (diffDays === 1) {
      current = stored.current + 1;
    } else {
      current = 1;
    }

    const monthDaysTarget = getDaysInMonth(now);
    const weeklyStreakEarned = current >= 7;
    const monthlyStreakEarned = current >= monthDaysTarget;

    const updated: StreakStorage = {
      current,
      longest: Math.max(stored.longest, current),
      lastActiveDate: todayKey,
      lastActivityTimestamp: nowTimestamp,
      weeklyStreakEarned,
      monthlyStreakEarned,
      monthDaysTarget
    };

    streakDataRef.current = updated;
    persistStreakData(updated);
    return updated;
  }, []);

  const [showLevelUp, setShowLevelUp] = React.useState(false);
  const [showAchievement, setShowAchievement] = React.useState<string | null>(null);
  const [achievementData, setAchievementData] = React.useState<{ title: string; description: string } | null>(null);
  const [recentAchievements, setRecentAchievements] = React.useState<string[]>([]);

  // 📊 SESSION TRACKING STATE
  const createInitialSessionData = () : SessionData => ({
    sessionId: `session-${Date.now()}`,
    startTime: new Date().toISOString(),
    wordsLearned: [],
    wordsDeleted: [],
    vocabularyTests: [],
    wordsLearnedFromTests: 0,
    pronunciationAttempts: [],
    sentencePronunciationScores: [],
    lastSentencePronunciationScore: null,
    grammarMistakes: [],
    correctResponses: 0,
    totalMessages: 0
  });

  const sessionDataRef = useRef<SessionData>({
    ...createInitialSessionData(),
    wordsLearnedFromTests: Number(localStorage.getItem('wordsLearnedTotal') || '0')
  });
  const [sessionData, setSessionData] = useState<SessionData>(sessionDataRef.current);

  const updateSessionData = React.useCallback((updater: (prev: SessionData) => SessionData) => {
    setSessionData(prev => {
      const next = updater(prev);
      sessionDataRef.current = next;
      return next;
    });
  }, []);

  const resetSessionData = React.useCallback(() => {
    const next = {
      ...createInitialSessionData(),
      wordsLearnedFromTests: Number(localStorage.getItem('wordsLearnedTotal') || '0')
    };
    sessionDataRef.current = next;
    setSessionData(next);
  }, []);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [conversationSummary, setConversationSummary] = useState<ConversationSummary | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [contextLevel, setContextLevel] = useState('Professional');
  const [difficultyLevel, setDifficultyLevel] = useState('Intermediate');
  const [currentConversationContextLocked, setCurrentConversationContextLocked] = useState(false);
  const [currentConversationDifficultyLocked, setCurrentConversationDifficultyLocked] = useState(false);
  const [lastGermanVoiceMessage, setLastGermanVoiceMessage] = useState<any>(null);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [conversationInput, setConversationInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'vocab' | 'progress'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [skipIntentOnce, setSkipIntentOnce] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const [isModalRecording, setIsModalRecording] = useState(false);
  const [modalRecorder, setModalRecorder] = useState<MediaRecorder | null>(null);
  const [modalTriggerType, setModalTriggerType] = useState<'voice' | 'text' | null>(null);
  
  // Debug component mount/unmount
  React.useEffect(() => {
    console.log('🚀 === DASHBOARD COMPONENT MOUNTED ===');
    console.log('Initial messageInput:', messageInput);
    console.log('Initial waitingForCorrection:', waitingForCorrection);
    console.log('Initial userAttempts:', userAttempts);
    console.log('Initial errorMessages:', errorMessages);
    
    // Add beforeunload event listener for session clearing
    const handleBeforeUnload = () => {
      console.log('🔄 === WINDOW CLOSING - CLEARING SESSION ===');
      resetConversationState();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      console.log('🛑 === DASHBOARD COMPONENT UNMOUNTING ===');
      console.log('Final messageInput:', messageInput);
      console.log('Final waitingForCorrection:', waitingForCorrection);
      console.log('Final userAttempts:', userAttempts);
      console.log('Final errorMessages:', errorMessages);
      
      // Clear session on unmount
      console.log('🔄 === COMPONENT UNMOUNTING - CLEARING SESSION ===');
      resetConversationState();
      
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // Debug selectedConversation changes
  React.useEffect(() => {
    console.log('💬 === SELECTED CONVERSATION CHANGED ===');
    console.log('New conversation ID:', selectedConversation);
    console.log('Previous conversation state:');
    console.log('- messageInput:', messageInput);
    console.log('- waitingForCorrection:', waitingForCorrection);
    console.log('- userAttempts:', userAttempts);
    console.log('- errorMessages:', errorMessages);
    console.log('- chatMessages count:', chatMessages.length);
    
    // Clear all retry states when switching conversations
    if (selectedConversation) {
      console.log('🧹 === CLEARING STATES FOR NEW CONVERSATION ===');
      console.log('Clearing all retry states for new conversation');
      setWaitingForCorrection(false);
      setUserAttempts({});
      setErrorMessages({});
      setComprehensiveAnalysis({});
      setMessageAttempts({});
      setShowOriginalMessage({});
      setOriginalMessages({});
      setActiveMessageId(null);
      setMessageStatus({});
      console.log('✅ === STATES CLEARED FOR NEW CONVERSATION ===');
    }
}, [selectedConversation]);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<{[key: string]: string}>({});
  const [suggestedResponses, setSuggestedResponses] = useState<{[key: string]: (string | {german: string, english: string})[]}>({});
  const getSuggestionKey = (conversationIdValue: string | null | undefined, messageId: string) => {
    const convoPart = conversationIdValue ?? selectedConversation ?? 'new-conversation';
    return `${convoPart}::${messageId}`;
  };
  const [showTranslation, setShowTranslation] = useState<{[key: string]: boolean}>({});
  const [showSuggestionTranslation, setShowSuggestionTranslation] = useState<{[key: string]: boolean}>({});
  const [showSuggestions, setShowSuggestions] = useState<{[key: string]: boolean}>({});
  const [showSuggestionsButtonClicked, setShowSuggestionsButtonClicked] = useState<{[key: string]: boolean}>({});
  React.useEffect(() => {
    if (selectedConversation) {
      console.log('🧹 Clearing cached suggested responses for new conversation:', selectedConversation);
    }
    setSuggestedResponses({});
    setShowSuggestions({});
    setShowSuggestionTranslation({});
    setShowSuggestionsButtonClicked({});
  }, [selectedConversation]);
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [currentAIMessage, setCurrentAIMessage] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [germanPartnerName, setGermanPartnerName] = useState<string>('');
  const [lastSeenTime, setLastSeenTime] = useState<string>('');
  const [toolbarOpenedViaHelp, setToolbarOpenedViaHelp] = useState<boolean>(false);
  const [activeHelpButton, setActiveHelpButton] = useState<string | null>(null);
  const [userAttempts, setUserAttempts] = useState<{[key: string]: number}>({});
  const [errorMessages, setErrorMessages] = useState<{[key: string]: string}>({});
  const [showOriginalMessage, setShowOriginalMessage] = useState<{[key: string]: boolean}>({});
  const [originalMessages, setOriginalMessages] = useState<{[key: string]: string}>({});
  const [waitingForCorrection, setWaitingForCorrection] = useState<boolean>(false);
  const [messageAttempts, setMessageAttempts] = useState<{[key: string]: string[]}>({});
  const [suggestedAnswers, setSuggestedAnswers] = useState<{[key: string]: string}>({});
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<{[key: string]: MessageStatus}>({});
  const [showVocabBuilder, setShowVocabBuilder] = useState(false);
  const [showPodcastsModal, setShowPodcastsModal] = useState(false);
  const [lastSuggestionUsed, setLastSuggestionUsed] = useState<{[messageId: string]: string}>({});
  
  // State for pronunciation practice from suggested responses
  const [recordedAudioBlobs, setRecordedAudioBlobs] = useState<Map<string, { blob: Blob, text: string }>>(new Map());
  const [responseRecordingState, setResponseRecordingState] = useState<{[responseId: string]: boolean}>({});
  const [responseAnalyzingState, setResponseAnalyzingState] = useState<{[responseId: string]: boolean}>({});
  const [responseShowAnalyze, setResponseShowAnalyze] = useState<{[responseId: string]: boolean}>({});
  const [responseHasBeenAnalyzed, setResponseHasBeenAnalyzed] = useState<{[responseId: string]: boolean}>({});
  const [practiceRecorders, setPracticeRecorders] = useState<{[responseId: string]: MediaRecorder}>({});
  const [pendingPronunciationAnalysis, setPendingPronunciationAnalysis] = useState<{audioBlob: Blob, text: string, responseId: string} | null>(null);
  
  // State for mic button recording analysis
  const [micRecordingBlob, setMicRecordingBlob] = useState<Blob | null>(null);
  const [micRecordingTranscription, setMicRecordingTranscription] = useState<string | null>(null);
  const [showMicAnalyzeButton, setShowMicAnalyzeButton] = useState(false);
  const [currentMicMessageId, setCurrentMicMessageId] = useState<string | null>(null);

  const updateMessageStatus = (messageId: string, status: MessageStatus | null) => {
    setMessageStatus(prev => {
      if (status === null) {
        if (!(messageId in prev)) return prev;
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      }

      if (prev[messageId] === status) {
        return prev;
      }

      return {
        ...prev,
        [messageId]: status
      };
    });
  };

  const clearCheckingStatus = (messageId: string) => {
    setMessageStatus(prev => {
      if (prev[messageId] !== 'checking') {
        return prev;
      }

      const newState = { ...prev };
      delete newState[messageId];
      return newState;
    });
  };

  // Recording state variables
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showLanguageMismatchModal, setShowLanguageMismatchModal] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<'german' | 'english' | null>(null);
  const [mismatchTranscription, setMismatchTranscription] = useState<string>('');
  const [mismatchMessageId, setMismatchMessageId] = useState<string>('');
  const [germanSuggestion, setGermanSuggestion] = useState<string>('');
  const [practiceAudioBlob, setPracticeAudioBlob] = useState<Blob | null>(null);
  const [recordingLanguage, setRecordingLanguage] = useState<'german' | 'english'>('german');

  // Debug modal state changes
  useEffect(() => {
    console.log('🔔 === MODAL STATE CHANGED ===');
    console.log('showLanguageMismatchModal:', showLanguageMismatchModal);
    console.log('detectedLanguage:', detectedLanguage);
    console.log('mismatchTranscription:', mismatchTranscription);
    console.log('germanSuggestion:', germanSuggestion);
    console.log('recordingLanguage:', recordingLanguage);
  }, [showLanguageMismatchModal, detectedLanguage, mismatchTranscription, germanSuggestion, recordingLanguage]);

  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showVocabSelector, setShowVocabSelector] = useState(false);
  const [extractedVocab, setExtractedVocab] = useState<Array<{word: string, meaning: string, context: string}>>([]);
  const [toolbarActiveTab, setToolbarActiveTab] = useState<'vocab' | 'explain' | 'pronunciation'>('explain');
  const [newVocabItems, setNewVocabItems] = useState<Array<{word: string, meaning: string, context: string}>>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [toolbarCollapsed, setToolbarCollapsed] = useState(true); // Start collapsed by default
  const [persistentVocab, setPersistentVocab] = useState<Array<{word: string, meaning: string, context: string}>>([]);
  const [wordMeanings, setWordMeanings] = useState<{[key: string]: string}>({});
  const [loadingMeanings, setLoadingMeanings] = useState<Set<string>>(new Set());
  
  // Comprehensive analysis state
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<{[key: string]: any}>({});
  
  // Pronunciation features state
  const [globalPlaybackSpeed, setGlobalPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('talkbuddy-playback-speed');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Individual word speeds for Pronunciation Guide
  const [wordSpeeds, setWordSpeeds] = useState<Record<string, number>>({});

  // Helper function to get speed for a specific word
  const getWordSpeed = (word: string): number => {
    return wordSpeeds[word] || globalPlaybackSpeed;
  };

  // Helper function to set speed for a specific word - UNUSED
  // const setWordSpeed = (word: string, speed: number): void => {
  //   setWordSpeeds(prev => ({
  //     ...prev,
  //     [word]: speed
  //   }));
  // };
  const [phoneticBreakdowns, setPhoneticBreakdowns] = useState<{[key: string]: Array<{original: string, phonetic: string, transliteration: string, syllables: string[]}>}>({});
  const [showPronunciationBreakdown, setShowPronunciationBreakdown] = useState<{[key: string]: boolean}>({});
  
  // Debug messageInput state changes
  React.useEffect(() => {
    console.log('📝 === MESSAGE INPUT STATE CHANGED ===');
    console.log('New value:', messageInput);
    console.log('Length:', messageInput.length);
    console.log('Trimmed:', messageInput.trim());
  }, [messageInput]);

  // Persist global playback speed to localStorage
  useEffect(() => {
    localStorage.setItem('talkbuddy-playback-speed', globalPlaybackSpeed.toString());
  }, [globalPlaybackSpeed]);
  
  // Debug errorMessages state changes
  React.useEffect(() => {
    const errorKeys = Object.keys(errorMessages);
    if (errorKeys.length > 0) {
      console.log('🚨 === ERROR MESSAGES STATE CHANGED ===');
      console.log('Error messages keys:', errorKeys);
    }
  }, [errorMessages]);
  
  // Debug userAttempts state changes
  React.useEffect(() => {
    const attemptKeys = Object.keys(userAttempts);
    if (attemptKeys.length > 0) {
      console.log('🔄 === USER ATTEMPTS STATE CHANGED ===');
      console.log('User attempts keys:', attemptKeys);
    }
  }, [userAttempts]);

  // Track which message is currently awaiting correction so retries replace it
  React.useEffect(() => {
    const activeEntry = Object.entries(userAttempts).find(([, attempts]) => attempts > 0);
    const nextActiveId = activeEntry ? activeEntry[0] : null;

    setActiveMessageId(prev => (prev === nextActiveId ? prev : nextActiveId));

    const shouldWait = Boolean(nextActiveId);
    setWaitingForCorrection(prev => (prev === shouldWait ? prev : shouldWait));
  }, [userAttempts]);
  
  // Debug waitingForCorrection state changes
  React.useEffect(() => {
    console.log('⏳ === WAITING FOR CORRECTION STATE CHANGED ===');
    console.log('New waitingForCorrection:', waitingForCorrection);
  }, [waitingForCorrection]);
  
  // Debug comprehensiveAnalysis state changes
  React.useEffect(() => {
    // Only log when there are actual changes, not on every render
    const analysisKeys = Object.keys(comprehensiveAnalysis);
    if (analysisKeys.length > 0) {
      console.log('🔍 === COMPREHENSIVE ANALYSIS STATE CHANGED ===');
      console.log('Analysis keys:', analysisKeys);
      
      // Only debug messages that have errors
      Object.entries(comprehensiveAnalysis).forEach(([messageId, analysis]) => {
        if (analysis?.hasErrors) {
          console.log(`📊 Message ${messageId} has errors:`, {
            hasErrors: analysis?.hasErrors,
            errorTypes: analysis?.errorTypes
          });
        }
      });
    }
  }, [comprehensiveAnalysis]);

  // Ref for auto-scrolling to bottom of conversation
  const messagesEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    loadOnboardingData();
    loadConversations();
    // Initialize German partner name and last seen time
    if (!germanPartnerName) {
      setGermanPartnerName(getRandomGermanName());
      setLastSeenTime(getRandomLastSeen());
    }
  }, [user.id, germanPartnerName]);

  // Monitor userAttempts and generate suggested answer when max attempts reached
  React.useEffect(() => {
    console.log('🔍 === CHECKING FOR SUGGESTED ANSWER GENERATION ===');
    console.log('User attempts:', userAttempts);
    console.log('Error messages:', errorMessages);
    console.log('Original messages:', originalMessages);
    console.log('Suggested answers:', suggestedAnswers);
    console.log('Comprehensive analysis:', comprehensiveAnalysis);

    Object.keys(userAttempts).forEach(messageId => {
      console.log(`🔍 === CHECKING MESSAGE ${messageId} ===`);
      const messageEntry = chatMessages.find(msg => msg.id === messageId);

      console.log('User attempts for this message:', userAttempts[messageId]);
      console.log('Error messages for this message:', errorMessages[messageId]);
      console.log('Original message for this message:', originalMessages[messageId]);
      console.log('Suggested answer for this message:', suggestedAnswers[messageId]);
      console.log('Comprehensive analysis for this message:', comprehensiveAnalysis[messageId]);
      console.log('Message entry for this message:', messageEntry);

      // Check if we have errors from either errorMessages or comprehensiveAnalysis
      const hasErrors = errorMessages[messageId] || (comprehensiveAnalysis[messageId] && comprehensiveAnalysis[messageId].hasErrors);
      console.log('Has errors (combined check):', hasErrors);

      if (userAttempts[messageId] >= 2 && hasErrors) {
        console.log('✅ === MAX ATTEMPTS REACHED WITH ERRORS ===');
        // Find the original message content
        const originalMessage = originalMessages[messageId];
        console.log('Original message found:', originalMessage);

        // Check if this is a voice input (has comprehensive analysis with errors)
        const isVoiceInput = Boolean(messageEntry?.isAudio);
        console.log('Is voice input:', isVoiceInput);

        if (isVoiceInput && originalMessage) {
          console.log('🎤 === VOICE INPUT - SHOWING LANGUAGE MISMATCH MODAL ===');
          console.log('Original message (transcribed text):', originalMessage);
          console.log('🔍 === VOICE CORRECTION TRIGGER DEBUG ===');
          console.log('User attempts for this message:', userAttempts[messageId]);
          console.log('Has comprehensive analysis errors:', !!(comprehensiveAnalysis[messageId] && comprehensiveAnalysis[messageId].hasErrors));
          console.log('Current chat messages count:', chatMessages.length);
          console.log('Current chat messages:', chatMessages.map(msg => ({ id: msg.id, content: msg.content, role: msg.role })));
          
          // Show language mismatch modal for voice input (like English mismatch flow)
          setDetectedLanguage('german'); // Treat as German practice
          setMismatchTranscription(originalMessage);
          setMismatchMessageId(messageId);
          
          // Generate German suggestion for practice
          console.log('Generating German suggestion for practice:', originalMessage);
          generateGermanSuggestion(originalMessage);
          
          // Show the modal
          setShowLanguageMismatchModal(true);
          
          // Clear retry states since we're switching to practice mode
          setWaitingForCorrection(false);
          setUserAttempts(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          setErrorMessages(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          // Also clear comprehensive analysis to prevent blocking
          setComprehensiveAnalysis(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          
        } else if (originalMessage && !suggestedAnswers[messageId]) {
          console.log('🚀 === GENERATING TEXT SUGGESTED ANSWER ===');
          generateSuggestedAnswer(messageId, originalMessage);
        } else if (suggestedAnswers[messageId]) {
          console.log('✅ === SUGGESTED ANSWER ALREADY EXISTS ===');
        } else {
          console.log('❌ === NO ORIGINAL MESSAGE FOUND ===');
        }
      } else {
        console.log('❌ === CONDITIONS NOT MET ===');
        console.log('User attempts >= 2:', userAttempts[messageId] >= 2);
        console.log('Has error messages:', !!errorMessages[messageId]);
        console.log('Has comprehensive analysis errors:', !!(comprehensiveAnalysis[messageId] && comprehensiveAnalysis[messageId].hasErrors));
        console.log('Has any errors:', hasErrors);
      }
    });
  }, [userAttempts, errorMessages, originalMessages, suggestedAnswers, comprehensiveAnalysis, chatMessages]);

  // Auto-scroll to bottom when new messages are added
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      
      // Load user profile data first
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('profile_picture_url')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile data:', profileError);
      }
      
      // Set current profile picture
      setCurrentProfilePicture(profileData?.profile_picture_url || null);

      // Load onboarding data
      const { data: onboardingRecord, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading onboarding data:', error);
      }

      if (onboardingRecord && onboardingRecord.completed_at) {
        const data: OnboardingData = {
          profilePictureUrl: profileData?.profile_picture_url || null,
          learningLanguage: onboardingRecord.learning_language,
          nativeLanguage: onboardingRecord.native_language,
          focusGroup: onboardingRecord.focus_group as 'travelers' | 'business' | undefined,
          // Keep old fields for backward compatibility
          motivations: onboardingRecord.motivations || [],
          customMotivation: onboardingRecord.custom_motivation,
          hobbies: onboardingRecord.hobbies || [],
          customHobbies: onboardingRecord.custom_hobbies || [],
          hasWork: onboardingRecord.has_work || false,
          workDomain: onboardingRecord.work_domain,
          germanLevel: onboardingRecord.german_level || '',
          speakingFears: onboardingRecord.speaking_fears || [],
          customFears: onboardingRecord.custom_fears || [],
          timeline: onboardingRecord.timeline || '',
          goals: onboardingRecord.goals || [],
          personalityTraits: onboardingRecord.personality_traits || [],
          secretDetails: onboardingRecord.secret_details,
          conversationTopics: onboardingRecord.conversation_topics || []
        };
        
        // Set context level based on focus group
        if (data.focusGroup === 'travelers') {
          setContextLevel('Casual');
        } else if (data.focusGroup === 'business') {
          setContextLevel('Professional');
        }
        
        setOnboardingData(data);
        setIsNewUser(false);
        setShowOnboarding(false);
        
        // Show hints if not dismissed
        if (!onboardingRecord.hints_dismissed) {
          setHintsDismissed(false);
          setShowHints(true);
        } else {
          setHintsDismissed(true);
        }
      } else {
        const hasCompletedOnboarding = localStorage.getItem(`onboarding_${user.id}`);
        if (hasCompletedOnboarding) {
          setIsNewUser(false);
          const localData = JSON.parse(hasCompletedOnboarding);
          // Normalize data from localStorage to ensure arrays are arrays
          const normalizedData: OnboardingData = {
            ...localData,
            goals: Array.isArray(localData.goals) ? localData.goals : [],
            personalityTraits: Array.isArray(localData.personalityTraits) ? localData.personalityTraits : [],
            conversationTopics: Array.isArray(localData.conversationTopics) ? localData.conversationTopics : [],
            germanLevel: localData.germanLevel || 'beginner',
          };
          setOnboardingData(normalizedData);
          
          // Set context level based on focus group
          if (normalizedData.focusGroup === 'travelers') {
            setContextLevel('Casual');
          } else if (normalizedData.focusGroup === 'business') {
            setContextLevel('Professional');
          }
          
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
      setShowOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      setConversationsLoading(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  };

  const createNewConversation = async () => {
    console.log('🚀 === START CHAT BUTTON CLICKED ===');
    console.log('Conversation input:', conversationInput);
    console.log('Input trim check:', conversationInput.trim());
    console.log('Context level:', contextLevel);
    console.log('Difficulty level:', difficultyLevel);
    
    if (!conversationInput.trim()) {
      console.log('❌ === BLOCKING - Empty conversation input ===');
      return;
    }

    // Language and gibberish validation at conversation start (no quick replies here)
    const startText = conversationInput.trim();
    const langAtStart = detectLanguage(startText);
    const onlyLettersAtStart = startText.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    const vowelCountAtStart = (onlyLettersAtStart.match(/[aeiouAEIOUÄÖÜäöü]/g) || []).length;
    const gibberishAtStart = onlyLettersAtStart.length > 0 && (vowelCountAtStart === 0 || (onlyLettersAtStart.length > 30 && vowelCountAtStart / onlyLettersAtStart.length < 0.15));

    if (langAtStart !== 'german' && langAtStart !== 'english') {
      alert('Please enter phrases or topics in German or English only to help us assist you better.');
      return;
    }
    if (gibberishAtStart) {
      alert("We couldn’t understand your input. Please enter clear sentences in German or English.");
      return;
    }

    try {
      console.log('👤 User ID:', user.id);
      console.log('👤 User object:', user);
      
      // Create the conversation in database
      // NOTE: conversation_context column doesn't exist in database yet, so excluding it
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: conversationInput.slice(0, 50) + (conversationInput.length > 50 ? '...' : ''),
          preview: conversationInput.slice(0, 100),
          context_level: contextLevel,
          difficulty_level: difficultyLevel,
          context_locked: false,
          difficulty_locked: false
          // conversation_context: conversationInput.trim() - removed until column exists
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }

      // Add to conversations list and start immediately
      setConversations(prev => [data, ...prev]);
      
      // Start the conversation with user's input as first message
      startConversationWithUserMessage(data.id, conversationInput.trim());
      
      // Clear input
      setConversationInput('');
      console.log('✅ === CONVERSATION CREATED SUCCESSFULLY ===');
    } catch (error) {
      console.error('❌ === ERROR CREATING CONVERSATION ===', error);
      alert('Failed to create conversation. Please check the console for details.');
    }
  };

  const startConversationWithUserMessage = (conversationId: string, userMessage: string) => {
    setSelectedConversation(conversationId);
    
    // Set initial messages
    setChatMessages([]);
    
    // Store the conversation context separately for future use
    // Note: conversation_context column will be added to database later
    console.log('📝 Conversation context stored:', userMessage);
    
    // Immediately send the user's message to get AI response
    sendInitialMessage(conversationId, userMessage);
  };

  const sendInitialMessage = async (conversationId: string, userMessage: string) => {
    setIsSending(true);
    setIsTyping(true);
    
    // Store the user's initial message in chatMessages for contextual suggestions
    const userMessageObj: ChatMessage = {
      id: '1',
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessageObj]);
    
    // Reset retry states for new conversation
    setWaitingForCorrection(false);
    setUserAttempts({});
    setErrorMessages({});
    setMessageAttempts({});
    setShowOriginalMessage({});
    setOriginalMessages({});
    setSuggestedAnswers({});

    try {
      // Get user session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('📡 === SENDING INITIAL MESSAGE TO API ===');
      console.log('Conversation ID:', conversationId);
      console.log('User message:', userMessage);
      console.log('Context level:', contextLevel);
      console.log('Difficulty level:', difficultyLevel);
      console.log('Onboarding data exists:', !!onboardingData);
      console.log('Has session token:', !!session?.access_token);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Ich möchte dieses Szenario üben: ${userMessage}.\n\nWICHTIG:\n1. Bestätigen Sie zunächst, dass Sie den Kontext verstanden haben\n2. Fassen Sie kurz zusammen, was wir üben werden\n3. Fragen Sie, ob ich bereit bin, mit dem Rollenspiel zu beginnen\n4. Antworten Sie NUR auf Deutsch\n${contextLevel === 'Professional' ? 'Verwenden Sie "Sie" für formale Anrede.' : 'Verwenden Sie "Du" für lockere Anrede.'}`
          }],
          conversationId,
          contextLevel,
          difficultyLevel,
          userProfile: onboardingData && onboardingData.germanLevel ? {
            germanLevel: onboardingData.germanLevel,
            goals: Array.isArray(onboardingData.goals) ? onboardingData.goals : [],
            personalityTraits: Array.isArray(onboardingData.personalityTraits) ? onboardingData.personalityTraits : [],
            conversationTopics: Array.isArray(onboardingData.conversationTopics) ? onboardingData.conversationTopics : []
          } : undefined,
          conversationContext: userMessage
        })
      });
      
      console.log('📡 === API RESPONSE ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`Failed to get response: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data || !data.message) {
        console.error('❌ Invalid API response - missing message field');
        console.error('Response data:', data);
        throw new Error('Invalid API response: missing message field');
      }
      
      console.log('AI Response:', data.message);
      
      const assistantMessage: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      let updatedInitialMessages: ChatMessage[] = [];
      setChatMessages(prev => {
        updatedInitialMessages = [...prev, assistantMessage];
        return updatedInitialMessages;
      });
      
      // Lock the context AND difficulty for this conversation
      await supabase
        .from('conversations')
        .update({ 
          context_locked: true,
          difficulty_locked: true
        })
        .eq('id', conversationId);
      
      // Update local state
      setCurrentConversationContextLocked(true);
      setCurrentConversationDifficultyLocked(true);
      
      // Update current message but don't show toolbar automatically
      setCurrentAIMessage(data.message);
      
      // Auto-generate 3 contextual suggestions after initial AI response
      const messageId = '2'; // First AI message ID
      await generateContextualSuggestionsForInitialResponse(
        messageId,
        data.message,
        userMessage,
        updatedInitialMessages.length ? updatedInitialMessages : chatMessages,
        conversationId
      );

    } catch (error) {
      console.error('❌ === ERROR SENDING INITIAL MESSAGE ===');
      console.error('Error:', error);
      console.error('Error details:', {
        conversationId,
        userMessage,
        contextLevel,
        difficultyLevel,
        hasOnboardingData: !!onboardingData,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      const errorMessage: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: 'Entschuldigung, ich hatte ein technisches Problem. Können Sie das bitte wiederholen? (Sorry, I had a technical issue. Could you please repeat that?)',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      // Show user-friendly error alert with more details
      const userErrorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start conversation: ${userErrorMsg}\n\nPlease check:\n1. Your internet connection\n2. Browser console for details\n3. Try refreshing the page`);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  // Unified function to generate suggestions using OpenAI
  // Automatically detects most recent bot message if not provided
  const generateSuggestionsUsingOpenAI = async (
    messageId: string,
    botMessage?: string,
    userContext?: string,
    messagesOverride?: ChatMessage[],
    conversationIdParam?: string | null
  ) => {
    console.log('🎯 === GENERATING SUGGESTIONS USING OPENAI ===');
    console.log('Message ID:', messageId);
    
    // Auto-detect most recent bot message if not provided
    const messages = messagesOverride ?? chatMessages;
    const suggestionKey = getSuggestionKey(conversationIdParam, messageId);

    // Locate the assistant message that matches the provided messageId
    const targetAssistantIndex = messages.findIndex(
      (msg) => msg.role === 'assistant' && msg.id === messageId
    );
    const targetAssistantMessage =
      targetAssistantIndex >= 0 ? messages[targetAssistantIndex] : undefined;

    let resolvedAssistantIndex = targetAssistantIndex;
    let aiMessage: string;

    if (botMessage) {
      aiMessage = botMessage;
      console.log('Using provided bot message:', aiMessage);
    } else if (targetAssistantMessage) {
      aiMessage = targetAssistantMessage.content;
      console.log('Matched bot message by ID:', { messageId, aiMessage });
    } else {
      // Fall back to most recent assistant message if the specific ID cannot be found
      const assistantMessages = messages.filter((msg) => msg.role === 'assistant');
      const mostRecentBotMessage = assistantMessages[assistantMessages.length - 1];

      if (!mostRecentBotMessage) {
        console.error('❌ No bot message found in chatMessages');
        // Fallback: use generateContextualFallbacks
        const contextualFallbacks = generateContextualFallbacks('');
        setSuggestedResponses((prev) => ({
          ...prev,
          [suggestionKey]: contextualFallbacks,
        }));
        return;
      }

      aiMessage = mostRecentBotMessage.content;
      resolvedAssistantIndex = messages.findIndex(
        (msg) => msg === mostRecentBotMessage
      );
      console.warn('⚠️ Falling back to most recent bot message due to missing ID match:', {
        requestedId: messageId,
        fallbackId: mostRecentBotMessage.id,
      });
    }

    // Enhanced conversation context extraction: Get last 2-3 messages for better context
    let conversationContext: string = userContext || '';
    let conversationHistory: string = '';

    if (resolvedAssistantIndex >= 0) {
      const startIndex = Math.max(0, resolvedAssistantIndex - 2);
      const recentMessages = messages.slice(startIndex, resolvedAssistantIndex + 1);
      conversationHistory = recentMessages
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Bot'}: ${msg.content}`)
        .join(' -> ');
      console.log('📜 Conversation history (last 2-3 messages):', conversationHistory);
    }

    // Also get initial user context if available (for first message)
    if (!conversationContext) {
      const firstUserMessage = messages.find((msg) => msg.role === 'user');
      if (firstUserMessage) {
        conversationContext = firstUserMessage.content;
        console.log('Using first user message as context:', conversationContext);
      }
    }

    // Determine if this is 2nd+ bot message (not the first one)
    const assistantMessages = messages.filter((msg) => msg.role === 'assistant');
    let isSecondOrSubsequentMessage = false;
    if (resolvedAssistantIndex >= 0) {
      const assistantMessagesUpToTarget = messages
        .slice(0, resolvedAssistantIndex + 1)
        .filter((msg) => msg.role === 'assistant');
      isSecondOrSubsequentMessage = assistantMessagesUpToTarget.length > 1;
    } else {
      isSecondOrSubsequentMessage = assistantMessages.length > 1;
    }
    console.log(
      '📊 Is 2nd+ bot message:',
      isSecondOrSubsequentMessage,
      'Total assistant messages:',
      assistantMessages.length
    );
    
    // Detect question type - expanded readiness detection
    const isReadinessQuestion = /sind.*bereit|bist.*bereit|ready|bereit.*beginnen|bereit.*starten|bereit.*mit|mit.*rollenspiel|rollenspiel.*beginnen|rollenspiel.*starten|möchten.*starten|können.*beginnen|kann.*anfangen|starten.*wir/i.test(aiMessage);
    const isYesNoQuestion = /\?/.test(aiMessage) && (/sind|bist|haben|hast|kannst|können|ist|soll|möchten/i.test(aiMessage));
    const isInformationalQuestion = /\?/.test(aiMessage) && (/was|wie|wo|wann|warum|welche|welcher|welches/i.test(aiMessage));
    const containsQuestion = /\?/.test(aiMessage) || /sind sie|bist du|können sie|kannst du|haben sie|hast du/i.test(aiMessage.toLowerCase());
    
    console.log('Question detection:', {
      isReadinessQuestion,
      isYesNoQuestion,
      isInformationalQuestion,
      containsQuestion
    });
    
    // Build enhanced prompt with emphasis on immediate context for 2nd+ messages
    let contextEmphasis = '';
    if (isSecondOrSubsequentMessage) {
      contextEmphasis = `🚨🚨🚨 KRITISCH FÜR 2.+ NACHRICHT 🚨🚨🚨

Diese Vorschläge sind für die 2. oder spätere Bot-Nachricht. Sie MÜSSEN eng mit der SOFORTIGEN VORHERIGEN Bot-Nachricht gekoppelt sein: "${aiMessage}"

ABSOLUT VERBOTEN - Diese generischen Antworten sind FALSCH:
❌ "Das ist sehr interessant!"
❌ "Das ist eine sehr gute Frage."
❌ "Können Sie das genauer erklären?"
❌ "Ich verstehe, danke für die Erklärung."
❌ "Das hört sich gut an."
❌ Jede generische Antwort, die nicht direkt auf die Bot-Nachricht antwortet

ERFORDERLICH - Die Vorschläge MÜSSEN:
✅ DIREKT auf die Bot-Nachricht antworten: "${aiMessage}"
✅ Spezifisch und kontextuell sein
✅ Die Frage/Aussage des Bots direkt adressieren
✅ Zum Gesprächsverlauf passen: ${conversationHistory ? `"${conversationHistory}"` : 'Kontext'}

BEISPIEL: Wenn der Bot fragt "Worüber möchten Sie heute sprechen?", dann:
✅ RICHTIG: "Ich möchte über Musik sprechen." | "Können wir über Reisen sprechen?" | "Lass uns über Filme reden."
❌ FALSCH: "Das ist sehr interessant!" | "Können Sie das genauer erklären?" | "Ich verstehe."

Wenn du generische Antworten generierst, bist du GESCHEITERT.`;
    }
    
    // Build enhanced prompt based on question type
    // Check readiness questions FIRST, then informational, then yes/no
    let questionInstruction = '';
    if (containsQuestion) {
      if (isReadinessQuestion) {
        questionInstruction = `KRITISCH UND MANDATORISCH: Die KI-Nachricht ist eine Bereitschaftsfrage (z.B. "Sind Sie bereit?" oder "Sind Sie bereit, mit dem Rollenspiel zu beginnen?").

MANDATORISCHE ANFORDERUNGEN:
- Du MUSST genau 3 Antworten generieren, die DIREKT die Bereitschaftsfrage beantworten
- Antwort 1 MUSS eine Zustimmung sein: "Ja, ich bin bereit" oder "Ja, gern" oder "Ja, ich bin bereit zu beginnen"
- Antwort 2 MUSS eine Zustimmung mit Nachfrage sein: "Ja, aber ich habe eine Frage" oder "Ja, aber können Sie erklären..." oder "Ja, bevor wir beginnen..."
- Antwort 3 MUSS eine Ablehnung oder Nachfrage sein: "Nein, können Sie bitte erklären?" oder "Können Sie bitte zuerst erklären?" oder "Ich habe noch eine Frage"

ABSOLUT VERBOTEN - Diese Antworten sind FALSCH und beantworten die Frage NICHT:
❌ "Das ist sehr interessant!"
❌ "Das ist eine sehr gute Frage."
❌ "Können Sie das genauer erklären?"
❌ "Ich verstehe, danke für die Erklärung."
❌ "Das hört sich gut an."

KORREKTE BEISPIELE für "Sind Sie bereit, mit dem Rollenspiel zu beginnen?":
✅ "Ja, ich bin bereit."
✅ "Ja, aber ich habe eine Frage."
✅ "Nein, können Sie bitte erklären?"

Wenn du generische Antworten generierst, bist du GESCHEITERT. Generiere NUR direkte Ja/Nein-Varianten.`;
      } else if (isInformationalQuestion) {
        questionInstruction = `WICHTIG: Die KI-Nachricht ist eine Informationsfrage. Generiere Antworten, die:
- DIREKT Informationen zur Frage geben
- Zum Kontext passen: "${conversationContext}"
- Praktisch und rollenspielgerecht sind`;
      } else if (isYesNoQuestion) {
        questionInstruction = `WICHTIG: Die KI-Nachricht ist eine Ja/Nein-Frage. Generiere Antworten, die DIREKT die Frage beantworten:
- Mindestens eine "Ja" Antwort
- Mindestens eine "Nein" oder alternative Antwort
- Antworten müssen die Frage direkt beantworten, nicht umschweifen`;
      } else {
        questionInstruction = `WICHTIG: Die KI-Nachricht enthält eine Frage. Generiere Antworten, die:
- DIREKT auf die Frage antworten
- Nicht generisch sind (keine "Das ist interessant" Antworten)
- Die Frage beantworten, nicht umschweifen`;
      }
    } else {
      questionInstruction = `Die KI-Nachricht ist eine Aussage oder Anweisung. Generiere Antworten, die:
- Kontextuell zur Aussage passen: "${conversationContext}"
- Für das Rollenspiel geeignet sind
- Natürlich auf die Aussage reagieren`;
    }
    
    try {
      // Call OpenAI API for ALL suggestions (including readiness questions)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyziere die KI-Nachricht: "${aiMessage}"

${contextEmphasis}

${conversationHistory ? `Gesprächsverlauf (letzte 2-3 Nachrichten): ${conversationHistory}` : ''}

${conversationContext ? `Anfänglicher Kontext: Der Benutzer möchte dieses Szenario üben: "${conversationContext}"` : ''}

${questionInstruction}

WICHTIG: Die Vorschläge MÜSSEN direkt auf diese SOFORTIGE VORHERIGE Bot-Nachricht antworten: "${aiMessage}"

Generiere genau 3 kurze deutsche Antworten (maximal 8 Wörter), die:
1. ${containsQuestion ? 'DIREKT die Frage beantworten' : 'Kontextuell zur Nachricht passen'} - ENGE KOPPLUNG ZUR BOT-NACHRICHT ERFORDERLICH
2. ${conversationHistory ? `Zum Gesprächsverlauf passen: "${conversationHistory}"` : conversationContext ? `Zum Szenario passen: "${conversationContext}"` : 'Zum Gesprächskontext passen'}
3. Für ein Rollenspiel geeignet sind
4. Den Formellitätsgrad berücksichtigen: ${contextLevel === 'Professional' ? 'Formell (Sie)' : 'Informell (Du)'}
5. ${isSecondOrSubsequentMessage ? 'NICHT generisch sind - sie müssen spezifisch auf die Bot-Nachricht antworten' : 'Zum Kontext passen'}

${isSecondOrSubsequentMessage ? 'VERBOTEN: Generische Antworten wie "Das ist interessant" - diese sind FALSCH für 2.+ Nachrichten' : ''}

Format: TRANSLATION: [English translation of AI message] SUGGESTIONS: [Antwort 1] | [Antwort 2] | [Antwort 3] ENGLISH: [Answer 1] | [Answer 2] | [Answer 3]`
          }],
          conversationId: selectedConversation || 'helper',
          contextLevel,
          difficultyLevel,
          conversationContext: conversationContext,
          systemInstruction: `Du bist ein Experte für deutsche Rollenspiele. Deine Aufgabe: Generiere 3 passende deutsche Antworten.

${isSecondOrSubsequentMessage ? `🚨🚨🚨 KRITISCH FÜR 2.+ NACHRICHT 🚨🚨🚨

Diese Vorschläge sind für die 2. oder spätere Bot-Nachricht. Sie MÜSSEN eng mit der SOFORTIGEN VORHERIGEN Bot-Nachricht gekoppelt sein.

ABSOLUT VERBOTEN für 2.+ Nachrichten:
❌ Generische Antworten wie "Das ist sehr interessant!"
❌ "Das ist eine sehr gute Frage."
❌ "Können Sie das genauer erklären?" (wenn nicht direkt relevant)
❌ "Ich verstehe, danke für die Erklärung."
❌ Jede generische Antwort, die nicht direkt auf die Bot-Nachricht antwortet

ERFORDERLICH für 2.+ Nachrichten:
✅ DIREKTE Antworten auf die Bot-Nachricht: "${aiMessage}"
✅ Spezifisch und kontextuell
✅ Direkte Adressierung der Frage/Aussage des Bots
✅ Zum Gesprächsverlauf passend: ${conversationHistory ? `"${conversationHistory}"` : 'Kontext'}

BEISPIEL RICHTIG (wenn Bot fragt "Worüber möchten Sie heute sprechen?"):
✅ "Ich möchte über Musik sprechen." | "Können wir über Reisen sprechen?" | "Lass uns über Filme reden."

BEISPIEL FALSCH (generische Antworten):
❌ "Das ist sehr interessant!" | "Können Sie das genauer erklären?" | "Ich verstehe."

Wenn du generische Antworten für 2.+ Nachrichten generierst, bist du GESCHEITERT.` : ''}

${isReadinessQuestion ? '🚨🚨🚨 KRITISCH UND MANDATORISCH 🚨🚨🚨\nDie KI-Nachricht ist eine Bereitschaftsfrage (z.B. "Sind Sie bereit?" oder "Sind Sie bereit, mit dem Rollenspiel zu beginnen?").\n\nMANDATORISCHE ANFORDERUNGEN:\n- Du MUSST genau 3 Antworten generieren, die DIREKT die Frage beantworten\n- Antwort 1 MUSS eine Zustimmung sein: "Ja, ich bin bereit" oder ähnlich\n- Antwort 2 MUSS eine Zustimmung mit Nachfrage sein: "Ja, aber ich habe eine Frage" oder ähnlich\n- Antwort 3 MUSS eine Ablehnung/Nachfrage sein: "Nein, können Sie bitte erklären?" oder ähnlich\n\nABSOLUT VERBOTEN - Diese Antworten sind FALSCH:\n❌ "Das ist sehr interessant!"\n❌ "Das ist eine sehr gute Frage."\n❌ "Können Sie das genauer erklären?"\n❌ "Ich verstehe, danke für die Erklärung."\n\nKORREKTE BEISPIELE:\n✅ "Ja, ich bin bereit."\n✅ "Ja, aber ich habe eine Frage."\n✅ "Nein, können Sie bitte erklären?"\n\nWenn du generische Antworten generierst, bist du GESCHEITERT. Generiere NUR direkte Ja/Nein-Varianten.' : containsQuestion ? `KRITISCH: Die KI-Nachricht ist eine Frage. Die Antworten MÜSSEN die Frage direkt beantworten, nicht umschweifen oder generisch sein.${isSecondOrSubsequentMessage ? ' Für 2.+ Nachrichten: KEINE generischen Antworten - sie müssen spezifisch auf diese Frage antworten.' : ''}` : `Die KI-Nachricht ist eine Aussage. Generiere passende, kontextuelle Reaktionen.${isSecondOrSubsequentMessage ? ' Für 2.+ Nachrichten: KEINE generischen Antworten - sie müssen spezifisch auf diese Aussage reagieren.' : ''}`}

${conversationHistory ? `Gesprächsverlauf: "${conversationHistory}"` : ''}
${conversationContext ? `Anfänglicher Kontext: "${conversationContext}"` : ''}
KI-Nachricht: "${aiMessage}"
Formellitätsgrad: ${contextLevel}

Regeln:
- Antworten müssen zur Frage/Aussage passen
- ${isSecondOrSubsequentMessage ? 'FÜR 2.+ NACHRICHTEN: KEINE generischen Antworten - sie müssen DIREKT auf die Bot-Nachricht antworten' : 'Keine generischen Antworten wie "Das ist interessant" wenn eine Frage gestellt wird'}
${isReadinessQuestion ? '- Für Bereitschaftsfragen: IMMER Ja/Nein-Varianten mit direkten Antworten\n- Beispiel RICHTIG: "Ja, ich bin bereit" | "Ja, aber ich habe eine Frage" | "Nein, können Sie bitte erklären"\n- Beispiel FALSCH: "Das ist sehr interessant" | "Können Sie das genauer erklären?" | "Ich verstehe, danke"\n- Wenn die Antworten generisch sind, bist du GESCHEITERT' : containsQuestion ? '- Für Fragen: Direkte, hilfreiche Antworten generieren - DIREKT auf die Frage antworten' : '- Für Aussagen: Natürliche, kontextuelle Reaktionen - DIREKT auf die Aussage reagieren'}
${isSecondOrSubsequentMessage ? '- VERBOTEN für 2.+ Nachrichten: Generische Phrasen wie "Das ist interessant" - diese zeigen, dass du die Aufgabe nicht verstanden hast' : ''}

Format: TRANSLATION: [translation] SUGGESTIONS: [a1] | [a2] | [a3] ENGLISH: [e1] | [e2] | [e3]`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.message;
        
        console.log('📡 API Response for suggestions:', content);
        
        // Parse translation and suggestions
        const translationMatch = content.match(/TRANSLATION:\s*(.+?)(?=SUGGESTIONS:|$)/);
        const suggestionsMatch = content.match(/SUGGESTIONS:\s*(.+?)(?=ENGLISH:|$)/);
        const englishMatch = content.match(/ENGLISH:\s*(.+)/);
        
        if (translationMatch) {
          setTranslatedMessages(prev => {
            // Only set if doesn't exist (preserve user translations)
            if (prev[messageId]) {
              console.log('Translation already exists, preserving user translation');
              return prev;
            }
            return {
              ...prev,
              [messageId]: translationMatch[1].trim()
            };
          });
        }
        
        if (suggestionsMatch && englishMatch) {
          const germanSuggestions = suggestionsMatch[1].split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          const englishTranslations = englishMatch[1].split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          
          const pairedSuggestions = germanSuggestions.map((german: string, index: number) => ({
            german: german.trim(),
            english: englishTranslations[index] ? englishTranslations[index].trim() : ''
          }));
          
          console.log('✅ Generated suggestions:', pairedSuggestions);
          
          // Enhanced validation: Check for generic responses for 2nd+ messages or readiness questions
          const genericPatterns = [
            /^das ist.*interessant/i,
            /^das ist.*sehr interessant/i,
            /^das ist.*gute.*frage/i,
            /^können.*sie.*das.*genauer.*erklären/i,
            /^können.*sie.*erklären[^?]*$/i,
            /^ich verstehe[,.]?$/i,
            /^ich verstehe, danke/i,
            /^danke.*erklärung/i,
            /^das hört.*gut/i,
            /^das klingt.*gut/i
          ];
          
          // Check if suggestions are generic (not contextually relevant)
          const hasGenericResponses = pairedSuggestions.some(suggestion => {
            const germanText = suggestion.german.toLowerCase().trim();
            return genericPatterns.some(pattern => pattern.test(germanText));
          });
          
          // For readiness questions, check for direct responses
          if (isReadinessQuestion) {
            const hasDirectResponses = pairedSuggestions.some(suggestion => {
              const germanText = suggestion.german.toLowerCase();
              return /^ja[,!.]|^nein[,!.]|bereit|aber.*frage/i.test(germanText);
            });
            
            if (hasGenericResponses || !hasDirectResponses) {
              console.warn('⚠️ OpenAI returned generic responses for readiness question, using fallback');
              const contextualFallbacks = generateContextualFallbacks(aiMessage);
              setSuggestedResponses(prev => ({
                ...prev,
                [suggestionKey]: contextualFallbacks
              }));
              return;
            }
          }
          
          // For 2nd+ messages, reject if all suggestions are generic
          if (isSecondOrSubsequentMessage && hasGenericResponses) {
            const genericCount = pairedSuggestions.filter(suggestion => {
              const germanText = suggestion.german.toLowerCase().trim();
              return genericPatterns.some(pattern => pattern.test(germanText));
            }).length;
            
            // If 2 or more suggestions are generic, reject and use fallback
            if (genericCount >= 2) {
              console.warn('⚠️ OpenAI returned generic responses for 2nd+ message, using fallback');
              console.warn('⚠️ Generic count:', genericCount, 'out of', pairedSuggestions.length);
              const contextualFallbacks = generateContextualFallbacks(aiMessage);
              setSuggestedResponses(prev => ({
                ...prev,
                [suggestionKey]: contextualFallbacks
              }));
              return;
            }
          }
          
          setSuggestedResponses(prev => ({
            ...prev,
            [suggestionKey]: pairedSuggestions
          }));
          
          // Don't automatically show suggestions - only show when user clicks question mark icon
        } else {
          console.log('⚠️ Could not parse suggestions from API response, using fallback');
          // Fallback to contextual suggestions
          const contextualFallbacks = generateContextualFallbacks(aiMessage);
          setSuggestedResponses(prev => ({
            ...prev,
            [suggestionKey]: contextualFallbacks
          }));
          // Don't automatically show suggestions - only show when user clicks question mark icon
        }
      } else {
        const errorText = await response.text();
        console.error('❌ API call failed:', response.status, errorText);
        // Fallback to contextual suggestions
        const contextualFallbacks = generateContextualFallbacks(aiMessage);
        setSuggestedResponses(prev => ({
          ...prev,
          [suggestionKey]: contextualFallbacks
        }));
        // Don't automatically show suggestions - only show when user clicks question mark icon
      }
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      // Fallback to contextual suggestions
      const contextualFallbacks = generateContextualFallbacks(aiMessage);
      setSuggestedResponses(prev => ({
        ...prev,
        [suggestionKey]: contextualFallbacks
      }));
      // Don't automatically show suggestions - only show when user clicks question mark icon
    }
  };

  // Generate 3 contextual suggestions for initial AI response
  const generateContextualSuggestionsForInitialResponse = async (
    messageId: string,
    aiMessage: string,
    userContext: string,
    messagesOverride?: ChatMessage[],
    conversationIdParam?: string | null
  ) => {
    console.log('🎯 === GENERATING CONTEXTUAL SUGGESTIONS FOR INITIAL RESPONSE ===');
    console.log('Message ID:', messageId);
    console.log('AI Message:', aiMessage);
    console.log('User Context:', userContext);
    
    // Use unified function with provided bot message and user context
    await generateSuggestionsUsingOpenAI(messageId, aiMessage, userContext, messagesOverride, conversationIdParam);
  };

  // Generate contextual fallback suggestions based on AI message content
  const generateContextualFallbacks = (germanText: string) => {
    const text = germanText.toLowerCase();
    
    // Check for readiness questions FIRST - this is critical!
    if (text.includes('bereit') && (text.includes('rollenspiel') || text.includes('beginnen') || text.includes('starten') || text.includes('mit dem'))) {
      console.log('✅ Fallback: Detected readiness question, returning appropriate responses');
      return [
        { german: 'Ja, ich bin bereit.', english: 'Yes, I am ready.' },
        { german: 'Ja, aber ich habe eine Frage.', english: 'Yes, but I have a question.' },
        { german: 'Nein, können Sie bitte erklären?', english: 'No, can you please explain?' }
      ];
    }
    
    // Specific question patterns and their direct answers
    if (text.includes('welche details') || text.includes('which details') || text.includes('am wichtigsten')) {
      return [
        { german: 'Die Budgetplanung ist am wichtigsten für uns.', english: 'Budget planning is most important for us.' },
        { german: 'Die technischen Spezifikationen sind entscheidend.', english: 'Technical specifications are crucial.' },
        { german: 'Die Sicherheitsanforderungen haben Priorität.', english: 'Security requirements have priority.' }
      ];
    }
    
    if (text.includes('anforderungen') || text.includes('requirements')) {
      return [
        { german: 'Wir brauchen eine Cloud-basierte Lösung.', english: 'We need a cloud-based solution.' },
        { german: 'Die Sicherheit ist unsere Hauptpriorität.', english: 'Security is our main priority.' },
        { german: 'Wir benötigen 24/7 Support.', english: 'We need 24/7 support.' }
      ];
    }
    
    if (text.includes('erfahrung') || text.includes('experience')) {
      return [
        { german: 'Ja, ich habe Erfahrung mit Microsoft-Produkten.', english: 'Yes, I have experience with Microsoft products.' },
        { german: 'Ich arbeite seit 5 Jahren in der IT-Branche.', english: 'I have been working in IT for 5 years.' },
        { german: 'Nein, aber ich lerne sehr schnell.', english: 'No, but I learn very quickly.' }
      ];
    }
    
    if (text.includes('finanz') || text.includes('budget') || text.includes('kosten')) {
      return [
        { german: 'Unser Budget liegt bei 50.000 Euro.', english: 'Our budget is 50,000 euros.' },
        { german: 'Die Kosten sind ein wichtiger Faktor.', english: 'Costs are an important factor.' },
        { german: 'Wir suchen nach einer kosteneffizienten Lösung.', english: 'We are looking for a cost-effective solution.' }
      ];
    }
    
    // Business/Professional context
    if (text.includes('vertrag') || text.includes('software') || text.includes('geschäft') || text.includes('meeting') || text.includes('projekt')) {
      return [
        { german: 'Das Projekt sollte bis Ende des Jahres abgeschlossen sein.', english: 'The project should be completed by the end of the year.' },
        { german: 'Wir haben bereits einen ähnlichen Vertrag abgeschlossen.', english: 'We have already signed a similar contract.' },
        { german: 'Können wir die nächsten Schritte besprechen?', english: 'Can we discuss the next steps?' }
      ];
    }
    
    // Travel context
    if (text.includes('reise') || text.includes('hotel') || text.includes('flug') || text.includes('stadt') || text.includes('urlaub')) {
      return [
        { german: 'Ich möchte gerne die Altstadt besichtigen.', english: 'I would like to visit the old town.' },
        { german: 'Welche Sehenswürdigkeiten empfehlen Sie?', english: 'What sights do you recommend?' },
        { german: 'Ich interessiere mich für die lokale Küche.', english: 'I am interested in the local cuisine.' }
      ];
    }
    
    // Food/Restaurant context
    if (text.includes('essen') || text.includes('restaurant') || text.includes('küche') || text.includes('speise') || text.includes('menü')) {
      return [
        { german: 'Ich bin Vegetarier, haben Sie vegetarische Optionen?', english: 'I am vegetarian, do you have vegetarian options?' },
        { german: 'Das hört sich sehr lecker an!', english: 'That sounds very delicious!' },
        { german: 'Können Sie das Gericht empfehlen?', english: 'Can you recommend this dish?' }
      ];
    }
    
    // General conversation context
    if (text.includes('frage') || text.includes('denken') || text.includes('meinung') || text.includes('glauben')) {
      return [
        { german: 'Das ist eine sehr gute Frage.', english: 'That is a very good question.' },
        { german: 'Ich denke, dass...', english: 'I think that...' },
        { german: 'Meine Meinung dazu ist...', english: 'My opinion on this is...' }
      ];
    }
    const questionWordMatch = text.match(/\b(welche|welcher|welches|was|wie|wo|wann|warum|wer)\b/);
    const hasQuestionMark = text.includes('?');

    if (questionWordMatch || hasQuestionMark) {
      const questionWord = questionWordMatch ? questionWordMatch[1] : '';

      if (questionWord.startsWith('welch') || questionWord === 'was') {
        return [
          { german: 'Am wichtigsten sind für mich die konkreten nächsten Schritte.', english: 'The most important thing for me is the concrete next steps.' },
          { german: 'Wir sollten uns zuerst auf die Erwartungen und Ziele einigen.', english: 'We should first agree on the expectations and goals.' },
          { german: 'Bitte konzentrieren wir uns auf das Thema Budget und Zeitplan.', english: 'Let’s focus on the budget and timeline.' }
        ];
      }

      if (questionWord === 'wie') {
        return [
          { german: 'Ich würde gern Schritt für Schritt vorgehen.', english: 'I would like to proceed step by step.' },
          { german: 'Vielleicht beginnen wir mit einer kurzen Zusammenfassung.', english: 'Perhaps we can start with a short summary.' },
          { german: 'Lassen Sie uns zuerst die wichtigsten Punkte priorisieren.', english: 'Let’s prioritize the key points first.' }
        ];
      }

      if (questionWord === 'wo') {
        return [
          { german: 'Wir können uns gern im Büro in Berlin treffen.', english: 'We can meet at the office in Berlin.' },
          { german: 'Ein Treffen online über Teams wäre für mich ideal.', english: 'An online meeting via Teams would be ideal for me.' },
          { german: 'Lassen Sie uns einen neutralen Ort wählen, z. B. das Café am Bahnhof.', english: 'Let’s choose a neutral location, for example the café at the station.' }
        ];
      }

      if (questionWord === 'wann') {
        return [
          { german: 'Mir passt der kommende Dienstagvormittag sehr gut.', english: 'Next Tuesday morning works very well for me.' },
          { german: 'Ich könnte auch Donnerstag gegen 15 Uhr einrichten.', english: 'I could also make Thursday around 3 PM work.' },
          { german: 'Lassen Sie uns gerne noch diese Woche einen Termin finden.', english: 'Let’s find an appointment later this week.' }
        ];
      }

      if (questionWord === 'warum') {
        return [
          { german: 'Weil wir langfristige Stabilität für das Projekt benötigen.', english: 'Because we need long-term stability for the project.' },
          { german: 'Der Hauptgrund ist, dass unsere Kunden klare Prozesse erwarten.', english: 'The main reason is that our customers expect clear processes.' },
          { german: 'Ohne diese Anpassung riskieren wir Verzögerungen im Ablauf.', english: 'Without this adjustment we risk delays in the process.' }
        ];
      }

      if (questionWord === 'wer') {
        return [
          { german: 'Mein Kollege Herr Müller übernimmt die Projektleitung.', english: 'My colleague Mr. Müller will take over the project lead.' },
          { german: 'Für die Abstimmung ist unser Teamleiterin Frau Becker zuständig.', english: 'Our team lead, Ms. Becker, is responsible for coordination.' },
          { german: 'Ich arbeite eng mit unserem Support-Team zusammen.', english: 'I am working closely with our support team.' }
        ];
      }

      // General yes/no or clarification style question fallback
      return [
        { german: 'Ja, das passt für mich sehr gut.', english: 'Yes, that works very well for me.' },
        { german: 'Ich bin mir noch unsicher, könnten Sie das kurz erläutern?', english: 'I’m still unsure, could you briefly explain it?' },
        { german: 'Im Moment habe ich Bedenken, weil wir noch offene Fragen haben.', english: 'At the moment I have concerns because we still have open questions.' }
      ];
    }
    
    // Statement fallback referencing the bot message while driving the conversation forward
    return [
      { german: 'Danke für die Information. Wie sollen wir als Nächstes vorgehen?', english: 'Thanks for the information. How should we proceed next?' },
      { german: 'Verstanden, ich unterstütze diesen Ansatz und bringe meine Ideen ein.', english: 'Understood, I support this approach and will contribute my ideas.' },
      { german: 'Das klingt nach einem guten Plan. Lassen Sie uns die nächsten Schritte klären.', english: 'That sounds like a good plan. Let’s clarify the next steps.' }
    ];
  };

  // Context enhancement function - extracts key topics from user messages
  const enhanceConversationContext = async (conversationId: string, userMessage: string) => {
    if (!conversationId || !userMessage.trim()) return;

    try {
      // NOTE: conversation_context column doesn't exist in database yet
      // This function is disabled until the migration is applied
      console.log('📝 Context enhancement skipped - column not available yet');
      return;
    } catch (error) {
      console.error('Error in enhanceConversationContext:', error);
    }
  };

  const generateTranslationAndSuggestions = async (
    messageId: string,
    germanText: string,
    messagesOverride?: ChatMessage[],
    conversationIdParam?: string | null
  ) => {
    console.log('🎯 === AUTO-GENERATING SUGGESTIONS ===');
    console.log('Message ID:', messageId);
    console.log('German text:', germanText);
    console.log('🚨 FUNCTION CALLED - Starting suggestion generation...');
    
    // Use unified function with provided bot message
    // It will auto-detect conversation context from chatMessages
    await generateSuggestionsUsingOpenAI(messageId, germanText, undefined, messagesOverride, conversationIdParam);
  };

  // Audio cache is now handled by the centralized TTS service

  // 🎮 GAMIFICATION FUNCTIONS
  const addExperience = (amount: number, source: string) => {
    setPlayerStats(prev => {
      const newExp = prev.experience + amount;
      const newLevel = Math.floor(newExp / 100) + 1;
      const expToNext = 100 - (newExp % 100);
      
      // Check for level up
      if (newLevel > prev.level) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }
      
      return {
        ...prev,
        experience: newExp,
        level: newLevel,
        experienceToNext: expToNext,
        totalPoints: prev.totalPoints + amount
      };
    });
  };

  // 🎮 GAMIFICATION TRIGGERS
  const triggerConversationComplete = () => {
    const streakUpdate = updateStreakOnActivity();

    setPlayerStats(prev => ({
      ...prev,
      conversationsCompleted: prev.conversationsCompleted + 1,
      currentStreak: streakUpdate.current,
      longestStreak: streakUpdate.longest,
      streak: streakUpdate.current
    }));
    addExperience(25, 'conversation_complete');
    checkAchievements();
  };

  React.useEffect(() => {
    const stored = streakDataRef.current;
    setPlayerStats(prev => ({
      ...prev,
      currentStreak: stored.current,
      longestStreak: stored.longest,
      streak: stored.current
    }));
  }, [currentView]);

  const triggerWordLearned = (wordCount: number = 1) => {
    setPlayerStats(prev => ({
      ...prev,
      wordsLearned: prev.wordsLearned + wordCount
    }));
    addExperience(wordCount * 2, 'word_learned');
    checkAchievements();
  };

  const triggerSpeakingTime = (minutes: number) => {
    setPlayerStats(prev => ({
      ...prev,
      speakingTime: prev.speakingTime + minutes
    }));
    addExperience(minutes * 3, 'speaking_time');
    checkAchievements();
  };

  const addAchievement = (achievementId: string, title: string, description: string) => {
    setPlayerStats(prev => {
      if (!prev.achievements.includes(achievementId)) {
        setAchievementData({ title, description });
        setShowAchievement(achievementId);
        setRecentAchievements(prev => [...prev, achievementId]);
        setTimeout(() => {
          setShowAchievement(null);
          setAchievementData(null);
        }, 3000);
        setTimeout(() => setRecentAchievements(prev => prev.filter(id => id !== achievementId)), 5000);
        
        return {
          ...prev,
          achievements: [...prev.achievements, achievementId]
        };
      }
      return prev;
    });
  };

  const checkAchievements = () => {
    const stats = playerStats;
    
    // Conversation achievements
    if (stats.conversationsCompleted >= 1 && !stats.achievements.includes('first_conversation')) {
      addAchievement('first_conversation', '🎉 First Conversation', 'Completed your first German conversation!');
    }
    if (stats.conversationsCompleted >= 10 && !stats.achievements.includes('conversation_master')) {
      addAchievement('conversation_master', '💬 Conversation Master', 'Completed 10 conversations!');
    }
    if (stats.conversationsCompleted >= 50 && !stats.achievements.includes('conversation_expert')) {
      addAchievement('conversation_expert', '🏆 Conversation Expert', 'Completed 50 conversations!');
    }
    
    // Streak achievements
    if (stats.currentStreak >= 3 && !stats.achievements.includes('streak_starter')) {
      addAchievement('streak_starter', '🔥 Streak Starter', '3-day practice streak!');
    }
    if (stats.currentStreak >= 7 && !stats.achievements.includes('week_warrior')) {
      addAchievement('week_warrior', '⚡ Week Warrior', '7-day practice streak!');
    }
    if (stats.currentStreak >= 30 && !stats.achievements.includes('month_master')) {
      addAchievement('month_master', '🌟 Month Master', '30-day practice streak!');
    }
    
    // Level achievements
    if (stats.level >= 5 && !stats.achievements.includes('level_5')) {
      addAchievement('level_5', '⭐ Level 5', 'Reached level 5!');
    }
    if (stats.level >= 10 && !stats.achievements.includes('level_10')) {
      addAchievement('level_10', '🌟 Level 10', 'Reached level 10!');
    }
    if (stats.level >= 25 && !stats.achievements.includes('level_25')) {
      addAchievement('level_25', '🏆 Level 25', 'Reached level 25!');
    }
    
    // Vocabulary achievements
    if (stats.wordsLearned >= 50 && !stats.achievements.includes('vocab_50')) {
      addAchievement('vocab_50', '📚 Vocabulary Builder', 'Learned 50 words!');
    }
    if (stats.wordsLearned >= 200 && !stats.achievements.includes('vocab_200')) {
      addAchievement('vocab_200', '📖 Word Wizard', 'Learned 200 words!');
    }
    if (stats.wordsLearned >= 500 && !stats.achievements.includes('vocab_500')) {
      addAchievement('vocab_500', '📚 Lexicon Legend', 'Learned 500 words!');
    }
  };

  const speakText = async (text: string) => {
    await germanTTS.speak(text);
  };

  // Pronunciation feature functions - UNUSED
  /*
  const getPhoneticBreakdown = async (text: string, messageId: string) => {
    console.log('🎯 Getting phonetic breakdown for:', text, 'Message ID:', messageId);
    console.log('🔗 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('🔑 Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    
    // For now, let's create mock data to test the UI
    console.log('🧪 Using mock data for testing...');
    
    const mockData = {
      words: text.split(' ').map(word => ({
        original: word,
        phonetic: `[${word}]`,
        transliteration: word.toUpperCase(),
        syllables: [word]
      }))
    };
    
    console.log('📊 Mock phonetic breakdown data:', mockData);
    
    setPhoneticBreakdowns(prev => ({
      ...prev,
      [messageId]: mockData.words
    }));
    
    console.log('✅ Mock phonetic breakdown set for message:', messageId);
    
    // TODO: Uncomment this when Supabase function is working
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phonetic-breakdown`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      console.log('📡 Phonetic breakdown response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Phonetic breakdown error:', errorText);
        throw new Error(`Failed to get phonetic breakdown: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Phonetic breakdown data:', data);
      
      if (data.success) {
        setPhoneticBreakdowns(prev => ({
          ...prev,
          [messageId]: data.words
        }));
        console.log('✅ Phonetic breakdown set for message:', messageId);
        console.log('📊 Updated phoneticBreakdowns:', { ...phoneticBreakdowns, [messageId]: data.words });
      } else {
        console.error('❌ Phonetic breakdown failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Error getting phonetic breakdown:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  };
  */

  const playWordAudio = async (word: string, speed?: number) => {
    // const actualSpeed = speed || getWordSpeed(word); // Unused
    
    // Add gamification points for playing word audio
    addExperience(2, 'word_audio_play');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/german-tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: word, speed })
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();
      if (data.success) {
        const audio = new Audio(data.audioUrl);
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing word audio:', error);
    }
  };

  const togglePronunciationBreakdown = (messageId: string) => {
    setShowPronunciationBreakdown(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const toggleTranslation = (messageId: string) => {
    const isCurrentlyShowing = showTranslation[messageId];
    
    if (isCurrentlyShowing) {
      // Hide translation
      setShowTranslation(prev => ({
        ...prev,
        [messageId]: false
      }));
    } else {
      // Show translation - get it if we don't have it
      if (!translatedMessages[messageId]) {
        // Find the message content
        const message = chatMessages.find(msg => msg.id === messageId);
        if (message) {
          translateMessage(messageId, message.content);
        }
      }
      setShowTranslation(prev => ({
        ...prev,
        [messageId]: true
      }));
    }
  };

  const translateMessage = async (messageId: string, germanText: string) => {
    console.log('🔤 === TRANSLATION REQUEST ===');
    console.log('Message ID:', messageId);
    console.log('German Text:', germanText);
    
    try {
      // Use chat function for translation since translate function might not exist
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Translate this German text to English: "${germanText}". Provide only the English translation, nothing else.`
          }],
          conversationId: 'translation',
          contextLevel: 'Casual',
          difficultyLevel: 'Intermediate',
          systemInstruction: "You are a German to English translator. Provide ONLY the English translation of the German text. Be accurate and concise. Do not add any explanations or additional text."
        })
      });

      console.log('🔤 Translation response status:', response.status);
      console.log('🔤 Translation response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔤 Translation response data:', data);
        console.log('🔤 Translation message:', data.message);
        
        if (data.message) {
          setTranslatedMessages(prev => ({
            ...prev,
            [messageId]: data.message
          }));
          console.log('✅ Translation set for message ID:', messageId);
        } else {
          console.error('❌ No message in response data');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Translation failed:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error translating message:', error);
      // Fallback - set a placeholder
      setTranslatedMessages(prev => ({
        ...prev,
        [messageId]: 'Translation unavailable'
      }));
    }
  };

  const toggleSuggestions = async (messageId: string) => {
    console.log('🔄 toggleSuggestions called for messageId:', messageId);
    const isCurrentlyShowing = showSuggestions[messageId];
    console.log('Current showSuggestions state:', showSuggestions);
    console.log('Is currently showing:', isCurrentlyShowing);
    
    if (isCurrentlyShowing) {
      // Hide suggestions
      setShowSuggestions(prev => ({
        ...prev,
        [messageId]: false
      }));
    } else {
      // Show suggestions
      setShowSuggestions(prev => ({
        ...prev,
        [messageId]: true
      }));
      
      // Check if we already have suggestions for this message
      const suggestionKey = getSuggestionKey(selectedConversation, messageId);
      const currentSuggestions = suggestedResponses[suggestionKey];
      console.log('🔍 toggleSuggestions: Current suggestions for messageId:', currentSuggestions);
      console.log('🔍 toggleSuggestions: Suggestions type:', typeof currentSuggestions);
      console.log('🔍 toggleSuggestions: Suggestions length:', currentSuggestions?.length);
      
      if (!currentSuggestions || currentSuggestions.length === 0) {
        // Generate suggestions on demand only if not already generated
        console.log('🔍 toggleSuggestions: No suggestions found, generating new ones...');
        const message = chatMessages.find(msg => msg.id === messageId);
        if (message) {
          console.log('🔍 toggleSuggestions: Found message, generating suggestions for:', message.content);
          await generateTranslationAndSuggestions(messageId, message.content, undefined, selectedConversation);
        } else {
          console.log('🔍 toggleSuggestions: No message found for messageId:', messageId);
        }
      } else {
        console.log('🔍 toggleSuggestions: Suggestions already exist, checking format...');
        // If we have suggestions but they're not translated yet, translate them
        const firstSuggestion = currentSuggestions[0];
        console.log('🔍 toggleSuggestions: First suggestion:', firstSuggestion);
        console.log('🔍 toggleSuggestions: First suggestion type:', typeof firstSuggestion);
        
        if (typeof firstSuggestion === 'string') {
          // They're still strings, need translation
          console.log('🔍 toggleSuggestions: Converting string suggestions to translated format...');
          translateSuggestions(messageId, currentSuggestions as string[], suggestionKey);
        } else {
          console.log('🔍 toggleSuggestions: Suggestions already in object format, no action needed');
        }
      }
    }
  };

  const toggleSuggestionTranslation = (messageId: string, suggestionIndex: number) => {
    const key = `${messageId}-${suggestionIndex}`;
    setShowSuggestionTranslation(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const useSuggestedResponse = (suggestion: string, messageId?: string) => {
    console.log('🔵 === USER SELECTED A SUGGESTION ===');
    console.log('Selected suggestion:', suggestion);
    console.log('Message ID:', messageId);
    
    setMessageInput(suggestion);
    
    // Track that this suggestion was selected for this message
    if (messageId) {
      setLastSuggestionUsed(prev => ({
        ...prev,
        [messageId]: suggestion
      }));
      console.log('✅ Tracked suggestion selection for message:', messageId);
    }
  };

  // Generate suggestions on demand when user clicks on suggested responses - UNUSED
  /*
  const generateSuggestionsOnDemand = async (messageId: string, germanText: string) => {
    // Always try to get contextual suggestions, even if fallback exists
    console.log('🎯 Generating contextual suggestions for:', germanText);
    
    try {
      // Extract conversation context (last 2-3 messages including current message)
      const currentMessageIndex = chatMessages.findIndex(msg => msg.id === messageId);
      let conversationContext = '';
      
      if (currentMessageIndex >= 0) {
        // Include messages up to and including the current message
        const contextMessages = chatMessages.slice(Math.max(0, currentMessageIndex - 2), currentMessageIndex + 1);
        const contextStrings = contextMessages.map(msg => `${msg.role}: ${msg.content}`);
        conversationContext = contextStrings.join(' -> ');
      }
      
      console.log('📝 Conversation context:', conversationContext);
      
      // Build enhanced prompt with conversation context
      const promptContent = conversationContext 
        ? `Based on this conversation context: ${conversationContext}. The AI just asked: "${germanText}". Please provide: 1) English translation of the AI's question: "${germanText}" 2) Three specific German responses that directly answer or respond to this question, appropriate for a language learner. Each response should be contextually relevant to the question asked. WITH their English translations. Format exactly as: TRANSLATION: [translation] SUGGESTIONS: [German suggestion 1] | [German suggestion 2] | [German suggestion 3] ENGLISH: [English translation 1] | [English translation 2] | [English translation 3]`
        : `The AI just asked: "${germanText}". Please provide: 1) English translation of the AI's question: "${germanText}" 2) Three specific German responses that directly answer or respond to this question, appropriate for a language learner. Each response should be contextually relevant to the question asked. WITH their English translations. Format exactly as: TRANSLATION: [translation] SUGGESTIONS: [German suggestion 1] | [German suggestion 2] | [German suggestion 3] ENGLISH: [English translation 1] | [English translation 2] | [English translation 3]`;
      
      console.log('🚀 Making API call for contextual suggestions...');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: promptContent
          }],
          conversationId: 'helper',
          contextLevel,
          difficultyLevel,
          systemInstruction: "You are a German language learning assistant. Generate suggestions that DIRECTLY ANSWER the specific question asked by the AI. Do NOT provide generic responses. Each suggestion must be a concrete, specific answer to the exact question. For example: if asked 'Which details are most important?' respond with specific details like 'Die Budgetplanung ist am wichtigsten' or 'Die technischen Spezifikationen sind entscheidend'. Always provide German suggestions with English translations in the exact format requested."
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.message;
        
        // Parse translation and suggestions - handle both old and new formats
        const translationMatch = content.match(/TRANSLATION:\s*(.+?)(?=SUGGESTIONS:|$)/);
        const suggestionsMatch = content.match(/SUGGESTIONS:\s*(.+?)(?=ENGLISH:|$)/);
        const englishMatch = content.match(/ENGLISH:\s*(.+)/);
        
        console.log('On-demand parsing debug:', {
          translationMatch: translationMatch ? translationMatch[1] : null,
          suggestionsMatch: suggestionsMatch ? suggestionsMatch[1] : null,
          englishMatch: englishMatch ? englishMatch[1] : null,
          content: content.substring(0, 200) + '...'
        });
        
        if (translationMatch) {
          setTranslatedMessages(prev => ({
            ...prev,
            [messageId]: translationMatch[1].trim()
          }));
        }
        
        // Try new format first (with English translations)
        if (suggestionsMatch && englishMatch) {
          const germanSuggestions = suggestionsMatch[1].split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          const englishTranslations = englishMatch[1].split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          
          // Pair German suggestions with their English translations
          const pairedSuggestions = germanSuggestions.map((german: string, index: number) => ({
            german: german.trim(),
            english: englishTranslations[index] ? englishTranslations[index].trim() : ''
          }));
          
          console.log('New format - German suggestions:', germanSuggestions);
          console.log('New format - English translations:', englishTranslations);
          console.log('New format - Paired suggestions:', pairedSuggestions);
          
          setSuggestedResponses(prev => ({
            ...prev,
            [messageId]: pairedSuggestions
          }));
        } else if (suggestionsMatch) {
          // Fallback: old format (German suggestions only)
          const suggestions = suggestionsMatch[1].split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          
          // Clean up any English translations that might be in parentheses or brackets
          const cleanedSuggestions = suggestions.map((suggestion: string) => {
            // Remove English text in parentheses like (English translation)
            let cleaned = suggestion.replace(/\([^)]*[A-Za-z][^)]*\)/g, '');
            // Remove English text in brackets like [English translation]
            cleaned = cleaned.replace(/\[[^\]]*[A-Za-z][^\]]*\]/g, '');
            // Remove any remaining English text patterns
            cleaned = cleaned.replace(/\([^)]*\)/g, '');
            cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
            // Trim whitespace
            return cleaned.trim();
          }).filter((s: string) => s.length > 0);
          
          console.log('Old format - Original suggestions:', suggestions);
          console.log('Old format - Cleaned suggestions:', cleanedSuggestions);
          
          setSuggestedResponses(prev => ({
            ...prev,
            [messageId]: cleanedSuggestions
          }));
        } else {
          console.log('No suggestions match found in:', content);
          // Set fallback suggestions if parsing fails
          const fallbackSuggestions = [
            { german: 'Das ist interessant.', english: 'That is interesting.' },
            { german: 'Können Sie das erklären?', english: 'Can you explain that?' },
            { german: 'Ich verstehe.', english: 'I understand.' }
          ];
          
          setSuggestedResponses(prev => ({
            ...prev,
            [messageId]: fallbackSuggestions
          }));
        }
      }
    } catch (error) {
      console.error('Error generating suggestions on demand:', error);
      
      // Set fallback suggestions to prevent infinite loading
      const fallbackSuggestions = [
        'Das ist interessant.',
        'Können Sie das erklären?',
        'Ich verstehe.'
      ];
      
      setSuggestedResponses(prev => ({
        ...prev,
        [messageId]: fallbackSuggestions
      }));
    }
  };
  */

  const handleHelpClick = async (messageContent: string, messageId: string) => {
    console.log('AI Grammar help button clicked for message:', messageId);
    console.log('Message content:', messageContent);
    console.log('Current state - showToolbar:', showToolbar, 'activeHelpButton:', activeHelpButton, 'toolbarCollapsed:', toolbarCollapsed);
    
    // Toggle toolbar collapse if it's already open for this message
    if (showToolbar && activeHelpButton === messageId) {
      console.log('Toggling AI grammar help toolbar collapse');
      setToolbarCollapsed(true);
      setActiveHelpButton(null); // Clear highlighting
      return;
    }
    
    console.log('Expanding AI grammar help toolbar');
    // Set the current AI message for the toolbar
    setCurrentAIMessage(messageContent);
    // Show the toolbar without affecting sidebar
    setShowToolbar(true);
    setToolbarCollapsed(false); // Expand toolbar
    // Don't automatically collapse sidebar - let user control it
    // setSidebarCollapsed(true); // REMOVED - let user control sidebar
    // Mark that toolbar was opened via help button
    setToolbarOpenedViaHelp(true);
    // Set the active help button
    setActiveHelpButton(messageId);
    setToolbarActiveTab('explain');
    
    // Run comprehensive analysis for the AI message
    console.log('Running comprehensive analysis for AI message');
    await runComprehensiveAnalysis(messageContent, messageId);
  };


  const triggerAIResponse = async (userMessage: string, messageId: string, clearedState?: {
    waitingForCorrection: boolean;
    errorMessages: { [key: string]: string };
    userAttempts: { [key: string]: number };
  }) => {
    console.log('🤖 === TRIGGER AI RESPONSE DEBUG ===');
    console.log('User message:', userMessage);
    console.log('Message ID:', messageId);
    console.log('Cleared state passed:', clearedState);
    console.log('🔍 === CURRENT STATE VALUES ===');
    console.log('waitingForCorrection:', waitingForCorrection);
    console.log('errorMessages:', errorMessages);
    console.log('userAttempts:', userAttempts);
    
    // Use cleared state if provided, otherwise use current state
    const currentWaitingForCorrection = clearedState ? clearedState.waitingForCorrection : waitingForCorrection;
    const currentErrorMessages = clearedState ? clearedState.errorMessages : errorMessages;
    const currentUserAttempts = clearedState ? clearedState.userAttempts : userAttempts;
    
    const hasErrorMessages = currentErrorMessages[messageId];
    
    console.log('Has error messages:', !!hasErrorMessages);
    console.log('Error messages content:', currentErrorMessages);
    console.log('User attempts content:', currentUserAttempts);
    console.log('Using cleared state:', !!clearedState);
    console.log('Current waitingForCorrection:', currentWaitingForCorrection);
    
    // Check if we should block AI response
    const shouldBlockAI = hasErrorMessages || currentWaitingForCorrection;
    
    console.log('🚫 === AI RESPONSE BLOCKING CHECK ===');
    console.log('Should block AI:', shouldBlockAI);
    console.log('Blocking reasons:');
    console.log('- hasErrorMessages:', !!hasErrorMessages);
    console.log('- waitingForCorrection:', currentWaitingForCorrection);
    console.log('- Error messages for this message:', currentErrorMessages[messageId]);
    console.log('- User attempts for this message:', currentUserAttempts[messageId]);
    
    if (shouldBlockAI) {
      console.log('🚫 === BLOCKING AI RESPONSE - ERRORS DETECTED ===');
      console.log('Not sending to AI because errors need to be corrected first');
      setIsSending(false);
      setIsTyping(false);
      return;
    }

    clearCheckingStatus(messageId);

    console.log('✅ === PROCEEDING WITH AI RESPONSE ===');
    console.log('📡 === STARTING AI API CALL ===');
    console.log('Selected conversation:', selectedConversation);
    console.log('User message being sent:', userMessage);
    
    setIsSending(true);
    setIsTyping(true);
    
    // Check if user selected a suggestion for this message
    const selectedSuggestion = lastSuggestionUsed[messageId];
    console.log('🔍 Checking if suggestion was used for this message:', messageId);
    console.log('Selected suggestion:', selectedSuggestion);
    
    // Build enhanced system instruction if suggestion was selected
    let enhancedSystemInstruction = `${contextLevel === 'Professional' ? 'Sie sind' : 'Du bist'} ein freundlicher Gesprächspartner. Antworte kurz und natürlich (1-2 Sätze). Stelle viele Fragen. Sei neugierig und interessiert. Lass den Nutzer viel sprechen. ${contextLevel === 'Professional' ? 'Verwende "Sie" und höfliche Ausdrücke.' : 'Verwende "Du" und umgangssprachliche Ausdrücke.'} KEINE englischen Übersetzungen oder Erklärungen.`;
    
    if (selectedSuggestion) {
      console.log('✅ User selected a suggestion - enhancing AI context');
      enhancedSystemInstruction += `\n\nWICHTIGER HINWEIS: Der Nutzer hat diese Antwort aus vorgeschlagenen Optionen ausgewählt: "${selectedSuggestion}". Das zeigt, dass der Nutzer mit dieser Perspektive einverstanden ist oder diese Antwort für passend hält. Baue deine Antwort darauf auf und entwickle das Gespräch weiter basierend auf dieser Auswahl.`;
      console.log('Enhanced system instruction:', enhancedSystemInstruction.substring(0, 200) + '...');
    }
    
    // Get conversation context from current conversation
    let conversationContextToSend = userMessage;
    if (selectedConversation) {
      const currentConversation = conversations.find(conv => conv.id === selectedConversation);
      if (currentConversation && currentConversation.conversation_context) {
        conversationContextToSend = currentConversation.conversation_context;
        console.log('📝 Using conversation context:', conversationContextToSend);
      }
    }
    
    try {
      // Build recent conversation history (user + assistant) to maintain context
      const ensureUserMessagePresent = chatMessages.some(msg => msg.id === messageId)
        ? chatMessages
        : [
            ...chatMessages,
            {
              id: messageId,
              role: 'user',
              content: textContent,
              timestamp: new Date().toISOString()
            }
          ];

      const sortedMessages = [...ensureUserMessagePresent].sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return aTime - bTime;
      });

      const recentMessages = sortedMessages.slice(-8);
      let openAIMessages = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      if (
        openAIMessages.length === 0 ||
        openAIMessages[openAIMessages.length - 1].role !== 'user'
      ) {
        openAIMessages = [
          ...openAIMessages,
          {
            role: 'user' as const,
            content: textContent
          }
        ];
      }

      // Get user session token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('📡 === TRIGGERING AI RESPONSE ===');
      console.log('Conversation ID:', selectedConversation);
      console.log('User message:', userMessage);
      console.log('Has session token:', !!session?.access_token);
      console.log('Onboarding data exists:', !!onboardingData);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: openAIMessages,
          conversationId: selectedConversation,
          contextLevel,
          difficultyLevel,
          userProfile: onboardingData && onboardingData.germanLevel ? {
            germanLevel: onboardingData.germanLevel,
            goals: Array.isArray(onboardingData.goals) ? onboardingData.goals : [],
            personalityTraits: Array.isArray(onboardingData.personalityTraits) ? onboardingData.personalityTraits : [],
            conversationTopics: Array.isArray(onboardingData.conversationTopics) ? onboardingData.conversationTopics : []
          } : undefined,
          systemInstruction: enhancedSystemInstruction,
          conversationContext: conversationContextToSend
        })
      });
      
      console.log('📡 === API RESPONSE RECEIVED ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', response.status);
        console.error('Error details:', errorText);
        const errorMessage = errorText || `API request failed with status ${response.status}`;
        setIsSending(false);
        setIsTyping(false);
        setErrorMessages(prev => ({ ...prev, [messageId]: errorMessage }));
        return;
      }
      
      const data = await response.json();
      
      if (!data || !data.message) {
        console.error('❌ Invalid API response - missing message field');
        console.error('Response data:', data);
        throw new Error('Invalid API response: missing message field');
      }
      
      console.log('📝 === AI RESPONSE DATA ===');
      console.log('AI message:', data.message);
      
      // Generate message ID first
      const messageId = (Date.now() + 1).toString();
        console.log('🤖 Generated message ID:', messageId);
        
        const assistantMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        };

        console.log('🤖 === ADDING AI MESSAGE TO CHAT ===');
        console.log('AI message ID:', assistantMessage.id);
        console.log('AI message content:', assistantMessage.content);
        
        let updatedMessages: ChatMessage[] = [];
        setChatMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          updatedMessages = newMessages;
          console.log('Updated chat messages count:', newMessages.length);
          return newMessages;
        });
        
        setCurrentAIMessage(data.message);
        
        // Automatically generate contextual suggestions for the AI's response
        console.log('🤖 === ABOUT TO AUTO-GENERATE SUGGESTIONS ===');
        console.log('🤖 Message ID for suggestions:', messageId);
        console.log('🤖 AI message content:', data.message);
        console.log('🤖 Calling generateTranslationAndSuggestions...');
        
        await generateTranslationAndSuggestions(
          messageId,
          data.message,
          updatedMessages.length ? updatedMessages : chatMessages,
          selectedConversation
        );
        
        console.log('🤖 === AUTO-GENERATION CALL COMPLETED ===');
        
        // Clear the suggestion tracking for this message after AI has responded
        if (selectedSuggestion) {
          console.log('🧹 Clearing suggestion tracking for message:', messageId);
          setLastSuggestionUsed(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
        }
        
        console.log('✅ === AI RESPONSE COMPLETED SUCCESSFULLY ===');
        setIsSending(false);
        setIsTyping(false);
    } catch (error) {
      console.error('❌ === AI RESPONSE ERROR ===');
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setIsSending(false);
      setIsTyping(false);
      setErrorMessages(prev => ({ ...prev, [messageId]: errorMessage }));
    } finally {
      console.log('🏁 === AI RESPONSE FINALLY BLOCK ===');
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const detectErrors = async (userMessage: string, messageId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze this German text for errors: "${userMessage}". Respond with "ERROR: [description]" if there are mistakes, or "CORRECT" if it's correct.`
          }],
          conversationId: 'error_detection',
          contextLevel: 'beginner',
          difficultyLevel: 'easy',
          systemInstruction: "You are a German grammar checker. Analyze the text for grammatical errors, spelling mistakes, or incorrect word usage. If there are errors, provide a brief description. If correct, just say CORRECT."
        })
      });

      if (response.ok) {
        const data = await response.json();
        const hasError = data.message.includes('ERROR:');
        
        if (hasError) {
          setErrorMessages(prev => ({
            ...prev,
            [messageId]: data.message
          }));
          setUserAttempts(prev => ({
            ...prev,
            [messageId]: (prev[messageId] || 0) + 1
          }));
          setWaitingForCorrection(true);
        } else {
          // Clear retry states only for this specific message, not all messages
          setUserAttempts(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          setErrorMessages(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          setMessageAttempts(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          setShowOriginalMessage(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          setOriginalMessages(prev => {
            const newState = { ...prev };
            delete newState[messageId];
            return newState;
          });
          
          // Check if there are any other messages with errors after clearing this one
          setTimeout(() => {
            setUserAttempts(current => {
              const hasOtherErrors = Object.keys(current).length > 0;
              setWaitingForCorrection(hasOtherErrors);
              return current;
            });
          }, 0);
          
          // Show typing animation and trigger AI response
          setIsSending(true);
          setIsTyping(true);
          await triggerAIResponse(userMessage, messageId);
        }
      }
    } catch (error) {
      console.error('Error detecting mistakes:', error);
    }
  };

  // Analyze German pronunciation for voice messages
  const analyzeGermanPronunciation = async (audioBlob: Blob, transcription: string, messageId: string): Promise<PronunciationData | null> => {
    try {
      console.log('🎤 === ANALYZING GERMAN PRONUNCIATION ===');
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('Transcription:', transcription);
      console.log('Message ID:', messageId);

      // Convert audio to base64 using chunked conversion for large files
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = '';
      const chunkSize = 8192; // Process in 8KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64 = btoa(binaryString);

      // Call pronunciation analysis API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronunciation-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64,
          transcription: transcription
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Pronunciation analysis completed:', data);

        // Save to database
        if (user && selectedConversation) {
          const conversation = conversations.find(c => c.id === selectedConversation);
          if (conversation) {
            await saveMessageAnalysis(
              messageId,
              user.id,
              conversation.id,
              transcription,
              'voice',
              data,
              undefined // No grammar topic for pronunciation-only analysis
            );
          }
        }

        // Track sentence-level pronunciation score for conversation summary
        if (data && typeof (data.sentenceScore ?? data.overallScore) === 'number') {
          handlePronunciationComplete(
            data.sentenceScore ?? data.overallScore,
            transcription,
            'sentence'
          );
        }

        return data;
      } else {
        console.error('❌ Pronunciation analysis failed:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error in pronunciation analysis:', error);
      return null;
    }
  };

  const handleErrorCorrection = async (messageId: string) => {
    console.log('=== GRAMMAR HELP BUTTON CLICKED ===');
    console.log('Message ID:', messageId);
    console.log('Comprehensive analysis for this message:', comprehensiveAnalysis[messageId]);
    console.log('Current AI message:', currentAIMessage);
    console.log('Show toolbar:', showToolbar, 'Toolbar collapsed:', toolbarCollapsed);
    console.log('All comprehensive analysis:', comprehensiveAnalysis);
    
    // Get the user message content for analysis
    const userMessage = chatMessages.find(msg => msg.id === messageId);
    if (!userMessage) {
      console.log('User message not found');
      return;
    }
    
    // Toggle toolbar collapse if it's already open for this message
    if (showToolbar && currentAIMessage === userMessage.content && !toolbarCollapsed) {
      console.log('Toggling toolbar collapse');
      setToolbarCollapsed(true);
      setActiveHelpButton(null); // Clear highlighting
      return;
    }
    
    console.log('Expanding toolbar for grammar help');
    // Set the user message content for grammar analysis
    setCurrentAIMessage(userMessage.content);
    // Show the toolbar without affecting sidebar
    setShowToolbar(true);
    setToolbarCollapsed(false); // Expand toolbar
    // Don't automatically collapse sidebar - let user control it
    // setSidebarCollapsed(true); // REMOVED - let user control sidebar
    // Mark that toolbar was opened via error correction
    setToolbarOpenedViaHelp(true);
    // Set the active help button for highlighting
    setActiveHelpButton(messageId);
    setToolbarActiveTab('explain');
    
    // Ensure comprehensive analysis is available for this message
    if (!comprehensiveAnalysis[messageId]) {
      console.log('Running comprehensive analysis for grammar help');
      await runComprehensiveAnalysis(userMessage.content, messageId);
    }
    
    // Auto-load grammar explanation when toolbar opens
    console.log('Auto-loading grammar explanation for:', userMessage.content);
    // The grammar explanation will be loaded automatically by the Toolbar component
    // due to the autoLoadExplanations prop being set to true
  };

  const generateSuggestedAnswer = async (messageId: string, userMessage: string) => {
    console.log('🚀 === GENERATING SUGGESTED ANSWER ===');
    console.log('Message ID:', messageId);
    console.log('User message:', userMessage);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `The user tried to say: "${userMessage}" but made mistakes. Provide a correct German sentence that conveys the same meaning. Respond with ONLY the correct German sentence, no explanations.`
          }],
          conversationId: 'suggestion',
          contextLevel: 'beginner',
          difficultyLevel: 'easy',
          systemInstruction: "You are a helpful German tutor. Provide a correct German sentence that conveys the same meaning as what the user was trying to say. Respond with ONLY the correct sentence, no explanations or translations."
        })
      });

      console.log('📡 === SUGGESTED ANSWER API RESPONSE ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📝 === SUGGESTED ANSWER DATA ===');
        console.log('Response data:', data);
        console.log('Suggested answer:', data.message);
        
        setSuggestedAnswers(prev => {
          const newState = {
            ...prev,
            [messageId]: data.message
          };
          console.log('✅ === SUGGESTED ANSWER STORED ===');
          console.log('New suggested answers state:', newState);
          return newState;
        });
      } else {
        console.error('❌ === SUGGESTED ANSWER API ERROR ===');
        console.error('Response status:', response.status);
        console.error('Response status text:', response.statusText);
      }
    } catch (error) {
      console.error('❌ === SUGGESTED ANSWER GENERATION ERROR ===');
      console.error('Error:', error);
    }
  };

  const handleSuggestedAnswerClick = (messageId: string, suggestedAnswer: string) => {
    console.log('🎯 === SUGGESTED ANSWER CLICKED ===');
    console.log('Message ID:', messageId);
    console.log('Suggested answer:', suggestedAnswer);
    
    // Update the message content with the suggested answer
    setChatMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: suggestedAnswer }
        : msg
    ));
    
    // Clear all retry states for this specific message
    console.log('🧹 === CLEARING ALL RETRY STATES FOR SUGGESTED ANSWER ===');
    setUserAttempts(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      console.log('Cleared userAttempts for:', messageId);
      return newState;
    });
    setErrorMessages(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      console.log('Cleared errorMessages for:', messageId);
      return newState;
    });
    setSuggestedAnswers(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      console.log('Cleared suggestedAnswers for:', messageId);
      return newState;
    });
    
    // Clear comprehensive analysis for this message to remove error symbols
    setComprehensiveAnalysis(prev => {
      const newState = { ...prev };
      if (newState[messageId]) {
        newState[messageId] = { ...newState[messageId], hasErrors: false };
        console.log('Cleared comprehensive analysis errors for:', messageId);
      }
      return newState;
    });
    
    // Clear original messages and other retry states
    setOriginalMessages(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      console.log('Cleared originalMessages for:', messageId);
      return newState;
    });
    setMessageAttempts(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      console.log('Cleared messageAttempts for:', messageId);
      return newState;
    });
    setShowOriginalMessage(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      console.log('Cleared showOriginalMessage for:', messageId);
      return newState;
    });
    
    // Check if there are any other messages with errors
    const hasOtherErrors = Object.keys(userAttempts).some(id => id !== messageId && userAttempts[id] > 0);
    console.log('Has other errors:', hasOtherErrors);
    console.log('Setting waitingForCorrection to:', hasOtherErrors);
    setWaitingForCorrection(hasOtherErrors);
    
    console.log('🚀 === TRIGGERING AI RESPONSE FOR SUGGESTED ANSWER ===');
    console.log('Final state before AI response:');
    console.log('- waitingForCorrection:', waitingForCorrection);
    console.log('- errorMessages:', errorMessages);
    console.log('- userAttempts:', userAttempts);
    console.log('- comprehensiveAnalysis:', comprehensiveAnalysis);
    
    // Create cleared state object to pass to triggerAIResponse
    const clearedState = {
      waitingForCorrection: false,
      errorMessages: {},
      userAttempts: {}
    };
    
    console.log('⏰ === CALLING AI RESPONSE WITH CLEARED STATE ===');
    console.log('Cleared state being passed:', clearedState);
    
    // Trigger AI response immediately with cleared state
    triggerAIResponse(suggestedAnswer, messageId, clearedState);
  };

  // Add logic to generate suggested answer when max attempts are reached
  const checkAndGenerateSuggestedAnswer = (messageId: string, userMessage: string) => {
    if (userAttempts[messageId] >= 2) {
      generateSuggestedAnswer(messageId, userMessage);
    }
  };

  const toggleOriginalMessage = (messageId: string) => {
    setShowOriginalMessage(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };


  const translateSuggestions = async (
    messageId: string,
    suggestions: string[],
    suggestionKeyOverride?: string
  ) => {
    console.log('🔄 translateSuggestions called for messageId:', messageId);
    console.log('🔄 translateSuggestions input suggestions:', suggestions);
    
    // Check if we already have test suggestions (object format)
    const key = suggestionKeyOverride ?? getSuggestionKey(selectedConversation, messageId);
    const currentSuggestions = suggestedResponses[key];
    if (currentSuggestions && currentSuggestions.length > 0 && typeof currentSuggestions[0] === 'object') {
      console.log('🔄 translateSuggestions: Test suggestions already exist, skipping translation');
      return;
    }
    
    console.log('🔄 translateSuggestions: Proceeding with translation...');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: suggestions.join(' | '),
          targetLanguage: 'English'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const translations = data.translation.split(' | ');
        
        // Store translations for each suggestion
        const translatedSuggestions = suggestions.map((suggestion, index) => ({
          german: suggestion,
          english: translations[index] || suggestion
        }));
        
        setSuggestedResponses(prev => ({
          ...prev,
          [key]: translatedSuggestions
        }));
      }
    } catch (error) {
      console.error('Error translating suggestions:', error);
    }
  };
  const processTextMessage = async (textContent: string, messageId: string, isRetry: boolean = false) => {
    console.log('📝 === PROCESS TEXT MESSAGE START ===');
    console.log('Text content:', textContent);
    console.log('Message ID:', messageId);
    console.log('Is Retry:', isRetry);
    console.log('Current chat messages count:', chatMessages.length);

    updateMessageStatus(messageId, 'checking');
    
    // Ensure the message content is properly updated in the chat (EXACT SAME AS VOICE)
    setChatMessages(prev => {
      console.log('🔄 === UPDATING MESSAGE WITH TEXT CONTENT ===');
      console.log('Message ID:', messageId);
      console.log('Is Retry:', isRetry);
      console.log('Text content:', textContent);
      console.log('Previous messages count:', prev.length);
      
      const updatedMessages = prev.map(msg => {
        if (msg.id === messageId) {
          console.log('✅ FOUND MESSAGE TO UPDATE:', msg.id);
          console.log('Original content:', msg.content);
          console.log('New content:', textContent);
          return { ...msg, content: textContent };
        }
        return msg;
      });
      
      console.log('Updated messages count:', updatedMessages.length);
      return updatedMessages;
    });
    
    // For text messages, run comprehensive analysis and get result immediately (EXACT SAME AS VOICE)
    const analysis = await runComprehensiveAnalysis(textContent, messageId, false);
    
    console.log('🔍 === CHECKING FOR ERRORS AFTER ANALYSIS ===');
    console.log('Analysis result:', analysis);
    console.log('Has errors:', analysis && analysis.hasErrors);
    console.log('Error messages for this message:', errorMessages[messageId]);
    console.log('Waiting for correction:', waitingForCorrection);
    
    if (analysis && analysis.hasErrors) {
      // Don't send to AI if there are errors - focus on correction (EXACT SAME AS VOICE)
      console.log('🚫 === TEXT MESSAGE HAS ERRORS - NOT SENDING TO AI ===');
      console.log('Focusing on error correction instead of AI response');
      updateMessageStatus(messageId, 'needs_correction');
      return;
    } else if (!analysis || analysis === null) {
      // Analysis failed - don't proceed with AI response (EXACT SAME AS VOICE)
      console.log('🚫 === ANALYSIS FAILED - NOT SENDING TO AI ===');
      console.log('Analysis returned null or undefined, not proceeding with AI response');
      console.log('Analysis value:', analysis);
      console.log('Analysis type:', typeof analysis);
      
      // Instead of setting error status, try to get a fallback analysis
      console.log('🔄 === ATTEMPTING FALLBACK ANALYSIS ===');
      const fallbackAnalysis = {
        hasErrors: false,
        errorTypes: {
          grammar: false,
          vocabulary: false,
          pronunciation: false
        },
        corrections: {
          grammar: null,
          vocabulary: [],
          pronunciation: null
        },
        suggestions: {
          grammar: null,
          vocabulary: null,
          pronunciation: null
        },
        wordsForPractice: [],
        message: textContent,
        timestamp: new Date().toISOString()
      };
      
      // Store the fallback analysis
      setComprehensiveAnalysis(prev => ({
        ...prev,
        [messageId]: fallbackAnalysis
      }));
      
      console.log('✅ === FALLBACK ANALYSIS STORED - PROCEEDING TO AI ===');
      // Continue with AI response instead of showing error
      // updateMessageStatus(messageId, 'error'); // REMOVED - don't show error
      // return; // REMOVED - continue with AI response
    }
    
    console.log('✅ === NO ERRORS DETECTED - PROCEEDING TO AI ===');
    console.log('🔍 === PRE-STATE CLEARING DEBUG ===');
    console.log('Message ID:', messageId);
    console.log('Current waitingForCorrection:', waitingForCorrection);
    console.log('Current errorMessages:', errorMessages);
    console.log('Current userAttempts:', userAttempts);
    console.log('Current comprehensiveAnalysis:', comprehensiveAnalysis);
    
    // Send text to AI only if no errors (EXACT SAME AS VOICE)
    // Clear retry states immediately before AI response
    console.log('🧹 === CLEARING RETRY STATES ===');
    
    // Clear states and get the updated values
    const clearedUserAttempts = { ...userAttempts };
    delete clearedUserAttempts[messageId];
    const clearedErrorMessages = { ...errorMessages };
    delete clearedErrorMessages[messageId];
    
    console.log('Clearing userAttempts for:', messageId);
    console.log('Before clearing:', userAttempts);
    console.log('After clearing:', clearedUserAttempts);
    console.log('Clearing errorMessages for:', messageId);
    console.log('Before clearing:', errorMessages);
    console.log('After clearing:', clearedErrorMessages);
    
    // Update the state
    setUserAttempts(clearedUserAttempts);
    setErrorMessages(clearedErrorMessages);
    setWaitingForCorrection(false);
    setActiveMessageId(prev => (prev === messageId ? null : prev));
    
    // Clear comprehensive analysis for this message to remove error symbols from UI
    console.log('🧹 === CLEARING COMPREHENSIVE ANALYSIS FOR UI ===');
    console.log('Clearing comprehensive analysis for message:', messageId);
    console.log('Current comprehensive analysis before clearing:', comprehensiveAnalysis[messageId]);
    setComprehensiveAnalysis(prev => {
      const newState = { ...prev };
      if (newState[messageId]) {
        // Update the analysis to show no errors
        newState[messageId] = { ...newState[messageId], hasErrors: false };
        console.log('Updated comprehensive analysis for message:', messageId);
        console.log('New analysis state:', newState[messageId]);
        console.log('Previous state:', prev[messageId]);
        console.log('State change:', {
          before: prev[messageId]?.hasErrors,
          after: newState[messageId]?.hasErrors
        });
      }
      return newState;
    });
    
    console.log('🔄 === STATE UPDATED ===');
    console.log('State should now be cleared for message:', messageId);
    
    console.log('⏰ === CALLING AI RESPONSE WITH CLEARED STATE ===');
    // Call AI response directly with cleared state (EXACT SAME AS VOICE)
    await triggerAIResponse(textContent, messageId, {
      waitingForCorrection: false,
      errorMessages: clearedErrorMessages,
      userAttempts: clearedUserAttempts
    });

    // Ensure the message content stays as the text content (EXACT SAME AS VOICE)
    setTimeout(() => {
      setChatMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: textContent }
          : msg
      ));
    }, 100);

    console.log('🏁 === AI RESPONSE COMPLETED ===');
    console.log('Final state after AI response:');
    console.log('- waitingForCorrection:', waitingForCorrection);
    console.log('- errorMessages:', errorMessages);
    console.log('- userAttempts:', userAttempts);
    console.log('- comprehensiveAnalysis:', comprehensiveAnalysis);
    console.log('🔍 === POST-AI STATE VERIFICATION ===');
    console.log('Error messages for this message:', errorMessages[messageId]);
    console.log('User attempts for this message:', userAttempts[messageId]);
    console.log('Comprehensive analysis for this message:', comprehensiveAnalysis[messageId]);
  };

  const sendMessage = async () => {
    console.log('📝 === SEND MESSAGE DEBUG ===');
    console.log('Message input:', messageInput.trim());
    console.log('Is sending:', isSending);
    console.log('Selected conversation:', selectedConversation);
    console.log('Chat messages count:', chatMessages.length);

    const trimmedInput = messageInput.trim();
    
    // Auto-collapse sidebar when starting conversation with first user message
    if (chatMessages.length <= 1 && !sidebarCollapsed) {
      setSidebarCollapsed(true);
      console.log('Auto-collapsing sidebar - first user message');
    }

    if (!trimmedInput || isSending || !selectedConversation) {
      console.log('🚫 === BLOCKING SEND MESSAGE ===');
      console.log('Reasons:');
      console.log('- Empty input:', !trimmedInput);
      console.log('- Is sending:', isSending);
      console.log('- No conversation:', !selectedConversation);
      return;
    }

    // Intent detection on first user message in conversation (skip if flagged)
    if (!skipIntentOnce && chatMessages.filter(m => m.role === 'user').length === 0) {
      const lang = detectLanguage(trimmedInput);
      const onlyLetters = trimmedInput.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
      const vowelCount = (onlyLetters.match(/[aeiouAEIOUÄÖÜäöü]/g) || []).length;
      const isGibberish = onlyLetters.length > 0 && (vowelCount === 0 || onlyLetters.length > 30 && vowelCount / onlyLetters.length < 0.15);

      // If neither German nor English
      if (lang !== 'german' && lang !== 'english') {
        alert('Please enter phrases or topics in German or English only to help us assist you better.');
        return;
      }

      // If gibberish
      if (isGibberish) {
        alert("We couldn’t understand your input. Please enter clear sentences in German or English.");
        return;
      }

      // Keyword-based intent detection
      const categoryKeywords: {[k: string]: string[]} = {
        Meeting: ['meeting','appointment','present','agenda'],
        'Café': ['kaffee','menu','order','bill'],
        Station: ['ticket','bahnhof','train','platform'],
        Airport: ['boarding','flight','luggage','gate'],
        Emergency: ['help','emergency','police','hospital']
      };
      const textLower = trimmedInput.toLowerCase();
      let matchedCategory: string | null = null;
      for (const [cat, keys] of Object.entries(categoryKeywords)) {
        if (keys.some(k => textLower.includes(k))) { matchedCategory = cat; break; }
      }

      const level = (onboardingData?.germanLevel || 'beginner').toLowerCase();
      const makeGerman = (cat: string) => {
        if (level.includes('advanced')) return `Super! Du möchtest ${cat} üben. Worum soll es genau gehen? Zum Beispiel: Vorstellungen, Agenda oder Feedback.`;
        if (level.includes('intermediate')) return `Toll! Du willst ${cat} üben. Was genau möchtest du üben? Z. B. Vorstellungen, Agenda oder Feedback.`;
        return `Klasse! Du möchtest ${cat} üben. Was genau? Zum Beispiel: Vorstellungen, Agenda oder Feedback.`;
      };
      const fallbackGerman = () => {
        if (level.includes('advanced')) return 'Möchtest du ein Meeting, ein Café‑Gespräch, eine Reisesituation oder Notfall‑Sätze üben?';
        if (level.includes('intermediate')) return 'Möchtest du Meeting, Café, Reise oder Notfall üben?';
        return 'Willst du Meeting, Café, Reise oder Notfall üben?';
      };

      if (matchedCategory) {
        const assistantMsg: ChatMessage = {
          id: `intent-${Date.now()}`,
          role: 'assistant',
          content: makeGerman(matchedCategory),
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, assistantMsg]);

        // Provide quick replies
        const subtopicsMap: {[k: string]: string[]} = {
          Meeting: ['Vorstellungen', 'Agenda besprechen', 'Feedback geben'],
          'Café': ['Bestellen', 'Nach der Speisekarte fragen', 'Die Rechnung'],
          Station: ['Ticket kaufen', 'Nach dem Gleis fragen', 'Zugzeiten'],
          Airport: ['Boarding', 'Gepäck aufgeben', 'Zum Gate finden'],
          Emergency: ['Hilfe rufen', 'Polizei kontaktieren', 'Zum Krankenhaus']
        };
        setSuggestedReplies(subtopicsMap[matchedCategory] || []);
        return;
      } else {
        const assistantMsg: ChatMessage = {
          id: `intent-${Date.now()}`,
          role: 'assistant',
          content: fallbackGerman(),
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        setSuggestedReplies(['Meeting', 'Café', 'Reise', 'Notfall']);
        return;
      }
    }
    // reset one-shot skip flag if it was set
    if (skipIntentOnce) setSkipIntentOnce(false);

    // Check for language mismatch in typed text
    const detectedLanguage = detectLanguage(trimmedInput);
    console.log('🔍 === TEXT LANGUAGE DETECTION ===');
    console.log('Detected language:', detectedLanguage);
    console.log('Recording language:', recordingLanguage);
    console.log('Show language mismatch modal state:', showLanguageMismatchModal);
    console.log('Waiting for correction state:', waitingForCorrection);
    console.log('Active message ID:', activeMessageId);
    
    if (detectedLanguage === 'english' && recordingLanguage === 'german') {
      console.log('🔍 === TEXT LANGUAGE MISMATCH DETECTED ===');
      console.log('English text detected when German was expected');
      
      // Clear any existing states that might interfere
      setWaitingForCorrection(false);
      setActiveMessageId(null);
      setUserAttempts({});
      setErrorMessages({});
      
      // Show mismatch modal for typed English text
      setDetectedLanguage(detectedLanguage);
      setMismatchTranscription(trimmedInput);
      setMismatchMessageId(Date.now().toString());
      setGermanSuggestion('');
      
      // Generate German suggestion for practice
      generateGermanSuggestion(trimmedInput);
      
      // Show the modal
      setModalTriggerType('text');
      setShowLanguageMismatchModal(true);
      
      console.log('🏁 === TEXT SEND END (MODAL SHOWN) ===');
      return; // Don't proceed with normal processing
    }

    // Don't collapse toolbar automatically - let vocabulary additions control it
    // The toolbar will auto-expand when words are added to vocabulary
    // if (chatMessages.length <= 1) { // Only AI greeting message exists
    //   setToolbarCollapsed(true);
    //   console.log('Collapsing toolbar - first user message');
    // }

    // Check if this is a retry attempt - be more robust in detection
    const isRetry = Boolean(activeMessageId);
    const existingMessageId = activeMessageId;

    console.log('🔍 === RETRY DETECTION DEBUG ===');
    console.log('Is retry:', isRetry);
    console.log('Existing message ID:', existingMessageId);
    console.log('Waiting for correction:', waitingForCorrection);
    console.log('User attempts:', userAttempts);
    console.log('Error messages:', errorMessages);

    let messageId = '';

    if (isRetry && existingMessageId) {
      // This is a retry - update existing message (EXACT SAME AS VOICE)
      console.log('🔄 === TEXT RETRY DETECTED ===');
      console.log('Updating existing message:', existingMessageId);
      console.log('Current attempts for this message:', userAttempts[existingMessageId] || 0);

      messageId = existingMessageId;

      updateMessageStatus(messageId, 'checking');

      // Update message content immediately so the retry replaces the previous attempt
      setChatMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: trimmedInput, timestamp: new Date().toISOString() }
          : msg
      ));

      // If this is a retry, clear previous error states for this message (EXACT SAME AS VOICE)
      console.log('🔄 === CLEARING PREVIOUS ERROR STATES FOR RETRY ===');
      console.log('Message ID for retry:', messageId);
      console.log('Current error messages:', errorMessages);
      console.log('Current user attempts:', userAttempts);

      setErrorMessages(prev => {
        const newState = { ...prev };
        delete newState[messageId];
        console.log('Cleared error messages for:', messageId);
        console.log('Remaining error messages:', newState);
        return newState;
      });

      // Don't clear waitingForCorrection here - let the analysis determine if we still need to wait (EXACT SAME AS VOICE)
      console.log('🔄 === KEEPING WAITING FOR CORRECTION STATE ===');
    } else {
      // This is a new message - create new message (EXACT SAME AS VOICE)
      console.log('🆕 === NEW TEXT MESSAGE ===');
      console.log('Creating new message because:');
      console.log('- isRetry:', isRetry);
      console.log('- existingMessageId:', existingMessageId);
      console.log('- waitingForCorrection:', waitingForCorrection);
      
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmedInput,
        timestamp: new Date().toISOString()
      };

      messageId = userMessage.id;

      updateMessageStatus(messageId, 'checking');

      // Add to chat immediately (EXACT SAME AS VOICE)
      setChatMessages(prev => {
        console.log('🆕 === ADDING NEW MESSAGE TO CHAT ===');
        console.log('New message ID:', messageId);
        console.log('Previous messages count:', prev.length);
        const newMessages = [...prev, userMessage];
        console.log('New messages count:', newMessages.length);
        
        // Track first message for chat hints
        if (!hasSentFirstMessage && prev.length <= 1) {
          setHasSentFirstMessage(true);
          if (!hintsDismissed && showHints === false) {
            // Show chat hints after a short delay
            setTimeout(() => {
              setShowChatHints(true);
            }, 1000);
          }
        }
        
        return newMessages;
      });

      // Store original message for suggested answer generation (EXACT SAME AS VOICE)
      setOriginalMessages(prev => ({
        ...prev,
        [messageId]: userMessage.content
      }));
      
      // Enhance conversation context with user message
      if (selectedConversation && trimmedInput) {
        await enhanceConversationContext(selectedConversation, trimmedInput);
      }
    }
    
    // Enhance context on retry if it's a correction
    if (isRetry && selectedConversation && trimmedInput) {
      await enhanceConversationContext(selectedConversation, trimmedInput);
    }

    // Process text message (EXACT SAME AS VOICE)
    await processTextMessage(trimmedInput, messageId, isRetry);

    // Clear the input after processing
    console.log('🧹 === CLEARING MESSAGE INPUT ===');
    console.log('Input before clearing:', messageInput);
    setMessageInput('');
    console.log('Input after clearing:', messageInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Track vocabulary additions to prevent duplicates - optimized
  const [vocabAdditionTracker, setVocabAdditionTracker] = useState<Set<string>>(new Set());
  const [pendingVocabItems, setPendingVocabItems] = useState<Set<string>>(new Set());

  const handleAddToVocab = (word: string, meaning: string) => {
    console.log('📚 === DASHBOARD HANDLE ADD TO VOCAB ===');
    console.log('Word:', word);
    console.log('Meaning:', meaning);
    console.log('Selected conversation:', selectedConversation);
    
    const wordKey = `${word}-${selectedConversation}`;
    const itemKey = `${word}-${meaning}`;
    
    console.log('Word key:', wordKey);
    console.log('Item key:', itemKey);
    console.log('Current vocabAdditionTracker:', Array.from(vocabAdditionTracker));
    console.log('Current pendingVocabItems:', Array.from(pendingVocabItems));
    console.log('Current persistentVocab:', persistentVocab.map(item => item.word));
    
    // Quick duplicate check - if already processed or pending, skip immediately
    if (vocabAdditionTracker.has(wordKey) || 
        persistentVocab.some(item => item.word === word) ||
        pendingVocabItems.has(itemKey)) {
      console.log('📚 === SKIPPING DUPLICATE VOCAB ADDITION ===');
      console.log('Reasons:', {
        inTracker: vocabAdditionTracker.has(wordKey),
        inPersistent: persistentVocab.some(item => item.word === word),
        inPending: pendingVocabItems.has(itemKey)
      });
      return;
    }
    
    console.log('📚 === PROCESSING NEW VOCAB ADDITION ===');
    
    // Mark as pending to prevent duplicate calls
    setPendingVocabItems(prev => {
      const newSet = new Set([...prev, itemKey]);
      console.log('📚 === UPDATED PENDING VOCAB ITEMS ===');
      console.log('New pending items:', Array.from(newSet));
      return newSet;
    });
    
    // Mark this word as processed
    setVocabAdditionTracker(prev => {
      const newSet = new Set([...prev, wordKey]);
      console.log('📚 === UPDATED VOCAB ADDITION TRACKER ===');
      console.log('New tracker:', Array.from(newSet));
      return newSet;
    });
    
    // Create the new vocab item
    const newVocabItem = { word, meaning, context: '' };
    console.log('📚 === ADDING TO PERSISTENT VOCAB IMMEDIATELY ===');
    console.log('New vocab item:', newVocabItem);
    
    // Add to persistent vocabulary immediately (for session persistence) - check for duplicates
    setPersistentVocab(prev => {
      // Check if word already exists
      const exists = prev.some(item => item.word === word);
      if (exists) {
        console.log('📚 === WORD ALREADY EXISTS IN PERSISTENT VOCAB, SKIPPING ===');
        return prev;
      }
      const updated = [newVocabItem, ...prev];
      console.log('📚 === UPDATED PERSISTENT VOCAB ===');
      console.log('New persistent vocab count:', updated.length);
      console.log('New persistent vocab items:', updated);
      console.log('📚 === VOCAB ADDED TO PERSISTENT STORAGE (WORKS EVEN WHEN TOOLBAR IS CLOSED) ===');
      return updated;
    });
    
    // Track vocabulary addition in session data
    updateSessionData(prev => ({
      ...prev,
      wordsLearned: [...prev.wordsLearned, word]
    }));
    console.log('📊 Session data updated: word added to wordsLearned');
    
    // Also add to new vocab items for Toolbar processing (when toolbar is open) - check for duplicates
    console.log('📚 === ADDING TO NEW VOCAB ITEMS FOR TOOLBAR ===');
    setNewVocabItems(prev => {
      // Check if word already exists
      const exists = prev.some(item => item.word === word);
      if (exists) {
        console.log('📚 === WORD ALREADY EXISTS IN NEW VOCAB ITEMS, SKIPPING ===');
        return prev;
      }
      const updated = [...prev, newVocabItem];
      console.log('📚 === UPDATED NEW VOCAB ITEMS ===');
      console.log('New vocab items count:', updated.length);
      console.log('New vocab items:', updated);
      return updated;
    });
    
    // Auto-open the toolbar and switch to vocab tab
    console.log('📚 === AUTO-OPENING TOOLBAR AND SWITCHING TO VOCAB TAB ===');
    console.log('Before - toolbarCollapsed:', toolbarCollapsed);
    console.log('Before - toolbarActiveTab:', toolbarActiveTab);
    console.log('Before - showToolbar:', showToolbar);
    
    // Use setTimeout to ensure state updates happen after any other pending updates
    setTimeout(() => {
      setShowToolbar(true);
      setToolbarCollapsed(false);
      setToolbarActiveTab('vocab');
      console.log('📚 === TOOLBAR STATE UPDATED (AFTER TIMEOUT) ===');
      console.log('After setting - toolbarCollapsed should be false');
      console.log('After setting - toolbarActiveTab should be vocab');
    }, 100);
    
    console.log('📚 === DASHBOARD HANDLE ADD TO VOCAB COMPLETED ===');
  };

  // Handle pronunciation completion - track pronunciation scores
  const handlePronunciationComplete = (
    score: number,
    text: string,
    type: 'word' | 'sentence' = 'sentence'
  ) => {
    const successThreshold = 65;
    updateSessionData(prev => {
      const timestamp = new Date().toISOString();

      const updatedAttempts = [
        ...prev.pronunciationAttempts,
        {
          word: text,
          score,
          timestamp,
          isSuccess: score >= successThreshold
        }
      ];

      let updatedSentenceScores = prev.sentencePronunciationScores;
      let updatedLastSentenceScore = prev.lastSentencePronunciationScore;

      if (type === 'sentence') {
        updatedSentenceScores = [
          ...prev.sentencePronunciationScores,
          {
            sentence: text,
            score,
            timestamp
          }
        ];
        updatedLastSentenceScore = score;
      }

      return {
        ...prev,
        pronunciationAttempts: updatedAttempts,
        sentencePronunciationScores: updatedSentenceScores,
        lastSentencePronunciationScore: updatedLastSentenceScore
      };
    });
    console.log('📊 Session data updated: pronunciation attempt added', { text, score, type });
  };

  // Handle word selection in sentence - no API calls in modal
  const toggleWordSelection = (word: string) => {
    const newSelectedWords = new Set(selectedWords);
    if (newSelectedWords.has(word)) {
      newSelectedWords.delete(word);
      setSelectedWords(newSelectedWords);
    } else {
      newSelectedWords.add(word);
      setSelectedWords(newSelectedWords);
    }
  };

  // Fetch meaning for a specific word
  const fetchWordMeaning = async (word: string) => {
    setLoadingMeanings(prev => new Set(prev).add(word));
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Provide the English translation for this German word: "${word}". Just return the English meaning, nothing else.`
          }],
          conversationId: 'word_meaning',
          systemInstruction: "Provide only the English translation of the German word. Be concise and accurate."
        })
      });

      if (response.ok) {
        const data = await response.json();
        setWordMeanings(prev => ({
          ...prev,
          [word]: data.message.trim()
        }));
      }
    } catch (error) {
      console.error('Error fetching word meaning:', error);
      setWordMeanings(prev => ({
        ...prev,
        [word]: 'Meaning not found'
      }));
    } finally {
      setLoadingMeanings(prev => {
        const newSet = new Set(prev);
        newSet.delete(word);
        return newSet;
      });
    }
  };

  // Add selected vocabulary words to user's vocabulary
  const addSelectedVocab = async () => {
    const selectedWordsList = Array.from(selectedWords).map(word => ({
      word: word,
      meaning: '', // Will be generated immediately
      context: extractedVocab[0]?.word || ''
    }));
    
    console.log('📚 === DASHBOARD ADDING SELECTED VOCAB ===');
    console.log('Selected words:', Array.from(selectedWords));
    console.log('Selected words list:', selectedWordsList);
    console.log('Current persistent vocab before:', persistentVocab.length);
    console.log('Current newVocabItems before:', newVocabItems.length);
    
    // Generate meanings immediately for each word
    const wordsWithMeanings = await Promise.all(selectedWordsList.map(async (item) => {
      console.log(`📚 === GENERATING MEANING FOR: ${item.word} ===`);
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Provide the English translation for this German word: "${item.word}". Just return the English meaning, nothing else.`
            }],
            conversationId: 'word_meaning',
            systemInstruction: "Provide only the English translation of the German word. Be concise and accurate."
          })
        });

        if (response.ok) {
          const data = await response.json();
          const meaning = data.message.trim();
          console.log(`📚 === GENERATED MEANING FOR ${item.word}: ${meaning} ===`);
          return { ...item, meaning };
        } else {
          console.error(`📚 === FAILED TO GET MEANING FOR ${item.word} ===`);
          return { ...item, meaning: 'Meaning not found' };
        }
      } catch (error) {
        console.error(`📚 === ERROR GENERATING MEANING FOR ${item.word} ===`);
        console.error('Error details:', error);
        return { ...item, meaning: 'Meaning not found' };
      }
    }));
    
    console.log('📚 === WORDS WITH MEANINGS GENERATED ===');
    console.log('Final words with meanings:', wordsWithMeanings);
    
    // Dedupe by word (case-insensitive) and exclude existing persistent vocab
    const existingWordsLower = new Set(persistentVocab.map(v => v.word.toLowerCase()));
    const seen = new Set<string>();
    const uniqueWithMeanings = wordsWithMeanings.filter(item => {
      const lower = item.word.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return !existingWordsLower.has(lower);
    });

    // Add to persistent vocabulary with meanings (deduped)
    setPersistentVocab(prev => {
      const updated = [...uniqueWithMeanings, ...prev];
      console.log('📚 === UPDATED PERSISTENT VOCAB WITH MEANINGS (DEDUPED) ===');
      console.log('New persistent vocab count:', updated.length);
      console.log('New persistent vocab items:', updated);
      return updated;
    });
    
    // Set new vocabulary items for the Toolbar (deduped and excluding existing)
    console.log('📚 === SETTING NEW VOCAB ITEMS FOR TOOLBAR (DEDUPED) ===');
    console.log('Items being sent to Toolbar:', uniqueWithMeanings);
    setNewVocabItems(prev => {
      const prevSeen = new Set((prev || []).map(i => i.word.toLowerCase()));
      const merged = [...uniqueWithMeanings.filter(i => !prevSeen.has(i.word.toLowerCase())), ...(prev || [])];
      // Final dedupe on merge
      const finalSeen = new Set<string>();
      const final = merged.filter(i => {
        const lower = i.word.toLowerCase();
        if (finalSeen.has(lower)) return false;
        finalSeen.add(lower);
        return true;
      });
      return final;
    });
    
    // Open toolbox with vocab tab active
    setToolbarActiveTab('vocab');
    setShowToolbar(true);
    
    // Close the modal and reset state
    setShowVocabSelector(false);
    setExtractedVocab([]);
    setSelectedWords(new Set());
    setWordMeanings({});
    setLoadingMeanings(new Set());
    
    console.log('📚 === DASHBOARD VOCAB ADDITION COMPLETED ===');
  };

  // Cancel vocabulary selection
  const cancelVocabSelection = () => {
    setShowVocabSelector(false);
    setExtractedVocab([]);
    setSelectedWords(new Set());
    setWordMeanings({});
    setLoadingMeanings(new Set());
  };


  // Clear new vocabulary items after they've been processed
  useEffect(() => {
    if (newVocabItems.length > 0) {
      console.log('📚 === DASHBOARD CLEARING NEW VOCAB ITEMS ===');
      console.log('Current newVocabItems:', newVocabItems);
      console.log('Setting timer to clear in 5000ms (increased to allow meaning generation)');
      
      // Clear the items after they've been processed by the Toolbar
      // Increased timeout to allow for meaning generation API calls
      const timer = setTimeout(() => {
        console.log('📚 === CLEARING NEW VOCAB ITEMS AFTER TIMEOUT ===');
        console.log('Clearing newVocabItems and pendingVocabItems');
        setNewVocabItems([]);
        setPendingVocabItems(new Set());
      }, 5000); // Increased from 1000ms to 5000ms
      return () => clearTimeout(timer);
    }
  }, [newVocabItems.length]); // Only depend on length, not the entire array


  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showLanguageMenu) {
        const target = event.target as Element;
        if (!target.closest('.language-menu-container')) {
          setShowLanguageMenu(false);
        }
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLanguageMenu]);



  // Auto-play German suggestion when modal opens
  // Removed automatic TTS playing - user should click "Listen" button manually

  // Clear German suggestion when modal opens
  useEffect(() => {
    if (showLanguageMismatchModal) {
      console.log('Modal opened, clearing German suggestion');
      setGermanSuggestion('');
    }
  }, [showLanguageMismatchModal]);

  // Generate German suggestion for practice modal
  const generateGermanSuggestion = async (englishText: string) => {
    try {
      console.log('=== GENERATE GERMAN SUGGESTION ===');
      console.log('Input text:', englishText);
      console.log('Current germanSuggestion state:', germanSuggestion);
      
      // Simple fallback only if API completely fails
      const simpleFallback = 'Entschuldigung, ich kann das nicht übersetzen.';
      
      console.log('Making API call to chat function...');
      console.log('API URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`);
      console.log('API Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a helpful German language tutor. The user said something in English: "${englishText}". 

Your task is to provide ONE natural German way to express the same meaning. Do NOT translate the phrase "I wanted to say" or "I want to say" - instead, understand what the user actually wants to express and provide the natural German way to say that.

For example:
- If user says "I wanted to say I went swimming today" → respond with "Ich bin heute schwimmen gegangen"
- If user says "I want to say I cooked chicken" → respond with "Ich habe Hühnchen gekocht"
- If user says "I wanted to say I was lazy" → respond with "Ich war faul"

Keep it simple and conversational. Just respond with the German translation, nothing else.`
            },
            {
              role: 'user',
              content: `How do I say this in German: "${englishText}"`
            }
          ],
          conversationId: `german-suggestion-${Date.now()}`,
          contextLevel: 'Intermediate',
          difficultyLevel: 'Intermediate'
        })
      });

      console.log('German suggestion API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('German suggestion API response:', data);
        console.log('Response keys:', Object.keys(data));
        console.log('Response type:', typeof data);

        // Check for different possible response structures
        let germanText = null;
        if (data.response && data.response.trim()) {
          germanText = data.response.trim();
        } else if (data.message && data.message.trim()) {
          germanText = data.message.trim();
        } else if (data.text && data.text.trim()) {
          germanText = data.text.trim();
        } else if (typeof data === 'string' && data.trim()) {
          germanText = data.trim();
        }

        if (germanText) {
          setGermanSuggestion(germanText);
          console.log('German suggestion generated:', germanText);

          // Clear the timeout since API succeeded
          if ((window as any).germanSuggestionTimeout) {
            clearTimeout((window as any).germanSuggestionTimeout);
            (window as any).germanSuggestionTimeout = null;
          }
        } else {
          console.error('No valid response data found in API response');
          console.error('Full response object:', JSON.stringify(data, null, 2));
          setGermanSuggestion(simpleFallback);
        }
      } else {
        const errorText = await response.text();
        console.error('API call failed with status:', response.status);
        console.error('Error response:', errorText);
        console.error('Response headers:', response.headers);
        setGermanSuggestion('Das ist interessant.');
      }
    } catch (error) {
      console.error('Network error generating German suggestion:', error);
      console.error('Error details:', (error as Error).message);
      setGermanSuggestion('Das ist interessant.');
    }
  };

  // Provide contextual German help for English input
  const provideContextualGermanHelp = async (englishText: string, messageId: string) => {
    try {
      console.log('Providing contextual German help for:', englishText);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a helpful German language tutor. The user said something in English: "${englishText}". 

Your task is to:
1. Understand what they want to express
2. Provide ONE formal German way to say it
3. Provide ONE informal/casual (Umgangssprachlich) way to say it
4. Keep it concise and natural
5. Be encouraging

Format your response like this:
**Formell:** [formal German expression]
**Umgangssprachlich:** [informal German expression]

Keep it short and helpful. Don't repeat the same phrase multiple times.`
            },
            {
              role: 'user',
              content: `I want to say this in German: "${englishText}"`
            }
          ],
          conversationId: 'contextual-help',
          contextLevel: 'Intermediate',
          difficultyLevel: 'Intermediate'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the AI response to chat with "Try it again" button
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          showTryAgain: true // Flag to show "Try it again" button
        };
        
        setChatMessages(prev => [...prev, aiMessage]);
        
        // Store the comprehensive analysis for the toolbar
        setComprehensiveAnalysis(prev => ({
          ...prev,
          [messageId]: {
            hasErrors: false,
            errorTypes: {
              grammar: false,
              vocabulary: false,
              pronunciation: false
            },
            suggestions: [data.response],
            explanation: `Contextual help for expressing "${englishText}" in German`
          }
        }));
        
        console.log('Contextual German help provided');
      } else {
        console.error('Failed to get contextual German help');
      }
    } catch (error) {
      console.error('Error providing contextual German help:', error);
    }
  };

  // Detect language of transcribed text
  const detectLanguage = (text: string): 'german' | 'english' => {
    // Simple and reliable language detection
    const words = text.toLowerCase().split(/\s+/);
    
    // Check for German-specific characters (strong indicator)
    const hasGermanChars = /[äöüßÄÖÜ]/.test(text);
    if (hasGermanChars) {
      console.log('Language detection: German characters found');
      return 'german';
    }
    
    // Check for common English words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'what', 'where', 'when', 'why', 'how', 'hello', 'hi', 'how', 'are', 'you', 'i', 'am', 'is', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall'];
    const englishCount = words.filter(word => {
      const cleanWord = word.replace(/[.,!?;:]/g, '');
      return englishWords.includes(cleanWord);
    }).length;
    
    // Check for common German words
    const germanWords = ['der', 'die', 'das', 'und', 'oder', 'aber', 'mit', 'von', 'zu', 'auf', 'in', 'an', 'für', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'ist', 'sind', 'haben', 'werden', 'können', 'müssen', 'sollen', 'wollen', 'möchte', 'mögen', 'bin', 'bist', 'war', 'waren', 'wird', 'werde', 'wirst', 'werdet', 'hast', 'hat', 'hatte', 'hatten', 'kann', 'kannst', 'könnt', 'konnte', 'konnten', 'will', 'willst', 'wollt', 'wollte', 'wollten', 'soll', 'sollst', 'sollt', 'sollte', 'sollten', 'muss', 'musst', 'müsst', 'musste', 'mussten', 'mag', 'magst', 'mögt', 'mochte', 'mochten'];
    const germanCount = words.filter(word => {
      const cleanWord = word.replace(/[.,!?;:]/g, '');
      return germanWords.includes(cleanWord);
    }).length;
    
    console.log('Language detection:', { text, germanCount, englishCount, hasGermanChars, detected: englishCount > germanCount ? 'english' : 'german' });
    
    return englishCount > germanCount ? 'english' : 'german';
  };

  // Extract vocabulary from German text using chat function
  const extractVocabularyFromText = async (germanText: string) => {
    console.log('📚 === EXTRACTING VOCABULARY DEBUG ===');
    console.log('German text:', germanText);
    console.log('Current selected conversation:', selectedConversation);
    console.log('Current persistent vocab count:', persistentVocab.length);
    console.log('Current vocabAdditionTracker:', Array.from(vocabAdditionTracker));
    console.log('Current persistent vocab words:', persistentVocab.map(item => item.word));
    console.log('Chat messages count:', chatMessages.length);
    console.log('Is first AI message:', chatMessages.length <= 1);
    console.log('Current showVocabSelector:', showVocabSelector);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Stack trace:', new Error().stack);
    
    // Instead of extracting words, just show the sentence for word-by-word selection
    setExtractedVocab([{ word: germanText, meaning: '', context: '' }]);
    setSelectedWords(new Set());
    setShowVocabSelector(true);
    
    console.log('📚 === VOCABULARY SELECTOR OPENED ===');
  };

  // Comprehensive analysis function
  const runComprehensiveAnalysis = async (message: string, messageId: string, isVoice: boolean = false) => {
    console.log('🔍 === COMPREHENSIVE ANALYSIS DEBUG ===');
    console.log('Message:', message);
    console.log('Message ID:', messageId);
    console.log('Is Voice:', isVoice);
    console.log('Timestamp:', new Date().toISOString());
    console.log('🔍 === CURRENT STATE BEFORE ANALYSIS ===');
    console.log('waitingForCorrection:', waitingForCorrection);
    console.log('errorMessages:', errorMessages);
    console.log('userAttempts:', userAttempts);
    console.log('Current comprehensive analysis for this message:', comprehensiveAnalysis[messageId]);

    // Prevent re-analysis of messages that have already been cleared
    if (comprehensiveAnalysis[messageId] && !comprehensiveAnalysis[messageId].hasErrors) {
      console.log('🚫 === SKIPPING ANALYSIS - MESSAGE ALREADY CLEARED ===');
      console.log('Message has already been processed and cleared, returning existing analysis');
      console.log('Current analysis state:', comprehensiveAnalysis[messageId]);
      console.log('This prevents overriding the cleared state');
      return comprehensiveAnalysis[messageId];
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comprehensive-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userLevel: 'Intermediate',
          source: isVoice ? 'voice' : 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
      // Store comprehensive analysis results
      console.log('📊 === COMPREHENSIVE ANALYSIS RESULT ===');
      console.log('Message ID:', messageId);
      console.log('Has errors:', data.hasErrors);
      console.log('Error types:', data.errorTypes);
      console.log('Full analysis data:', data);
      console.log('🔍 === STATE AFTER ANALYSIS STORAGE ===');
      console.log('waitingForCorrection:', waitingForCorrection);
      console.log('errorMessages:', errorMessages);
      console.log('userAttempts:', userAttempts);
      console.log('🔍 === CURRENT COMPREHENSIVE ANALYSIS STATE ===');
      console.log('Current comprehensive analysis for this message:', comprehensiveAnalysis[messageId]);
      console.log('Will this override a cleared state?', comprehensiveAnalysis[messageId] && !comprehensiveAnalysis[messageId].hasErrors && data.hasErrors);

      setComprehensiveAnalysis(prev => {
        // CRITICAL FIX: Don't override a cleared state with new analysis
        if (prev[messageId] && !prev[messageId].hasErrors && data.hasErrors) {
          console.log('🚫 === PREVENTING OVERRIDE OF CLEARED STATE ===');
          console.log('Message was already cleared, not overriding with new analysis');
          console.log('Previous cleared state:', prev[messageId]);
          console.log('New analysis would set hasErrors to:', data.hasErrors);
          return prev; // Don't update the state
        }
        
        const newState = {
          ...prev,
          [messageId]: data
        };
        console.log('🔄 === STORING ANALYSIS RESULT ===');
        console.log('Previous state for message:', prev[messageId]);
        console.log('New state for message:', newState[messageId]);
        console.log('State change:', {
          before: prev[messageId]?.hasErrors,
          after: newState[messageId]?.hasErrors
        });
        return newState;
      });
        
        // Check for errors and display them
        if (data.hasErrors) {
          console.log('🚨 === ERRORS DETECTED ===');
          console.log('Error types:', data.errorTypes);
          console.log('Corrections:', data.corrections);
          
          let errorMessage = '';
          let shouldStopAI = false;
          
          if (data.errorTypes.grammar && data.corrections.grammar) {
            errorMessage += `📝 Grammar: ${data.corrections.grammar}\n`;
            console.log('Grammar error detected:', data.corrections.grammar);
          }
          
          if (data.errorTypes.vocabulary && data.corrections.vocabulary) {
            const vocabErrors = data.corrections.vocabulary.map((v: any) => 
              `"${v.wrong}" → "${v.correct}" (${v.meaning})`
            ).join(', ');
            errorMessage += `📚 Vocabulary: ${vocabErrors}\n`;
            console.log('Vocabulary errors detected:', data.corrections.vocabulary);
            
            // Auto-add vocabulary corrections from grammar is disabled for vocabulary isolation
            if (selectedConversation) {
              console.log('📚 === AUTO-ADDING VOCABULARY FROM ERRORS (DISABLED) ===');
              console.log('Vocabulary corrections count:', data.corrections.vocabulary.length);
              console.log('Current persistent vocab count:', persistentVocab.length);
              console.log('Current vocabAdditionTracker:', Array.from(vocabAdditionTracker));
              console.log('Timestamp:', new Date().toISOString());
              console.log('Stack trace:', new Error().stack);
            }
          }
          
          if (data.errorTypes.pronunciation && data.corrections.pronunciation) {
            errorMessage += `🗣️ Pronunciation: ${data.corrections.pronunciation}\n`;
            shouldStopAI = true; // Stop AI response for pronunciation errors
            console.log('Pronunciation error detected:', data.corrections.pronunciation);
            
            // Auto-open pronunciation tab for practice
            setShowToolbar(true);
            setCurrentAIMessage(message);
            
            // Set pronunciation words for practice
            if (data.wordsForPractice && data.wordsForPractice.length > 0) {
              const pronunciationWords = data.wordsForPractice
                .filter((word: any) => word.errorType === 'pronunciation')
                .map((word: any) => ({
                  word: word.word,
                  score: word.score || 60,
                  needsPractice: true,
                  feedback: `Practice pronouncing "${word.word}"`,
                  difficulty: 'medium',
                  soundsToFocus: ['pronunciation'],
                  improvementTips: ['Listen to native speakers', 'Practice slowly']
                }));
              
              // Store pronunciation words for practice
              setComprehensiveAnalysis(prev => ({
                ...prev,
                [messageId]: {
                  ...data,
                  pronunciationWords
                }
              }));
            }
          }
          
          // Show error message
          if (errorMessage) {
            console.log('📝 === SETTING ERROR MESSAGE ===');
            console.log('Message ID:', messageId);
            console.log('Error message:', errorMessage.trim());
            console.log('Should stop AI:', shouldStopAI);
            
            setErrorMessages(prev => ({
              ...prev,
              [messageId]: errorMessage.trim()
            }));
            
        // Set user attempts for messages with errors (both voice and text)
        console.log('📝 Message with errors - incrementing attempts');
        console.log('Current attempts for message:', messageId, ':', userAttempts[messageId] || 0);
        console.log('Is voice:', isVoice);
        console.log('Waiting for correction before increment:', waitingForCorrection);

        setUserAttempts(prev => {
          const newAttempts = (prev[messageId] || 0) + 1;
          console.log('New attempt count:', newAttempts);
          console.log('Updated user attempts:', { ...prev, [messageId]: newAttempts });
          return {
            ...prev,
            [messageId]: newAttempts
          };
        });

        // Set waiting for correction when there are errors (both voice and text)
        console.log('🔄 === SETTING WAITING FOR CORRECTION FOR ERRORS ===');
        setWaitingForCorrection(true);
            
            // Auto-open toolbar to show analysis (if not already opened for pronunciation)
            if (!data.errorTypes.pronunciation) {
              console.log('🔧 Opening toolbar for non-pronunciation errors');
              setShowToolbar(true);
              setCurrentAIMessage(message);
            }
            
            // Stop AI response if there are errors that need attention
            if (shouldStopAI) {
              console.log('🚫 === STOPPING AI RESPONSE - ERRORS NEED ATTENTION ===');
              console.log('Returning early to prevent AI response');
              return; // Don't continue with AI response
            }
          }
        }
        
        // Note: Retry state clearing is now handled in the main flow after analysis
        
        // Return the analysis data for immediate use
        console.log('🔄 === RETURNING ANALYSIS DATA ===');
        console.log('Returning data:', data);
        console.log('🔍 === FINAL STATE BEFORE RETURN ===');
        console.log('waitingForCorrection:', waitingForCorrection);
        console.log('errorMessages:', errorMessages);
        console.log('userAttempts:', userAttempts);
        return data;
      } else {
        // Handle non-ok response
        console.error('❌ === COMPREHENSIVE ANALYSIS API ERROR ===');
        console.error('Response status:', response.status);
        console.error('Response status text:', response.statusText);
        
        // Return fallback analysis instead of null to prevent error message
        console.log('🔄 === RETURNING FALLBACK ANALYSIS FOR API ERROR ===');
        
        const fallbackAnalysis = {
          hasErrors: false,
          errorTypes: {
            grammar: false,
            vocabulary: false,
            pronunciation: false
          },
          corrections: {
            grammar: null,
            vocabulary: [],
            pronunciation: null
          },
          suggestions: {
            grammar: null,
            vocabulary: null,
            pronunciation: null
          },
          wordsForPractice: [],
          message: message,
          timestamp: new Date().toISOString()
        };
        
        // Store the fallback analysis
        setComprehensiveAnalysis(prev => ({
          ...prev,
          [messageId]: fallbackAnalysis
        }));
        
        return fallbackAnalysis;
      }
    } catch (error) {
      console.error('Error in comprehensive analysis:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Full error details:', error);
      
      // Instead of returning null (which causes the error message), return a fallback analysis
      // that indicates no errors were found, allowing the conversation to continue
      console.log('🔄 === RETURNING FALLBACK ANALYSIS ===');
      console.log('Providing fallback analysis to prevent error message display');
      
      const fallbackAnalysis = {
        hasErrors: false,
        errorTypes: {
          grammar: false,
          vocabulary: false,
          pronunciation: false
        },
        corrections: {
          grammar: null,
          vocabulary: [],
          pronunciation: null
        },
        suggestions: {
          grammar: null,
          vocabulary: null,
          pronunciation: null
        },
        wordsForPractice: [],
        message: message,
        timestamp: new Date().toISOString()
      };
      
      // Store the fallback analysis
      setComprehensiveAnalysis(prev => ({
        ...prev,
        [messageId]: fallbackAnalysis
      }));
      
      return fallbackAnalysis;
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      console.log('🎤 === STARTING RECORDING ===');
      // Clear previous mic message ID when starting new recording
      setCurrentMicMessageId(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone access granted');
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const recordingStartTime = Date.now();

      // Start duration tracking
      const durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setRecordingDuration(elapsed);
        
        // Warn at 25 seconds
        if (elapsed >= 25) {
          console.warn('Recording approaching 30s limit');
        }
      }, 1000);

      // Request data periodically to ensure chunks are collected
      const dataInterval = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.requestData();
          console.log('📊 Requested data from recorder, chunks count:', chunks.length);
        }
      }, 100); // Request data every 100ms

      recorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('✅ Chunk added, total chunks:', chunks.length);
        } else {
          console.warn('⚠️ Empty chunk received');
        }
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        clearInterval(durationInterval);
        clearInterval(dataInterval);
        setIsRecording(false);
        alert('Recording error occurred. Please try again.');
      };

      recorder.onstop = async () => {
        console.log('🛑 === RECORDING STOPPED ===');
        clearInterval(durationInterval);
        clearInterval(dataInterval);
        setRecordingDuration(0);
        
        console.log('📊 Total chunks collected:', chunks.length);
        console.log('📊 Total data size:', chunks.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
        
        if (chunks.length === 0) {
          console.error('❌ No chunks collected during recording!');
          alert('No audio data was recorded. Please try again.');
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          return;
        }
        
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('✅ Audio blob created:', audioBlob.size, 'bytes');
        console.log('✅ Audio blob type:', audioBlob.type);
        
        // Store audio blob for pronunciation analysis
        setMicRecordingBlob(audioBlob);
        // Reset transcription state
        setMicRecordingTranscription(null);
        
        // Process audio in background (don't await - let it run async)
        processAudioMessage(audioBlob).catch(error => {
          console.error('Error processing audio message:', error);
        });
        
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Media stream tracks stopped');
      };

      console.log('🎤 Starting MediaRecorder...');
      recorder.start();
      console.log('✅ MediaRecorder started, state:', recorder.state);
      setMediaRecorder(recorder);
      setIsRecording(true);
      console.log('✅ Recording state set to true');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setIsRecording(false);
      alert('Microphone access denied. Please allow microphone access to use voice input.');
    }
  };

  const stopRecording = () => {
    console.log('🛑 === STOP RECORDING CALLED ===');
    console.log('MediaRecorder exists:', !!mediaRecorder);
    console.log('Is recording:', isRecording);
    console.log('MediaRecorder state:', mediaRecorder?.state);
    
    if (mediaRecorder && isRecording) {
      console.log('✅ Stopping MediaRecorder...');
      try {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          console.log('✅ MediaRecorder.stop() called');
        } else {
          console.warn('⚠️ MediaRecorder is not in recording state:', mediaRecorder.state);
        }
        setIsRecording(false);
        console.log('✅ Recording state set to false');
      } catch (error) {
        console.error('❌ Error stopping recorder:', error);
        setIsRecording(false);
      }
    } else {
      console.warn('⚠️ Cannot stop recording - mediaRecorder or isRecording is false');
    }
  };

  // Stop practice recording handler for suggested responses
  const handleStopPracticeResponse = (responseId: string, responseText: string) => {
    console.log('🛑 === STOP PRACTICE RESPONSE CLICKED ===');
    console.log('Response ID:', responseId);
    console.log('Response Text:', responseText);
    
    const recorder = practiceRecorders[responseId];
    if (recorder && recorder.state !== 'inactive') {
      console.log('🛑 Stopping recorder for response:', responseId);
      recorder.stop();
      // The recorder.onstop handler will set showAnalyze to true
    } else {
      console.log('⚠️ No active recorder found for response:', responseId);
      // Manually set states if recorder not found
      setResponseRecordingState(prev => ({
        ...prev,
        [responseId]: false
      }));
    }
  };

  // Practice recording handlers for suggested responses
  const handlePracticeResponse = async (responseId: string, responseText: string) => {
    console.log('🎤 === PRACTICE RESPONSE CLICKED ===');
    console.log('Response ID:', responseId);
    console.log('Response Text:', responseText);

    // Check if already recording - stop recording
    if (responseRecordingState[responseId]) {
      const recorder = practiceRecorders[responseId];
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      return;
    }

    // Reset hasBeenAnalyzed when starting a new practice (Practice Again)
    // This allows the Analyse button to be enabled again after recording
    setResponseHasBeenAnalyzed(prev => ({
      ...prev,
      [responseId]: false
    }));

    // Reset showAnalyze initially, will be set to true after recording stops
    setResponseShowAnalyze(prev => ({
      ...prev,
      [responseId]: false
    }));
    
    // Ensure Analyze button is NOT shown while recording
    console.log('🔄 Reset showAnalyze for response:', responseId, '- Analyze button will be enabled after Stop');

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('🎤 === RECORDING STOPPED FOR RESPONSE ===');
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        
        // Store audio blob
        setRecordedAudioBlobs(prev => {
          const newMap = new Map(prev);
          newMap.set(responseId, { blob: audioBlob, text: responseText });
          return newMap;
        });

        // Show Analyze button - enable it after recording stops
        setResponseShowAnalyze(prev => {
          const newState = {
            ...prev,
            [responseId]: true
          };
          console.log('✅ Analyze button enabled for response:', responseId);
          console.log('📊 Updated responseShowAnalyze:', newState);
          return newState;
        });

        // Stop recording state
        setResponseRecordingState(prev => ({
          ...prev,
          [responseId]: false
        }));

        // Clean up recorder
        setPracticeRecorders(prev => {
          const newRecorders = { ...prev };
          delete newRecorders[responseId];
          return newRecorders;
        });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      
      // Update state
      setResponseRecordingState(prev => ({
        ...prev,
        [responseId]: true
      }));
      
      setPracticeRecorders(prev => ({
        ...prev,
        [responseId]: recorder
      }));
    } catch (error) {
      console.error('❌ Error starting practice recording:', error);
      alert('Microphone access denied. Please allow microphone access to use voice input.');
    }
  };

  // Analyze handler - navigates to pronunciation tab
  const handleAnalyzeResponse = (responseId: string, responseText: string) => {
    console.log('🔍 === ANALYZE RESPONSE CLICKED ===');
    console.log('Response ID:', responseId);
    console.log('Response Text:', responseText);

    const audioData = recordedAudioBlobs.get(responseId);
    if (!audioData) {
      console.error('❌ No audio blob found for response:', responseId);
      alert('Please record audio first before analyzing.');
      return;
    }

    // Set pending analysis
    setPendingPronunciationAnalysis({
      audioBlob: audioData.blob,
      text: responseText,
      responseId
    });

    // Navigate to pronunciation tab - ensure toolbar is visible and expanded
    setToolbarActiveTab('pronunciation');
    setShowToolbar(true);
    setToolbarCollapsed(false);

    // Mark as analyzed
    setResponseHasBeenAnalyzed(prev => ({
      ...prev,
      [responseId]: true
    }));
  };

  // Helper function to re-transcribe audio blob using Whisper API
  const reTranscribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    console.log('🔄 === RE-TRANSCRIBING AUDIO ===');
    console.log('Audio blob size:', audioBlob.size, 'bytes');
    
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks
      let binaryString = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binaryString);
      console.log('Base64 audio length:', base64Audio.length);
      
      // Call Whisper API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          language: recordingLanguage === 'german' ? 'de' : 'en',
          storeForAnalysis: true
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Re-transcription failed:', response.status, errorText);
        return null;
      }
      
      const data = await response.json();
      
      if (data.transcription && typeof data.transcription === 'string') {
        const transcription = data.transcription.trim();
        console.log('✅ Re-transcription successful:', transcription);
        return transcription;
      } else {
        console.error('❌ Invalid re-transcription response:', data);
        return null;
      }
    } catch (error) {
      console.error('❌ Re-transcription error:', error);
      return null;
    }
  };

  // Message-level Analyse handler - navigates to pronunciation tab with mic recording
  const handleMessageAnalyse = async (messageId: string) => {
    console.log('🔍 === MESSAGE ANALYSE CLICKED ===');
    console.log('Message ID:', messageId);
    console.log('Current micRecordingBlob:', micRecordingBlob ? `exists (${micRecordingBlob.size} bytes)` : 'null');
    console.log('Current micRecordingTranscription:', micRecordingTranscription);
    
    if (!micRecordingBlob) {
      console.error('❌ No mic recording blob found');
      alert('No audio recording available for analysis.');
      return;
    }

    // Get transcript from message content or stored transcription
    const message = chatMessages.find(msg => msg.id === messageId);
    const transcription = micRecordingTranscription || (message?.content && message.content !== '🎤 Recording...' && message.content !== '🎤 Voice message' ? message.content : null);
    
    if (!transcription || transcription.trim().length === 0) {
      console.error('❌ No transcription available');
      alert('No transcription available. Please wait for transcription to complete.');
      return;
    }

    // Validate transcript has letters
    const hasLetters = /[a-zA-ZäöüÄÖÜß]/.test(transcription);
    if (!hasLetters) {
      console.error('❌ Transcription does not contain letters:', transcription);
      alert('Invalid transcription - no readable text detected.');
      return;
    }

    console.log('✅ Using transcription for pronunciation analysis:', transcription);

    // Set pending analysis with mic recording
    const responseId = `mic-${messageId}-${Date.now()}`;
    console.log('📝 Setting pendingPronunciationAnalysis with:');
    console.log('  - audioBlob:', micRecordingBlob.size, 'bytes');
    console.log('  - text:', transcription);
    console.log('  - responseId:', responseId);
    
    setPendingPronunciationAnalysis({
      audioBlob: micRecordingBlob,
      text: transcription.trim(),
      responseId: responseId
    });

    // Navigate to pronunciation tab - ensure toolbar is visible and expanded
    setToolbarActiveTab('pronunciation');
    setShowToolbar(true);
    setToolbarCollapsed(false);
    
    console.log('✅ Navigation to pronunciation tab completed');
  };

  // Mic button Analyze handler - navigates to pronunciation tab with mic recording (kept for backward compatibility)
  const handleMicAnalyze = async () => {
    console.log('🔍 === MIC ANALYZE CLICKED ===');
    console.log('Current micRecordingBlob:', micRecordingBlob ? `exists (${micRecordingBlob.size} bytes)` : 'null');
    console.log('Current micRecordingTranscription:', micRecordingTranscription);
    console.log('Current micRecordingTranscription type:', typeof micRecordingTranscription);
    
    if (!micRecordingBlob) {
      console.error('❌ No mic recording blob found');
      alert('Please record audio first before analyzing.');
      return;
    }

    // Check if we have a transcription and if it's valid
    let transcription = micRecordingTranscription ? micRecordingTranscription.trim() : null;
    let needsReTranscription = false;
    
    // If no transcription exists, or if it's invalid/gibberish, re-transcribe
    if (!transcription || transcription.length === 0) {
      console.log('🔄 No transcription available - re-transcribing...');
      needsReTranscription = true;
    } else {
      // Validate the existing transcription
      const validationResult = validateTranscript(transcription);
      if (!validationResult.isValid) {
        console.log('🔄 Existing transcription is gibberish - re-transcribing...');
        console.log('🔄 Validation reason:', validationResult.reason);
        needsReTranscription = true;
      }
    }

    // Re-transcribe if needed
    if (needsReTranscription) {
      console.log('🔄 === RE-TRANSCRIBING AUDIO FOR ANALYSIS ===');
      console.log('🔄 Re-transcribing audio blob to get valid transcription...');
      
      // Show loading state
      const reTranscribedText = await reTranscribeAudio(micRecordingBlob);
      
      if (!reTranscribedText || reTranscribedText.trim().length === 0) {
        console.error('❌ Re-transcription failed or returned empty');
        alert('Unable to transcribe the audio. Please try recording again.');
        return;
      }
      
      // Validate the re-transcribed text
      const reValidationResult = validateTranscript(reTranscribedText);
      if (!reValidationResult.isValid) {
        console.error('❌ Re-transcription still returned gibberish:', reTranscribedText);
        console.error('❌ Validation reason:', reValidationResult.reason);
        alert('Unable to get a valid transcription from the audio. Please try recording again with clearer speech.');
        return;
      }
      
      // Use the re-transcribed text
      transcription = reTranscribedText;
      console.log('✅ Using re-transcribed text for analysis:', transcription);
      
      // Update the stored transcription
      setMicRecordingTranscription(transcription);
    } else {
      console.log('✅ Using existing valid transcription:', transcription);
    }

    // Final validation: Ensure transcription has content and letters
    if (!transcription || transcription.length === 0) {
      console.error('❌ Final transcription is empty');
      alert('No transcription available. Please record again.');
      return;
    }

    const hasLetters = /[a-zA-ZäöüÄÖÜß]/.test(transcription);
    if (!hasLetters) {
      console.error('❌ Transcription does not contain letters:', transcription);
      alert('Invalid transcription - no readable text detected. Please speak clearly and record again.');
      return;
    }

    console.log('✅ Using transcription for pronunciation analysis:', transcription);
    console.log('✅ Transcription length:', transcription.length);

    // Clear any previous pronunciation analysis results before setting new pending analysis
    console.log('🧹 Clearing previous pronunciation analysis');
    
    // Set pending analysis with mic recording - this overwrites any previous pending analysis
    const micResponseId = `mic-${Date.now()}`;
    console.log('📝 Setting pendingPronunciationAnalysis with:');
    console.log('  - audioBlob:', micRecordingBlob.size, 'bytes');
    console.log('  - text:', transcription);
    console.log('  - responseId:', micResponseId);
    
    setPendingPronunciationAnalysis({
      audioBlob: micRecordingBlob,
      text: transcription,
      responseId: micResponseId
    });

    // Navigate to pronunciation tab - ensure toolbar is visible and expanded
    setToolbarActiveTab('pronunciation');
    setShowToolbar(true);
    setToolbarCollapsed(false);

    // Hide the Analyse button after clicking
    setShowMicAnalyzeButton(false);
    
    console.log('✅ Navigation to pronunciation tab completed');
  };

  // Modal recording functions
  const startModalRecording = async (isForConversationInput: boolean = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const recordingStartTime = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const recordingDuration = Date.now() - recordingStartTime;
        
        console.log('🎤 === MODAL RECORDING STOPPED ===');
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        console.log('Recording duration:', recordingDuration, 'ms');
        
        // Process the recording based on context
        if (isForConversationInput) {
          await processConversationInputRecording(audioBlob);
        } else {
          await processModalRecording(audioBlob);
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setModalRecorder(recorder);
      setIsModalRecording(true);
      
      console.log('🎤 === MODAL RECORDING STARTED ===');
    } catch (error) {
      console.error('Error starting modal recording:', error);
      alert('Microphone access denied. Please allow microphone access to use voice input.');
    }
  };

  const stopModalRecording = () => {
    if (modalRecorder && isModalRecording) {
      modalRecorder.stop();
      setIsModalRecording(false);
    }
  };

  const processConversationInputRecording = async (audioBlob: Blob) => {
    console.log('🎤 === PROCESSING CONVERSATION INPUT RECORDING ===');
    console.log('Audio blob size:', audioBlob.size, 'bytes');
    console.log('Audio blob type:', audioBlob.type);
    console.log('Recording language:', recordingLanguage);
    
    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        alert('Failed to read audio file. Please try again.');
        setIsTranscribing(false);
      };
      
      reader.onload = async () => {
        try {
          const base64Audio = reader.result as string;
          if (!base64Audio || !base64Audio.includes(',')) {
            console.error('Invalid base64 audio data');
            alert('Failed to process recording. Please try again.');
            setIsTranscribing(false);
            return;
          }
          
          const base64Data = base64Audio.split(',')[1];
          console.log('Base64 audio length:', base64Data.length);
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ 
              audioData: base64Data,
              language: recordingLanguage === 'german' ? 'de' : 'en'
            })
          });

          console.log('Whisper response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('Whisper response data:', data);
            
            if (data.transcription && data.transcription.trim()) {
              const transcription = data.transcription.trim();
              console.log('✅ Conversation input transcription received:', transcription);
              console.log('🎯 Setting this transcription to conversationInput field');
              
              // Set the transcription as the conversation input
              setConversationInput(transcription);
              setIsTranscribing(false);
              
              console.log('✅ Transcription set in conversationInput');
            } else {
              console.error('No transcription or empty transcription received');
              console.error('Response data:', data);
              alert('No speech detected. Please try again.');
              setIsTranscribing(false);
            }
          } else {
            const errorText = await response.text();
            console.error('Transcription failed:', response.status, errorText);
            alert('Failed to process your recording. Please try again.');
            setIsTranscribing(false);
          }
        } catch (error) {
          console.error('Transcription error:', error);
          alert('Failed to process your recording. Please try again.');
          setIsTranscribing(false);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing conversation input recording:', error);
      alert('Failed to process your recording. Please try again.');
      setIsTranscribing(false);
    }
  };

  const processModalRecording = async (audioBlob: Blob) => {
    console.log('🎤 === PROCESSING MODAL RECORDING ===');
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Audio = reader.result as string;
      const base64Data = base64Audio.split(',')[1];
      
      console.log('Base64 audio length:', base64Data.length);
      
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ 
            audioData: base64Data,
            language: recordingLanguage === 'german' ? 'de' : 'en'
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.transcription) {
            const transcription = data.transcription;
            console.log('Modal transcription:', transcription);
            
            // Detect language
            const detectedLanguage = detectLanguage(transcription);
            console.log('Modal detected language:', detectedLanguage);
            
            if (detectedLanguage === 'german') {
              // User said it correctly in German - close modal and replace message
              console.log('✅ === MODAL PRACTICE SUCCESSFUL ===');
              
              // Replace the original English message with the German transcription
              if (mismatchMessageId) {
                setChatMessages(prev => prev.map(msg =>
                  msg.id === mismatchMessageId
                    ? { ...msg, content: transcription, isAudio: true }
                    : msg
                ));
                
                // Store the German voice message for pronunciation analysis
                setLastGermanVoiceMessage({
                  transcription: transcription,
                  audioData: base64Data,
                  messageId: mismatchMessageId
                });
                
                console.log('🎤 === STORED GERMAN VOICE MESSAGE FOR PRONUNCIATION ANALYSIS ===');
                console.log('Transcription:', transcription);
                console.log('Message ID:', mismatchMessageId);
                console.log('Audio data length:', base64Data.length);
                
                // Process the German message normally
                await processTextMessage(transcription, mismatchMessageId, false);
              }
              
              // Close modal
              setShowLanguageMismatchModal(false);
              setDetectedLanguage(null);
              setMismatchTranscription('');
              setMismatchMessageId('');
              setGermanSuggestion('');
              setModalInput('');
              setModalTriggerType(null);
              setIsTranscribing(false);
            } else {
              // User still said it in English - show error
              console.log('❌ === MODAL PRACTICE FAILED - STILL ENGLISH ===');
              alert('Please try saying it in German. You said: "' + transcription + '"');
            }
          }
        } else {
          console.error('Modal transcription failed:', response.status);
          alert('Failed to process your recording. Please try again.');
        }
      } catch (error) {
        console.error('Modal transcription error:', error);
        alert('Failed to process your recording. Please try again.');
      }
    };
    
    reader.readAsDataURL(audioBlob);
  };

  // Handle modal text submission
  const handleModalTextSubmit = async () => {
    if (!modalInput.trim()) return;
    
    console.log('📝 === MODAL TEXT SUBMISSION ===');
    console.log('Modal input:', modalInput);
    
    // Detect language of the typed text
    const detectedLanguage = detectLanguage(modalInput);
    console.log('Modal text detected language:', detectedLanguage);
    
    if (detectedLanguage === 'german') {
      // User typed it correctly in German - create new message and process
      console.log('✅ === MODAL TEXT SUBMISSION SUCCESSFUL ===');
      
      // Create a new message with the German text
      const newMessageId = Date.now().toString();
      const newMessage = {
        id: newMessageId,
        content: modalInput,
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        isTranscribing: false
      };
      
      // Add the new message to chat
      setChatMessages(prev => [...prev, newMessage]);
      
      // Close modal and clear input immediately
      setShowLanguageMismatchModal(false);
      setDetectedLanguage(null);
      setMismatchTranscription('');
      setMismatchMessageId('');
      setGermanSuggestion('');
      setModalInput('');
      setModalTriggerType(null);
      setMessageInput(''); // Clear the chat input box
      
      // Process the German message asynchronously (after modal closes)
      setTimeout(async () => {
        await processTextMessage(modalInput, newMessageId, false);
      }, 100);
    } else {
      // User still typed it in English - show error
      console.log('❌ === MODAL TEXT SUBMISSION FAILED - STILL ENGLISH ===');
      alert('Please type it in German. You typed: "' + modalInput + '"');
    }
  };

  const processAudioMessage = async (audioBlob: Blob, preExistingMessageId?: string) => {
    // Store audio blob for practice modal use
    setPracticeAudioBlob(audioBlob);
    
    // If messageId was passed directly (from stopRecording), use it
    // Otherwise check state for pre-existing message
    if (!preExistingMessageId) {
      preExistingMessageId = currentMicMessageId;
    }
    
    // Check if we're in a retry state - be more robust in detection
    const isRetry = Boolean(activeMessageId);
    const existingMessageId = activeMessageId;

    console.log('🎤 === PROCESSING AUDIO MESSAGE ===');
    console.log('Pre-existing message ID (from parameter or state):', preExistingMessageId);
    console.log('Is retry:', isRetry);
    console.log('Existing message ID:', existingMessageId);
    console.log('Waiting for correction:', waitingForCorrection);
    console.log('User attempts:', userAttempts);
    console.log('Error messages:', errorMessages);
    console.log('Current chat messages count:', chatMessages.length);
    console.log('🔍 === RETRY DETECTION DETAILS ===');
    console.log('waitingForCorrection value:', waitingForCorrection);
    console.log('userAttempts keys:', Object.keys(userAttempts));
    console.log('userAttempts values:', Object.values(userAttempts));
    console.log('errorMessages keys:', Object.keys(errorMessages));
    console.log('errorMessages values:', Object.values(errorMessages));
    
    let messageId = '';
    
    // If message was already created in stopRecording, use that messageId
    if (preExistingMessageId) {
      console.log('✅ Using pre-existing message ID from mic recording:', preExistingMessageId);
      messageId = preExistingMessageId;
      // Wait a moment for React state to update (message was just added in stopRecording)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify message exists using functional state access
      let messageFound = false;
      setChatMessages(currentMessages => {
        const messageExists = currentMessages.find(msg => msg.id === preExistingMessageId);
        if (messageExists) {
          messageFound = true;
          console.log('✅ Message found in chatMessages:', preExistingMessageId);
        } else {
          console.error('❌ Message not found in chatMessages:', preExistingMessageId);
          console.log('Current message IDs:', currentMessages.map(m => m.id));
        }
        return currentMessages; // Don't modify, just read
      });
      
      if (messageFound) {
        // Process audio in background - message already exists, just need to transcribe
        await transcribeAudio(audioBlob, messageId, false);
        // Clear after transcription completes
        setCurrentMicMessageId(null);
        return;
      } else {
        // If message still doesn't exist, fall through to create new message
        console.warn('⚠️ Message not found after wait, falling through to create new message');
      }
    }
    
    if (isRetry && existingMessageId) {
      // This is a retry - update existing message
      console.log('🔄 === VOICE RETRY DETECTED ===');
      console.log('Updating existing message:', existingMessageId);
      console.log('Current attempts for this message:', userAttempts[existingMessageId] || 0);

      messageId = existingMessageId;

      updateMessageStatus(messageId, 'checking');

      // Update the existing message to show retry attempt
      setChatMessages(prev => {
        console.log('🔄 === UPDATING EXISTING MESSAGE FOR RETRY ===');
        console.log('Previous messages count:', prev.length);
        console.log('Looking for message ID:', messageId);
        
        const updatedMessages = prev.map(msg => {
          if (msg.id === messageId) {
            console.log('✅ FOUND MESSAGE TO UPDATE FOR RETRY:', msg.id);
            console.log('Original content:', msg.content);
            return { ...msg, content: '🎤 Recording retry...', isTranscribing: true, audioUrl: URL.createObjectURL(audioBlob) };
          }
          return msg;
        });

        console.log('Updated messages count after retry:', updatedMessages.length);
        return updatedMessages;
      });

      // Ensure we maintain the retry state
      setWaitingForCorrection(true);
    } else {
      // Check if this is voice correction mode (mismatch modal + mismatch transcription)
      const isVoiceCorrectionMode = showLanguageMismatchModal && mismatchTranscription && mismatchTranscription !== '🎤 Voice message';
      
      if (isVoiceCorrectionMode) {
        // Voice correction mode - don't create new message, we'll replace the original
        console.log('🎤 === VOICE CORRECTION MODE - SKIPPING NEW MESSAGE CREATION ===');
        console.log('Will replace original message:', mismatchMessageId);
        messageId = mismatchMessageId; // Use the original message ID

        updateMessageStatus(messageId, 'checking');
      } else {
        // This is a new message - create new message
        console.log('🆕 === NEW VOICE MESSAGE ===');
        console.log('Creating new message because:');
        console.log('- isRetry:', isRetry);
        console.log('- existingMessageId:', existingMessageId);
        console.log('- waitingForCorrection:', waitingForCorrection);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('✅ Audio URL created:', audioUrl);
        console.log('✅ Audio blob size:', audioBlob.size, 'bytes');
        console.log('✅ Audio blob type:', audioBlob.type);
        
        const audioMessage: ChatMessage = {
          id: Date.now().toString(), // Always create new ID to avoid duplicates
          role: 'user',
          content: '🎤 Voice message',
          timestamp: new Date().toISOString(),
          audioUrl: audioUrl, // Set audioUrl immediately for play button
          isAudio: true, // Mark as audio message
          isTranscribing: true
        };
        
        messageId = audioMessage.id;
        console.log('✅ Message created with ID:', messageId);
        console.log('✅ Message audioUrl:', audioMessage.audioUrl);
        console.log('✅ Message isAudio:', audioMessage.isAudio);

        updateMessageStatus(messageId, 'checking');
        console.log('✅ Message status set to "checking"');
        
        // Add to chat immediately
        setChatMessages(prev => {
          console.log('🆕 === ADDING NEW MESSAGE TO CHAT ===');
          console.log('New message ID:', messageId);
          console.log('Previous messages count:', prev.length);
          console.log('Audio URL in message:', audioMessage.audioUrl);
          const newMessages = [...prev, audioMessage];
          console.log('New messages count:', newMessages.length);
          console.log('✅ Message added to chat - play button should be enabled');
          return newMessages;
        });
      }
    }
    
    // Process audio in background
    await transcribeAudio(audioBlob, messageId, isRetry);
  };

  // Comprehensive transcript validation function
  // Tests and confirms transcript is valid before displaying
  const validateTranscript = (transcript: string): { isValid: boolean; reason?: string } => {
    const trimmed = transcript.trim();
    
    // Check if transcript is empty
    if (!trimmed || trimmed.length === 0) {
      return { isValid: false, reason: 'empty' };
    }
    
    // Comprehensive gibberish pattern detection
    const invalidPatterns = [
      /^🎤/i,  // Placeholder like "🎤 Voice message"
      /^Recording/i,  // Placeholder like "Recording retry..."
      /^Untertitel/i,  // "Untertitel" at start
      /Untertitel der/i,  // "Untertitel der" anywhere
      /Untertitel der.*Amara/i,  // "Untertitel der Amara" pattern
      /Untertitel im Auftrag/i,  // "Untertitel im Auftrag" pattern
      /Untertitel im Auftrag des ZDF/i,  // "Untertitel im Auftrag des ZDF" pattern
      /Amara\.org/i,  // "Amara.org" anywhere
      /Amara\.org-Community/i,  // "Amara.org-Community" pattern
      /Amara-Community/i,  // "Amara-Community" pattern
      /im Auftrag/i,  // "im Auftrag" pattern
      /für funk/i,  // "für funk" pattern
      /^\d{4}$/,  // Just year numbers like "2017"
      /Community.*Untertitel/i,  // "Community Untertitel" pattern
      /der.*Amara/i,  // "der Amara" pattern
      /ZDF.*funk/i,  // "ZDF für funk" pattern
    ];
    
    const isGibberishPattern = invalidPatterns.some(pattern => pattern.test(trimmed));
    if (isGibberishPattern) {
      return { isValid: false, reason: 'gibberish_pattern' };
    }
    
    // Check if transcript has meaningful content (letters)
    const hasLetters = /[a-zA-ZäöüÄÖÜß]/.test(trimmed);
    if (!hasLetters) {
      return { isValid: false, reason: 'no_letters' };
    }
    
    // Check transcript length (too short might be invalid)
    if (trimmed.length < 2) {
      return { isValid: false, reason: 'too_short' };
    }
    
    // Check for too many repeated characters (might indicate corrupted transcription)
    const repeatedChars = /(.)\1{4,}/.test(trimmed);
    if (repeatedChars) {
      return { isValid: false, reason: 'repeated_chars' };
    }
    
    // All validation checks passed
    return { isValid: true };
  };
  
  const transcribeAudio = async (audioBlob: Blob, messageId: string, isRetry: boolean = false) => {
    console.log('🎤 === TRANSCRIBE AUDIO START ===');
    console.log('Message ID:', messageId);
    console.log('Is Retry:', isRetry);
    console.log('Recording language:', recordingLanguage);
    console.log('Current chat messages count:', chatMessages.length);
    console.log('Show language mismatch modal state:', showLanguageMismatchModal);
    
    setIsTranscribing(true);
    try {
      // Log audio info for debugging
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('Audio blob type:', audioBlob.type);
      console.log('Recording language:', recordingLanguage);
      
      // Convert blob to base64 using a safer method for large files
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Use a more robust base64 conversion that handles large arrays
      let binaryString = '';
      const chunkSize = 8192; // Process in 8KB chunks
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binaryString);
      
      console.log('Base64 audio length:', base64Audio.length);

      // Try the whisper function first, fallback to chat function if not available
      let response;
      let isWhisperResponse = false; // Track if response is from Whisper API
      try {
        // Use auto-detection instead of forcing a specific language
        // This allows Whisper to detect the actual language spoken
        
        // Add timeout for longer recordings
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whisper`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioData: base64Audio,
            language: recordingLanguage === 'german' ? 'de' : 'en',
            storeForAnalysis: true
          }),
          signal: controller.signal
        });
        
        isWhisperResponse = true; // Mark that this is from Whisper API
        clearTimeout(timeoutId);
      } catch (whisperError) {
        console.log('Whisper function error:', whisperError);
        
        // Check if it's a timeout or size issue
        if ((whisperError as Error).name === 'AbortError') {
          console.log('Transcription timeout - audio might be too long');
          setChatMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: '⏱️ Audio too long (30s limit). Try shorter recordings.', isTranscribing: false }
              : msg
          ));
          return;
        }
        
        // Check if audio is too large
        if (audioBlob.size > 25 * 1024 * 1024) { // 25MB limit
          console.log('Audio file too large:', audioBlob.size);
          setChatMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: '📁 Audio file too large. Try shorter recordings.', isTranscribing: false }
              : msg
          ));
          return;
        }
        
        console.log('Whisper function not available, using fallback...');
        // Fallback: Use chat function with a message about audio transcription
        const fallbackMessage = recordingLanguage === 'german' 
          ? 'I just recorded an audio message. Please respond as if I said something in German and help me practice.'
          : 'I just recorded an audio message in English. Please help me translate it to German and suggest how to say it naturally.';
        
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: fallbackMessage
              }
            ],
            conversationId: 'audio-fallback',
            contextLevel: 'Intermediate',
            difficultyLevel: 'Intermediate'
          })
        });
        
        isWhisperResponse = false; // This is NOT from Whisper API
      }

      if (response.ok) {
        const data = await response.json();
        
        // Check if this is a whisper response or chat fallback
        if (data.transcription) {
          // Whisper function response
          // CRITICAL: Use ONLY the transcription from Whisper API, never from any other source
          const transcription = data.transcription;
          
          // CRITICAL VALIDATION: Ensure this transcription is from Whisper API, not from chat fallback
          // Only store mic transcription if this is confirmed to be from Whisper API
          if (!isWhisperResponse) {
            console.warn('⚠️ Response is from chat fallback, not Whisper API - skipping mic transcription storage');
            console.warn('⚠️ Transcription from fallback:', transcription);
          }
          
          // Validate that transcription is actually from Whisper API and not a fallback
          if (typeof transcription !== 'string') {
            console.error('❌ Invalid transcription type from API:', typeof transcription);
            setIsTranscribing(false);
            return;
          }
          
          console.log('🎤 === WHISPER API TRANSCRIPTION RECEIVED ===');
          console.log('Raw transcription from API:', transcription);
          console.log('Transcription type:', typeof transcription);
          console.log('Transcription length:', transcription.length);
          console.log('Is from Whisper API:', isWhisperResponse);
          console.log('✅ Transcription received from Whisper API');
          
          // CRITICAL: Store transcription IMMEDIATELY for mic recordings if micRecordingBlob exists
          // This ensures we capture the actual API transcription before any other processing
          // Store it regardless of language detection - we'll validate later
          // ONLY store if this is confirmed to be from Whisper API
          if (micRecordingBlob && isWhisperResponse) {
            const actualTranscription = transcription.trim();
            if (actualTranscription && actualTranscription.length > 0) {
              console.log('🎤 === STORING MIC RECORDING TRANSCRIPTION IMMEDIATELY ===');
              console.log('✅ Storing actual API transcription immediately:', actualTranscription);
              console.log('✅ Storing BEFORE language detection or any other processing');
              console.log('✅ Confirmed source: Whisper API');
              setMicRecordingTranscription(actualTranscription);
              
              // Verify storage
              setTimeout(() => {
                console.log('✅ Verification: micRecordingTranscription stored immediately as:', actualTranscription);
              }, 0);
            }
          } else if (micRecordingBlob && !isWhisperResponse) {
            console.warn('⚠️ NOT storing mic transcription - response is not from Whisper API');
            console.warn('⚠️ Transcription would have been:', transcription);
          }
          
          // VALIDATE transcript before displaying - test and confirm it's valid
          const trimmedTranscription = transcription.trim();
          
          // Only check if transcription is truly empty (API failure case)
          if (!trimmedTranscription || trimmedTranscription.length === 0) {
            console.error('❌ Empty transcription from Whisper API:', transcription);
            setChatMessages(prev => {
              const updatedMessages = prev.map(msg => {
                if (msg.id === messageId) {
                  return { 
                    ...msg, 
                    content: '❌ Transcription failed - no audio detected', 
                    isTranscribing: false 
                  };
                }
                return msg;
              });
              return updatedMessages;
            });
            
            setIsTranscribing(false);
            updateMessageStatus(messageId, 'error');
            
            return;
          }
          
          // TEST AND CONFIRM transcript is valid before displaying
          const validationResult = validateTranscript(trimmedTranscription);
          
          console.log('🔍 === TRANSCRIPT VALIDATION ===');
          console.log('Transcription:', trimmedTranscription);
          console.log('Validation result:', validationResult);
          
          // Keep message with placeholder when gibberish detected - don't display gibberish transcript
          if (!validationResult.isValid) {
            console.error('❌ Invalid transcript detected - keeping message with placeholder:', trimmedTranscription);
            console.error('❌ Validation reason:', validationResult.reason);
            console.error('❌ Keeping message visible with placeholder "🎤 Voice message"');
            
            // Keep the message visible but with placeholder instead of gibberish
            setChatMessages(prev => {
              const updatedMessages = prev.map(msg => {
                if (msg.id === messageId) {
                  console.log('✅ KEEPING MESSAGE WITH PLACEHOLDER FOR GIBBERISH TRANSCRIPT');
                  console.log('Original content:', msg.content);
                  console.log('Keeping placeholder: 🎤 Voice message');
                  
                  return { 
                    ...msg, 
                    content: '🎤 Voice message',  // Keep placeholder instead of gibberish
                    isTranscribing: false,
                    audioUrl: msg.audioUrl, // Preserve existing audio URL for playback
                    isAudio: true // Keep isAudio flag so play button displays
                  };
                }
                return msg;
              });
              return updatedMessages;
            });
            
            setIsTranscribing(false);
            // Don't set error status - just keep placeholder message
            
            // Clear checking status to remove "Checking your message..." indicator
            if (messageId) {
              clearCheckingStatus(messageId);
              console.log('✅ Cleared checking status for invalid transcript');
            }
            
            // For gibberish transcripts, keep placeholder - Analyse button won't show until valid transcript
            // User can still use Play button to listen to recording
            console.log('⚠️ Invalid transcript - keeping placeholder, Analyse button will not appear');
            
            return; // Don't proceed with processing invalid transcript
          }
          
          // VALID TRANSCRIPTION CONFIRMED - display the EXACT transcription from Whisper API word-for-word
          console.log('✅ Valid transcription confirmed - displaying EXACT transcript word-for-word:', trimmedTranscription);
          console.log('✅ Transcript length:', trimmedTranscription.length);
          console.log('✅ Transcript is from Whisper API - no modifications applied');
          
          setChatMessages(prev => {
            console.log('🔍 === UPDATING MESSAGE WITH TRANSCRIPT ===');
            console.log('Looking for messageId:', messageId);
            console.log('Current messages:', prev.map(m => ({ id: m.id, content: m.content.substring(0, 50) })));
            const messageExists = prev.find(msg => msg.id === messageId);
            console.log('Message found:', !!messageExists);
            if (messageExists) {
              console.log('Existing message content:', messageExists.content);
            }
            
            const updatedMessages = prev.map(msg => {
              if (msg.id === messageId) {
                console.log('✅ UPDATING MESSAGE WITH EXACT TRANSCRIPTION FROM WHISPER API:', msg.id);
                console.log('Original content:', msg.content);
                console.log('New content (EXACT transcription from Whisper API):', trimmedTranscription);
                console.log('✅ No modifications - displaying word-for-word as received from API');
                
                // Store transcribed text as original message for suggestion generation (voice input)
                if (!isRetry) {
                  console.log('📝 === STORING TRANSCRIBED TEXT AS ORIGINAL MESSAGE FOR VOICE INPUT ===');
                  console.log('Message ID:', messageId);
                  console.log('Transcribed text:', trimmedTranscription);
                  setOriginalMessages(prev => ({
                    ...prev,
                    [messageId]: trimmedTranscription
                  }));
                }
                
                return { 
                  ...msg, 
                  content: trimmedTranscription,  // Display EXACT transcription word-for-word from Whisper API
                  isTranscribing: false,
                  audioUrl: msg.audioUrl, // Preserve existing audio URL for playback (set when message was created)
                  isAudio: true // Mark as audio message for proper UI display
                };
              }
              return msg;
            });
            console.log('✅ Message updated with exact transcript - transcript displayed in chat');
            return updatedMessages;
          });
          
          // Clear loading states
          setIsTranscribing(false);
          
          // Clear checking status to remove "Checking your message..." indicator
          if (messageId) {
            clearCheckingStatus(messageId);
            console.log('✅ Cleared checking status after valid transcription');
          }
          
          // Detect language for Analyse button visibility and other processing
          const detectedLanguage = detectLanguage(transcription);
          console.log('🔍 === VOICE LANGUAGE DETECTION DEBUG ===');
          console.log('Transcription:', transcription);
          console.log('Detected language:', detectedLanguage);
          console.log('Selected language:', recordingLanguage);
          
          // Check if language is not German (for mic recordings in German mode)
          const isNotGerman = micRecordingBlob && recordingLanguage === 'german' && detectedLanguage !== 'german';
          
          // Store transcription for Analyse button on message
          // Analyse button will be shown on the message itself, not next to mic button
          if (micRecordingBlob && validationResult.isValid) {
            console.log('🎤 === STORING TRANSCRIPTION FOR MESSAGE ANALYSE BUTTON ===');
            console.log('✅ Valid transcription completed:', trimmedTranscription);
            console.log('✅ micRecordingBlob exists:', micRecordingBlob.size, 'bytes');
            console.log('✅ Transcript stored - Analyse button will appear on message');
            setMicRecordingTranscription(trimmedTranscription);
          }
          
          console.log('✅ Transcription displayed from Whisper API');
          
          // Check if we're in practice modal mode
          if (showLanguageMismatchModal && germanSuggestion) {
            // In practice modal - check if user said it correctly in German
            if (detectedLanguage === 'german') {
              // User said it in German - close modal and continue with conversation
              console.log('✅ === PRACTICE SUCCESSFUL - CLOSING MODAL ===');
              console.log('User said it in German, closing practice modal');
              setShowLanguageMismatchModal(false);
              setDetectedLanguage(null);
              setMismatchTranscription('');
              setMismatchMessageId('');
              setGermanSuggestion('');
              
              // Clear any loading states
              setIsTranscribing(false);
              
              // Check if this is voice correction (original message was German) or language mismatch (original was English)
              const isVoiceCorrection = mismatchTranscription && mismatchTranscription !== '🎤 Voice message';
              console.log('🎤 === CHECKING MODAL TYPE ===');
              console.log('Mismatch transcription:', mismatchTranscription);
              console.log('Is voice correction:', isVoiceCorrection);
              
              if (isVoiceCorrection) {
                // Voice correction - replace the original wrong message
                console.log('🎤 === VOICE CORRECTION - REPLACING ORIGINAL MESSAGE ===');
                console.log('🔍 === BEFORE REPLACING MESSAGE ===');
                console.log('Current chat messages count:', chatMessages.length);
                console.log('Current chat messages:', chatMessages.map(msg => ({ id: msg.id, content: msg.content, role: msg.role })));
                console.log('Original wrong message ID:', mismatchMessageId);
                
                // Update the original wrong message with the corrected content
                setChatMessages(prev => {
                  const updated = prev.map(msg => {
                    if (msg.id === mismatchMessageId) {
                      console.log('🔄 === REPLACING ORIGINAL MESSAGE ===');
                      console.log('Original content:', msg.content);
                      console.log('New corrected content:', transcription);
                      return {
                        ...msg,
                        content: transcription,
                        audioUrl: practiceAudioBlob ? URL.createObjectURL(practiceAudioBlob) : msg.audioUrl,
                        isTranscribing: false
                      };
                    }
                    return msg;
                  });
                  console.log('Updated chat messages count:', updated.length);
                  console.log('Updated chat messages:', updated.map(msg => ({ id: msg.id, content: msg.content, role: msg.role })));
                  return updated;
                });
                
                // Clear practice audio blob
                setPracticeAudioBlob(null);

                console.log('🧹 === CLEARING VOICE CORRECTION STATES ===');
                console.log('Message ID:', mismatchMessageId);

                const clearedUserAttempts = { ...userAttempts };
                delete clearedUserAttempts[mismatchMessageId];

                const clearedErrorMessages = { ...errorMessages };
                delete clearedErrorMessages[mismatchMessageId];

                const updatedAnalysisEntry = comprehensiveAnalysis[mismatchMessageId]
                  ? { ...comprehensiveAnalysis[mismatchMessageId], hasErrors: false }
                  : undefined;

                console.log('Cleared user attempts state:', clearedUserAttempts);
                console.log('Cleared error messages state:', clearedErrorMessages);
                console.log('Updated analysis entry:', updatedAnalysisEntry);

                setUserAttempts(clearedUserAttempts);
                setErrorMessages(clearedErrorMessages);
                setWaitingForCorrection(false);
                setActiveMessageId(prev => (prev === mismatchMessageId ? null : prev));

                if (updatedAnalysisEntry) {
                  setComprehensiveAnalysis(prev => ({
                    ...prev,
                    [mismatchMessageId]: updatedAnalysisEntry
                  }));
                }

                console.log('🔍 === CALLING SEND TRANSCRIPTION TO AI ===');
                console.log('Transcription:', transcription);
                console.log('Original message ID:', mismatchMessageId);

                // Send to AI with the original message ID (now corrected)
                await sendTranscriptionToAI(transcription, mismatchMessageId, false, updatedAnalysisEntry, {
                  waitingForCorrection: false,
                  errorMessages: clearedErrorMessages,
                  userAttempts: clearedUserAttempts
                });

                clearCheckingStatus(mismatchMessageId);

                console.log('🔍 === AFTER SEND TRANSCRIPTION TO AI ===');
                console.log('Chat messages after AI call:', chatMessages.length);
                return;
              } else {
                // Language mismatch - replace the old English message
                console.log('🌍 === LANGUAGE MISMATCH - REPLACING MESSAGE ===');
                
                // Debug: Log current state before replacement
                console.log('=== MESSAGE REPLACEMENT DEBUG ===');
                console.log('mismatchMessageId:', mismatchMessageId);
                console.log('transcription:', transcription);
                console.log('practiceAudioBlob:', practiceAudioBlob);
                console.log('Current chat messages before replacement:', chatMessages);
                
                // Replace the old English message with the new German message
                setChatMessages(prev => {
                console.log('=== MESSAGE REPLACEMENT DETAILED DEBUG ===');
                console.log('Previous messages count:', prev.length);
                console.log('Previous messages:', JSON.stringify(prev, null, 2));
                console.log('Looking for message ID:', mismatchMessageId);
                
                const updatedMessages = prev.map(msg => {
                  console.log('Checking message ID:', msg.id, 'vs target:', mismatchMessageId);
                  if (msg.id === mismatchMessageId) {
                    console.log('✅ FOUND MESSAGE TO REPLACE:', JSON.stringify(msg, null, 2));
                    console.log('Original content:', msg.content);
                    console.log('New transcription:', transcription);
                    console.log('Practice audio blob exists:', !!practiceAudioBlob);
                    
                    const newMessage: ChatMessage = {
                      ...msg,
                      content: transcription,
                      audioUrl: practiceAudioBlob ? URL.createObjectURL(practiceAudioBlob) : undefined,
                      isAudio: true,
                      isTranscribing: false,
                      role: 'user' as const,
                      timestamp: new Date().toISOString()
                    };
                    console.log('✅ NEW MESSAGE CREATED:', JSON.stringify(newMessage, null, 2));
                    console.log('New content field:', newMessage.content);
                    return newMessage;
                  }
                  console.log('❌ Message ID does not match, keeping original');
                  return msg;
                });
                console.log('✅ UPDATED MESSAGES AFTER REPLACEMENT:', JSON.stringify(updatedMessages, null, 2));
                return updatedMessages;
              });
              
              // Force a re-render by updating the state again
              setTimeout(() => {
                setChatMessages(current => {
                  console.log('=== FINAL STATE CHECK ===');
                  console.log('Final messages count:', current.length);
                  console.log('Final messages:', JSON.stringify(current, null, 2));
                  const targetMessage = current.find(msg => msg.id === mismatchMessageId);
                  if (targetMessage) {
                    console.log('✅ TARGET MESSAGE FOUND IN FINAL STATE:', JSON.stringify(targetMessage, null, 2));
                    console.log('Target message content:', targetMessage.content);
                  } else {
                    console.log('❌ TARGET MESSAGE NOT FOUND IN FINAL STATE');
                  }
                  return current;
                });
              }, 100);
              
              // Clear practice audio blob
              setPracticeAudioBlob(null);
              
              // Continue with normal German processing but don't override the message content
              console.log('🎤 === SENDING CORRECTED VOICE MESSAGE TO AI ===');
              console.log('Transcription:', transcription);
              console.log('Message ID:', messageId);
              console.log('Mismatch message ID:', mismatchMessageId);
              await sendTranscriptionToAI(transcription, messageId);

              // Ensure the message content stays as the transcription
              setTimeout(() => {
                setChatMessages(prev => prev.map(msg =>
                  msg.id === messageId
                    ? { ...msg, content: transcription }
                    : msg
                ));
              }, 500);

              clearCheckingStatus(messageId);
              return;
              }
            } else {
              // User still said it in English - keep modal open
              console.log('Practice failed - user still said it in English');
              setMismatchTranscription(transcription);
              return;
            }
          }
          
          // Show mismatch modal if there's a language difference OR if English words are detected
          const hasEnglishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by|this|that|these|those|what|where|when|why|how|hello|hi|how|are|you)\b/i.test(transcription);
          const isLanguageMismatch = detectedLanguage !== recordingLanguage;
          
          if (isLanguageMismatch || (recordingLanguage === 'german' && hasEnglishWords)) {
            console.log('🔍 === LANGUAGE MISMATCH DETECTED ===');
            console.log('Detected language:', detectedLanguage);
            console.log('Recording language:', recordingLanguage);
            console.log('Transcription:', transcription);
            
            // Show modal for ANY English sentence, regardless of length
            console.log('✅ === SHOWING LANGUAGE MISMATCH MODAL ===');
            console.log('Transcription:', transcription);
            
            // Language mismatch detected - show modal
            setDetectedLanguage(detectedLanguage);
            setMismatchTranscription(transcription);
            setMismatchMessageId(messageId);
            
            // Clear any previous German suggestion
            setGermanSuggestion('');
            console.log('Cleared German suggestion state');
            
            // Generate German suggestion for practice
            if (detectedLanguage === 'english') {
              console.log('English detected, generating German suggestion for:', transcription);

              // Use API as primary method - no fallback until API fails
              generateGermanSuggestion(transcription);

              // Set a timeout fallback in case API fails
              const timeoutId = setTimeout(() => {
                console.log('API timeout, using simple fallback');
                setGermanSuggestion('Entschuldigung, ich kann das nicht übersetzen.');
              }, 5000); // 5 second timeout

              // Store timeout ID to clear it if API succeeds
              (window as any).germanSuggestionTimeout = timeoutId;
            }

            console.log('🚀 Setting showLanguageMismatchModal to TRUE');
            setModalTriggerType('voice');
            setShowLanguageMismatchModal(true);

            setChatMessages(prev => prev.map(msg =>
              msg.id === messageId
                ? { ...msg, content: transcription, isTranscribing: false }
                : msg
            ));

            updateMessageStatus(messageId, 'mismatch');

            // Clear any loading states
            setIsTranscribing(false);
            console.log('🏁 === TRANSCRIBE AUDIO END (MODAL SHOWN) ===');
            return; // Don't proceed with AI processing
          } else {
            console.log('✅ === LANGUAGES MATCH - PROCEEDING WITH NORMAL PROCESSING ===');
            console.log('Detected language:', detectedLanguage, 'Recording language:', recordingLanguage);
            
            // Analyse button logic is already handled above in the main flow
            // No need to duplicate here - transcription is already displayed
          }
          
          // Message content has already been updated above with transcription or error message
          // No need to update again - skip to retry handling and processing
          
          // If this is a retry, clear previous error states for this message
          if (isRetry) {
            console.log('🔄 === CLEARING PREVIOUS ERROR STATES FOR RETRY ===');
            console.log('Message ID for retry:', messageId);
            console.log('Current error messages:', errorMessages);
            console.log('Current user attempts:', userAttempts);
            
            setErrorMessages(prev => {
              const newState = { ...prev };
              delete newState[messageId];
              console.log('Cleared error messages for:', messageId);
              console.log('Remaining error messages:', newState);
              return newState;
            });
            
            // Don't clear waitingForCorrection here - let the analysis determine if we still need to wait
            console.log('🔄 === KEEPING WAITING FOR CORRECTION STATE ===');
          }
          
          if (recordingLanguage === 'german') {
            console.log('🇩🇪 === PROCESSING GERMAN VOICE INPUT ===');
            console.log('Transcription:', transcription);
            console.log('Message ID:', messageId);
            
            // For German recordings, run comprehensive analysis and get result immediately
            const analysis = await runComprehensiveAnalysis(transcription, messageId, true);
            
            // Store the German voice message for pronunciation analysis
            const audioArrayBuffer = await audioBlob.arrayBuffer();
            const uint8Array = new Uint8Array(audioArrayBuffer);
            let binaryString = '';
            const chunkSize = 8192; // Process in 8KB chunks
            
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.slice(i, i + chunkSize);
              binaryString += String.fromCharCode.apply(null, Array.from(chunk));
            }
            
            const audioBase64 = btoa(binaryString);
            
            console.log('🎤 === STORING GERMAN VOICE MESSAGE FOR PRONUNCIATION ===');
            console.log('Message ID:', messageId);
            console.log('Transcription:', transcription);
            
            setLastGermanVoiceMessage({
              transcription: transcription,
              audioData: audioBase64,
              messageId: messageId
            });
            
            console.log('✅ === GERMAN VOICE MESSAGE STORED ===');
            console.log('lastGermanVoiceMessage should now have messageId:', messageId);
            
            console.log('🔍 === CHECKING FOR ERRORS AFTER ANALYSIS ===');
            console.log('Analysis result:', analysis);
            console.log('Has errors:', analysis && analysis.hasErrors);
            console.log('Error messages for this message:', errorMessages[messageId]);
            console.log('Waiting for correction:', waitingForCorrection);
            
          if (analysis && analysis.hasErrors) {
            // Don't send to AI if there are errors - focus on correction
            console.log('🚫 === VOICE MESSAGE HAS ERRORS - NOT SENDING TO AI ===');
            console.log('Focusing on error correction instead of AI response');
            updateMessageStatus(messageId, 'needs_correction');
            return;
          } else if (!analysis || analysis === null) {
            // Analysis failed - don't proceed with AI response
            console.log('🚫 === ANALYSIS FAILED - NOT SENDING TO AI ===');
            console.log('Analysis returned null or undefined, not proceeding with AI response');
            console.log('Analysis value:', analysis);
            console.log('Analysis type:', typeof analysis);
            
            // Instead of setting error status, try to get a fallback analysis
            console.log('🔄 === ATTEMPTING FALLBACK ANALYSIS FOR VOICE ===');
            const fallbackAnalysis = {
              hasErrors: false,
              errorTypes: {
                grammar: false,
                vocabulary: false,
                pronunciation: false
              },
              corrections: {
                grammar: null,
                vocabulary: [],
                pronunciation: null
              },
              suggestions: {
                grammar: null,
                vocabulary: null,
                pronunciation: null
              },
              wordsForPractice: [],
              message: transcription,
              timestamp: new Date().toISOString()
            };
            
            // Store the fallback analysis
            setComprehensiveAnalysis(prev => ({
              ...prev,
              [messageId]: fallbackAnalysis
            }));
            
            console.log('✅ === FALLBACK ANALYSIS STORED FOR VOICE - PROCEEDING TO AI ===');
            // Continue with AI response instead of showing error
            // updateMessageStatus(messageId, 'error'); // REMOVED - don't show error
            // return; // REMOVED - continue with AI response
          }
            
            console.log('✅ === NO ERRORS DETECTED - PROCEEDING TO AI ===');
            console.log('🔍 === PRE-STATE CLEARING DEBUG ===');
            console.log('Message ID:', messageId);
            console.log('Current waitingForCorrection:', waitingForCorrection);
            console.log('Current errorMessages:', errorMessages);
            console.log('Current userAttempts:', userAttempts);
            console.log('Current comprehensiveAnalysis:', comprehensiveAnalysis);
            
            // Send transcription to AI only if no errors
            // Clear retry states immediately before AI response
            console.log('🧹 === CLEARING RETRY STATES ===');
            
            // Clear states and get the updated values
            const clearedUserAttempts = { ...userAttempts };
            delete clearedUserAttempts[messageId];
            const clearedErrorMessages = { ...errorMessages };
            delete clearedErrorMessages[messageId];
            
            console.log('Clearing userAttempts for:', messageId);
            console.log('Before clearing:', userAttempts);
            console.log('After clearing:', clearedUserAttempts);
            console.log('Clearing errorMessages for:', messageId);
            console.log('Before clearing:', errorMessages);
            console.log('After clearing:', clearedErrorMessages);
            
            // Update the state
            setUserAttempts(clearedUserAttempts);
            setErrorMessages(clearedErrorMessages);
            setWaitingForCorrection(false);
            setActiveMessageId(prev => (prev === messageId ? null : prev));

            console.log('⏰ === CALLING AI RESPONSE WITH CLEARED STATE ===');
            // Call AI response directly with cleared state
            await sendTranscriptionToAI(transcription, messageId, false, analysis, {
              waitingForCorrection: false,
              errorMessages: clearedErrorMessages,
              userAttempts: clearedUserAttempts
            });

            clearCheckingStatus(messageId);
          } else {
            // For English recordings, translate to German and provide suggestions
            await translateEnglishToGerman(transcription, messageId);
          }
        } else if (data.response) {
          // Chat function fallback response
          const fallbackMessage = "🎤 Audio recorded (transcription not available)";
          
          // Update the audio message
          setChatMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: fallbackMessage, isTranscribing: false }
              : msg
          ));
          
          // Add AI response directly
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString()
          };
          setChatMessages(prev => [...prev, aiMessage]);
        }
      } else {
        const errorText = await response.text();
        console.error('Transcription failed:', response.status, errorText);
        
        let errorMessage = '❌ Transcription failed';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = `❌ ${errorData.error}`;
          }
        } catch (parseError) {
          // If we can't parse the error, use the status code
          errorMessage = `❌ Transcription failed (${response.status})`;
        }
        
        // Update message to show error with more details
        setChatMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: errorMessage, isTranscribing: false }
            : msg
        ));
        updateMessageStatus(messageId, 'error');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);

      // Only show error for actual API failures, not for transcription content
      const errorMessage = '❌ Transcription failed - please try again';
      
      // Update message with error
      setChatMessages(prev => {
        const updatedMessages = prev.map(msg => {
          if (msg.id === messageId) {
            console.log('❌ Updating message with error due to transcription API failure');
            return { 
              ...msg, 
              content: errorMessage, 
              isTranscribing: false 
            };
          }
          return msg;
        });
        return updatedMessages;
      });
      
      // Clear loading states
      setIsTranscribing(false);
      updateMessageStatus(messageId, 'error');
      
      // Don't disable Analyse button if we have audio blob - user can still analyze
      if (micRecordingBlob) {
        console.log('✅ Keeping Analyse button enabled despite transcription error');
        setShowMicAnalyzeButton(true);
      } else {
        setShowMicAnalyzeButton(false);
      }
      
      // Clear checking status
      if (messageId) {
        clearCheckingStatus(messageId);
      }
    } finally {
      console.log('🏁 === TRANSCRIBE AUDIO END ===');
      console.log('Final showLanguageMismatchModal state:', showLanguageMismatchModal);
      console.log('Final chat messages count:', chatMessages.length);
      console.log('Final isTranscribing state:', isTranscribing);
      console.log('Final micRecordingBlob exists:', !!micRecordingBlob);
      console.log('Final showMicAnalyzeButton:', showMicAnalyzeButton);
      
      // Ensure isTranscribing is always cleared
      setIsTranscribing(false);
      
      // Clear checking status if still checking
      if (messageId && messageStatus[messageId] === 'checking') {
        console.log('Clearing stuck checking status for message:', messageId);
        clearCheckingStatus(messageId);
      }
    }
  };

  // Translate English to German and provide suggestions
  const translateEnglishToGerman = async (englishText: string, messageId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: englishText,
          sourceLanguage: 'en',
          targetLanguage: 'de',
          context: 'conversation'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const germanTranslation = data.translation;
        
        // Create a helpful AI response with the translation and suggestions
        const aiResponse: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `Ah, du möchtest sagen: "${germanTranslation}"\n\nHier sind ein paar Möglichkeiten, wie du das ausdrücken kannst:\n\n• **Formell:** "${germanTranslation}"\n• **Umgangssprachlich:** "${data.casual || germanTranslation}"\n• **Natürlicher:** "${data.natural || germanTranslation}"\n\nVersuche es nochmal auf Deutsch! 🎯`,
          timestamp: new Date().toISOString()
        };
        
        console.log('🔍 === ADDING AI RESPONSE TO CHAT ===');
        console.log('AI response:', aiResponse);
        console.log('Chat messages before adding AI response:', chatMessages.length);
        setChatMessages(prev => {
          const updated = [...prev, aiResponse];
          console.log('Chat messages after adding AI response:', updated.length);
          console.log('Updated chat messages:', updated.map(msg => ({ id: msg.id, content: msg.content, role: msg.role })));
          return updated;
        });

        updateMessageStatus(messageId, 'needs_correction');
      } else {
        // Fallback: Use chat function for translation
        await sendTranscriptionToAI(`Translate this to German and provide suggestions: "${englishText}"`, messageId, true);
      }
    } catch (error) {
      console.error('Error translating English to German:', error);
      // Fallback: Use chat function for translation
      await sendTranscriptionToAI(`Translate this to German and provide suggestions: "${englishText}"`, messageId, true);
    }
  };

  // Handle voice message retry
  const handleVoiceRetry = async (messageId: string) => {
    const message = chatMessages.find(msg => msg.id === messageId);
    if (!message || !message.audioUrl) return;

    console.log('🔄 === VOICE RETRY START ===');
    console.log('Message ID:', messageId);
    console.log('Current user attempts:', userAttempts[messageId] || 0);

    // Start recording again for retry
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        console.log('🔄 === PROCESSING VOICE RETRY ===');
        console.log('Audio blob size:', audioBlob.size);
        
        // Update the existing message to show retry attempt
        setChatMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: '🎤 Recording retry...', isTranscribing: true }
            : msg
        ));
        
        // Process the retry audio with the same message ID
        await transcribeAudio(audioBlob, messageId, true);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting retry recording:', error);
      alert('Microphone access denied. Please allow microphone access to retry voice input.');
    }
  };

  const sendTranscriptionToAI = async (transcription: string, messageId: string, isEnglishTranslation: boolean = false, analysisData?: any, clearedState?: {
    waitingForCorrection: boolean;
    errorMessages: { [key: string]: string };
    userAttempts: { [key: string]: number };
  }) => {
    if (!selectedConversation) return;

    console.log('🎤 === SEND TRANSCRIPTION TO AI DEBUG ===');
    console.log('Transcription:', transcription);
    console.log('Message ID:', messageId);
    console.log('Is English Translation:', isEnglishTranslation);
    console.log('🔍 === CHAT MESSAGES BEFORE AI PROCESSING ===');
    console.log('Current chat messages count:', chatMessages.length);
    console.log('Current chat messages:', chatMessages.map(msg => ({ id: msg.id, content: msg.content, role: msg.role })));
    console.log('🔍 === CURRENT STATE VALUES ===');
    console.log('waitingForCorrection:', waitingForCorrection);
    console.log('errorMessages:', errorMessages);
    console.log('userAttempts:', userAttempts);
    console.log('comprehensiveAnalysis:', comprehensiveAnalysis);
    console.log('Comprehensive analysis for this message:', comprehensiveAnalysis[messageId]);
    console.log('Analysis data passed directly:', analysisData);
    console.log('Cleared state passed:', clearedState);
    console.log('🔍 === STATE OBJECTS DETAILS ===');
    console.log('errorMessages keys:', Object.keys(errorMessages));
    console.log('userAttempts keys:', Object.keys(userAttempts));
    console.log('comprehensiveAnalysis keys:', Object.keys(comprehensiveAnalysis));
    
    // Check if we should wait for correction before sending to AI
    const analysis = analysisData || comprehensiveAnalysis[messageId];
    const hasErrors = analysis && analysis.hasErrors;
    
    // Use cleared state if provided, otherwise use current state
    const currentWaitingForCorrection = clearedState ? clearedState.waitingForCorrection : waitingForCorrection;
    const currentErrorMessages = clearedState ? clearedState.errorMessages : errorMessages;
    const currentUserAttempts = clearedState ? clearedState.userAttempts : userAttempts;
    
    const hasErrorMessages = currentErrorMessages[messageId];
    
    console.log('Has errors from analysis:', hasErrors);
    console.log('Has error messages:', !!hasErrorMessages);
    console.log('Error messages content:', currentErrorMessages);
    console.log('User attempts content:', currentUserAttempts);
    console.log('Using cleared state:', !!clearedState);
    console.log('Current waitingForCorrection:', currentWaitingForCorrection);
    
    if (hasErrors || hasErrorMessages || currentWaitingForCorrection) {
      console.log('🚫 === BLOCKING AI RESPONSE - ERRORS DETECTED ===');
      console.log('Not sending to AI because errors need to be corrected first');
      console.log('Blocking reasons:');
      console.log('- hasErrors:', hasErrors);
      console.log('- hasErrorMessages:', !!hasErrorMessages);
      console.log('- waitingForCorrection:', currentWaitingForCorrection);
      setIsSending(false);
      setIsTyping(false);
      return;
    }

    console.log('✅ === PROCEEDING WITH AI RESPONSE ===');
    clearCheckingStatus(messageId);
    
    // Enhance conversation context with voice transcription
    if (selectedConversation && transcription) {
      await enhanceConversationContext(selectedConversation, transcription);
    }
    
    setIsSending(true);
    setIsTyping(true);

    try {
      const systemInstruction = isEnglishTranslation 
        ? `${contextLevel === 'Professional' ? 'Sie sind' : 'Du bist'} ein hilfreicher Deutschlehrer. Wenn der Nutzer etwas auf Englisch sagt, übersetze es ins Deutsche und gib hilfreiche Vorschläge, wie man es natürlich ausdrücken kann. Sei ermutigend und gib verschiedene Ausdrucksmöglichkeiten (formell, umgangssprachlich, natürlich).`
        : `${contextLevel === 'Professional' ? 'Sie sind' : 'Du bist'} ein freundlicher Gesprächspartner. Antworte kurz und natürlich (1-2 Sätze). Stelle viele Fragen. Sei neugierig und interessiert. Lass den Nutzer viel sprechen. ${contextLevel === 'Professional' ? 'Verwende "Sie" und höfliche Ausdrücke.' : 'Verwende "Du" und umgangssprachliche Ausdrücke.'}`;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...chatMessages.filter(msg => !msg.isAudio).map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: transcription
            }
          ],
          conversationId: selectedConversation,
          contextLevel,
          difficultyLevel,
          systemInstruction: systemInstruction,
          userProfile: onboardingData,
          conversationContext: transcription
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        };
        
        console.log('🔍 === ADDING MAIN AI RESPONSE TO CHAT ===');
        console.log('Assistant message:', assistantMessage);
        console.log('Chat messages before adding assistant message:', chatMessages.length);
        setChatMessages(prev => {
          const updated = [...prev, assistantMessage];
          console.log('Chat messages after adding assistant message:', updated.length);
          console.log('Updated chat messages:', updated.map(msg => ({ id: msg.id, content: msg.content, role: msg.role })));
          return updated;
        });
        setCurrentAIMessage(data.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const startNewConversation = (conversationId: string) => {
    // Clear the last German voice message when starting new conversation
    setLastGermanVoiceMessage(null);
    
    // Reset all states first
    resetConversationState();
    
    // Find the conversation to get its context and difficulty levels
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setContextLevel(conversation.context_level);
      setDifficultyLevel(conversation.difficulty_level);
      setCurrentConversationContextLocked(conversation.context_locked);
      setCurrentConversationDifficultyLocked(conversation.difficulty_locked);
    }
    
    // Start new conversation
    setSelectedConversation(conversationId);
    setChatMessages([{
      id: '1',
      role: 'assistant',
      content: 'Worüber möchten Sie heute sprechen?',
      timestamp: new Date().toISOString()
    }]);
    
    // Show toolbar but start collapsed
    setShowToolbar(true);
    setToolbarCollapsed(true);
    // Don't collapse sidebar when starting new conversation - let user control it
    // setSidebarCollapsed(false);
  };

  // Helper function to reset all conversation states (used by both end and new conversation)
  const resetAllConversationStates = () => {
    // Reset conversation states
    setSelectedConversation(null);
    setChatMessages([]);
    setCurrentAIMessage('');
    setActiveMessageId(null);
    
    // Reset context and difficulty states
    setContextLevel('Professional');
    setCurrentConversationContextLocked(false);
    setCurrentConversationDifficultyLocked(false);
    setDifficultyLevel('Intermediate');
    
    // Reset toolbar states
    setShowToolbar(false);
    setToolbarCollapsed(true);
    setToolbarActiveTab('explain');
    setToolbarOpenedViaHelp(false);
    setActiveHelpButton(null);
    
    // Reset error and correction states
    setErrorMessages({});
    setUserAttempts({});
    setMessageAttempts({});
    setShowOriginalMessage({});
    setOriginalMessages({});
    setWaitingForCorrection(false);
    setSuggestedAnswers({});
    setMessageStatus({});
    
    // Reset translation and suggestion states
    setShowTranslation({});
    setShowSuggestions({});
    setTranslatedMessages({});
    setSuggestedResponses({});
    setShowSuggestionTranslation({});
    
    // Reset vocabulary states (conversation-specific)
    setPersistentVocab([]);
    setShowVocabSelector(false);
    setExtractedVocab([]);
    setSelectedWords(new Set());
    setWordMeanings({});
    setLoadingMeanings(new Set());
    setVocabAdditionTracker(new Set());
    setPendingVocabItems(new Set());
    setNewVocabItems([]);
    
    // Reset comprehensive analysis
    setComprehensiveAnalysis({});
    
    // Reset pronunciation-related states
    setPhoneticBreakdowns({});
    setShowPronunciationBreakdown({});
    
    // Reset recording states
    setShowLanguageMenu(false);
    setShowLanguageMismatchModal(false);
    setDetectedLanguage(null);
    setMismatchTranscription('');
    setMismatchMessageId('');
    setGermanSuggestion('');
    setPracticeAudioBlob(null);
    setLastGermanVoiceMessage(null);
    setRecordingLanguage('german');
    setRecordingDuration(0);
    
    // Reset UI states
    setSidebarCollapsed(false);
    setCurrentView('dashboard');
    
    // Reset session data for new conversation
    resetSessionData();
    console.log('📊 Session data reset for new conversation');
  };

  // End conversation - shows summary modal
  const endConversation = () => {
    // Generate and show summary before resetting
    console.log('📊 Generating conversation summary with session data:', sessionDataRef.current);
    const summary = generateConversationSummary(sessionDataRef.current);
    console.log('📊 Generated summary:', summary);
    setConversationSummary(summary);
    setShowSummaryModal(true);
    console.log('📊 Conversation summary generated and modal shown');
    
    // Increment conversations completed and update streaks
    const streakUpdate = updateStreakOnActivity();
    console.log('🔥 Streak updated on conversation end:', streakUpdate);

    setPlayerStats(prev => ({
      ...prev,
      conversationsCompleted: prev.conversationsCompleted + 1,
      currentStreak: streakUpdate.current,
      longestStreak: streakUpdate.longest,
      streak: streakUpdate.current
    }));
    console.log('🎯 Conversations completed incremented');
    
    // Reset all states
    resetAllConversationStates();
  };

  // Start new conversation - does NOT show summary modal
  const resetConversationState = () => {
    console.log('🆕 Starting new conversation without summary');
    
    // Just reset all states without showing summary
    resetAllConversationStates();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    // Ensure all array fields are properly initialized (same as existing users)
    const normalizedData: OnboardingData = {
      ...data,
      goals: Array.isArray(data.goals) ? data.goals : [],
      personalityTraits: Array.isArray(data.personalityTraits) ? data.personalityTraits : [],
      conversationTopics: Array.isArray(data.conversationTopics) ? data.conversationTopics : [],
      germanLevel: data.germanLevel || 'beginner', // Default to beginner if not set
      // Keep backward compatibility fields
      motivations: Array.isArray(data.motivations) ? data.motivations : [],
      hobbies: Array.isArray(data.hobbies) ? data.hobbies : [],
      speakingFears: Array.isArray(data.speakingFears) ? data.speakingFears : [],
    };
    
    setOnboardingData(normalizedData);
    setShowOnboarding(false);
    setIsNewUser(false);
    setCurrentProfilePicture(normalizedData.profilePictureUrl || null);
    localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(normalizedData));
    
    // Set context level based on focus group
    if (normalizedData.focusGroup === 'travelers') {
      setContextLevel('Casual');
    } else if (normalizedData.focusGroup === 'business') {
      setContextLevel('Professional');
    }
    
    // 🎮 Give XP for completing onboarding
    addExperience(50, 'onboarding_complete');
    addAchievement('onboarding_complete', '🚀 Getting Started', 'Completed your profile setup!');
    
    // Show hints after onboarding achievement modal closes (if not already dismissed)
    // Achievement modal auto-closes after 3000ms, so wait 4000ms to ensure it's fully closed and animations finished
    setTimeout(() => {
      if (!hintsDismissed) {
        setShowHints(true);
      }
    }, 4000);
  };

  const handleProfilePictureUpdate = (newUrl: string | null) => {
    setCurrentProfilePicture(newUrl);
    if (onboardingData) {
      const updatedData = {
        ...onboardingData,
        profilePictureUrl: newUrl || undefined
      };
      setOnboardingData(updatedData);
      localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(updatedData));
    }
  };

  const handleRestartOnboarding = () => {
    setShowOnboarding(true);
  };

  // Hints handlers
  const handleDismissHints = async () => {
    setShowHints(false);
    setHintsDismissed(true);
    
    // Save to database
    try {
      await supabase
        .from('user_onboarding')
        .update({ hints_dismissed: true })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving hints dismissal:', error);
    }
  };

  const handleSkipAllHints = async () => {
    setShowHints(false);
    setShowChatHints(false);
    setHintsDismissed(true);
    
    // Save to database
    try {
      await supabase
        .from('user_onboarding')
        .update({ hints_dismissed: true })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving hints dismissal:', error);
    }
  };

  const handleShowHints = () => {
    setShowHints(true);
    setShowChatHints(false);
  };

  const handleDismissChatHints = () => {
    setShowChatHints(false);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting conversation:', error);
        return;
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If this was the selected conversation, clear it
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setChatMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const firstName = user.user_metadata?.first_name || 'User';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-text500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow 
        user={user} 
        onComplete={handleOnboardingComplete}
        existingData={onboardingData}
        isEditing={!isNewUser}
      />
    );
  }

  const conversationCategories = [
    'Professional',
    'Medical',
    'Travel',
    'Shopping',
    'Social',
    'Academic'
  ];

  const contextLevels = ['Professional', 'Casual'];
  const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced'];

  const filteredConversations = conversations.filter(conv =>
    (conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     conv.preview.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedCategory === null || conv.context_level === selectedCategory)
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {(mobileSidebarOpen && !sidebarCollapsed) && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Elingo Purple Theme - Wider for Conversations */}
      <div className={`
        ${sidebarCollapsed ? 'w-16' : 'w-[380px]'} 
        ${mobileSidebarOpen ? 'fixed left-0 z-50 lg:relative lg:z-auto' : 'hidden lg:flex'}
        border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden shadow-sm
        h-screen
      `} style={{ backgroundColor: '#faf9ff' }}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 relative" style={{ backgroundColor: '#faf9ff' }}>
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <Volume2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-text font-display tracking-tight">TalkBuddy</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {sidebarCollapsed && (
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <Volume2 className="h-6 w-6 text-white" />
                </div>
              )}
              {!sidebarCollapsed && (
                <>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {currentProfilePicture ? (
                      <img src={currentProfilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </button>
                  <button
                    onClick={handleShowHints}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
                    title="Show Hints"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRestartOnboarding}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
                    title="Collapse sidebar"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* New Conversation Button - Elingo Purple */}
          {!sidebarCollapsed && (
            <button 
              onClick={resetConversationState}
              className="w-full btn-glossy flex items-center justify-center space-x-2 mb-4"
            >
              <Plus className="h-5 w-5" />
              <span>New Conversation</span>
            </button>
          )}
          {sidebarCollapsed && (
            <button 
              onClick={() => {
                resetConversationState();
                // Don't change sidebar state - preserve user preference
              }}
              className="w-full btn-glossy p-3 flex items-center justify-center mb-4 rounded-full"
              title="New Conversation"
            >
              <Plus className="h-6 w-6 text-white font-bold flex-shrink-0" strokeWidth={3} />
            </button>
          )}

          {/* 🎮 GAMIFICATION COMPONENTS - Collapsible for More Space */}
          {!sidebarCollapsed && (
            <div className="mb-3">
              {/* Collapsible Header */}
              <button
                onClick={() => setStatsExpanded(!statsExpanded)}
                className="w-full flex items-center justify-between p-2 hover:bg-primary/5 rounded-xl transition-all duration-200 mb-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-base">🎮</span>
                  </div>
                  <span className="text-xs font-bold text-text font-display">Level {playerStats.level}</span>
                  <span className="text-xs text-primary font-semibold">{playerStats.totalPoints} XP</span>
                  <span className="text-xs text-accent font-bold">🔥 {playerStats.currentStreak}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${statsExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Collapsible Content */}
              {statsExpanded && (
                <div className="space-y-2 mb-3">
                  {/* Compact Stats - Horizontal */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg p-2.5 text-center border border-primary/40 shadow-sm">
                      <div className="text-lg font-bold text-primary font-display">{playerStats.conversationsCompleted}</div>
                      <div className="text-[10px] text-gray-700 font-body">Conversations</div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 text-center border border-primary/40 shadow-sm">
                      <div className="text-lg font-bold text-primary font-display">{playerStats.wordsLearned}</div>
                      <div className="text-[10px] text-gray-700 font-body">Words Learned</div>
                    </div>
                  </div>

                  {/* Compact Experience Bar */}
                  <div className="bg-white rounded-lg p-2.5 border border-primary/40 shadow-sm">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary to-accent rounded-full h-1.5 transition-all duration-500"
                        style={{ width: `${(playerStats.experience % 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-gray-700 font-body">
                      {100 - (playerStats.experience % 100)} XP to next level
                    </div>
                  </div>

                  {/* Compact Achievements */}
                  {recentAchievements.length > 0 && (
                    <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
                      <div className="text-[10px] font-bold text-text mb-1 font-display">🏆 Achievements</div>
                      <div className="space-y-0.5">
                        {recentAchievements.slice(0, 2).map((achievement, index) => (
                          <div key={index} className="text-[10px] text-primary font-semibold font-body flex items-center space-x-1">
                            <span className="text-accent">✨</span>
                            <span className="truncate">Achievement!</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation Links - Elingo Purple Theme - Compact */}
          {!sidebarCollapsed && (
            <div className="flex space-x-1.5">
              <button
                onClick={() => setCurrentView('progress')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                  currentView === 'progress'
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 border border-primary'
                    : 'text-gray-600 hover:text-primary hover:bg-primary/10 border border-primary/40'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Progress</span>
              </button>
              <button
                onClick={() => setShowPodcastsModal(true)}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                  showPodcastsModal
                    ? 'bg-primary/10 text-primary border border-primary'
                    : 'text-gray-600 hover:text-primary hover:bg-primary/10 border border-primary/40'
                }`}
                title="Podcasts"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Podcasts</span>
              </button>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={() => setCurrentView('progress')}
                className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
                  currentView === 'progress'
                    ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                    : 'text-gray-600 hover:text-primary hover:bg-primary/10'
                }`}
                title="Progress"
              >
                <BarChart3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowPodcastsModal(true)}
                className="p-3 rounded-xl transition-all duration-200 text-gray-600 hover:text-primary hover:bg-primary/10 flex items-center justify-center"
                title="Podcasts"
              >
                <BookOpen className="h-5 w-5" />
              </button>
              <div className="mt-8">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-3 rounded-xl transition-all duration-200 text-gray-600 hover:text-primary hover:bg-primary/10 flex items-center justify-center"
                  title="Expand Sidebar"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search and Conversations Section - For Hint Targeting */}
        {!sidebarCollapsed && (
          <div data-hint-target="conversation-sidebar" className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Search - Elingo Purple Theme - Compact */}
            <div className="px-4 py-3 border-b border-gray-200" style={{ backgroundColor: '#faf9ff' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-primary/40 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-body placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Recent Conversations - Elingo Purple Theme - Maximized Space */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0" style={{ backgroundColor: '#faf9ff' }}>
              <div className="px-4 py-2.5 border-b border-gray-100" style={{ backgroundColor: '#faf9ff' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-text font-display uppercase tracking-wide">Conversations</h3>
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="flex items-center space-x-1 text-[10px] text-gray-600 hover:text-primary font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 border border-gray-200 transition-all duration-200"
                    >
                      <span className="truncate max-w-[80px]">{selectedCategory || 'All'}</span>
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 z-10 py-2">
                        <button
                          onClick={() => {
                            setSelectedCategory(null);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-primary/10 transition-colors rounded-lg mx-1 ${
                            selectedCategory === null ? 'text-primary font-bold bg-primary/10' : 'text-gray-700'
                          }`}
                        >
                          All Categories
                        </button>
                        {conversationCategories.map((category) => (
                          <button
                            key={category}
                            onClick={() => {
                              setSelectedCategory(selectedCategory === category ? null : category);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs hover:bg-primary/10 transition-colors rounded-lg mx-1 ${
                              selectedCategory === category ? 'text-primary font-bold bg-primary/10' : 'text-gray-700'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-gray-100">
                {conversationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                ) : filteredConversations.length > 0 ? (
                  <div className="space-y-1.5">
                    {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredConversation(conversation.id)}
                    onMouseLeave={() => setHoveredConversation(null)}
                  >
                    <button
                      onClick={() => {
                        startNewConversation(conversation.id);
                        setMobileSidebarOpen(false); // Close mobile sidebar when selecting
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 ${
                        selectedConversation === conversation.id
                          ? 'bg-primary/10 border-2 border-primary shadow-sm'
                          : 'hover:bg-primary/5 border border-transparent hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-0.5">
                        <h4 className={`text-xs font-bold truncate font-display flex-1 ${
                          selectedConversation === conversation.id ? 'text-primary' : 'text-text'
                        }`}>
                          {conversation.title}
                        </h4>
                      </div>
                      <p className={`text-[10px] truncate mb-0.5 font-body leading-tight ${
                        selectedConversation === conversation.id ? 'text-primary/70' : 'text-gray-600'
                      }`}>{conversation.preview}</p>
                      <p className="text-[10px] text-gray-600 font-body">{formatTime(conversation.updated_at)}</p>
                    </button>
                    
                    {/* Delete button - appears on hover */}
                    {hoveredConversation === conversation.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl opacity-90 hover:opacity-100 transition-all duration-200 shadow-lg"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                    ))}
                  </div>
                ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <MessageCircle className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2 font-display">No Conversations Yet</h3>
                <p className="text-sm text-text-muted font-body">
                  {selectedCategory 
                    ? `No ${selectedCategory.toLowerCase()} conversations yet`
                    : 'Start your first conversation to begin learning!'
                  }
                </p>
              </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings - Elingo Purple Theme */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <h3 className="text-sm font-bold text-text mb-3 font-display">Settings</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-3 flex-1 text-left p-3">
                {currentProfilePicture ? (
                  <img src={currentProfilePicture} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border-2 border-gray-200">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold text-text font-display">{firstName}</p>
                  <p className="text-xs text-gray-600 font-body">Profile Settings</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vocabulary Builder Panel - Conditionally Rendered */}
      {showVocabBuilder && (
        <VocabularyBuilderModal
          isOpen={showVocabBuilder}
          onClose={() => setShowVocabBuilder(false)}
          myVocabWords={Array.from(new Set(JSON.parse(localStorage.getItem('myVocab') || '[]')))}
          persistentVocab={persistentVocab}
          onPlayAudio={(word) => {
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(word);
              utterance.lang = 'de-DE';
              const voices = window.speechSynthesis.getVoices();
              const germanVoice = voices.find(voice => voice.lang === 'de-DE' || voice.lang.startsWith('de'));
              if (germanVoice) {
                utterance.voice = germanVoice;
              }
              window.speechSynthesis.speak(utterance);
            }
          }}
          onUpdatePersistentVocab={(newVocab) => {
            setPersistentVocab(newVocab);
          }}
          onTestComplete={(results) => {
    updateSessionData(prev => {
      const updatedTests = [...prev.vocabularyTests, results];
      const updatedWordsFromTests = (prev.wordsLearnedFromTests || 0) + (results.correctWords || 0);
      localStorage.setItem('wordsLearnedTotal', String(updatedWordsFromTests));
      return {
        ...prev,
        vocabularyTests: updatedTests,
        wordsLearnedFromTests: updatedWordsFromTests
      };
    });
            if (results.correctWords) {
              triggerWordLearned(results.correctWords);
            }
            console.log('📊 Session data updated: test results added');
          }}
        />
      )}

      {/* Podcasts Panel */}
      {showPodcastsModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            style={{ marginLeft: sidebarCollapsed ? '64px' : '380px', width: `calc(100% - ${sidebarCollapsed ? 64 : 380}px)` }}
            onClick={() => setShowPodcastsModal(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50"
            style={{ width: `calc(100% - ${sidebarCollapsed ? 64 : 380}px)` }}
          >
            <PodcastsPanel onClose={() => setShowPodcastsModal(false)} />
          </div>
        </>
      )}

      {/* Main Content - Hidden when vocab builder is open - Elingo Purple Theme */}
      {!showVocabBuilder && (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #faf9ff 0%, #f5f5f5 100%)' }}>
          {selectedConversation ? (
          // Conversation View
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* German Partner Display - Elingo Purple Theme */}
            <div className="border-b border-gray-200 px-4 py-4 lg:pl-4 pl-16 shadow-sm relative" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-30 p-2.5 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 transition-all duration-200"
                title="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Desktop Sidebar Toggle - Show when collapsed - Vertically Centered to Avoid Overlap */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="hidden lg:flex fixed left-2 z-30 p-2.5 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 transition-all duration-200"
                  style={{ top: '50%', transform: 'translateY(-50%)', marginTop: 0 }}
                  title="Expand sidebar"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {germanPartnerName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h3 className="font-bold text-text font-display text-lg">{germanPartnerName}</h3>
                      {/* Context Indicator Badge - Elingo Purple */}
                      {selectedConversation && (
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold ${
                          contextLevel === 'Professional' 
                            ? 'bg-primary/20 text-primary border border-primary/30' 
                            : 'bg-accent/20 text-accent border border-accent/30'
                        }`}>
                          <span className="mr-1">
                            {contextLevel === 'Professional' ? '💼' : '😊'}
                          </span>
                          {contextLevel}
                          {currentConversationContextLocked && (
                            <span className="ml-1">🔒</span>
                          )}
                        </div>
                      )}
                      {/* Difficulty Level Badge - Elingo Purple */}
                      {selectedConversation && (
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold ${
                          difficultyLevel === 'Beginner' 
                            ? 'bg-accent/20 text-accent border border-accent/30' 
                            : difficultyLevel === 'Intermediate'
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-primary/30 text-primary border border-primary/40'
                        }`}>
                          <span className="mr-1">
                            {difficultyLevel === 'Beginner' ? '🌱' : difficultyLevel === 'Intermediate' ? '📚' : '🎯'}
                          </span>
                          {difficultyLevel}
                          {currentConversationDifficultyLocked && (
                            <span className="ml-1">🔒</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-primary font-semibold">Online</span>
                      </div>
                      <span className="text-xs text-text-muted">•</span>
                      <span className="text-xs text-text-muted font-body">Last seen {lastSeenTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-text-muted font-body">German Language Partner</p>
                    <p className="text-xs text-primary font-semibold">Native Speaker</p>
                  </div>
                  <button 
                    onClick={endConversation}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    End
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation Messages - Elingo Purple Theme */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-gray-100" style={{ backgroundColor: '#faf9ff' }}>
              {chatMessages.map((message) => {
                // Debug logging for grammar help button
                if (message.role === 'user') {
                  console.log('Message ID:', message.id, 'Content:', message.content);
                  console.log('Comprehensive analysis:', comprehensiveAnalysis[message.id]);
                  console.log('Has errors:', comprehensiveAnalysis[message.id]?.hasErrors);
                }
                return (
                  <div key={message.id}>
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {/* Mistake Detection Button - Outside chat bubble for user messages */}
                    {message.role === 'user' && (comprehensiveAnalysis[message.id]?.hasErrors || errorMessages[message.id]) && (
                      <div className="flex items-center mr-2 z-10">
                        <button
                          onClick={() => handleErrorCorrection(message.id)}
                          className={`group relative p-2.5 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer ${
                            activeHelpButton === message.id 
                              ? 'bg-primary hover:bg-primary/90' 
                              : 'bg-red-500 hover:bg-red-600'
                          } text-white`}
                          title="Click to understand the mistake and get grammar help"
                        >
                          <svg className="h-4 w-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {/* Tooltip */}
                          <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-primary text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg">
                            Click to understand the mistake
                          </div>
                        </button>
                      </div>
                    )}
                    
                    <div className={`max-w-sm lg:max-w-lg px-4 py-3 rounded-2xl shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-white rounded-tr-md'
                        : 'bg-white border border-gray-200 rounded-tl-md'
                    }`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                              <Bot className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-primary font-display">{germanPartnerName}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={async () => await speakText(message.content)}
                              className="p-1.5 hover:bg-primary/10 rounded-lg transition-all duration-200"
                              title="Listen"
                              data-hint-target="listen-button"
                            >
                              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.846 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.846l3.537-3.816a1 1 0 011.617.816zM16 8a2 2 0 11-4 0 2 2 0 014 0zM14 8a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => toggleTranslation(message.id)}
                              className={`p-1.5 rounded-lg transition-all duration-200 text-xs font-bold ${
                                showTranslation[message.id] ? 'text-white bg-primary' : 'text-primary hover:bg-primary/10'
                              }`}
                              title="Translate"
                              data-hint-target="translation-toggle"
                            >
                              EN
                            </button>
                            <button
                              onClick={() => toggleSuggestions(message.id)}
                              className="p-1.5 hover:bg-primary/10 rounded-lg transition-all duration-200"
                              title="Suggest responses"
                              data-hint-target="suggested-answers"
                            >
                              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleHelpClick(message.content, message.id)}
                              className={`p-1.5 rounded-lg transition-all duration-200 ${
                                activeHelpButton === message.id 
                                  ? 'bg-primary text-white' 
                                  : 'hover:bg-primary/10 text-primary'
                              }`}
                              title="Get Grammar Help"
                            >
                              <BookOpen className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className={`text-sm font-body leading-relaxed ${
                        message.role === 'user' 
                          ? 'text-white' 
                          : 'text-text'
                      }`}>
                        {message.isAudio ? (
                          <div>
                            <div className="mb-2">
                              <span>{message.content}</span>
                              {message.isTranscribing && (
                                <Loader2 className="h-4 w-4 animate-spin inline-block ml-2" />
                              )}
                            </div>
                            {/* Play and Analyse buttons at bottom */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-opacity-20 border-white">
                              {/* Play button on left */}
                              <button 
                                onClick={async () => {
                                  if (message.audioUrl) {
                                    try {
                                      console.log('▶️ Playing audio from URL:', message.audioUrl);
                                      const audio = new Audio(message.audioUrl);
                                      audio.onerror = (e) => {
                                        console.error('❌ Audio playback error:', e);
                                        alert('Error playing audio. The recording may have expired.');
                                      };
                                      await audio.play();
                                      console.log('✅ Audio playback started successfully');
                                    } catch (error) {
                                      console.error('❌ Error playing audio:', error);
                                      alert('Error playing audio. Please try again.');
                                    }
                                  } else {
                                    console.warn('⚠️ No audioUrl available for message:', message.id);
                                  }
                                }}
                                disabled={!message.audioUrl}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors ${
                                  !message.audioUrl
                                    ? 'bg-white bg-opacity-10 text-white opacity-50 cursor-not-allowed'
                                    : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white'
                                }`}
                                title="Play recording"
                              >
                                <Play className="h-4 w-4" />
                                <span className="text-xs">Play</span>
                              </button>
                              {/* Analyse button on right - only show when transcript is ready */}
                              {!message.isTranscribing && 
                               message.content !== '🎤 Recording...' && 
                               message.content !== '🎤 Voice message' && 
                               message.content.trim().length > 0 &&
                               /[a-zA-ZäöüÄÖÜß]/.test(message.content) && 
                               micRecordingBlob && (
                                <button
                                  onClick={() => handleMessageAnalyse(message.id)}
                                  className="flex items-center space-x-1 px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                                  title="Analyze pronunciation"
                                >
                                  <Target className="h-4 w-4" />
                                  <span className="text-xs">Analyse</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>

                      {/* Pronunciation Badge for German Voice Messages (keep for other use cases) */}
                      {message.role === 'user' && message.isAudio && lastGermanVoiceMessage && lastGermanVoiceMessage.messageId === message.id && !message.isTranscribing && message.content === '🎤 Voice message' && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => {
                              setToolbarActiveTab('pronunciation');
                              setToolbarCollapsed(false);
                              setShowToolbar(true);
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-primary-100 hover:bg-primary-200 text-text700 rounded-full text-xs font-medium transition-colors"
                            title="Analyze pronunciation"
                          >
                            <Volume2 className="h-3 w-3" />
                            <span>Analyze</span>
                          </button>
                        </div>
                      )}

                  </div>
                </div>

                {message.role === 'user' && messageStatus[message.id] === 'checking' && (
                  <div className="flex justify-end mt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Checking your message...</span>
                    </div>
                  </div>
                )}

                {message.role === 'user' && messageStatus[message.id] === 'needs_correction' && (
                  <div className="flex justify-end mt-2">
                    <div className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg text-xs font-medium">
                      Let's fix this before moving on.
                    </div>
                  </div>
                )}

                {message.role === 'user' && messageStatus[message.id] === 'error' && (
                  <div className="flex justify-end mt-2">
                    <div className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-medium">
                      We couldn't check this message. Please try again.
                    </div>
                  </div>
                )}

                  {/* Error indicators for user messages - Below chat bubble */}
                  {message.role === 'user' && comprehensiveAnalysis[message.id] && comprehensiveAnalysis[message.id].hasErrors && (
                    <div className="flex justify-end mt-2">
                      <div className="flex items-center space-x-2">
                        {userAttempts[message.id] < 2 && (
                          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-xs font-medium">
                            Attempts: {userAttempts[message.id]}/2
                          </div>
                        )}

                        {userAttempts[message.id] >= 2 && comprehensiveAnalysis[message.id]?.hasErrors && (
                          <div className="text-xs text-red-500 font-medium">
                            Max attempts reached
                          </div>
                        )}
                        
                      </div>
                    </div>
                  )}
                  
                  {/* Suggested Answer - Match bot suggestions style */}
                  {message.role === 'user' && userAttempts[message.id] >= 2 && suggestedAnswers[message.id] && (
                    <div className="flex justify-end mt-2">
                      <div className="max-w-sm lg:max-w-lg space-y-1">
                        <div className="text-xs font-medium text-gray-600 mb-1">Suggested answer:</div>
                        <button
                          onClick={() => handleSuggestedAnswerClick(message.id, suggestedAnswers[message.id])}
                          className="block w-full text-left bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-lg text-xs text-gray-700 transition-colors"
                        >
                          <div className="font-medium">{suggestedAnswers[message.id]}</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Motivation animation for wrong answers - Hide when max attempts reached */}
                  {message.role === 'user' && comprehensiveAnalysis[message.id] && comprehensiveAnalysis[message.id].hasErrors && userAttempts[message.id] < 2 && (
                    <div className="flex justify-end mt-2">
                      <div className="bg-background-light border border-gray-200 rounded-lg p-3 max-w-sm">
                        <div className="flex items-center space-x-2">
                          <div className="animate-bounce">
                            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-sm text-red-700">
                            <div className="font-medium">Don't give up!</div>
                            <div className="text-xs">You're learning - every mistake is progress! 💪</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Translation */}
                  {message.role === 'assistant' && showTranslation[message.id] && translatedMessages[message.id] && (
                    <div className="ml-4 mt-2 max-w-sm lg:max-w-lg">
                      <div className="bg-gray-100 px-3 py-2 rounded-lg text-xs text-gray-700">
                        <span className="font-medium">Translation: </span>
                        {translatedMessages[message.id]}
                      </div>
                      <button
                        onClick={() => extractVocabularyFromText(message.content)}
                        className="mt-2 text-xs text-text600 hover:text-text800 hover:underline transition-colors"
                      >
                        📚 Add words to vocab
                      </button>
                    </div>
                  )}
                  
                  {/* Suggested Responses */}
                  {message.role === 'assistant' && showSuggestions[message.id] && (
                    <div className="ml-4 mt-2 max-w-sm lg:max-w-lg space-y-1">
                      <div className="text-xs font-medium text-gray-600 mb-1">Suggested responses:</div>
                      {(() => {
                        const suggestionKey = getSuggestionKey(selectedConversation, message.id);
                        const suggestionsForMessage = suggestedResponses[suggestionKey];
                        return suggestionsForMessage ? (
                        suggestionsForMessage.map((suggestion, index) => {
                          const responseId = `${message.id}-${index}`;
                          const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.german;
                          const suggestionTranslation = typeof suggestion === 'string' 
                            ? translatedMessages[message.id] || '' 
                            : suggestion.english;
                          
                          return (
                            <SuggestedResponseCard
                              key={responseId}
                              response={suggestionText}
                              translation={suggestionTranslation}
                              responseId={responseId}
                              onPractice={handlePracticeResponse}
                              onStop={handleStopPracticeResponse}
                              isRecording={responseRecordingState[responseId] || false}
                              isAnalyzing={responseAnalyzingState[responseId] || false}
                              showAnalyze={responseShowAnalyze[responseId] || false}
                              hasBeenAnalyzed={responseHasBeenAnalyzed[responseId] || false}
                              onAnalyze={handleAnalyzeResponse}
                            />
                          );
                        })) : (
                        <div className="text-xs text-gray-500 italic">Loading suggestions...</div>
                      );
                      })()}
                    </div>
                  )}
                  
                  {/* Try it again button for contextual help */}
                  {message.role === 'assistant' && message.showTryAgain && (
                    <div className="ml-4 mt-2 max-w-sm lg:max-w-lg">
                      <button
                        onClick={() => {
                          // Focus on the input field to encourage user to try again
                          const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                          if (inputElement) {
                            inputElement.focus();
                          }
                        }}
                        className="text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <span>🎯</span>
                        <span>Try it again in German!</span>
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 max-w-sm lg:max-w-lg shadow-sm" style={{ backgroundColor: '#ffffff' }}>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-bold text-primary font-display">{germanPartnerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-text-muted font-body">{germanPartnerName} ist typing</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input - Elingo Purple Theme */}
            <div className="border-t border-gray-200 p-4 lg:p-6 shadow-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  {/* Intent quick replies (only when provided) */}
                  {suggestedReplies.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {suggestedReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setMessageInput(reply);
                            setSuggestedReplies([]);
                            setSkipIntentOnce(true);
                            sendMessage();
                          }}
                          className="btn-glossy px-3 py-1 rounded-full text-xs"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Type your message in German..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 font-body placeholder:text-gray-400"
                  />
                  {isRecording && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <div className="flex items-center space-x-1.5 bg-red-50 px-2.5 py-1 rounded-xl border border-red-200">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-bold text-red-600">{recordingDuration}s</span>
                        {recordingDuration >= 25 && (
                          <span className="text-orange-500">⚠️</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons - Elingo Purple Theme */}
                <div className="flex items-center space-x-2">
                  {/* Send Button */}
                  <button 
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || isSending}
                    className="btn-glossy p-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    title="Send message"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Send className="h-5 w-5 text-white" />
                    )}
                  </button>
                  
                  {/* Record Button - Elingo Purple Theme */}
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className={`p-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-accent hover:bg-accent/90 text-white'
                    } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isRecording ? "Stop recording" : "Start recording"}
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            </div>
            
            {/* Right Sidebar - Collapsible Toolbar - White & Subtle */}
            <div className={`${toolbarCollapsed ? 'w-12' : 'w-[600px] lg:w-[700px]'} border-l border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out shadow-sm bg-white`}>
              {/* Toolbar Header - Elingo Purple Theme */}
              {!toolbarCollapsed && (
                <div className="p-4 border-b border-primary/20 flex-shrink-0 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                        <BookOpen className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-text font-display block">Learning Tools</span>
                        <span className="text-xs text-text-muted font-body">Vocabulary • Grammar • Pronunciation</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setToolbarCollapsed(!toolbarCollapsed);
                      }}
                      className="p-2 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
                      title="Collapse toolbar"
                    >
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 -rotate-90" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Toolbar Content */}
              {!toolbarCollapsed ? (
                <div className="flex-1 overflow-y-auto bg-white">
                  <Toolbar
                    isVisible={true}
                    currentMessage={currentAIMessage}
                    currentMessageId={activeHelpButton || undefined}
                    onAddToVocab={handleAddToVocab}
                    autoLoadExplanations={toolbarOpenedViaHelp}
                    comprehensiveAnalysis={activeHelpButton ? comprehensiveAnalysis[activeHelpButton] : null}
                    activeTab={toolbarActiveTab}
                    onTabChange={setToolbarActiveTab}
                    newVocabItems={newVocabItems}
                    persistentVocab={persistentVocab}
                    lastGermanVoiceMessage={lastGermanVoiceMessage}
                    phoneticBreakdowns={phoneticBreakdowns}
                    onPlayWordAudio={playWordAudio}
                    globalPlaybackSpeed={globalPlaybackSpeed}
                    onSpeedChange={setGlobalPlaybackSpeed}
                    onAddExperience={addExperience}
                    onWordLearned={(word?: string) => {
                      setPlayerStats(prev => ({
                        ...prev,
                        wordsLearned: prev.wordsLearned + 1
                      }));
                      console.log('🎯 Words learned incremented from Dashboard');
                      
                      // Track deleted word as learned in session data
                      if (word) {
        updateSessionData(prev => ({
          ...prev,
          wordsDeleted: [...prev.wordsDeleted, word]
        }));
                        console.log('📊 Session data updated: word added to wordsDeleted');
                      }
                    }}
                    onPronunciationComplete={handlePronunciationComplete}
                    pendingPronunciationAnalysis={pendingPronunciationAnalysis}
                    onUpdatePersistentVocab={(newVocab) => {
                      console.log('📚 === DASHBOARD ONUPDATE PERSISTENT VOCAB CALLED ===');
                      console.log('New vocab received:', newVocab);
                      console.log('New vocab count:', newVocab.length);
                      console.log('New vocab items:');
                      newVocab.forEach((item, index) => {
                        console.log(`New item ${index}:`, {
                          word: item.word,
                          meaning: item.meaning,
                          context: item.context
                        });
                      });
                      console.log('Current persistent vocab before update:', persistentVocab.length);
                      setPersistentVocab(newVocab);
                      console.log('📚 === PERSISTENT VOCAB UPDATED ===');
                    }}
                    onOpenVocabularyBuilder={() => setShowVocabBuilder(true)}
                  />
                </div>
              ) : (
                /* Collapsed State - Interactive Arrow Only */
                <div className="flex-1 flex items-center justify-center bg-white">
                  <button
                    onClick={() => {
                      setToolbarCollapsed(false);
                      // Auto-analyze grammar when expanding toolbar
                      if (currentAIMessage) {
                        console.log('Auto-analyzing grammar for:', currentAIMessage);
                        // The comprehensive analysis should already be available
                        // Just make sure the toolbar shows the analysis
                      }
                    }}
                    className="p-2 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200 group"
                    title="Click to expand Learning Tools"
                  >
                    <ChevronDown className="h-5 w-5 rotate-90 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'progress' ? (
          // 🎮 GAMIFIED PROGRESS VIEW
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-display text-gradient-primary mb-2">
                  🎯 Your German Progress
                </h1>
                <p className="text-xl text-text600 font-body">
                  Level up your German skills with achievements and rewards!
                </p>
              </div>

              {/* 🎮 GAMIFIED STATS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Level Card */}
                <div className="bg-background-light border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-text-muted font-body">Level</h3>
                    <span className="text-2xl">🎮</span>
                  </div>
                  <p className="text-3xl font-bold text-text font-display">{playerStats.level}</p>
                  <div className="text-xs text-text-muted mt-1 font-body">
                    {playerStats.experienceToNext} XP to next level
                  </div>
                </div>
                
                {/* Experience Card */}
                <div className="bg-background-light border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-muted font-display">Total XP</h3>
                    <span className="text-xl">⭐</span>
                  </div>
                  <p className="text-2xl font-display text-text font-bold">{playerStats.totalPoints}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-text h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(playerStats.experience % 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Streak Card */}
                <div className="bg-background-light border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-muted font-display">Streak</h3>
                    <span className="text-xl">🔥</span>
                  </div>
                  <p className="text-2xl font-display text-text font-bold">{playerStats.currentStreak}</p>
                  <div className="text-xs text-text-muted mt-1 font-body">
                    Best: {playerStats.longestStreak} days
                  </div>
                  <div className="mt-2 space-y-1">
                    {streakDataRef.current.weeklyStreakEarned ? (
                      <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <span>✅</span> Weekly streak achieved
                      </div>
                    ) : (
                      <div className="text-[11px] text-text-muted">
                        {Math.max(0, 7 - playerStats.currentStreak)} days to weekly streak
                      </div>
                    )}
                    {streakDataRef.current.monthlyStreakEarned ? (
                      <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                        <span>🌙</span> Monthly streak secured
                      </div>
                    ) : (
                      <div className="text-[11px] text-text-muted">
                        {Math.max(
                          0,
                          (streakDataRef.current.monthDaysTarget || getDaysInMonth(new Date())) - playerStats.currentStreak
                        )} days to monthly streak
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Conversations Card */}
                <div className="bg-background-light border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-text-muted font-display">Conversations</h3>
                    <MessageCircle className="h-5 w-5 text-text" />
                  </div>
                  <p className="text-2xl font-display text-text font-bold">{playerStats.conversationsCompleted}</p>
                  <div className="text-xs text-text-muted mt-1 font-body">
                    {playerStats.wordsLearned} words learned
                  </div>
                </div>
              </div>

              {/* 🏆 ACHIEVEMENTS SECTION */}
              <div className="apple-card rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold apple-text-primary mb-4 flex items-center">
                  🏆 Achievements ({playerStats.achievements.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Achievement Cards */}
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🎉</span>
                      <div className="text-xs opacity-90">Unlocked</div>
                    </div>
                    <div className="text-sm font-medium">First Conversation</div>
                    <div className="text-xs opacity-90">Completed your first German conversation!</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">💬</span>
                      <div className="text-xs opacity-90">Unlocked</div>
                    </div>
                    <div className="text-sm font-medium">Conversation Master</div>
                    <div className="text-xs opacity-90">Completed 10 conversations!</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">📚</span>
                      <div className="text-xs opacity-90">Unlocked</div>
                    </div>
                    <div className="text-sm font-medium">Vocabulary Builder</div>
                    <div className="text-xs opacity-90">Learned 50 words!</div>
                  </div>
                  
                  {/* Locked Achievements */}
                  <div className="bg-gray-100 rounded-lg p-4 text-gray-400">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🔒</span>
                      <div className="text-xs">Locked</div>
                    </div>
                    <div className="text-sm font-medium">Conversation Expert</div>
                    <div className="text-xs">Complete 50 conversations</div>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-4 text-gray-400">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🔒</span>
                      <div className="text-xs">Locked</div>
                    </div>
                    <div className="text-sm font-medium">Word Wizard</div>
                    <div className="text-xs">Learn 200 words</div>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-4 text-gray-400">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🔒</span>
                      <div className="text-xs">Locked</div>
                    </div>
                    <div className="text-sm font-medium">Month Master</div>
                    <div className="text-xs">30-day practice streak</div>
                  </div>
                </div>
              </div>

              {/* Recent Practice Sessions */}
              <div className="apple-card rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold apple-text-primary mb-4">Recent Practice Sessions</h2>
                {conversations.length > 0 ? (
                  <div className="space-y-4 h-96 overflow-y-auto pr-2 conversation-scroll">
                    {conversations.slice(0, 5).map((conversation) => (
                      <div key={conversation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium apple-text-primary">{conversation.title}</h3>
                          <p className="text-sm apple-text-secondary truncate">{conversation.preview}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatTime(conversation.updated_at)}</p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => setSelectedConversation(conversation.id)}
                            className="px-3 py-1 text-sm bg-primary-100 text-text700 rounded-full hover:bg-primary-200 transition-colors"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => {
                              setConversationInput(conversation.preview);
                              startNewConversation(conversation.id);
                              setCurrentView('dashboard');
                            }}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                          >
                            Re-practice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="apple-text-secondary">No practice sessions yet. Start a conversation to see your progress!</p>
                  </div>
                )}
              </div>

              {/* Practice Goals */}
              <div className="apple-card rounded-xl p-6">
                <h2 className="text-xl font-semibold apple-text-primary mb-4">Practice Goals</h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium apple-text-primary">Weekly Goal</span>
                      <span className="text-sm apple-text-secondary">
                        {conversations.filter(conv => {
                          const weekAgo = new Date();
                          weekAgo.setDate(weekAgo.getDate() - 7);
                          return new Date(conv.created_at) > weekAgo;
                        }).length} / 5 conversations
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(100, (conversations.filter(conv => {
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return new Date(conv.created_at) > weekAgo;
                          }).length / 5) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium apple-text-primary">Daily Streak</span>
                      <span className="text-sm apple-text-secondary">3 / 7 days</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: '43%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'vocab' ? (
          // Vocab List View - Elingo Purple Theme
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto bg-white" style={{ backgroundColor: '#f5f5f5' }}>
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <BookOpen className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-text font-display mb-3">Vocabulary List</h2>
              <p className="text-lg text-text-muted font-body">Your saved words and phrases will appear here</p>
            </div>
          </div>
        ) : (
          // Welcome Screen - Elingo Purple Theme with Animated Background
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto relative" style={{ backgroundColor: '#f5f5f5' }}>
            {/* Animated Background - Fun & Engaging for Professional Learners */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Animated Grid Pattern */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `
                  linear-gradient(rgba(105, 73, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(105, 73, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
                animation: 'grid-move 20s linear infinite'
              }}></div>
              
              {/* Dynamic Floating Geometric Shapes */}
              <div className="absolute top-20 left-20 w-16 h-16 bg-primary/30 rounded-2xl rotate-45 animate-bounce-slow shadow-lg"></div>
              <div className="absolute top-40 right-32 w-12 h-12 bg-accent/35 rounded-full animate-bounce-medium shadow-lg" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-32 left-32 w-20 h-20 bg-primary/25 rounded-lg rotate-12 animate-bounce-slow shadow-lg" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-24 right-24 w-14 h-14 bg-accent/30 rounded-3xl rotate-45 animate-bounce-medium shadow-lg" style={{ animationDelay: '1.5s' }}></div>
              <div className="absolute top-1/3 left-1/4 w-18 h-18 bg-primary/28 rounded-xl rotate-6 animate-bounce-medium shadow-lg" style={{ animationDelay: '2s' }}></div>
              
              {/* Animated Particles/Dots */}
              <div className="absolute top-32 left-1/3 w-3 h-3 bg-primary rounded-full animate-particle-float shadow-md" style={{ animationDelay: '0s' }}></div>
              <div className="absolute top-48 right-1/4 w-2 h-2 bg-accent rounded-full animate-particle-float shadow-md" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-40 left-1/2 w-3 h-3 bg-primary rounded-full animate-particle-float shadow-md" style={{ animationDelay: '2s' }}></div>
              <div className="absolute top-2/3 right-1/3 w-2.5 h-2.5 bg-accent rounded-full animate-particle-float shadow-md" style={{ animationDelay: '1.5s' }}></div>
              <div className="absolute bottom-1/3 left-1/5 w-2 h-2 bg-primary rounded-full animate-particle-float shadow-md" style={{ animationDelay: '0.5s' }}></div>
              
              {/* Large Gradient Orbs with More Energy */}
              <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/25 via-primary/15 to-transparent rounded-full blur-3xl animate-orb-drift"></div>
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-accent/25 via-accent/15 to-transparent rounded-full blur-3xl animate-orb-drift" style={{ animationDelay: '2s' }}></div>
              
              {/* Pulsing Energy Rings */}
              <div className="absolute top-1/2 left-1/2 w-64 h-64 border-2 border-primary/20 rounded-full animate-ring-pulse" style={{ transform: 'translate(-50%, -50%)' }}></div>
              <div className="absolute top-1/2 left-1/2 w-80 h-80 border-2 border-accent/15 rounded-full animate-ring-pulse" style={{ transform: 'translate(-50%, -50%)', animationDelay: '1s' }}></div>
              
              {/* Floating Connection Lines */}
              <svg className="absolute inset-0 w-full h-full opacity-10">
                <path d="M 100 200 Q 300 100 500 250" stroke="url(#gradient1)" strokeWidth="2" fill="none" className="animate-draw-line" />
                <path d="M 800 300 Q 600 200 400 350" stroke="url(#gradient2)" strokeWidth="2" fill="none" className="animate-draw-line" style={{ animationDelay: '1s' }} />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(105, 73, 255, 0.3)" />
                    <stop offset="100%" stopColor="rgba(255, 193, 7, 0.3)" />
                  </linearGradient>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255, 193, 7, 0.3)" />
                    <stop offset="100%" stopColor="rgba(105, 73, 255, 0.3)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="max-w-2xl w-full relative z-10">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-display text-text font-bold mb-3">
                  Hello {firstName}! 👋
                </h1>
                <p className="text-lg text-gray-600 font-body">
                  What would you like to practice in German today?
                </p>
              </div>

              {/* Enhanced Conversation Input - Elingo Purple Theme */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative backdrop-blur-sm bg-white/95">
                {/* Text Input */}
                <div className="mb-6">
                  <textarea
                    placeholder="My left knee is injured and I want to visit a doctor."
                    value={conversationInput}
                    onChange={(e) => setConversationInput(e.target.value)}
                    data-hint-target="text-input"
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl text-base resize-none focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 transition-all duration-200 font-body placeholder:text-gray-400"
                    rows={4}
                  />
                </div>

                {/* Context and Difficulty Selectors */}
                <div className="flex space-x-4 mb-6">
                  {/* Context Level */}
                  <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-text800 mb-2 font-heading">Context</label>
                    <button
                      onClick={() => !currentConversationContextLocked && setShowContextDropdown(!showContextDropdown)}
                      disabled={currentConversationContextLocked}
                      data-hint-target="context-switcher"
                      className={`w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-left flex items-center justify-between shadow-sm transition-all duration-200 ${
                        currentConversationContextLocked 
                          ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                          : 'bg-white hover:shadow-md hover:border-primary/30'
                      }`}
                    >
                      <span className="text-sm font-semibold text-text800 font-heading flex items-center">
                        {contextLevel}
                        {currentConversationContextLocked && (
                          <span className="ml-2 text-xs">🔒</span>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 ${currentConversationContextLocked ? 'text-gray-300' : 'text-gray-400'}`} />
                    </button>
                    {showContextDropdown && !currentConversationContextLocked && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white to-slate-50 border border-gray-200 rounded-lg shadow-lg z-10">
                        {contextLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setContextLevel(level);
                              setShowContextDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 first:rounded-t-lg last:rounded-b-lg text-text800 font-body transition-all duration-200"
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Difficulty Level */}
                  <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-text800 mb-2 font-heading">Level</label>
                    <button
                      onClick={() => !currentConversationDifficultyLocked && setShowDifficultyDropdown(!showDifficultyDropdown)}
                      disabled={currentConversationDifficultyLocked}
                      className={`w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-left flex items-center justify-between bg-white shadow-sm transition-all duration-200 ${
                        currentConversationDifficultyLocked 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:shadow-md hover:border-primary/30'
                      }`}
                    >
                      <span className="text-sm font-semibold text-text800 font-heading">{difficultyLevel}</span>
                      {currentConversationDifficultyLocked ? (
                        <Lock className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {showDifficultyDropdown && !currentConversationDifficultyLocked && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white to-slate-50 border border-gray-200 rounded-lg shadow-lg z-10">
                        {difficultyLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setDifficultyLevel(level);
                              setShowDifficultyDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 first:rounded-t-lg last:rounded-b-lg text-text800 font-body transition-all duration-200"
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div></div>
                  
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={isModalRecording ? stopModalRecording : () => startModalRecording(true)}
                      disabled={isTranscribing}
                      title={isModalRecording ? "Stop recording" : "Start recording"}
                      data-hint-target="voice-input"
                      className={`p-3 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl ${
                        isModalRecording 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-accent hover:bg-accent/90 text-white'
                      } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isTranscribing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isModalRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                    <button 
                      onClick={createNewConversation}
                      disabled={!conversationInput.trim()}
                      className="btn-glossy px-8 py-3 rounded-2xl flex items-center space-x-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Play className="h-4 w-4" />
                      <span>Start Conversation</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      <ProfilePictureModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        currentPictureUrl={currentProfilePicture}
        onPictureUpdate={handleProfilePictureUpdate}
      />


      {/* Vocabulary Selector Modal */}
      {showVocabSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select Words to Add</h3>
              <p className="text-gray-600 text-sm">Click on the words you want to add to your vocabulary</p>
            </div>
            
            {/* Sentence with clickable words */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Original sentence:</p>
                <div className="text-lg text-gray-900 leading-relaxed">
                  {extractedVocab[0]?.word && extractedVocab[0].word.split(' ').map((word, index) => {
                    const cleanWord = word.replace(/[.,!?;:]/g, '');
                    const isSelected = selectedWords.has(cleanWord);
                    
                    return (
                      <span key={index}>
                        <button
                          onClick={() => toggleWordSelection(cleanWord)}
                          className={`inline-block px-2 py-1 mx-1 my-1 rounded-lg transition-all duration-200 ${
                            isSelected 
                              ? 'bg-primary-500 text-white shadow-md' 
                              : 'bg-white text-gray-700 hover:bg-primary-100 border border-gray-200'
                          }`}
                        >
                          {cleanWord}
                        </button>
                        {word.match(/[.,!?;:]/) && <span className="text-gray-700">{word.match(/[.,!?;:]/)?.[0]}</span>}
                        {index < extractedVocab[0].word.split(' ').length - 1 && ' '}
                      </span>
                    );
                  })}
                </div>
              </div>
              
              {/* Selected words */}
              {selectedWords.size > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 text-sm">Selected words:</h4>
                  {Array.from(selectedWords).map((word, index) => (
                    <div key={index} className="flex items-center justify-between bg-primary-50 rounded-lg p-3">
                      <div className="flex-1">
                        <span className="font-semibold text-text900">{word}</span>
                        <span className="text-text600 ml-2 text-sm">Meanings will be generated in vocab tab</span>
                      </div>
                      <button
                        onClick={() => toggleWordSelection(word)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelVocabSelection}
                className="flex-1 py-3 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={addSelectedVocab}
                disabled={selectedWords.size === 0}
                className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                Add {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Mismatch Modal */}
      {showLanguageMismatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 max-w-sm mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Practice in German</h3>
              <p className="text-gray-600 text-sm mb-4">
                {modalTriggerType === 'text' ? 'Try writing this in German:' : 'Try saying this in German:'}
              </p>
            </div>
            
            {/* German Suggestion */}
            <div className="mb-6">
              <div className="bg-primary-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900 mb-4">
                    {germanSuggestion || 'Loading...'}
                  </div>
                  <button
                    onClick={async () => {
                      if (germanSuggestion) {
                        await speakText(germanSuggestion);
                      } else {
                        console.log('No German suggestion available to speak');
                      }
                    }}
                    disabled={!germanSuggestion}
                    className={`px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto ${
                      germanSuggestion 
                        ? 'bg-primary-500 hover:bg-primary-600 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    <span>Listen</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Practice Input */}
            <div className="space-y-4">
              {/* Text Input - Only show for text-triggered modals */}
              {modalTriggerType === 'text' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Type your German response:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleModalTextSubmit();
                        }
                      }}
                      placeholder="Type in German..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleModalTextSubmit}
                      disabled={!modalInput.trim()}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        modalInput.trim()
                          ? 'bg-primary-500 hover:bg-primary-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Recording - Only show for voice-triggered modals */}
              {modalTriggerType === 'voice' && (
                <div className="text-center">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className={`p-4 rounded-full transition-colors ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </button>
                  <div className="mt-2 text-sm text-gray-600">
                    {isRecording ? 'Recording...' : isTranscribing ? 'Processing...' : 'Click to practice'}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                console.log('⏭️ === SKIP BUTTON CLICKED - CLOSING MODAL ===');
                setShowLanguageMismatchModal(false);
                setDetectedLanguage(null);
                setMismatchTranscription('');
                setMismatchMessageId('');
                setGermanSuggestion('');
                setModalInput('');
                setModalTriggerType(null);
                setPracticeAudioBlob(null);
                setIsTranscribing(false);
                setIsModalRecording(false);
                if (modalRecorder) {
                  modalRecorder.stop();
                  setModalRecorder(null);
                }
              }}
              className="w-full mt-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* 🎮 GAMIFICATION MODALS */}
      
      {/* Level Up Modal */}
      {showLevelUp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-bounce">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Level Up!</h2>
            <p className="text-gray-600 mb-4">You've reached Level {playerStats.level}!</p>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-4 mb-4">
              <div className="text-sm opacity-90">New Level</div>
              <div className="text-3xl font-bold">{playerStats.level}</div>
            </div>
            <button
              onClick={() => setShowLevelUp(false)}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Achievement Modal - Purple Theme */}
      {showAchievement && achievementData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-8 max-w-md w-full text-center shadow-figma-hero">
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-2xl font-bold text-text mb-2">Achievement Unlocked!</h2>
            <p className="text-text-muted mb-6">You've earned a new achievement!</p>
            <div className="bg-gradient-to-r from-primary via-primary/90 to-accent text-white rounded-2xl p-6 mb-6 shadow-lg">
              <div className="text-sm opacity-90 mb-2">Achievement</div>
              <div className="text-2xl font-bold mb-2">{achievementData.title}</div>
              <div className="text-sm opacity-90">{achievementData.description}</div>
            </div>
            <button
              onClick={() => {
                setShowAchievement(null);
                setAchievementData(null);
              }}
              className="btn-glossy w-full"
            >
              Amazing!
            </button>
          </div>
        </div>
      )}

      {/* Conversation Summary Modal */}
      {showSummaryModal && conversationSummary && (
        <ConversationSummaryModal
          isOpen={showSummaryModal}
          onClose={() => {
            setShowSummaryModal(false);
            setConversationSummary(null);
          }}
          summary={conversationSummary}
        />
      )}

      {/* Onboarding Hints - Dashboard */}
      {showHints && (
        <OnboardingHints
          isVisible={showHints}
          onDismiss={handleDismissHints}
          onSkipAll={handleSkipAllHints}
          hints={dashboardHints}
          startIndex={0}
        />
      )}

      {/* Onboarding Hints - Chat Bubbles */}
      {showChatHints && selectedConversation && (
        <OnboardingHints
          isVisible={showChatHints}
          onDismiss={handleDismissChatHints}
          onSkipAll={handleSkipAllHints}
          hints={chatBubbleHints}
          startIndex={0}
        />
      )}
    </div>
  );
}