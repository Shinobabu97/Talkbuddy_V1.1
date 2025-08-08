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

  // Check if user exists when email field loses focus (onBlur)
  const handleEmailBlur = async () => {
    if (!formData.email || mode !== 'signup' || checkingUser || loading) {
      return;
    }
    
    // Only check if email looks valid
    if (formData.email.includes('@') && formData.email.includes('.')) {
      setCheckingUser(true);
      setMessage(null); // Clear any existing messages
      
      try {
        // Use signInWithPassword with a known wrong password to check if user exists
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: 'intentionally-wrong-password-12345'
        });
        
        console.log('Email check response:', { data, error }); // Debug log
        
        if (error) {
          console.log('Email check error:', error.message); // Debug log
          
          const errorMessage = error.message.toLowerCase();
          
          // If we get "invalid login credentials", it means the user exists but password is wrong
          if (errorMessage.includes('invalid login credentials')) {
            // User exists in auth table
            console.log('Email already exists in auth table - user found'); // Debug log
            setMessage({
              type: 'error',
              text: 'An account with this email already exists. Please try logging in instead.'
            });
          } else if (errorMessage.includes('email not confirmed') || 
                     errorMessage.includes('email not verified')) {
            // User exists but email not confirmed
            console.log('Email exists but not confirmed'); // Debug log
            setMessage({
              type: 'error',
              text: 'An account with this email already exists. Please check your email for verification or try logging in.'
            });
          } else if (errorMessage.includes('user not found') || 
                     errorMessage.includes('email not found') ||
                     errorMessage.includes('no user found')) {
            // Email doesn't exist - good for signup
            console.log('Email is available for signup - user not found'); // Debug log
            setMessage(null);
          } else {
            // Other errors - assume email is available
            console.log('Other error (assuming email available):', error.message);
            setMessage(null);
          }
        } else {
          // This shouldn't happen with wrong password, but if it does, user exists
          console.log('Unexpected success - user might exist'); // Debug log
          setMessage(null); // Don't block signup
        }
      } catch (error) {
        console.log('Network/unexpected error:', error);
        setMessage(null);
      } finally {
        setCheckingUser(false);
      }
    } else {
      // Invalid email format - clear any existing messages
      setMessage(null);
    }
  };

  // Alternative method using admin API (if available)
  const handleEmailBlurAlternative = async () => {
    if (!formData.email || mode !== 'signup' || checkingUser || loading) return;
    
    // Only check if email looks valid
    if (formData.email.includes('@') && formData.email.includes('.')) {
      setCheckingUser(true);
      setMessage(null);
      
      try {
        // Try to sign up with a temporary password to check if user exists
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: 'temp-check-password-123456789', // Temporary password
        });
        
        console.log('Signup check response:', { data, error }); // Debug log
        
        if (error) {
          console.log('Signup check error:', error.message); // Debug log
          
          const errorMessage = error.message.toLowerCase();
          
          // Check for user already exists errors
          if (errorMessage.includes('user already registered') ||
              errorMessage.includes('already been registered') ||
              errorMessage.includes('email address is already registered') ||
              errorMessage.includes('user with this email already exists') ||
              errorMessage.includes('already registered') ||
              errorMessage.includes('duplicate') ||
              errorMessage.includes('already exists')) {
            // Email exists in auth table
            console.log('Email already exists in auth table - user already registered'); // Debug log
            setMessage({
              type: 'error',
              text: 'An account with this email already exists. Please try logging in instead.'
            });
          } else {
            // Other errors - might be rate limiting, network, etc.
            console.log('Signup check - Other error (not blocking signup):', error.message);
            setMessage(null);
          }
        } else if (data.user) {
          // Check if user was actually created or if it's a duplicate
          if (data.user.email_confirmed_at || data.user.confirmed_at) {
            // User already existed and is confirmed
            console.log('Email already exists - user is confirmed'); // Debug log
            setMessage({
              type: 'error',
              text: 'An account with this email already exists. Please try logging in instead.'
            });
          } else {
            // New user created for checking - this means email was available
            console.log('Email is available for signup - new user created for check'); // Debug log
            setMessage(null);
            
            // Clean up the temporary user (optional - Supabase will handle unconfirmed users)
            // Note: We can't delete users from client side, but unconfirmed users are automatically cleaned up
          }
        } else {
          // Unexpected case
          console.log('Unexpected signup response'); // Debug log
          setMessage(null);
        }
      } catch (error) {
        console.log('Network/unexpected error during signup check:', error);
        setMessage(null);
      } finally {
        setCheckingUser(false);
      }
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear message when email changes
    if (e.target.name === 'email') {
      setMessage(null);
    }
    
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent signup if we know user exists
    if (message?.text?.includes('account with this email already exists')) {
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
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

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Account created successfully! Please check your email to verify your account.'
      });
      
      // Clear form
      setFormData({ firstName: '', lastName: '', email: '', password: '' });
    } catch (error: any) {
      // Handle specific duplicate user errors
      if (error.message?.includes('User already registered') || 
          error.message?.includes('already been registered')) {
        setMessage({
          type: 'error',
          text: 'An account with this email already exists. Please try logging in instead.'
        });
      } else {
        setMessage({
          type: 'error',
          text: error.message || 'An error occurred during sign up'
        });
      }
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

      if (error) throw error;

      onClose();
    } catch (error: any) {
      let errorMessage = 'An error occurred during login';
      
      if (error.message === 'Invalid login credentials') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({
        type: 'error',
        text: errorMessage
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
                    onBlur={handleEmailBlur}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                      message?.text?.includes('account with this email already exists') 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="john@example.com"
                    required
                  />
                  {checkingUser && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full"></div>
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
                disabled={loading || checkingUser || (message?.text?.includes('account with this email already exists') && message?.type === 'error')}
                className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                {loading || checkingUser ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {loading ? 'Creating Account...' : 'Checking...'}
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
              
              {message?.text?.includes('account with this email already exists') && (
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                  >
                    Go to Login →
                  </button>
                </div>
              )}
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