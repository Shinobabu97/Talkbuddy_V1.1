import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  Clock, 
  TrendingUp, 
  Shield, 
  Users, 
  Target, 
  CheckCircle,
  Star,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { supabase, AuthUser } from './lib/supabase';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Move data arrays and useEffect hooks before any conditional returns
  const benefits = [
    {
      icon: Clock,
      title: "Available 24/7",
      description: "Practice whenever inspiration strikes - early morning, lunch break, or late night study sessions."
    },
    {
      icon: TrendingUp,
      title: "Adapts to Your Level",
      description: "Whether you're a complete beginner or intermediate learner, conversations match your skill level."
    },
    {
      icon: Shield,
      title: "Zero Judgment Zone",
      description: "Make mistakes freely without embarrassment, eye rolls, or impatient sighs."
    },
    {
      icon: Users,
      title: "Custom Conversation Topics",
      description: "Practice job interviews, ordering food, making friends, or discussing your hobbies."
    },
    {
      icon: Target,
      title: "Builds Real Confidence",
      description: "Graduate from textbook phrases to natural conversation flow."
    },
    {
      icon: CheckCircle,
      title: "Instant Feedback",
      description: "Get gentle corrections and suggestions in real-time to improve naturally."
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Tell Us About You",
      description: "Share your hobbies, interests, learning goals, and work background so your AI buddy gets to know the real you."
    },
    {
      number: "2",
      title: "Get Your Personal Topic Menu",
      description: "Based on what you shared, we create conversation topics that actually matter to you - from your career field to weekend hobbies."
    },
    {
      number: "3",
      title: "Choose & Start Speaking",
      description: "Pick any topic that sparks your interest and start talking out loud with your AI language partner who knows your context."
    },
    {
      number: "4",
      title: "Review Your Speaking Session",
      description: "After each conversation, see your full speaking transcript with helpful corrections, better phrasing suggestions, and new vocabulary you could have used."
    },
    {
      number: "5",
      title: "Save Your Progress",
      description: "Bookmark useful sentences and vocab words to review later, building your personal speaking library as you go."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Manager",
      rating: 5,
      text: "TalkBuddy helped me gain confidence for client presentations. The AI is so patient and understanding - I actually look forward to practicing now!"
    },
    {
      name: "Miguel Rodriguez",
      role: "University Student",
      rating: 5,
      text: "As an international student, TalkBuddy was a game-changer. I went from being terrified of speaking in class to actively participating in discussions."
    },
    {
      name: "Priya Patel",
      role: "Software Engineer",
      rating: 5,
      text: "The personalized topics based on my work in tech made all the difference. I can now confidently lead team meetings and present my ideas clearly."
    },
    {
      name: "James Wilson",
      role: "Business Traveler",
      rating: 5,
      text: "Before my 6-month assignment in Germany, TalkBuddy helped me practice real-world scenarios. I felt prepared and confident from day one."
    }
  ];

  const faqs = [
    {
      question: "How does TalkBuddy work?",
      answer: "Tell us about your interests and goals, then speak out loud with your AI language partner about topics that matter to you. After each conversation, review your transcript with corrections and new vocabulary you can bookmark for later practice."
    },
    {
      question: "What if I'm nervous or make mistakes while speaking?",
      answer: "That's exactly why TalkBuddy exists! Your AI buddy has infinite patience for stumbles, \"um's,\" and mistakes. It's designed to help you build confidence in a judgment-free environment before speaking with real people."
    },
    {
      question: "Do I need to download anything or use special equipment?",
      answer: "No downloads needed - TalkBuddy works in your web browser on any device. You just need a microphone (most phones and computers have one built-in) to start speaking."
    },
    {
      question: "Can complete beginners use this?",
      answer: "Absolutely! During setup, tell us your level and your AI partner will adjust to speak at your pace. Whether you know 10 words or 1000, we'll meet you where you are and help you improve naturally."
    },
    {
      question: "Is there a free way to try it?",
      answer: "Yes, you can try your first 10 conversations free to see how TalkBuddy helps build your speaking confidence - no credit card required."
    }
  ];

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          user_metadata: session.user.user_metadata
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          user_metadata: session.user.user_metadata
        });
        setAuthModalOpen(false);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Element is entering viewport - animate in
          entry.target.classList.add('fade-in');
          
          // Add staggered animation to child elements with delay
          const staggerElements = entry.target.querySelectorAll('.stagger-animate');
          staggerElements.forEach((element, index) => {
            setTimeout(() => {
              element.classList.add('fade-in');
            }, index * 200);
          });
        } else {
          // Element is leaving viewport - reset for next time
          entry.target.classList.remove('fade-in');
          
          // Reset child elements too
          const staggerElements = entry.target.querySelectorAll('.stagger-animate');
          staggerElements.forEach((element) => {
            element.classList.remove('fade-in');
          });
        }
      });
    }, observerOptions);

    // Wait for DOM to be ready
    setTimeout(() => {
      const sections = document.querySelectorAll('.scroll-animate');
      sections.forEach((section) => observer.observe(section));
    }, 100);

    return () => observer.disconnect();
  }, []);

  const handleAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Mic className="h-12 w-12 text-orange-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading TalkBuddy...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <style jsx>{`
        .scroll-animate {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }
        
        .scroll-animate.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
        
        .stagger-animate {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease-out;
        }
        
        .stagger-animate.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
        
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        
        .pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
        
        .gentle-bounce {
          animation: gentleBounce 4s ease-in-out infinite;
        }
        
        .subtle-bg-shift {
          background: linear-gradient(45deg, #fef7ed 0%, #fff7ed 50%, #fef7ed 100%);
          background-size: 200% 200%;
          animation: subtleShift 20s ease-in-out infinite;
        }
        
        .soft-glow {
          animation: softGlow 4s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulseGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(251, 146, 60, 0.3);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(251, 146, 60, 0.5);
            transform: scale(1.02);
          }
        }
        
        @keyframes gentleBounce {
          0%, 100% { transform: translateY(0px); }
          25% { transform: translateY(-5px); }
          75% { transform: translateY(-2px); }
        }
        
        @keyframes subtleShift {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
        
        @keyframes softGlow {
          0%, 100% { 
            box-shadow: 0 0 40px rgba(251, 146, 60, 0.25);
            opacity: 0.4;
          }
          50% { 
            box-shadow: 0 0 70px rgba(251, 146, 60, 0.4);
            opacity: 0.6;
          }
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Header */}
      <header className="relative z-50 bg-white/90 backdrop-blur-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Mic className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">TalkBuddy</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 hover:text-blue-600 transition-colors">Home</a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-600 transition-colors">Benefits</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors">Reviews</a>
              <a href="#faq" className="text-gray-700 hover:text-blue-600 transition-colors">FAQ</a>
            </nav>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => handleAuthModal('login')}
                className="hidden md:inline-flex px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 font-medium"
              >
                Login
              </button>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-orange-100 hover:bg-orange-200 transition-colors"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-orange-200">
            <div className="px-2 py-2 space-y-2">
              <a href="#home" className="block py-2 text-gray-700 hover:text-blue-600">Home</a>
              <a href="#benefits" className="block py-2 text-gray-700 hover:text-blue-600">Benefits</a>
              <a href="#how-it-works" className="block py-2 text-gray-700 hover:text-blue-600">How It Works</a>
              <a href="#testimonials" className="block py-2 text-gray-700 hover:text-blue-600">Reviews</a>
              <a href="#faq" className="block py-2 text-gray-700 hover:text-blue-600">FAQ</a>
              <button 
                onClick={() => handleAuthModal('login')}
                className="w-full mt-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden py-20 lg:py-28 subtle-bg-shift">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-orange-600 font-medium uppercase tracking-wide">
                  Introducing Your Personal AI Language Coach
                </p>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  The Language Partner Who Actually Listens
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Talk to an AI friend with infinite patience for your 'um's and 'uh's— one that adapts to your pace, cheers you on, and helps you build confidence before facing real conversations.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleAuthModal('signup')}
                  className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 font-medium text-lg shadow-lg"
                >
                  Try Your First Conversation
                </button>
                <div className="flex items-center space-x-2 text-gray-600">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span className="font-medium">4.9/5 from 5,500+ users</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-200 to-orange-300 rounded-full transform scale-110 soft-glow"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl">
                <img 
                  src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop" 
                  alt="Person practicing language with TalkBuddy" 
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">AI Language Partner Active</span>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">"Let's practice ordering at a restaurant. I'll be the waiter, and you're the customer..."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-white/80 backdrop-blur-sm mb-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <p className="text-center text-gray-600 mb-8">
            More than 5,500+ language learners trust TalkBuddy
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-2xl font-bold text-gray-700">Working Professionals</div>
            <div className="text-2xl font-bold text-gray-700">University Students</div>
            <div className="text-2xl font-bold text-gray-700">Language Enthusiasts</div>
            <div className="text-2xl font-bold text-gray-700">International Teams</div>
            
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 relative subtle-bg-shift scroll-animate" style={{ marginTop: '0', paddingTop: '5rem' }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why TalkBuddy Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience personalized language learning that adapts to your needs and builds real confidence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={index}
                  className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 border border-orange-200 hover:border-orange-300 group hover:bg-orange-50/80 stagger-animate"
                >
                  <div className="mb-4">
                    <Icon className="h-10 w-10 text-orange-600 mb-3 group-hover:text-orange-700 transition-colors duration-300" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-gray-900 transition-colors duration-300">
                      {benefit.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white/90 backdrop-blur-sm relative scroll-animate">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f97316' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes and begin building your speaking confidence today
            </p>
          </div>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 border border-orange-200 hover:border-orange-300 group hover:bg-orange-50/80 stagger-animate"
              >
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold group-hover:scale-110 group-hover:bg-orange-700 transition-all duration-300">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2 group-hover:text-orange-700 transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gradient-to-b from-amber-50 to-orange-50 relative scroll-animate">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from people who transformed their speaking confidence
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 px-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg max-w-2xl mx-auto border border-orange-200">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-lg text-gray-700 mb-6 italic">
                      "{testimonial.text}"
                    </blockquote>
                    <div>
                      <cite className="text-gray-900 font-semibold">
                        {testimonial.name}
                      </cite>
                      <p className="text-gray-600 text-sm">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                    index === currentTestimonial ? 'bg-orange-600' : 'bg-orange-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white/90 backdrop-blur-sm relative scroll-animate">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f97316' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about TalkBuddy
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-orange-200 hover:border-orange-300 transition-colors duration-200">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-orange-50 transition-colors duration-200"
                >
                  <span className="font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                      openFAQ === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openFAQ === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Speaking with Confidence?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of learners who've transformed their speaking skills with TalkBuddy
            </p>
            <button 
              onClick={() => handleAuthModal('signup')}
              className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 font-medium text-lg shadow-lg"
            >
              Try Your First Conversation
            </button>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <Mic className="h-8 w-8 text-orange-400" />
                  <span className="text-2xl font-bold">TalkBuddy</span>
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Your AI-powered language partner that helps you build real speaking confidence through personalized, judgment-free conversations.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Reviews</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2025 TalkBuddy. All rights reserved. Built for language learners who want to speak with confidence.</p>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}

export default App;