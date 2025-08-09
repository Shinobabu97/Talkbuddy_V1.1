import React, { useState, useEffect, useRef } from 'react';
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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [preventDashboard] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const signingUpRef = useRef(false);

  const benefits = [
    {
      icon: Clock,
      title: "Always Available",
      description: "Practice speaking anytime, anywhere. Your AI partner never sleeps."
    },
    {
      icon: TrendingUp,
      title: "Personalized Learning",
      description: "Conversations that adapt to your pace and skill level automatically."
    },
    {
      icon: Shield,
      title: "Safe Environment",
      description: "Practice without fear of judgment. Make mistakes and learn naturally."
    },
    {
      icon: Users,
      title: "Real-World Topics",
      description: "From job interviews to casual conversations about your interests."
    },
    {
      icon: Target,
      title: "Build Confidence",
      description: "Transform from hesitant speaker to confident communicator."
    },
    {
      icon: CheckCircle,
      title: "Instant Feedback",
      description: "Receive helpful corrections and suggestions as you speak."
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Share Your Interests",
      description: "Tell us about your hobbies, goals, and background so we can personalize your experience."
    },
    {
      number: "2",
      title: "Get Custom Topics",
      description: "Receive conversation topics tailored to your interests and professional needs."
    },
    {
      number: "3",
      title: "Start Speaking",
      description: "Choose a topic and begin your conversation with your AI language partner."
    },
    {
      number: "4",
      title: "Review & Learn",
      description: "Get detailed feedback with corrections, suggestions, and new vocabulary."
    },
    {
      number: "5",
      title: "Track Progress",
      description: "Save useful phrases and track your improvement over time."
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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (signingUpRef.current) {
          await supabase.auth.signOut();
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata
          });
          setAuthModalOpen(false);
          setShowSuccessMessage(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        signingUpRef.current = false;
        setShowSuccessMessage(false);
      }
    });

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

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  useEffect(() => {
    if (user) return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          
          const staggerElements = entry.target.querySelectorAll('.stagger-animate');
          staggerElements.forEach((element, index) => {
            setTimeout(() => {
              element.classList.add('fade-in');
            }, index * 150);
          });
        } else {
          entry.target.classList.remove('fade-in');
          
          const staggerElements = entry.target.querySelectorAll('.stagger-animate');
          staggerElements.forEach((element) => {
            element.classList.remove('fade-in');
          });
        }
      });
    }, observerOptions);

    const initializeObserver = () => {
      requestAnimationFrame(() => {
        const sections = document.querySelectorAll('.scroll-animate');
        if (sections.length > 0) {
          sections.forEach((section) => observer.observe(section));
        } else {
          setTimeout(initializeObserver, 200);
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeObserver);
    } else if (document.readyState === 'interactive') {
      setTimeout(initializeObserver, 100);
    } else {
      initializeObserver();
    }

    return () => {
      observer.disconnect();
      document.removeEventListener('DOMContentLoaded', initializeObserver);
    };
  }, [user]);

  const handleAuthModal = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setShowSuccessMessage(false);
    signingUpRef.current = false;
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

  if (user && !preventDashboard) {
    return <Dashboard user={user} />;
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="relative z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Mic className="h-7 w-7 text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">TalkBuddy</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Home</a>
              <a href="#benefits" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Reviews</a>
              <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
            </nav>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => handleAuthModal('login')}
                className="hidden md:inline-flex px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm"
              >
                Sign In
              </button>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-2 py-2 space-y-2">
              <a href="#home" className="block py-2 text-sm text-gray-600 hover:text-gray-900">Home</a>
              <a href="#benefits" className="block py-2 text-sm text-gray-600 hover:text-gray-900">Features</a>
              <a href="#how-it-works" className="block py-2 text-sm text-gray-600 hover:text-gray-900">How It Works</a>
              <a href="#testimonials" className="block py-2 text-sm text-gray-600 hover:text-gray-900">Reviews</a>
              <a href="#faq" className="block py-2 text-sm text-gray-600 hover:text-gray-900">FAQ</a>
              <button 
                onClick={() => handleAuthModal('login')}
                className="w-full mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden py-24 lg:py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-10">
              <div className="space-y-6">
                <p className="text-blue-600 font-medium text-sm uppercase tracking-wider">
                  AI Language Learning
                </p>
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
                  Practice Speaking with Confidence
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  Your personal AI language partner that listens, adapts, and helps you build real speaking confidence.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleAuthModal('signup')}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
                >
                  Start Free Trial
                </button>
                <div className="flex items-center space-x-3 text-gray-500 text-sm">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span>4.9/5 from 5,500+ learners</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
                <img 
                  src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop" 
                  alt="Person practicing language with TalkBuddy" 
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-500">AI Partner Active</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">"Let's practice ordering at a restaurant. I'll be the waiter, and you're the customer..."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-white border-y border-gray-100 scroll-animate">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Trusted by Language Learners Worldwide
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Join over 5,500+ professionals, students, and language enthusiasts
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center stagger-animate">
              <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 hover:bg-blue-100 hover:scale-110 transition-all duration-300">
                <Users className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Working Professionals</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Building confidence for meetings and presentations</p>
            </div>
            
            <div className="text-center stagger-animate">
              <div className="bg-green-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 hover:bg-green-100 hover:scale-110 transition-all duration-300">
                <Target className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">University Students</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Preparing for academic discussions and social interactions</p>
            </div>
            
            <div className="text-center stagger-animate">
              <div className="bg-purple-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 hover:bg-purple-100 hover:scale-110 transition-all duration-300">
                <Star className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Language Enthusiasts</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Passionate learners perfecting their speaking skills</p>
            </div>
            
            <div className="text-center stagger-animate">
              <div className="bg-orange-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 hover:bg-orange-100 hover:scale-110 transition-all duration-300">
                <Shield className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">International Teams</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Improving cross-cultural communication</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-gray-50 scroll-animate">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Features That Make a Difference
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Everything you need to build speaking confidence and fluency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-gray-200 group stagger-animate"
                >
                  <div className="mb-6">
                    <Icon className="h-8 w-8 text-blue-600 mb-4 group-hover:text-blue-700 transition-colors duration-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {benefit.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white scroll-animate">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Simple steps to start improving your speaking skills
            </p>
          </div>

          <div className="space-y-12">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="flex flex-col lg:flex-row items-center gap-8 stagger-animate"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-semibold">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-gray-50 scroll-animate">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              What Learners Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Stories from learners who transformed their speaking confidence
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 px-4">
                  <div className="bg-white rounded-xl p-8 shadow-sm max-w-2xl mx-auto border border-gray-100">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-gray-700 mb-6 leading-relaxed">
                      "{testimonial.text}"
                    </blockquote>
                    <div>
                      <cite className="text-gray-900 font-medium">
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
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white scroll-animate">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Common Questions
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Everything you need to know to get started
            </p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors duration-200">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors duration-200"
                >
                  <span className="font-medium text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                      openFAQ === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openFAQ === index && (
                  <div className="px-6 pb-5">
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
      <footer className="bg-gray-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Build Your Confidence?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of learners building speaking confidence with TalkBuddy
            </p>
            <button 
              onClick={() => handleAuthModal('signup')}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
            >
              Start Free Trial
            </button>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <Mic className="h-7 w-7 text-blue-400" />
                  <span className="text-xl font-semibold">TalkBuddy</span>
                </div>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Your AI language partner for building real speaking confidence through personalized conversations.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-4 text-sm">Product</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Reviews</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-4 text-sm">Legal</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
              <p>&copy; 2025 TalkBuddy. All rights reserved.</p>
            </div>
          </div>
          </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        showSuccessMessage={showSuccessMessage}
        onSignUpStart={() => {
          signingUpRef.current = true;
        }}
      />
    </div>
  );
}

export default App;
