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

  const checkEmailExists = async () => {
    if (!formData.email) return;
    
    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single();
      
      setEmailExists(!!data);
    } catch (error) {
      setEmailExists(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          onClose();
        }
      } else if (mode === 'signup') {
        const { error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            }
          }
        });

        if (signupError) {
          setMessage({ type: 'error', text: signupError.message });
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Account created successfully! Please go to the login page to sign in with your new account.' 
          });
          // Clear the form
          setFormData({ firstName: '', lastName: '', email: '', password: '' });
          setEmailExists(null);
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
        
        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          setMessage({ type: 'success', text: 'Password reset email sent!' });
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create account'}
            {mode === 'forgot' && 'Reset password'}
          </h2>
          <p className="text-gray-600">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'signup' && 'Get started with your free account'}
            {mode === 'forgot' && 'Enter your email to reset your password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={mode === 'signup' ? checkEmailExists : undefined}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@example.com"
              />
              {checkingEmail && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={18} />
              )}
            </div>
            {mode === 'signup' && emailExists === true && (
              <p className="text-red-600 text-sm mt-1">
                This email is already registered. 
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:underline ml-1"
                >
                  Sign in instead?
                </button>
              </p>
            )}
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
              {message.type === 'success' && (
                <div className="mt-2">
                  <button
                    onClick={() => setMode('login')}
                    className="text-green-800 underline hover:text-green-900 font-medium"
                  >
                    Go to Login Page
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && emailExists === true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                {mode === 'login' && 'Sign in'}
                {mode === 'signup' && 'Create account'}
                {mode === 'forgot' && 'Send reset email'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === 'login' && (
            <>
              <button
                onClick={() => setMode('forgot')}
                className="text-blue-600 hover:underline"
              >
                Forgot your password?
              </button>
              <div className="mt-2">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-blue-600 hover:underline"
                >
                  Sign up
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <div>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </div>
          )}
          {mode === 'forgot' && (
            <div>
              Remember your password?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}