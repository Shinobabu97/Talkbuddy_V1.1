import React, { useEffect, useState } from 'react';
import { Sparkles, Heart } from 'lucide-react';

interface OnboardingWelcomeProps {
  firstName: string;
  learningLanguage?: string;
  onComplete: () => void;
}

export default function OnboardingWelcome({ firstName, learningLanguage, onComplete }: OnboardingWelcomeProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Animate in after a brief delay
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">
          Welcome to TalkBuddy! 🎉
        </h2>
        <p className="text-text max-w-2xl mx-auto">
          You're all set, {firstName}! Ready to start your language learning journey?
        </p>
      </div>

      {/* Animated Character */}
      <div className="flex justify-center items-center min-h-[400px]">
        <div className={`relative transition-all duration-1000 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Main Character Circle */}
          <div className="relative w-64 h-64 mx-auto">
            {/* Outer Glow Ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse"></div>
            
            {/* Character Container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/40 via-primary to-primary/80 flex items-center justify-center shadow-2xl animate-gentle-bounce overflow-hidden">
              {/* Welcoming Character - Woman waving hello */}
              <div className="text-9xl relative z-10 animate-wave" style={{ transformOrigin: '50% 60%' }}>
                🙋‍♀️
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 animate-pulse"></div>
            </div>

            {/* Floating Particles */}
            <div className="absolute -top-4 -right-4 w-6 h-6 bg-accent rounded-full animate-particle-float shadow-lg" style={{ animationDelay: '0s' }}></div>
            <div className="absolute top-8 -left-6 w-4 h-4 bg-primary/60 rounded-full animate-particle-float shadow-lg" style={{ animationDelay: '1s' }}></div>
            <div className="absolute -bottom-4 left-8 w-5 h-5 bg-accent/80 rounded-full animate-particle-float shadow-lg" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-12 -right-8 w-4 h-4 bg-primary/50 rounded-full animate-particle-float shadow-lg" style={{ animationDelay: '1.5s' }}></div>

            {/* Sparkle Effects */}
            <div className="absolute top-0 left-1/4">
              <Sparkles className="h-6 w-6 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="absolute bottom-0 right-1/4">
              <Sparkles className="h-5 w-5 text-primary/60 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="absolute top-1/2 -right-4">
              <Heart className="h-5 w-5 text-red-400 animate-pulse" style={{ animationDelay: '1.5s' }} />
            </div>
          </div>

          {/* Welcome Message Bubble */}
          <div className={`mt-8 max-w-md mx-auto transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="card-glass p-6 border-2 border-primary/20 relative">
              {/* Speech Bubble Tail */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border-l-2 border-t-2 border-primary/20 rotate-45"></div>
              
              <div className="text-center space-y-3">
                <p className="text-xl font-bold text-text">
                  Hi {firstName}! 👋
                </p>
                <p className="text-text-muted">
                  I'm your TalkBuddy assistant! I'm here to help you practice {learningLanguage || 'your target language'} through real conversations.
                </p>
                <div className="flex items-center justify-center space-x-2 text-primary pt-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold">Let's start learning together!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className={`text-center transition-all duration-1000 delay-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={onComplete}
          className="btn-glossy px-8 py-4 text-lg flex items-center space-x-2 mx-auto"
        >
          <Sparkles className="h-5 w-5" />
          <span>Start My Learning Journey!</span>
        </button>
      </div>
    </div>
  );
}

