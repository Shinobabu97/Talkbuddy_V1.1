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
  MessageCircle
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
  const [currentView, setCurrentView] = useState<'dashboard' | 'vocab'>('dashboard');

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

      // Add to conversations list
      setConversations(prev => [data, ...prev]);
      
      // Select the new conversation
      setSelectedConversation(data.id);
      
      // Clear input
      setConversationInput('');
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
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
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
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
    <>
      <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-
  )
}between mb-4">
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
              onClick={() => {
                setCurrentView('dashboard');
                setSelectedConversation(null);
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                currentView === 'dashboard' && !selectedConversation
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-1" />
              Dashboard
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
          <h3 className="text-sm font-medium text-gray-700 mb-3 apple-text-primary">Search Conversations</h3>
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
          
          {/* Filter Categories */}
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {conversationCategories.map((category) => (
                <button
                  key={category}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3 apple-text-primary">Recent Conversations</h3>
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
                    onClick={() => setSelectedConversation(conversation.id)}
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
                <p className="text-sm apple-text-secondary">No conversations yet</p>
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
              <div className="flex justify-start">
                <div className="apple-card rounded-2xl rounded-tl-md px-4 py-3 max-w-xs">
                  <p className="text-sm apple-text-primary">Hello! I'm your AI language partner. What would you like to practice today?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-xs">
                  <p className="text-sm">{conversations.find(c => c.id === selectedConversation)?.preview}</p>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 apple-input rounded-full text-sm"
                  />
                </div>
                <button className="apple-button p-3 rounded-full">
                  <Send className="h-4 w-4 text-white" />
                </button>
                <button className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors">
                  <Mic className="h-4 w-4" />
                </button>
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
        ) : currentView === 'dashboard' && !selectedConversation ? (
          // Progress Dashboard View
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold apple-text-primary mb-2">Progress Dashboard</h2>
              <p className="text-lg apple-text-secondary">Track your learning progress and practice sessions</p>
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
                  <div className="flex space-x-3">
                  <button 
                    onClick={createNewConversation}
                    disabled={!conversationInput.trim()}
                    className="apple-button px-8 py-3 rounded-full flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4" />
                    <span>Ask</span>
                  </button>
                  
                  <button className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors">
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
