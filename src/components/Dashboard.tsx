import React from 'react';
import {
  Mic,
  LogOut,
  BookOpen,
  Clock,
  Star,
  Play,
  Target,
  Award,
  MessageCircle,
  Settings
} from 'lucide-react';
import { supabase, AuthUser } from '../lib/supabase';
import OnboardingFlow from './OnboardingFlow';

interface DashboardProps {
  user: AuthUser;
}

interface OnboardingData {
  profilePicture?: string;
  motivations: string[];
  customMotivation?: string;
  hobbies: string[];
  customHobbies: string[];
  hasWork: boolean;
  workDomain?: string;
  germanLevel: string;
  speakingFears: string[];
  timeline: string;
  goals: string[];
  conversationTopics: string[];
}

export default function Dashboard({ user }: DashboardProps) {
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [onboardingData, setOnboardingData] = React.useState<OnboardingData | null>(null);
  const [isNewUser, setIsNewUser] = React.useState(true);

  React.useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(`onboarding_${user.id}`);
    if (hasCompletedOnboarding) {
      setIsNewUser(false);
      setOnboardingData(JSON.parse(hasCompletedOnboarding));
    } else {
      setShowOnboarding(true);
    }
  }, [user.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setShowOnboarding(false);
    setIsNewUser(false);
    localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(data));
  };

  const handleRestartOnboarding = () => {
    setShowOnboarding(true);
  };

  const firstName = user.user_metadata?.first_name || 'User';

  // Show onboarding flow for new users or when requested
  if (showOnboarding) {
    return <OnboardingFlow user={user} onComplete={handleOnboardingComplete} />;
  }

  const mockStats = [
    { label: 'Conversations', value: '12', icon: MessageCircle, color: 'text-blue-600' },
    { label: 'Speaking Time', value: '2.5h', icon: Clock, color: 'text-green-600' },
    { label: 'Streak', value: '7 days', icon: Target, color: 'text-orange-600' },
    { label: 'Level', value: 'B1', icon: Award, color: 'text-purple-600' }
  ];

  // Use personalized topics if available, otherwise use defaults
  const recentTopics = onboardingData?.conversationTopics.length ? 
    onboardingData.conversationTopics.map((topic, index) => ({
      title: topic,
      duration: `${12 + index * 2} min`,
      completed: index < 2
    })) : [
      { title: 'Job Interview Practice', duration: '15 min', completed: true },
      { title: 'Restaurant Ordering', duration: '12 min', completed: true },
      { title: 'Travel Conversations', duration: '18 min', completed: false },
      { title: 'Business Meeting', duration: '20 min', completed: false }
    ];

  return (
    <div className="min-h-screen bg-gradient-glass-light">
      {/* Header */}
      <header className="header-glossy-light sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Mic className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900" style={{ textShadow: '0 2px 4px rgba(255, 255, 255, 0.5)' }}>TalkBuddy</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-800 font-medium" style={{ textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)' }}>Hi, {firstName}!</span>
              <button
                onClick={handleRestartOnboarding}
                className="flex items-center space-x-2 px-3 py-2 glass rounded-lg hover:glass-strong transition-all duration-200"
                title="Restart onboarding"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 btn-glossy-secondary rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-glass-light">
            {isNewUser ? `Welcome to TalkBuddy, ${firstName}! 🎉` : `Welcome back, ${firstName}! 👋`}
          </h1>
          <p className="text-gray-700-light text-lg">
            {isNewUser ? 
              "Let's start your German learning adventure!" : 
              "Ready to continue your language learning journey?"
            }
          </p>
          {onboardingData && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                Level: {onboardingData.germanLevel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {onboardingData.goals.length} Goals Set
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                {onboardingData.hobbies.length + onboardingData.customHobbies.length} Interests
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {mockStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card-glass-light no-hover rounded-xl p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold mb-1 text-glass-light">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-700-light">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Quick Start */}
          <div className="lg:col-span-2">
            <div className="card-glass-light no-hover rounded-xl p-4 lg:p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-glass-light">
                Quick Start
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <button className="p-4 glass-light-subtle actionable rounded-lg transition-all duration-300 text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <Play className="h-6 w-6 text-orange-600" />
                    <span className="font-semibold text-glass-light">Start New Conversation</span>
                  </div>
                  <p className="text-sm text-gray-700-light">
                    Begin a new speaking session with your AI partner
                  </p>
                </button>
                
                <button className="p-4 glass-light-subtle actionable rounded-lg transition-all duration-300 text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    <span className="font-semibold text-glass-light">Review Vocabulary</span>
                  </div>
                  <p className="text-sm text-gray-700-light">
                    Practice words and phrases from previous sessions
                  </p>
                </button>
              </div>
            </div>

            {/* Recent Topics */}
            <div className="card-glass-light no-hover rounded-xl p-4 lg:p-6">
              <h2 className="text-xl font-semibold mb-4 text-glass-light">
                {onboardingData?.conversationTopics.length ? 'Your Personalized Topics' : 'Recent Topics'}
              </h2>
              <div className="space-y-3">
                {recentTopics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-3 glass-light-subtle rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        topic.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div>
                        <div className="font-semibold text-glass-light">{topic.title}</div>
                        <div className="text-xs sm:text-sm text-gray-700-light">{topic.duration}</div>
                      </div>
                    </div>
                    <button className="text-orange-600 hover:text-orange-700 font-semibold text-xs sm:text-sm transition-colors duration-200 px-2 py-1 rounded hover:bg-orange-50">
                      {topic.completed ? 'Review' : 'Continue'}
                    </button>
                  </div>
                ))}
              </div>
              {onboardingData?.conversationTopics.length && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-600">
                    Topics personalized based on your interests and goals ✨
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Chart */}
            <div className="card-glass-light no-hover rounded-xl p-4 lg:p-6">
              <h3 className="text-lg font-semibold mb-4 text-glass-light">
                Weekly Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700-light">Speaking Time</span>
                  <span className="font-semibold text-gray-900-light">2.5h / 5h</span>
                </div>
                <div className="w-full glass-light-subtle rounded-full h-2">
                  <div className="progress-bar-orange h-2 rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700-light">Vocabulary Learned</span>
                  <span className="font-semibold text-gray-900-light">23 / 30</span>
                </div>
                <div className="w-full glass-light-subtle rounded-full h-2">
                  <div className="progress-bar-blue h-2 rounded-full" style={{ width: '77%' }}></div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="card-glass-light no-hover rounded-xl p-4 lg:p-6">
              <h3 className="text-lg font-semibold mb-4 text-glass-light">
                Recent Achievements
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 glass-light-subtle rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-glass-light">First Week</div>
                    <div className="text-xs text-gray-700-light">Completed 7 conversations</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 glass-light-subtle rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-glass-light">Consistent Learner</div>
                    <div className="text-xs text-gray-700-light">7-day streak</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Session */}
            <div className="btn-glossy rounded-xl p-4 lg:p-6 text-white">
              <h3 className="text-lg font-semibold mb-2 text-glow">
                {isNewUser ? "Ready to start speaking?" : "Ready for your next session?"}
              </h3>
              <p className="text-white/90 text-xs sm:text-sm mb-4">
                {isNewUser ? 
                  "Begin your journey with personalized German conversations." :
                  "Continue building your confidence with personalized conversations."
                }
              </p>
              <button className="w-full py-2 btn-glossy-secondary text-gray-900 rounded-lg font-semibold hover:scale-105 transition-transform duration-200">
                {isNewUser ? "Start First Conversation" : "Start Speaking"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}