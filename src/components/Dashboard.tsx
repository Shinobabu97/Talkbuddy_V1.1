import React, { useState } from 'react';
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
  Play
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

  React.useEffect(() => {
    loadOnboardingData();
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

  // Mock conversation data
  const conversations = [
    { id: '1', title: 'Doctor Visit Practice', preview: 'My left knee is injured...', time: '2 min ago', unread: true },
    { id: '2', title: 'Restaurant Ordering', preview: 'I would like to order...', time: '1 hour ago', unread: false },
    { id: '3', title: 'Job Interview Prep', preview: 'Tell me about yourself...', time: 'Yesterday', unread: false },
    { id: '4', title: 'Travel Planning', preview: 'I need to book a hotel...', time: '2 days ago', unread: false },
    { id: '5', title: 'Shopping Conversation', preview: 'Where can I find...', time: '3 days ago', unread: false },
  ];

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Mic className="h-6 w-6 text-blue-500" />
              <span className="text-lg font-semibold text-gray-900">TalkBuddy</span>
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
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2.5 flex items-center justify-center space-x-2 transition-colors font-medium">
            <Plus className="h-4 w-4" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Conversation Categories */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Conversation Categories</h3>
          <div className="space-y-1">
            {conversationCategories.map((category) => (
              <button
                key={category}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
              >
                {category}
              </button>
            ))}
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Conversations</h3>
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
                    <h4 className={`text-sm font-medium truncate ${
                      conversation.unread ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {conversation.title}
                    </h4>
                    {conversation.unread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">{conversation.preview}</p>
                  <p className="text-xs text-gray-400">{conversation.time}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Settings</h3>
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
              <p className="text-sm font-medium text-gray-900">{firstName}</p>
              <p className="text-xs text-gray-500">User ID</p>
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
                  <h2 className="text-lg font-semibold text-gray-900">
                    {conversations.find(c => c.id === selectedConversation)?.title}
                  </h2>
                  <p className="text-sm text-gray-500">AI Language Partner</p>
                </div>
                <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  End Conversation
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3 max-w-xs">
                  <p className="text-sm text-gray-900">Hello! I'm your AI language partner. What would you like to practice today?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-xs">
                  <p className="text-sm">My left knee is injured and I want to visit a doctor.</p>
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
                    value={conversationInput}
                    onChange={(e) => setConversationInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full transition-colors">
                  <Send className="h-4 w-4" />
                </button>
                <button className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-colors">
                  <Mic className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Welcome Screen
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Hello {firstName}!
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                What would you like to practice in German today?
              </p>

              {/* Conversation Input */}
              <div className="mb-6">
                <textarea
                  placeholder="My left knee is injured and I want to visit a doctor."
                  value={conversationInput}
                  onChange={(e) => setConversationInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Context and Difficulty Selectors */}
              <div className="flex space-x-4 mb-6">
                {/* Context Level */}
                <div className="flex-1 relative">
                  <button
                    onClick={() => setShowContextDropdown(!showContextDropdown)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-300 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">{contextLevel}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  {showContextDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {contextLevels.map((level) => (
                        <button
                          key={level}
                          onClick={() => {
                            setContextLevel(level);
                            setShowContextDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Difficulty Level */}
                <div className="flex-1 relative">
                  <button
                    onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-300 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">{difficultyLevel}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  {showDifficultyDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {difficultyLevels.map((level) => (
                        <button
                          key={level}
                          onClick={() => {
                            setDifficultyLevel(level);
                            setShowDifficultyDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ask Button */}
              <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-8 py-3 flex items-center justify-center space-x-2 mx-auto transition-colors font-medium">
                <Play className="h-4 w-4" />
                <span>Ask</span>
              </button>
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