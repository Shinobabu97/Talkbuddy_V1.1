import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
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
      setEmailExists(null);
      setCheckingEmail(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null); // Clear any previous messages
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Check email existence when email changes (only in signup mode)
    if (e.target.name === 'email' && mode === 'signup') {
      setEmailExists(null); // Reset previous check
      if (e.target.value && e.target.value.includes('@')) {
        // Debounce the check to avoid too many API calls
        setTimeout(() => {
          if (formData.email === e.target.value) { // Only check if email hasn't changed again
            checkEmailExists(e.target.value);
          }
        }, 500);
      }
    }
  };

  const checkEmailExists = async (emailToCheck?: string) => {
    const email = emailToCheck || formData.email;
    if (!email || mode !== 'signup') return;
    
    setCheckingEmail(true);
    try {
      // Try to sign in with a known invalid password
      // This will give us different error messages for existing vs non-existing users
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'invalid-password-check-123456789'
      });
      
      if (error) {
        // Check the error message to determine if user exists
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Email not confirmed') ||
            error.message.includes('Invalid email or password')) {
          // User exists but password is wrong (which is expected)
          setEmailExists(true);
          setMessage({
            type: 'error',
            text: 'An account with this email already exists. Please try logging in instead.'
          });
        } else {
          // User doesn't exist or other error
          setEmailExists(false);
          setMessage(null);
        }
      } else {
        // This shouldn't happen with our invalid password, but just in case
        setEmailExists(true);
        setMessage({
          type: 'error',
          text: 'An account with this email already exists. Please try logging in instead.'
        });
      }
    } catch (error) {
      // If there's a network error or other issue, assume user doesn't exist
      setEmailExists(false);
      setMessage(null);
    } finally {
      setCheckingEmail(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If we already know the email exists, don't proceed
    if (emailExists === true) {
      setMessage({
        type: 'error',
        text: 'An account with this email already exists. Please try logging in instead.'
      });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (error) throw error;

      // User created successfully
      setMessage({
        type: 'success',
        text: 'Account created successfully! Please check your email to confirm your account.'
      });

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred during signup. Please try again.'
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      onClose();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Invalid login credentials'
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

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Password reset email sent! Please check your inbox.'
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred while sending reset email'
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
                    onFocus={() => checkEmailExists()}
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
                  {checkingEmail && (
                    <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="animate-spin h-4 w-4 text-orange-500" />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || emailExists === true}
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
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
                  onClick={() => setMode('forgot')}
                  className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                >
                  Forgot your password?
                </button>
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
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
                    onClick={() => setMode('login')}
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