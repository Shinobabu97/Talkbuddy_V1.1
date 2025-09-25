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
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const signingUpRef = useRef(false);

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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (signingUpRef.current) {
          signingUpRef.current = false;
          setShowSuccessMessage(true);
          setAuthModalOpen(true);
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

  if (user) {
    return <Dashboard user={user} />;
  }

  return (
    <div className="min-h-screen bg-continuous-hero">

      {/* Header */}
      <header className="relative z-50 header-glossy-light sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Mic className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">TalkBuddy</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 hover:text-blue-600 transition-all duration-300 font-medium">Home</a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-600 transition-all duration-300 font-medium">Benefits</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-all duration-300 font-medium">How It Works</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-all duration-300 font-medium">Reviews</a>
              <a href="#faq" className="text-gray-700 hover:text-blue-600 transition-all duration-300 font-medium">FAQ</a>
            </nav>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => handleAuthModal('login')}
                className="hidden md:inline-flex px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Login
              </button>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg glass hover:glass-strong transition-all duration-300"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden glass-strong border-t border-white/20" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
            <div className="px-2 py-2 space-y-2">
              <a href="#home" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">Home</a>
              <a href="#benefits" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">Benefits</a>
              <a href="#how-it-works" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">How It Works</a>
              <a href="#testimonials" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">Reviews</a>
              <a href="#faq" className="block py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium">FAQ</a>
              <button 
                onClick={() => handleAuthModal('login')}
                className="w-full mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden py-20 lg:py-28 section-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-blue-600 font-semibold uppercase tracking-wide">
                  Introducing Your Personal AI Language Coach
                </p>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  The Language Partner Who Actually Listens
                </h1>
                <p className="text-xl text-gray-700 leading-relaxed">
                  Talk to an AI friend with infinite patience for your 'um's and 'uh's— one that adapts to your pace, cheers you on, and helps you build confidence before facing real conversations.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleAuthModal('signup')}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg"
                >
                  Try Your First Conversation
                </button>
                <div className="flex items-center space-x-2 text-gray-700">
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
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100/60 to-indigo-100/60 rounded-full transform scale-110 opacity-40"></div>
              <div className="relative card-glass rounded-2xl p-8 shadow-glass-xl">
                <img 
                  src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=500&h=500&fit=crop" 
                  alt="Person practicing language with TalkBuddy" 
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-700 font-medium">AI Language Partner Active</span>
                  </div>
                  <div className="glass-subtle rounded-lg p-3">
                    <p className="text-sm text-gray-700 italic">"Let's practice ordering at a restaurant. I'll be the waiter, and you're the customer..."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 scroll-animate social-proof-highlight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by Language Learners Worldwide
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Join a community of over 5,500+ professionals, students, and language enthusiasts
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center stagger-animate">
              <div className="bg-white/80 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Working Professionals</h3>
              <p className="text-gray-600 text-sm">Building confidence for meetings and presentations</p>
            </div>
            
            <div className="text-center stagger-animate">
              <div className="bg-white/80 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">University Students</h3>
              <p className="text-gray-600 text-sm">Preparing for academic discussions and social interactions</p>
            </div>
            
            <div className="text-center stagger-animate">
              <div className="bg-white/80 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Language Enthusiasts</h3>
              <p className="text-gray-600 text-sm">Passionate learners perfecting their speaking skills</p>
            </div>
            
            <div className="text-center stagger-animate">
              <div className="bg-white/80 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">International Teams</h3>
              <p className="text-gray-600 text-sm">Improving cross-cultural communication</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 relative scroll-animate section-divider" style={{ marginTop: '0', paddingTop: '5rem' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  className="bg-white/90 rounded-xl p-6 shadow-lg group stagger-animate hover:shadow-xl transition-all duration-300"
                >
                  <div className="mb-4">
                    <Icon className="h-10 w-10 text-blue-600 mb-3 transition-colors duration-300" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 scroll-animate section-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                className="bg-white/90 rounded-xl p-6 shadow-lg group stagger-animate hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 shadow-lg">
                      {step.number}
                    </div>
                  </div>
                  <div className="flex-1 text-center lg:text-left">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
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
      <section id="testimonials" className="py-20 relative scroll-animate section-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <div className="bg-white/90 rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
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
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 scroll-animate section-divider">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <div key={index} className="bg-white/90 rounded-lg shadow-lg transition-all duration-300">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-all duration-300 rounded-lg"
                >
                  <span className="font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-600 transition-transform duration-300 ${
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
      <footer className="py-16 relative footer-dark section-top-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Ready to Start Speaking with Confidence?
            </h2>
            <p className="text-xl mb-8 text-gray-300">
              Join thousands of learners who've transformed their speaking skills with TalkBuddy
            </p>
            <button 
              onClick={() => handleAuthModal('signup')}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg"
            >
              Try Your First Conversation
            </button>
          </div>

          <div className="border-t border-gray-300/30 pt-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <Mic className="h-8 w-8 text-blue-400" />
                  <span className="text-2xl font-bold text-white">TalkBuddy</span>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Your AI-powered language partner that helps you build real speaking confidence through personalized, judgment-free conversations.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 text-white">Product</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Reviews</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 text-white">Legal</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/20 mt-8 pt-8 text-center text-gray-300">
              <p>&copy; 2025 TalkBuddy. All rights reserved. Built for language learners who want to speak with confidence.</p>
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
