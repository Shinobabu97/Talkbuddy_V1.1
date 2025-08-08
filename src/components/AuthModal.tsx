import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthError } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  // Update mode when initialMode changes
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Clear messages and form when modal is closed
  React.useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setFormData({ firstName: '', lastName: '', email: '', password: '' });
      setShowPassword(false);
      setLoading(false);
      setCheckingUser(false);
    }
  }, [isOpen]);

  // Check if user exists when email changes during signup
  React.useEffect(() => {
    if (mode === 'signup' && formData.email && formData.email.includes('@')) {
      const checkUserExists = async () => {
        setCheckingUser(true);
        try {
          // Try to sign in with a dummy password to check if user exists
          const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: 'dummy-password-check-12345'
          });
          
          // If error is "Invalid login credentials", user doesn't exist (good)
          // If error is "Email not confirmed" or similar, user exists
          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              // User doesn't exist, clear any existing warnings
              if (message?.type === 'warning') {
                setMessage(null);
              }
            } else if (
              error.message.includes('Email not confirmed') ||
              error.message.includes('Invalid login') ||
              error.message.includes('Too many requests') ||
              error.message.includes('signup_disabled')
            ) {
              // User likely exists
              setMessage({
                type: 'warning',
                text: 'An account with this email already exists. Try logging in instead.'
              });
            }
          }
        } catch (err) {
          // Network or other errors - don't block signup
          console.warn('Error checking user existence:', err);
        } finally {
          setCheckingUser(false);
        }
      };

      const timeoutId = setTimeout(checkUserExists, 800); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [formData.email, mode, message?.type]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Only clear error messages, keep warnings for duplicate email
    if (message?.type === 'error') {
      setMessage(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow signup if there's a warning about existing user
    if (message?.type === 'warning') {
      setMessage({
        type: 'error',
        text: 'Please use a different email address or try logging in with this email.'
      });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      // Double-check user doesn't exist before attempting signup
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: 'dummy-password-check-12345'
      });
      
      if (checkError && !checkError.message.includes('Invalid login credentials')) {
        // User likely exists
        throw new Error('An account with this email already exists. Please try logging in instead.');
      }

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please try logging in instead.');
        } else if (error.message.includes('signup_disabled')) {
          throw new Error('Account registration is currently disabled. Please try again later.');
        } else if (error.message.includes('weak_password')) {
          throw new Error('Password is too weak. Please use at least 6 characters.');
        } else if (error.message.includes('invalid_email')) {
          throw new Error('Please enter a valid email address.');
        }
        throw error;
      }

      setMessage({
        type: 'success',
        text: 'Account created successfully! You can now start using TalkBuddy.'
      });
      
      // Clear form
      setFormData({ firstName: '', lastName: '', email: '', password: '' });
      
      // Auto-close modal after successful signup
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred during sign up. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        // Handle specific login errors
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }
        throw error;
      }

      onClose();
    } catch (error: any) {
      console.error('Login error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred during login. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes('rate_limit')) {
          throw new Error('Too many reset requests. Please wait before trying again.');
        }
        throw error;
      }

      setMessage({
        type: 'success',
        text: 'Password reset email sent! Please check your inbox.'
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred while sending reset email. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : message.type === 'warning'
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="John"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                      message?.type === 'warning' 
                        ? 'border-yellow-300 bg-yellow-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="john@example.com"
                    required
                  />
                  {checkingUser && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || checkingUser || message?.type === 'warning'}
                className={`w-full py-3 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                  loading || checkingUser || message?.type === 'warning'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 transform hover:scale-105'
                } disabled:transform-none`}
              >
                {loading || checkingUser ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {loading ? 'Creating Account...' : 'Checking Email...'}
                  </>
                ) : message?.type === 'warning' ? (
                  'Email Already Registered'
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setMessage(null);
                    }}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setMessage(null);
                  }}
                  className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                >
                  Forgot your password?
                </button>
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setMessage(null);
                    }}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Sending Reset Email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </button>

              <div className="text-center">
                <p className="text-gray-600">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setMessage(null);
                    }}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}