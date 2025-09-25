import React, { useState, useEffect } from 'react';
import {
  Mic,
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
  Target,
  Bot
} from 'lucide-react';
import { supabase, AuthUser } from '../lib/supabase';
import OnboardingFlow from './OnboardingFlow';
import ProfilePictureModal from './ProfilePictureModal';

interface DashboardProps {
  user: AuthUser;
}

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
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
export default function Dashboard({ user }: DashboardProps) {
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [onboardingData, setOnboardingData] = React.useState<OnboardingData | null>(null);
  const [isNewUser, setIsNewUser] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [currentProfilePicture, setCurrentProfilePicture] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [contextLevel, setContextLevel] = useState('Professional');
  const [difficultyLevel, setDifficultyLevel] = useState('Intermediate');
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
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState<{[key: string]: string}>({});
  const [suggestedResponses, setSuggestedResponses] = useState<{[key: string]: string[]}>({});
  const [showTranslation, setShowTranslation] = useState<{[key: string]: boolean}>({});
  const [showSuggestions, setShowSuggestions] = useState<{[key: string]: boolean}>({});

  React.useEffect(() => {
    loadOnboardingData();
    loadConversations();
  }, [user.id]);

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
          difficulty_level: difficultyLevel
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
    
    // Set initial messages with topic display and encouragement
    const topicMessage: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: `**Topic: ${userMessage}**\n\nLet's start practicing this scenario together in German! I'll guide you through the conversation.`,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages([topicMessage]);
    
    // Immediately send the user's message to get AI response
    sendInitialMessage(conversationId, userMessage);
  };

  const sendInitialMessage = async (conversationId: string, userMessage: string) => {
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
            content: `I want to practice this scenario: ${userMessage}. Please start the conversation directly by asking me the first question in German. Don't include any English explanations or translations - just start the German conversation naturally.`
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
      
      const assistantMessage: ChatMessage = {
        id: '2',
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Generate translation and suggestions for the AI message
      generateTranslationAndSuggestions(assistantMessage.id, data.message);

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
            content: `Please provide: 1) English translation of: "${germanText}" 2) Three suggested German responses that a language learner could use to reply. Format as: TRANSLATION: [translation] SUGGESTIONS: [suggestion1] | [suggestion2] | [suggestion3]`
          }],
          conversationId: 'helper',
          contextLevel,
          difficultyLevel
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
          const suggestions = suggestionsMatch[1].split('|').map(s => s.trim());
          setSuggestedResponses(prev => ({
            ...prev,
            [messageId]: suggestions
          }));
        }
      }
    } catch (error) {
      console.error('Error generating translation and suggestions:', error);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE'; // German language
      utterance.rate = 0.8; // Slightly slower for learning
      window.speechSynthesis.speak(utterance);
    }
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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: germanText,
          targetLanguage: 'English'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTranslatedMessages(prev => ({
          ...prev,
          [messageId]: data.translation
        }));
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

  const toggleSuggestions = (messageId: string) => {
    setShowSuggestions(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const useSuggestedResponse = (suggestion: string) => {
    setMessageInput(suggestion);
  };
  const sendMessage = async () => {
    if (!messageInput.trim() || isSending || !selectedConversation) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setMessageInput('');
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
          messages: [...chatMessages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          conversationId: selectedConversation,
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
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      // Generate translation and suggestions for the AI message
      generateTranslationAndSuggestions(assistantMessage.id, data.message);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setChatMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ich bin Ihr KI-Sprachpartner. Worüber möchten Sie heute sprechen? (Hello! I\'m your AI language partner. What would you like to talk about today?)',
      timestamp: new Date().toISOString()
    }]);
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6 text-blue-500" />
              <span className="text-lg font-semibold text-gray-900 apple-text-primary">TalkBuddy</span>
            </div>
            <div className="flex items-center space-x-2">
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
            </div>
          </div>

          {/* New Conversation Button */}
          <button 
            onClick={() => {
              setSelectedConversation(null);
              setCurrentView('dashboard');
            }}
            className="w-full apple-button px-4 py-2.5 flex items-center justify-center space-x-2 font-medium mb-3"
          >
            <Plus className="h-4 w-4" />
            <span>New Conversation</span>
          </button>

          {/* Navigation Links */}
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentView('progress')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentView === 'progress'
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-1" />
              Progress
            </button>
            <button
              onClick={() => setCurrentView('vocab')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentView === 'vocab'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="h-4 w-4 inline mr-1" />
              Vocab List
            </button>
          </div>
        </div>

        {/* Search */}
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

        {/* Recent Conversations */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 apple-text-primary">Recent Conversations</h3>
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
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => startNewConversation(conversation.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedConversation === conversation.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-medium truncate apple-text-primary">
                        {conversation.title}
                      </h4>
                    </div>
                    <p className="text-xs apple-text-secondary truncate mb-1">{conversation.preview}</p>
                    <p className="text-xs text-gray-400">{formatTime(conversation.updated_at)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm apple-text-secondary">
                  {selectedCategory 
                    ? `No ${selectedCategory.toLowerCase()} conversations yet`
                    : 'No conversations yet'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3 apple-text-primary">Settings</h3>
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center space-x-3 w-full text-left p-2 hover:bg-gray-50 rounded-md transition-colors"
          >
            {currentProfilePicture ? (
              <img src={currentProfilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium apple-text-primary">{firstName}</p>
              <p className="text-xs apple-text-secondary">Profile Settings</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          // Conversation View
          <div className="flex-1 flex flex-col">
            {/* Conversation Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold apple-text-primary">
                    {conversations.find(c => c.id === selectedConversation)?.title}
                  </h2>
                  <p className="text-sm apple-text-secondary">AI Language Partner</p>
                </div>
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  End Conversation
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id}>
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-tr-md'
                        : message.content.startsWith('**Topic:')
                        ? 'apple-card rounded-tl-md border-l-4 border-blue-500'
                        : 'apple-card rounded-tl-md'
                    }`}>
                      {message.role === 'assistant' && !message.content.startsWith('**Topic:') && (
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Bot className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">AI Language Partner</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => speakText(message.content)}
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
                          </div>
                        </div>
                      )}
                      <div className={`text-sm ${
                        message.role === 'user' 
                          ? 'text-white' 
                          : message.content.startsWith('**Topic:')
                          ? 'apple-text-primary'
                          : 'apple-text-primary'
                      }`}>
                        {message.content.startsWith('**Topic:') ? (
                          <div>
                            <div className="font-semibold text-blue-600 mb-2">
                              {message.content.split('\n')[0].replace(/\*\*/g, '')}
                            </div>
                            <div className="text-gray-700">
                              {message.content.split('\n').slice(2).join('\n')}
                            </div>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Translation */}
                  {message.role === 'assistant' && !message.content.startsWith('**Topic:') && showTranslation[message.id] && translatedMessages[message.id] && (
                    <div className="ml-4 mt-2 max-w-xs lg:max-w-md">
                      <div className="bg-gray-100 px-3 py-2 rounded-lg text-xs text-gray-700">
                        <span className="font-medium">Translation: </span>
                        {translatedMessages[message.id]}
                      </div>
                    </div>
                  )}
                  
                  {/* Suggested Responses */}
                  {message.role === 'assistant' && !message.content.startsWith('**Topic:') && showSuggestions[message.id] && suggestedResponses[message.id] && (
                    <div className="ml-4 mt-2 max-w-xs lg:max-w-md space-y-1">
                      <div className="text-xs font-medium text-gray-600 mb-1">Suggested responses:</div>
                      {suggestedResponses[message.id].map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => useSuggestedResponse(suggestion.german)}
                          className="block w-full text-left bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs text-gray-700 transition-colors"
                        >
                          <div className="font-medium">{suggestion.german}</div>
                          {showTranslation[message.id] && (
                            <div className="text-gray-500 text-xs mt-1">{suggestion.english}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="apple-card rounded-2xl rounded-tl-md px-4 py-3 max-w-xs">
                    <div className="flex items-center space-x-2 mb-2">
                      <Bot className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium text-blue-600">AI Language Partner</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                    className="w-full px-4 py-3 apple-input rounded-full text-sm"
                  />
                </div>
                <button 
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="apple-button p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 text-white" />
                  )}
                </button>
                <button className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors">
                  <Mic className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : currentView === 'progress' ? (
          // Progress View
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold apple-text-primary mb-2">
                  Your Progress
                </h1>
                <p className="text-xl apple-text-secondary">
                  Track your speaking practice and review past conversations
                </p>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="apple-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium apple-text-secondary">Total Conversations</h3>
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-semibold apple-text-primary">{conversations.length}</p>
                </div>
                
                <div className="apple-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium apple-text-secondary">This Week</h3>
                    <BarChart3 className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-semibold apple-text-primary">
                    {conversations.filter(conv => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(conv.created_at) > weekAgo;
                    }).length}
                  </p>
                </div>
                
                <div className="apple-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium apple-text-secondary">Current Streak</h3>
                    <Target className="h-5 w-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-semibold apple-text-primary">3 days</p>
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
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold apple-text-primary mb-2">Vocabulary List</h2>
              <p className="text-lg apple-text-secondary">Your saved words and phrases will appear here</p>
            </div>
          </div>
        ) : (
          // Welcome Screen
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold apple-text-primary mb-2">
                  Hello {firstName}!
                </h1>
                <p className="text-xl apple-text-secondary">
                  What would you like to practice in German today?
                </p>
              </div>

              {/* Enhanced Conversation Input */}
              <div className="apple-card rounded-2xl p-6 shadow-lg">
                {/* Text Input */}
                <div className="mb-6">
                  <textarea
                    placeholder="My left knee is injured and I want to visit a doctor."
                    value={conversationInput}
                    onChange={(e) => setConversationInput(e.target.value)}
                    className="w-full px-4 py-4 apple-input rounded-xl text-base resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                </div>

                {/* Context and Difficulty Selectors */}
                <div className="flex space-x-4 mb-6">
                  {/* Context Level */}
                  <div className="flex-1 relative">
                    <label className="block text-sm font-medium apple-text-primary mb-2">Context</label>
                    <button
                      onClick={() => setShowContextDropdown(!showContextDropdown)}
                      className="w-full apple-input rounded-lg px-4 py-3 text-left flex items-center justify-between"
                    >
                      <span className="text-sm font-medium apple-text-primary">{contextLevel}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                    {showContextDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 apple-card rounded-lg shadow-lg z-10">
                        {contextLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setContextLevel(level);
                              setShowContextDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg apple-text-primary"
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Difficulty Level */}
                  <div className="flex-1 relative">
                    <label className="block text-sm font-medium apple-text-primary mb-2">Level</label>
                    <button
                      onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                      className="w-full apple-input rounded-lg px-4 py-3 text-left flex items-center justify-between"
                    >
                      <span className="text-sm font-medium apple-text-primary">{difficultyLevel}</span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>
                    {showDifficultyDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 apple-card rounded-lg shadow-lg z-10">
                        {difficultyLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setDifficultyLevel(level);
                              setShowDifficultyDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg apple-text-primary"
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
                    <button className="p-3 apple-input rounded-full hover:bg-gray-50 transition-colors">
                      <Mic className="h-5 w-5 text-gray-600" />
                    </button>
                    <button 
                      onClick={createNewConversation}
                      disabled={!conversationInput.trim()}
                      className="apple-button px-8 py-3 rounded-full flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}