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
  MessageCircle
} from 'lucide-react';
import { supabase, AuthUser } from '../lib/supabase';

interface DashboardProps {
  user: AuthUser;
}

export default function Dashboard({ user }: DashboardProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const firstName = user.user_metadata?.first_name || 'User';

  const mockStats = [
    { label: 'Conversations', value: '12', icon: MessageCircle, color: 'text-blue-600' },
    { label: 'Speaking Time', value: '2.5h', icon: Clock, color: 'text-green-600' },
    { label: 'Streak', value: '7 days', icon: Target, color: 'text-orange-600' },
    { label: 'Level', value: 'B1', icon: Award, color: 'text-purple-600' }
  ];

  const recentTopics = [
    { title: 'Job Interview Practice', duration: '15 min', completed: true },
    { title: 'Restaurant Ordering', duration: '12 min', completed: true },
    { title: 'Travel Conversations', duration: '18 min', completed: false },
    { title: 'Business Meeting', duration: '20 min', completed: false }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Mic className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold text-white">TalkBuddy</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Hi, {firstName}!</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
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
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-gray-300 text-lg">
            Ready to continue your language learning journey?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {mockStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-gray-800/95 rounded-xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-300">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Start */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/95 rounded-xl p-6 shadow-lg border border-gray-700 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Quick Start
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <button className="p-4 bg-emerald-900/30 hover:bg-emerald-900/50 rounded-lg border border-emerald-600 transition-colors text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <Play className="h-6 w-6 text-emerald-400" />
                    <span className="font-medium text-white">Start New Conversation</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    Begin a new speaking session with your AI partner
                  </p>
                </button>
                
                <button className="p-4 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg border border-blue-500 transition-colors text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <BookOpen className="h-6 w-6 text-blue-400" />
                    <span className="font-medium text-white">Review Vocabulary</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    Practice words and phrases from previous sessions
                  </p>
                </button>
              </div>
            </div>

            {/* Recent Topics */}
            <div className="bg-gray-800/95 rounded-xl p-6 shadow-lg border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Recent Topics
              </h2>
              <div className="space-y-3">
                {recentTopics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        topic.completed ? 'bg-emerald-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <div className="font-medium text-white">{topic.title}</div>
                        <div className="text-sm text-gray-300">{topic.duration}</div>
                      </div>
                    </div>
                    <button className="text-emerald-400 hover:text-emerald-300 font-medium text-sm">
                      {topic.completed ? 'Review' : 'Continue'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Chart */}
            <div className="bg-gray-800/95 rounded-xl p-6 shadow-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Weekly Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Speaking Time</span>
                  <span className="font-medium text-white">2.5h / 5h</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Vocabulary Learned</span>
                  <span className="font-medium text-white">23 / 30</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '77%' }}></div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-gray-800/95 rounded-xl p-6 shadow-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Achievements
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-900/50 rounded-full flex items-center justify-center">
                    <Star className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">First Week</div>
                    <div className="text-xs text-gray-300">Completed 7 conversations</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-900/50 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">Consistent Learner</div>
                    <div className="text-xs text-gray-300">7-day streak</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Session */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">
                Ready for your next session?
              </h3>
              <p className="text-emerald-100 text-sm mb-4">
                Continue building your confidence with personalized conversations.
              </p>
              <button className="w-full py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium">
                Start Speaking
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}