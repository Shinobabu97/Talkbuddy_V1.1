import React, { useState, useRef, useEffect } from 'react';
import { germanTTS } from '../lib/tts';
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
  Send,
  Play,
  BookOpen,
  BarChart3,
  MessageCircle,
  Volume2,
  Target,
  Bot,
  Trash2,
  X,
} from 'lucide-react';
import { supabase, AuthUser } from '../lib/supabase';
import OnboardingFlow from './OnboardingFlow';
import ProfilePictureModal from './ProfilePictureModal';
import Toolbar from './Toolbar';

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
  motivations: string[];
  customMotivation?: string;
  hobbies: string[];
  customHobbies: string[];
  hasWork: boolean;
  workDomain?: string;
  germanLevel: string;
  speakingFears: string[];
  customFears: string[];
  timeline: string;
  goals: string[];
  personalityTraits: string[];
  secretDetails?: string;
  conversationTopics: string[];
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  context_level: string;
  difficulty_level: string;
  context_locked: boolean;
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

  // 🎮 GAMIFICATION STATE
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

  const [showLevelUp, setShowLevelUp] = React.useState(false);
  const [showAchievement, setShowAchievement] = React.useState<string | null>(null);
  const [recentAchievements, setRecentAchievements] = React.useState<string[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [contextLevel, setContextLevel] = useState('Professional');
  const [difficultyLevel, setDifficultyLevel] = useState('Intermediate');
  const [currentConversationContextLocked, setCurrentConversationContextLocked] = useState(false);
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
    
    return () => {
      console.log('🛑 === DASHBOARD COMPONENT UNMOUNTING ===');
      console.log('Final messageInput:', messageInput);
      console.log('Final waitingForCorrection:', waitingForCorrection);
      console.log('Final userAttempts:', userAttempts);
      console.log('Final errorMessages:', errorMessages);
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
  const [suggestedResponses, setSuggestedResponses] = useState<{[key: string]: string[]}>({});
  const [showTranslation, setShowTranslation] = useState<{[key: string]: boolean}>({});
  const [showSuggestions, setShowSuggestions] = useState<{[key: string]: boolean}>({});
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [currentAIMessage, setCurrentAIMessage] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        
        setOnboardingData(data);
        setIsNewUser(false);
        setShowOnboarding(false);
      } else {
        const hasCompletedOnboarding = localStorage.getItem(`onboarding_${user.id}`);
        if (hasCompletedOnboarding) {
          setIsNewUser(false);
          setOnboardingData(JSON.parse(hasCompletedOnboarding));
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
    if (!conversationInput.trim()) return;

    try {
      // Create the conversation in database
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: conversationInput.slice(0, 50) + (conversationInput.length > 50 ? '...' : ''),
          preview: conversationInput.slice(0, 100),
          context_level: contextLevel,
          difficulty_level: difficultyLevel,
          context_locked: false
        })
        .select()
        .single();

      if (error) throw error;

      // Add to conversations list and start immediately
      setConversations(prev => [data, ...prev]);
      
      // Start the conversation with user's input as first message
      startConversationWithUserMessage(data.id, conversationInput.trim());
      
      // Clear input
      setConversationInput('');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const startConversationWithUserMessage = (conversationId: string, userMessage: string) => {
    setSelectedConversation(conversationId);
    
    // Set initial messages
    setChatMessages([]);
    
    // Immediately send the user's message to get AI response
    sendInitialMessage(conversationId, userMessage);
  };

  const sendInitialMessage = async (conversationId: string, userMessage: string) => {
    setIsSending(true);
    setIsTyping(true);
    
    // Reset retry states for new conversation
    setWaitingForCorrection(false);
    setUserAttempts({});
    setErrorMessages({});
    setMessageAttempts({});
    setShowOriginalMessage({});
    setOriginalMessages({});
    setSuggestedAnswers({});

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
            content: `${contextLevel === 'Professional' ? 'Ich möchte dieses Szenario üben' : 'Ich möchte dieses Szenario üben'}: ${userMessage}. ${contextLevel === 'Professional' ? 'Beginnen Sie das Gespräch sofort mit der ersten Frage auf Deutsch. Verwenden Sie keine einleitenden Phrasen wie "Natürlich, gerne!" oder "Gerne!" - stellen Sie einfach die erste Frage direkt. WICHTIG: Antworten Sie NUR auf Deutsch. Verwenden Sie "Sie" statt "Du" für eine professionelle Atmosphäre.' : 'Beginn das Gespräch sofort mit der ersten Frage auf Deutsch. Verwende keine einleitenden Phrasen wie "Natürlich, gerne!" oder "Gerne!" - stell einfach die erste Frage direkt. WICHTIG: Antworte NUR auf Deutsch. Verwende "Du" statt "Sie" für eine lockere Atmosphäre.'}`
          }],
          conversationId,
          contextLevel,
          difficultyLevel,
          userProfile: onboardingData ? {
            germanLevel: onboardingData.germanLevel,
            goals: onboardingData.goals,
            personalityTraits: onboardingData.personalityTraits,
            conversationTopics: onboardingData.conversationTopics
          } : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      console.log('AI Response:', data.message);
      
      const assistantMessage: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Lock the context for this conversation
      await supabase
        .from('conversations')
        .update({ context_locked: true })
        .eq('id', conversationId);
      
      // Update local state
      setCurrentConversationContextLocked(true);
      
      // Update current message but don't show toolbar automatically
      setCurrentAIMessage(data.message);

    } catch (error) {
      console.error('Error sending initial message:', error);
      const errorMessage: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: 'Entschuldigung, ich hatte ein technisches Problem. Können Sie das bitte wiederholen? (Sorry, I had a technical issue. Could you please repeat that?)',
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const generateTranslationAndSuggestions = async (messageId: string, germanText: string) => {
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
            content: `Please provide: 1) English translation of: "${germanText}" 2) Three suggested German responses that a language learner could use to reply. IMPORTANT: The suggestions must be ONLY in German - no English translations in parentheses or brackets. Format exactly as: TRANSLATION: [translation] SUGGESTIONS: [suggestion1] | [suggestion2] | [suggestion3]`
          }],
          conversationId: 'helper',
          contextLevel,
          difficultyLevel,
          systemInstruction: "When providing German suggestions, respond ONLY in German. Do not include any English translations in parentheses or brackets in the suggestions."
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.message;
        
        console.log('Translation and suggestions response:', content);
        
        // Parse translation and suggestions
        const translationMatch = content.match(/TRANSLATION:\s*(.+?)(?=SUGGESTIONS:|$)/);
        const suggestionsMatch = content.match(/SUGGESTIONS:\s*(.+)/);
        
        if (translationMatch) {
          setTranslatedMessages(prev => ({
            ...prev,
            [messageId]: translationMatch[1].trim()
          }));
        }
        
        if (suggestionsMatch) {
          const suggestions = suggestionsMatch[1].split('|').map(s => s.trim()).filter(s => s.length > 0);
          
          // Clean up any English translations that might be in parentheses or brackets
          const cleanedSuggestions = suggestions.map(suggestion => {
            // Remove English text in parentheses like (English translation)
            let cleaned = suggestion.replace(/\([^)]*[A-Za-z][^)]*\)/g, '');
            // Remove English text in brackets like [English translation]
            cleaned = cleaned.replace(/\[[^\]]*[A-Za-z][^\]]*\]/g, '');
            // Remove any remaining English text patterns
            cleaned = cleaned.replace(/\([^)]*\)/g, '');
            cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
            // Trim whitespace
            return cleaned.trim();
          }).filter(s => s.length > 0);
          
          console.log('Original suggestions:', suggestions);
          console.log('Cleaned suggestions:', cleanedSuggestions);
          
          setSuggestedResponses(prev => ({
            ...prev,
            [messageId]: cleanedSuggestions
          }));
        } else {
          console.log('No suggestions match found in:', content);
        }
      } else {
        console.error('Failed to get translation and suggestions:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error generating translation and suggestions:', error);
    }
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
    setPlayerStats(prev => ({
      ...prev,
      conversationsCompleted: prev.conversationsCompleted + 1,
      currentStreak: prev.currentStreak + 1,
      longestStreak: Math.max(prev.longestStreak, prev.currentStreak + 1)
    }));
    addExperience(25, 'conversation_complete');
    checkAchievements();
  };

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
        setShowAchievement(achievementId);
        setRecentAchievements(prev => [...prev, achievementId]);
        setTimeout(() => setShowAchievement(null), 3000);
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

  // Pronunciation feature functions
  const getPhoneticBreakdown = async (text: string, messageId: string) => {
    console.log('🎯 Getting phonetic breakdown for:', text, 'Message ID:', messageId);
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
      } else {
        console.error('❌ Phonetic breakdown failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Error getting phonetic breakdown:', error);
    }
  };

  const playWordAudio = async (word: string, speed: number = globalPlaybackSpeed) => {
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
          systemInstruction: "You are a German to English translator. Provide only the English translation of the German text. Be accurate and concise."
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTranslatedMessages(prev => ({
          ...prev,
          [messageId]: data.message
        }));
      } else {
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
    const isCurrentlyShowing = showSuggestions[messageId];
    
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
      const currentSuggestions = suggestedResponses[messageId];
      if (!currentSuggestions || currentSuggestions.length === 0) {
        // Generate suggestions on demand
        const message = chatMessages.find(msg => msg.id === messageId);
        if (message) {
          await generateSuggestionsOnDemand(messageId, message.content);
        }
      } else {
        // If we have suggestions but they're not translated yet, translate them
        const firstSuggestion = currentSuggestions[0];
        if (typeof firstSuggestion === 'string') {
          // They're still strings, need translation
          translateSuggestions(messageId, currentSuggestions);
        }
      }
    }
  };

  const useSuggestedResponse = (suggestion: string) => {
    setMessageInput(suggestion);
  };

  // Generate suggestions on demand when user clicks on suggested responses
  const generateSuggestionsOnDemand = async (messageId: string, germanText: string) => {
    if (suggestedResponses[messageId]) {
      return; // Already generated
    }
    
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
            content: `Please provide: 1) English translation of: "${germanText}" 2) Three suggested German responses that a language learner could use to reply. IMPORTANT: The suggestions must be ONLY in German - no English translations in parentheses or brackets. Format exactly as: TRANSLATION: [translation] SUGGESTIONS: [suggestion1] | [suggestion2] | [suggestion3]`
          }],
          conversationId: 'helper',
          contextLevel,
          difficultyLevel,
          systemInstruction: "When providing German suggestions, respond ONLY in German. Do not include any English translations in parentheses or brackets in the suggestions."
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.message;
        
        // Parse translation and suggestions
        const translationMatch = content.match(/TRANSLATION:\s*(.+?)(?=SUGGESTIONS:|$)/);
        const suggestionsMatch = content.match(/SUGGESTIONS:\s*(.+)/);
        
        if (translationMatch) {
          setTranslatedMessages(prev => ({
            ...prev,
            [messageId]: translationMatch[1].trim()
          }));
        }
        
        if (suggestionsMatch) {
          const suggestions = suggestionsMatch[1].split('|').map(s => s.trim()).filter(s => s.length > 0);
          
          // Clean up any English translations that might be in parentheses or brackets
          const cleanedSuggestions = suggestions.map(suggestion => {
            // Remove English text in parentheses like (English translation)
            let cleaned = suggestion.replace(/\([^)]*[A-Za-z][^)]*\)/g, '');
            // Remove English text in brackets like [English translation]
            cleaned = cleaned.replace(/\[[^\]]*[A-Za-z][^\]]*\]/g, '');
            // Remove any remaining English text patterns
            cleaned = cleaned.replace(/\([^)]*\)/g, '');
            cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
            // Trim whitespace
            return cleaned.trim();
          }).filter(s => s.length > 0);
          
          setSuggestedResponses(prev => ({
            ...prev,
            [messageId]: cleanedSuggestions
          }));
        }
      }
    } catch (error) {
      console.error('Error generating suggestions on demand:', error);
    }
  };

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
            content: userMessage
          }],
          conversationId: selectedConversation,
          contextLevel,
          difficultyLevel,
          userProfile: onboardingData ? {
            germanLevel: onboardingData.germanLevel,
            goals: onboardingData.goals,
            personalityTraits: onboardingData.personalityTraits,
            conversationTopics: onboardingData.conversationTopics
          } : undefined,
          systemInstruction: `${contextLevel === 'Professional' ? 'Sie sind' : 'Du bist'} ein freundlicher Gesprächspartner. Antworte kurz und natürlich (1-2 Sätze). Stelle viele Fragen. Sei neugierig und interessiert. Lass den Nutzer viel sprechen. ${contextLevel === 'Professional' ? 'Verwende "Sie" und höfliche Ausdrücke.' : 'Verwende "Du" und umgangssprachliche Ausdrücke.'} KEINE englischen Übersetzungen oder Erklärungen.`
        })
      });

      console.log('📡 === AI API RESPONSE ===');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📝 === AI RESPONSE DATA ===');
        console.log('AI message:', data.message);
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        };

        console.log('🤖 === ADDING AI MESSAGE TO CHAT ===');
        console.log('AI message ID:', assistantMessage.id);
        console.log('AI message content:', assistantMessage.content);
        
        setChatMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          console.log('Updated chat messages count:', newMessages.length);
          return newMessages;
        });
        
        setCurrentAIMessage(data.message);
        console.log('✅ === AI RESPONSE COMPLETED SUCCESSFULLY ===');
      } else {
        console.error('❌ === AI API ERROR ===');
        console.error('Response status:', response.status);
        console.error('Response status text:', response.statusText);
      }
    } catch (error) {
      console.error('❌ === AI RESPONSE ERROR ===');
      console.error('Error:', error);
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


  const translateSuggestions = async (messageId: string, suggestions: string[]) => {
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
          [messageId]: translatedSuggestions
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
    } else if (!analysis) {
      // Analysis failed - don't proceed with AI response (EXACT SAME AS VOICE)
      console.log('🚫 === ANALYSIS FAILED - NOT SENDING TO AI ===');
      console.log('Analysis returned null, not proceeding with AI response');
      updateMessageStatus(messageId, 'error');
      return;
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

    if (!trimmedInput || isSending || !selectedConversation) {
      console.log('🚫 === BLOCKING SEND MESSAGE ===');
      console.log('Reasons:');
      console.log('- Empty input:', !trimmedInput);
      console.log('- Is sending:', isSending);
      console.log('- No conversation:', !selectedConversation);
      return;
    }

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

    // Collapse toolbar when conversation starts (first user message)
    if (chatMessages.length <= 1) { // Only AI greeting message exists
      setToolbarCollapsed(true);
      console.log('Collapsing toolbar - first user message');
    }

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
        return newMessages;
      });

      // Store original message for suggested answer generation (EXACT SAME AS VOICE)
      setOriginalMessages(prev => ({
        ...prev,
        [messageId]: userMessage.content
      }));
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
    
    // Add to persistent vocabulary immediately (for session persistence)
    setPersistentVocab(prev => {
      const updated = [newVocabItem, ...prev];
      console.log('📚 === UPDATED PERSISTENT VOCAB ===');
      console.log('New persistent vocab count:', updated.length);
      console.log('New persistent vocab items:', updated);
      console.log('📚 === VOCAB ADDED TO PERSISTENT STORAGE (WORKS EVEN WHEN TOOLBAR IS CLOSED) ===');
      return updated;
    });
    
    // Also add to new vocab items for Toolbar processing (when toolbar is open)
    console.log('📚 === ADDING TO NEW VOCAB ITEMS FOR TOOLBAR ===');
    setNewVocabItems(prev => {
      const updated = [...prev, newVocabItem];
      console.log('📚 === UPDATED NEW VOCAB ITEMS ===');
      console.log('New vocab items count:', updated.length);
      console.log('New vocab items:', updated);
      return updated;
    });
    
    console.log('📚 === DASHBOARD HANDLE ADD TO VOCAB COMPLETED ===');
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
    
    // Add to persistent vocabulary with meanings
    setPersistentVocab(prev => {
      const updated = [...wordsWithMeanings, ...prev];
      console.log('📚 === UPDATED PERSISTENT VOCAB WITH MEANINGS ===');
      console.log('New persistent vocab count:', updated.length);
      console.log('New persistent vocab items:', updated);
      return updated;
    });
    
    // Set new vocabulary items for the Toolbar (with meanings already generated)
    console.log('📚 === SETTING NEW VOCAB ITEMS FOR TOOLBAR ===');
    console.log('Items being sent to Toolbar:', wordsWithMeanings);
    setNewVocabItems(wordsWithMeanings);
    
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
        setGermanSuggestion(simpleFallback);
      }
    } catch (error) {
      console.error('Network error generating German suggestion:', error);
      console.error('Error details:', error.message);
      setGermanSuggestion(simpleFallback);
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
            
            // Auto-add vocabulary corrections (only for current session and avoid duplicates)
            if (selectedConversation) {
              console.log('📚 === AUTO-ADDING VOCABULARY FROM ERRORS ===');
              console.log('Vocabulary corrections count:', data.corrections.vocabulary.length);
              console.log('Current persistent vocab count:', persistentVocab.length);
              console.log('Current vocabAdditionTracker:', Array.from(vocabAdditionTracker));
              console.log('Timestamp:', new Date().toISOString());
              console.log('Stack trace:', new Error().stack);
              
              data.corrections.vocabulary.forEach((v: any, index: number) => {
                console.log(`📚 Processing vocabulary ${index + 1}:`, v.correct, v.meaning);
                // Check if word already exists in persistent vocab to avoid duplicates
                const wordExists = persistentVocab.some(item => item.word === v.correct);
                console.log(`📚 Word "${v.correct}" exists:`, wordExists);
                console.log(`📚 Current persistent vocab words:`, persistentVocab.map(item => item.word));
                
                // Also check if word is already in tracker
                const wordKey = `${v.correct}-${selectedConversation}`;
                const inTracker = vocabAdditionTracker.has(wordKey);
                console.log(`📚 Word "${v.correct}" in tracker:`, inTracker);
                console.log(`📚 Word key:`, wordKey);
                
                if (!wordExists && !inTracker) {
                  console.log(`📚 Adding word "${v.correct}" to vocabulary`);
                  handleAddToVocab(v.correct, v.meaning);
                } else {
                  console.log(`📚 Skipping duplicate word "${v.correct}" - exists: ${wordExists}, in tracker: ${inTracker}`);
                }
              });
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
      }
    } catch (error) {
      console.error('Error in comprehensive analysis:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      let recordingStartTime = Date.now();

      // Start duration tracking
      const durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setRecordingDuration(elapsed);
        
        // Warn at 25 seconds
        if (elapsed >= 25) {
          console.warn('Recording approaching 30s limit');
        }
      }, 1000);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearInterval(durationInterval);
        setRecordingDuration(0);
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied. Please allow microphone access to use voice input.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Modal recording functions
  const startModalRecording = async (isForConversationInput: boolean = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      let recordingStartTime = Date.now();

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
    
    setIsTranscribing(true);
    
    try {
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
            body: JSON.stringify({ audioData: base64Data })
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.transcription) {
              const transcription = data.transcription;
              console.log('Conversation input transcription:', transcription);
              
              // Set the transcription as the conversation input
              setConversationInput(transcription);
              setIsTranscribing(false);
            } else {
              console.error('No transcription received');
              alert('No speech detected. Please try again.');
              setIsTranscribing(false);
            }
          } else {
            console.error('Transcription failed:', response.status);
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
          body: JSON.stringify({ audioData: base64Data })
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
                    ? { ...msg, content: transcription }
                    : msg
                ));
                
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

  const processAudioMessage = async (audioBlob: Blob) => {
    // Store audio blob for practice modal use
    setPracticeAudioBlob(audioBlob);
    
    // Check if we're in a retry state - be more robust in detection
    const isRetry = Boolean(activeMessageId);
    const existingMessageId = activeMessageId;

    console.log('🎤 === PROCESSING AUDIO MESSAGE ===');
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
        
        const audioMessage: ChatMessage = {
          id: Date.now().toString(), // Always create new ID to avoid duplicates
          role: 'user',
          content: showLanguageMismatchModal ? '🎤 Voice message' : '🎤 Voice message',
          timestamp: new Date().toISOString(),
          audioUrl: URL.createObjectURL(audioBlob),
          isAudio: true,
          isTranscribing: true
        };
        
        messageId = audioMessage.id;

        updateMessageStatus(messageId, 'checking');
        
        // Add to chat immediately
        setChatMessages(prev => {
          console.log('🆕 === ADDING NEW MESSAGE TO CHAT ===');
          console.log('New message ID:', messageId);
          console.log('Previous messages count:', prev.length);
          const newMessages = [...prev, audioMessage];
          console.log('New messages count:', newMessages.length);
          return newMessages;
        });
      }
    }
    
    // Process audio in background
    await transcribeAudio(audioBlob, messageId, isRetry);
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
      
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      console.log('Base64 audio length:', base64Audio.length);

      // Try the whisper function first, fallback to chat function if not available
      let response;
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
            // Don't specify language - let Whisper auto-detect
            storeForAnalysis: true
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (whisperError) {
        console.log('Whisper function error:', whisperError);
        
        // Check if it's a timeout or size issue
        if (whisperError.name === 'AbortError') {
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
      }

      if (response.ok) {
        const data = await response.json();
        
        // Check if this is a whisper response or chat fallback
        if (data.transcription) {
          // Whisper function response
          const transcription = data.transcription;
          
          // Detect language mismatch
          const detectedLanguage = detectLanguage(transcription);
          console.log('🔍 === VOICE LANGUAGE DETECTION DEBUG ===');
          console.log('Transcription:', transcription);
          console.log('Detected language:', detectedLanguage);
          console.log('Selected language:', recordingLanguage);
          console.log('Language mismatch:', detectedLanguage !== recordingLanguage);
          console.log('Show language mismatch modal state:', showLanguageMismatchModal);
          console.log('Has English words check:', /\b(the|and|or|but|in|on|at|to|for|of|with|by|this|that|these|those|what|where|when|why|how|hello|hi|how|are|you)\b/i.test(transcription));
          
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
                    
                    const newMessage = {
                      ...msg,
                      content: transcription,
                      audioUrl: practiceAudioBlob ? URL.createObjectURL(practiceAudioBlob) : undefined,
                      isAudio: true,
                      isTranscribing: false,
                      role: 'user',
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
          }
          
          // Update the audio message with transcription
          setChatMessages(prev => {
            console.log('🔄 === UPDATING MESSAGE WITH TRANSCRIPTION ===');
            console.log('Message ID:', messageId);
            console.log('Is Retry:', isRetry);
            console.log('Transcription:', transcription);
            console.log('Previous messages count:', prev.length);
            
            const updatedMessages = prev.map(msg => {
              if (msg.id === messageId) {
                console.log('✅ FOUND MESSAGE TO UPDATE:', msg.id);
                console.log('Original content:', msg.content);
                console.log('New content:', transcription);
                
                // Store transcribed text as original message for suggestion generation (voice input)
                if (!isRetry) {
                  console.log('📝 === STORING TRANSCRIBED TEXT AS ORIGINAL MESSAGE FOR VOICE INPUT ===');
                  console.log('Message ID:', messageId);
                  console.log('Transcribed text:', transcription);
                  setOriginalMessages(prev => ({
                    ...prev,
                    [messageId]: transcription
                  }));
                }
                
                return { ...msg, content: transcription, isTranscribing: false };
              }
              return msg;
            });
            
            console.log('Updated messages count:', updatedMessages.length);
            return updatedMessages;
          });
          
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
          } else if (!analysis) {
            // Analysis failed - don't proceed with AI response
            console.log('🚫 === ANALYSIS FAILED - NOT SENDING TO AI ===');
            console.log('Analysis returned null, not proceeding with AI response');
            updateMessageStatus(messageId, 'error');
            return;
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
        // Update message to show error with more details
        setChatMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: `❌ Transcription failed (${response.status})`, isTranscribing: false }
            : msg
        ));
        updateMessageStatus(messageId, 'error');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);

      // Check if it's a CORS or function not found error
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        // Update message to show function needs deployment
        setChatMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                content: '⚠️ Whisper function not deployed. Audio recorded but transcription unavailable.', 
                isTranscribing: false 
              }
            : msg
        ));
        updateMessageStatus(messageId, 'error');
      } else {
        // Update message to show transcription failed
        setChatMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: '❌ Transcription failed', isTranscribing: false }
            : msg
        ));
        updateMessageStatus(messageId, 'error');
      }
    } finally {
      console.log('🏁 === TRANSCRIBE AUDIO END (NORMAL PROCESSING) ===');
      console.log('Final showLanguageMismatchModal state:', showLanguageMismatchModal);
      console.log('Final chat messages count:', chatMessages.length);
      setIsTranscribing(false);
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
          userProfile: onboardingData
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
    // Reset all states first
    resetConversationState();
    
    // Find the conversation to get its context and difficulty levels
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setContextLevel(conversation.context_level);
      setDifficultyLevel(conversation.difficulty_level);
      setCurrentConversationContextLocked(conversation.context_locked);
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
    setSidebarCollapsed(false);
  };

  // Reset all states when ending conversation
  const resetConversationState = () => {
    // Reset conversation states
    setSelectedConversation(null);
    setChatMessages([]);
    setCurrentAIMessage('');
    setActiveMessageId(null);
    
    // Reset context and difficulty states
    setContextLevel('Professional');
    setCurrentConversationContextLocked(false);
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
    
    // Reset recording states
    setShowLanguageMenu(false);
    setShowLanguageMismatchModal(false);
    setDetectedLanguage(null);
    setMismatchTranscription('');
    setMismatchMessageId('');
    setGermanSuggestion('');
    setPracticeAudioBlob(null);
    setRecordingLanguage('german');
    setRecordingDuration(0);
    
    // Reset UI states
    setSidebarCollapsed(false);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setShowOnboarding(false);
    setIsNewUser(false);
    setCurrentProfilePicture(data.profilePictureUrl || null);
    localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(data));
    
    // 🎮 Give XP for completing onboarding
    addExperience(50, 'onboarding_complete');
    addAchievement('onboarding_complete', '🚀 Getting Started', 'Completed your profile setup!');
  };

  const handleProfilePictureUpdate = (newUrl: string | null) => {
    setCurrentProfilePicture(newUrl);
    if (onboardingData) {
      const updatedData = {
        ...onboardingData,
        profilePictureUrl: newUrl
      };
      setOnboardingData(updatedData);
      localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(updatedData));
    }
  };

  const handleRestartOnboarding = () => {
    setShowOnboarding(true);
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
          <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-gradient-to-b from-white to-slate-50 border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out shadow-lg overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-4">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Volume2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-display text-gradient-primary">TalkBuddy</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {sidebarCollapsed && (
                <Volume2 className="h-6 w-6 text-blue-500" />
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-90' : '-rotate-90'}`} />
              </button>
              {!sidebarCollapsed && (
                <>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    {currentProfilePicture ? (
                      <img src={currentProfilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </button>
                  <button
                    onClick={handleRestartOnboarding}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* New Conversation Button */}
          {!sidebarCollapsed && (
            <button 
              onClick={resetConversationState}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2.5 flex items-center justify-center space-x-2 font-semibold mb-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>New Conversation</span>
            </button>
          )}
          {sidebarCollapsed && (
            <button 
              onClick={resetConversationState}
              className="w-full apple-button p-2 flex items-center justify-center mb-3"
              title="New Conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          {/* 🎮 GAMIFICATION COMPONENTS */}
          {!sidebarCollapsed && (
            <div className="mb-4">
              {/* Player Stats Card */}
              <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-xl p-4 text-white mb-3 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">🎮</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Level {playerStats.level}</div>
                      <div className="text-xs opacity-90">{playerStats.totalPoints} XP</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-90">Streak</div>
                    <div className="text-sm font-bold">{playerStats.currentStreak} 🔥</div>
                  </div>
                </div>
                
                {/* Experience Bar */}
                <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ width: `${(playerStats.experience % 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs opacity-90">
                  {100 - (playerStats.experience % 100)} XP to next level
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center border border-blue-200">
                  <div className="text-lg font-display text-blue-700">{playerStats.conversationsCompleted}</div>
                  <div className="text-xs text-blue-600 font-caption">Conversations</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center border border-green-200">
                  <div className="text-lg font-display text-green-700">{playerStats.wordsLearned}</div>
                  <div className="text-xs text-green-600 font-caption">Words Learned</div>
                </div>
              </div>

              {/* Recent Achievements */}
              {recentAchievements.length > 0 && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-3 mb-3 border border-yellow-200">
                  <div className="text-xs font-semibold text-amber-700 mb-2">🏆 Recent Achievements</div>
                  <div className="space-y-1">
                    {recentAchievements.map((achievement, index) => (
                      <div key={index} className="text-xs text-amber-600 animate-pulse font-medium">
                        ✨ Achievement unlocked!
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          {!sidebarCollapsed && (
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentView('progress')}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  currentView === 'progress'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-1" />
                Progress
              </button>
              <button
                onClick={() => setCurrentView('vocab')}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  currentView === 'vocab'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100'
                }`}
              >
                <BookOpen className="h-4 w-4 inline mr-1" />
                Vocab List
              </button>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => setCurrentView('progress')}
                className={`p-2 text-sm font-medium rounded-lg transition-colors ${
                  currentView === 'progress'
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Progress"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentView('vocab')}
                className={`p-2 text-sm font-medium rounded-lg transition-colors ${
                  currentView === 'vocab'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title="Vocab List"
              >
                <BookOpen className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 apple-input text-sm"
              />
            </div>
          </div>
        )}

        {/* Recent Conversations */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-slate-50/50 to-white min-h-0">
          <div className="p-4 pb-2 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 font-heading">Recent Conversations</h3>
              <div className="relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-900 font-medium px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span>{selectedCategory || 'All Categories'}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-40 apple-card rounded-lg shadow-lg z-10 py-1">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                        selectedCategory === null ? 'text-blue-600 font-medium' : 'text-gray-700'
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
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                          selectedCategory === category ? 'text-blue-600 font-medium' : 'text-gray-700'
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
          <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredConversation(conversation.id)}
                    onMouseLeave={() => setHoveredConversation(null)}
                  >
                    <button
                      onClick={() => startNewConversation(conversation.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedConversation === conversation.id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm'
                          : 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 border border-transparent hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-sm font-semibold truncate text-slate-800 font-heading">
                          {conversation.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 truncate mb-1 font-body">{conversation.preview}</p>
                      <p className="text-xs text-slate-500 font-caption">{formatTime(conversation.updated_at)}</p>
                    </button>
                    
                    {/* Delete button - appears on hover */}
                    {hoveredConversation === conversation.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 transition-all duration-200 shadow-sm"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 font-heading">No Conversations Yet</h3>
                <p className="text-sm text-slate-600 font-body">
                  {selectedCategory 
                    ? `No ${selectedCategory.toLowerCase()} conversations yet`
                    : 'Start your first conversation to begin learning!'
                  }
                </p>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Settings */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 font-heading">Settings</h3>
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center space-x-3 w-full text-left p-2 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 rounded-md transition-all duration-200"
            >
              {currentProfilePicture ? (
                <img src={currentProfilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800 font-heading">{firstName}</p>
                <p className="text-xs text-slate-600 font-caption">Profile Settings</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-white to-slate-50 overflow-hidden">
        {selectedConversation ? (
          // Conversation View
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* German Partner Display */}
            <div className="bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {germanPartnerName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{germanPartnerName}</h3>
                      {/* Context Indicator Badge */}
                      {selectedConversation && (
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          contextLevel === 'Professional' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
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
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      </div>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">Last seen {lastSeenTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">German Language Partner</p>
                    <p className="text-xs text-gray-400">Native Speaker</p>
                  </div>
                  <button 
                    onClick={resetConversationState}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    End Conversation
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-gradient-to-b from-slate-50/50 to-white scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
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
                          className={`group relative p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer ${
                            activeHelpButton === message.id 
                              ? 'bg-blue-500 hover:bg-blue-600' 
                              : 'bg-red-500 hover:bg-red-600'
                          } text-white`}
                          title="Click to understand the mistake and get grammar help"
                        >
                          <svg className="h-4 w-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {/* Tooltip */}
                          <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            Click to understand the mistake
                          </div>
                        </button>
                      </div>
                    )}
                    
                    <div className={`max-w-sm lg:max-w-lg px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-md shadow-md'
                        : 'bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-tl-md shadow-sm'
                    }`}>
                      {message.role === 'assistant' && (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Bot className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">{germanPartnerName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={async () => await speakText(message.content)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Listen"
                            >
                              <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.846 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.846l3.537-3.816a1 1 0 011.617.816zM16 8a2 2 0 11-4 0 2 2 0 014 0zM14 8a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => toggleTranslation(message.id)}
                              className={`p-1 hover:bg-gray-100 rounded transition-colors text-xs ${
                                showTranslation[message.id] ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
                              }`}
                              title="Translate"
                            >
                              EN
                            </button>
                            <button
                              onClick={() => toggleSuggestions(message.id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Suggest responses"
                            >
                              <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleHelpClick(message.content, message.id)}
                              className={`p-1 rounded transition-colors ${
                                activeHelpButton === message.id 
                                  ? 'bg-blue-100' 
                                  : 'hover:bg-gray-100'
                              }`}
                              title="Get Grammar Help"
                            >
                              <BookOpen className={`h-3 w-3 ${
                                activeHelpButton === message.id 
                                  ? 'text-blue-500' 
                                  : 'text-gray-500'
                              }`} />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className={`text-sm ${
                        message.role === 'user' 
                          ? 'text-white' 
                          : 'apple-text-primary'
                      }`}>
                        {message.isAudio ? (
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => {
                                if (message.audioUrl) {
                                  const audio = new Audio(message.audioUrl);
                                  audio.play();
                                }
                              }}
                              className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
                            >
                              <Play className="h-4 w-4" />
                              <span className="text-sm">Play</span>
                            </button>
                            <span>{message.content}</span>
                            {message.isTranscribing && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>

                      {/* Pronunciation Breakdown for Assistant Messages */}
                      {message.role === 'assistant' && (
                        <div className="mt-3">
                          {(() => {
                            const wordCount = message.content.split(' ').length;
                            const shouldAutoShow = wordCount <= 5;
                            const isShowing = showPronunciationBreakdown[message.id];
                            const phoneticData = phoneticBreakdowns[message.id];
                            
                            return (
                              <div>
                                {!phoneticData && (
                                  <button
                                    onClick={() => {
                                      // Open pronunciation tab and get phonetic breakdown
                                      setToolbarActiveTab('pronunciation');
                                      setShowToolbar(true);
                                      setToolbarCollapsed(false);
                                      getPhoneticBreakdown(message.content, message.id);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                  >
                                    Get pronunciation guide
                                  </button>
                                )}
                                
                                {phoneticData && (
                                  <div className="space-y-2">
                                    {!shouldAutoShow && !isShowing && (
                                      <button
                                        onClick={() => togglePronunciationBreakdown(message.id)}
                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                      >
                                        Show pronunciation breakdown
                                      </button>
                                    )}
                                    
                                    {(shouldAutoShow || isShowing) && (
                                      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-medium text-gray-700">Pronunciation Guide</span>
                                          {!shouldAutoShow && (
                                            <button
                                              onClick={() => togglePronunciationBreakdown(message.id)}
                                              className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                              Hide
                                            </button>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          {phoneticData.map((word: {original: string, phonetic: string, transliteration: string, syllables: string[]}, index: number) => (
                                            <div key={index} className="flex items-center space-x-2 text-xs">
                                              <span className="font-medium text-gray-800">{word.original}</span>
                                              <span className="text-gray-600">[{word.phonetic}]</span>
                                              <span className="text-blue-600 italic">{word.transliteration}</span>
                                              <div className="flex items-center space-x-1">
                                                <button
                                                  onClick={() => playWordAudio(word.original)}
                                                  className="p-1 hover:bg-gray-200 rounded"
                                                  title="Play pronunciation"
                                                >
                                                  <Volume2 className="h-3 w-3 text-gray-500" />
                                                </button>
                                                <div className="flex items-center space-x-1">
                                                  <span className="text-xs text-gray-500">Speed:</span>
                                                  <input
                                                    type="range"
                                                    min="0.5"
                                                    max="2.0"
                                                    step="0.1"
                                                    value={globalPlaybackSpeed}
                                                    onChange={(e) => {
                                                      const speed = parseFloat(e.target.value);
                                                      setGlobalPlaybackSpeed(speed);
                                                    }}
                                                    className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                  />
                                                  <span className="text-xs text-gray-500 w-8">{globalPlaybackSpeed.toFixed(1)}x</span>
                                                </div>
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
                          })()}
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
                          className="block w-full text-left bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs text-gray-700 transition-colors"
                        >
                          <div className="font-medium">{suggestedAnswers[message.id]}</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Motivation animation for wrong answers - Hide when max attempts reached */}
                  {message.role === 'user' && comprehensiveAnalysis[message.id] && comprehensiveAnalysis[message.id].hasErrors && userAttempts[message.id] < 2 && (
                    <div className="flex justify-end mt-2">
                      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-3 max-w-sm">
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
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        📚 Add words to vocab
                      </button>
                    </div>
                  )}
                  
                  {/* Suggested Responses */}
                  {message.role === 'assistant' && showSuggestions[message.id] && (
                    <div className="ml-4 mt-2 max-w-sm lg:max-w-lg space-y-1">
                      <div className="text-xs font-medium text-gray-600 mb-1">Suggested responses:</div>
                      {suggestedResponses[message.id] ? (
                        suggestedResponses[message.id].map((suggestion, index) => {
                          const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.german;
                          const suggestionTranslation = typeof suggestion === 'object' ? suggestion.english : null;
                          
                          return (
                            <button
                              key={index}
                              onClick={() => useSuggestedResponse(suggestionText)}
                              className="block w-full text-left bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs text-gray-700 transition-colors"
                            >
                              <div className="font-medium">{suggestionText}</div>
                              {showTranslation[message.id] && suggestionTranslation && (
                                <div className="text-gray-500 text-xs mt-1">{suggestionTranslation}</div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-xs text-gray-500 italic">Loading suggestions...</div>
                      )}
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
                  <div className="apple-card rounded-2xl rounded-tl-md px-4 py-3 max-w-sm lg:max-w-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bot className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-blue-600">{germanPartnerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{germanPartnerName} ist typing</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-gradient-to-r from-white to-slate-50 border-t border-slate-200 p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                    className="w-full px-4 py-3 border border-slate-300 rounded-full text-sm bg-white shadow-sm focus:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <button 
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </button>
                <div className="flex items-center space-x-2">
                  {isRecording && (
                    <div className="text-sm text-gray-600">
                      {recordingDuration}s
                      {recordingDuration >= 25 && (
                        <span className="text-orange-500 ml-1">⚠️</span>
                      )}
                    </div>
                  )}
                  {/* Record Button - German by default */}
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className={`p-3 rounded-full transition-colors ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            </div>
            
            {/* Right Sidebar - Collapsible Toolbar */}
            <div className={`${toolbarCollapsed ? 'w-12' : 'w-96'} bg-white border-l border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out`}>
              {/* Toolbar Header */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  {!toolbarCollapsed && (
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-semibold text-gray-900">Learning Tools</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    {toolbarCollapsed && (
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    )}
                    <button
                      onClick={() => {
                        setToolbarCollapsed(!toolbarCollapsed);
                        // Auto-analyze grammar when expanding toolbar
                        if (toolbarCollapsed && currentAIMessage) {
                          console.log('Auto-analyzing grammar for:', currentAIMessage);
                          // The comprehensive analysis should already be available
                          // Just make sure the toolbar shows the analysis
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      title={toolbarCollapsed ? "Expand toolbar" : "Collapse toolbar"}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${toolbarCollapsed ? 'rotate-90' : '-rotate-90'}`} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Toolbar Content */}
              {!toolbarCollapsed ? (
                <div className="flex-1 overflow-y-auto">
                  <Toolbar
                    isVisible={true}
                    currentMessage={currentAIMessage}
                    onAddToVocab={handleAddToVocab}
                    autoLoadExplanations={toolbarOpenedViaHelp}
                    comprehensiveAnalysis={activeHelpButton ? comprehensiveAnalysis[activeHelpButton] : null}
                    activeTab={toolbarActiveTab}
                    onTabChange={setToolbarActiveTab}
                    newVocabItems={newVocabItems}
                    persistentVocab={persistentVocab}
                    phoneticBreakdowns={phoneticBreakdowns}
                    onPlayWordAudio={playWordAudio}
                    globalPlaybackSpeed={globalPlaybackSpeed}
                    onSpeedChange={setGlobalPlaybackSpeed}
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
                  />
                </div>
              ) : (
                /* Collapsed State - Show expand button */
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-2">
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
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Expand toolbar"
                  >
                    <ChevronDown className="h-6 w-6 rotate-90" />
                  </button>
                  <div className="text-xs text-gray-500 text-center">
                    Click to expand<br />Learning Tools
                  </div>
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
                  🎮 Your Gaming Progress
                </h1>
                <p className="text-xl text-slate-600 font-body">
                  Level up your German skills with achievements and rewards!
                </p>
              </div>

              {/* 🎮 GAMIFIED STATS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Level Card */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium opacity-90">Level</h3>
                    <span className="text-2xl">🎮</span>
                  </div>
                  <p className="text-3xl font-bold">{playerStats.level}</p>
                  <div className="text-xs opacity-90 mt-1">
                    {playerStats.experienceToNext} XP to next level
                  </div>
                </div>
                
                {/* Experience Card */}
                <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-600 font-heading">Total XP</h3>
                    <span className="text-xl">⭐</span>
                  </div>
                  <p className="text-2xl font-display text-slate-800">{playerStats.totalPoints}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(playerStats.experience % 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Streak Card */}
                <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-600 font-heading">Streak</h3>
                    <span className="text-xl">🔥</span>
                  </div>
                  <p className="text-2xl font-display text-slate-800">{playerStats.currentStreak}</p>
                  <div className="text-xs text-slate-500 mt-1 font-caption">
                    Best: {playerStats.longestStreak} days
                  </div>
                </div>
                
                {/* Conversations Card */}
                <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-600 font-heading">Conversations</h3>
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-display text-slate-800">{playerStats.conversationsCompleted}</p>
                  <div className="text-xs text-slate-500 mt-1 font-caption">
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
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => {
                              setConversationInput(conversation.preview);
                              startNewConversation(conversation.id);
                              setCurrentView('dashboard');
                            }}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
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
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
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
          // Vocab List View
          <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="text-center">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold apple-text-primary mb-2">Vocabulary List</h2>
              <p className="text-lg apple-text-secondary">Your saved words and phrases will appear here</p>
            </div>
          </div>
        ) : (
          // Welcome Screen
          <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white overflow-y-auto">
            <div className="max-w-2xl w-full">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display text-gradient-primary mb-2">
                  Hello {firstName}!
                </h1>
                <p className="text-xl text-slate-600 font-body">
                  What would you like to practice in German today?
                </p>
              </div>

              {/* Enhanced Conversation Input */}
              <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-lg">
                {/* Text Input */}
                <div className="mb-6">
                  <textarea
                    placeholder="My left knee is injured and I want to visit a doctor."
                    value={conversationInput}
                    onChange={(e) => setConversationInput(e.target.value)}
                    className="w-full px-4 py-4 border border-slate-300 rounded-xl text-base resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm focus:shadow-md transition-all duration-200 font-body"
                    rows={4}
                  />
                </div>

                {/* Context and Difficulty Selectors */}
                <div className="flex space-x-4 mb-6">
                  {/* Context Level */}
                  <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-slate-800 mb-2 font-heading">Context</label>
                    <button
                      onClick={() => !currentConversationContextLocked && setShowContextDropdown(!showContextDropdown)}
                      disabled={currentConversationContextLocked}
                      className={`w-full border border-slate-300 rounded-lg px-4 py-3 text-left flex items-center justify-between shadow-sm transition-all duration-200 ${
                        currentConversationContextLocked 
                          ? 'bg-gray-100 cursor-not-allowed opacity-60' 
                          : 'bg-white hover:shadow-md'
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-800 font-heading flex items-center">
                        {contextLevel}
                        {currentConversationContextLocked && (
                          <span className="ml-2 text-xs">🔒</span>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 ${currentConversationContextLocked ? 'text-gray-300' : 'text-gray-400'}`} />
                    </button>
                    {showContextDropdown && !currentConversationContextLocked && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-lg shadow-lg z-10">
                        {contextLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setContextLevel(level);
                              setShowContextDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 first:rounded-t-lg last:rounded-b-lg text-slate-800 font-body transition-all duration-200"
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Difficulty Level */}
                  <div className="flex-1 relative">
                    <label className="block text-sm font-semibold text-slate-800 mb-2 font-heading">Level</label>
                    <button
                      onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 text-left flex items-center justify-between bg-white shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <span className="text-sm font-semibold text-slate-800 font-heading">{difficultyLevel}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                    {showDifficultyDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-lg shadow-lg z-10">
                        {difficultyLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setDifficultyLevel(level);
                              setShowDifficultyDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 first:rounded-t-lg last:rounded-b-lg text-slate-800 font-body transition-all duration-200"
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
                      className={`p-3 rounded-full transition-colors ${
                        isModalRecording 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
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
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3 rounded-full flex items-center space-x-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Play className="h-4 w-4" />
                      <span>Start Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-200'
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
                    <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                      <div className="flex-1">
                        <span className="font-semibold text-blue-900">{word}</span>
                        <span className="text-blue-600 ml-2 text-sm">Meanings will be generated in vocab tab</span>
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
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
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
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
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
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
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
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
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
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Achievement Modal */}
      {showAchievement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-pulse">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Achievement Unlocked!</h2>
            <p className="text-gray-600 mb-4">You've earned a new achievement!</p>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-4 mb-4">
              <div className="text-sm opacity-90">Achievement</div>
              <div className="text-xl font-bold">🎉 First Conversation</div>
              <div className="text-sm opacity-90">Completed your first German conversation!</div>
            </div>
            <button
              onClick={() => setShowAchievement(null)}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Amazing!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}