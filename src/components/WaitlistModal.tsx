import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

const countryCodes = [
  { code: '+1', label: 'United States (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+61', label: 'Australia (+61)' },
];

const languages = [
  'English',
  'German',
  'Spanish',
  'French',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
  'Mandarin Chinese',
];

const reasons = [
  'Casual Learning',
  'Professional Need',
  'Freelancer',
  'Current Trend or Craze',
  'Potential Growth Opportunity',
];

export default function WaitlistModal({ isOpen, onClose, onSuccess }: WaitlistModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('German');
  const [baseLanguage, setBaseLanguage] = useState('English');
  const [reason, setReason] = useState('Professional Need');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setCountryCode('+91');
    setPhoneNumber('');
    setTargetLanguage('German');
    setBaseLanguage('English');
    setReason('Professional Need');
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const trimmedEmail = email.trim();
      const trimmedFirstName = firstName.trim();

      const { error: insertError } = await supabase.from('waitlist_leads').insert({
        first_name: trimmedFirstName,
        last_name: lastName.trim(),
        email: trimmedEmail,
        phone_country_code: countryCode,
        phone_number: phoneNumber.trim(),
        target_language: targetLanguage,
        base_language: baseLanguage,
        reason,
      });

      if (insertError) {
        throw insertError;
      }

      // Try to send email, but don't block success if it fails
      // The database insert is the critical operation - email is a nice-to-have
      try {
        console.log('📧 Attempting to invoke email function...');
        // Note: Using 'quick-processor' to match the deployed function name
        // TODO: Deploy waitlist-email function properly and update this to 'waitlist-email'
        const { data, error: fnError } = await supabase.functions.invoke('quick-processor', {
          body: {
            email: trimmedEmail,
            firstName: trimmedFirstName,
          },
        });

        if (fnError) {
          // Log email error but don't throw - database insert succeeded
          console.error('❌ Email function error:', fnError);
          console.warn('Email sending failed, but waitlist entry was saved:', fnError);
        } else {
          console.log('✅ Email function called successfully:', data);
        }
      } catch (emailErr) {
        // Log email error but don't throw - database insert succeeded
        console.error('❌ Email function exception:', emailErr);
        console.warn('Email sending failed, but waitlist entry was saved:', emailErr);
      }

      // Database insert succeeded, show success regardless of email status
      const emailForAck = trimmedEmail;
      resetState();
      onClose();
      onSuccess(emailForAck);
    } catch (err) {
      console.error('Waitlist submission failed:', err);
      
      // Check for specific error types and provide user-friendly messages
      let message = 'Something went wrong. Please try again.';
      
      // Extract error message from various error formats
      let errorMessage = '';
      let errorCode = '';
      
      if (err && typeof err === 'object') {
        // Check for Supabase PostgREST errors (has code and message properties)
        if ('code' in err) {
          errorCode = String(err.code);
        }
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('error' in err && typeof err.error === 'string') {
          errorMessage = err.error;
        } else if ('error' in err && err.error && typeof err.error === 'object' && 'message' in err.error) {
          errorMessage = String(err.error.message);
          if ('code' in err.error) {
            errorCode = String(err.error.code);
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Determine user-friendly message based on error
      if (errorCode === 'PGRST205' || errorMessage.includes('PGRST205') || 
          errorMessage.includes('404') || errorMessage.includes('not found') ||
          errorMessage.includes("Could not find the table 'public.waitlist_leads'")) {
        message = 'The waitlist database table is not set up yet. Please contact support or try again later.';
      } else if (errorMessage.includes('email') || errorMessage.includes('Email') || 
                 errorMessage.includes('RESEND') || errorMessage.includes('Resend')) {
        message = 'There was an issue sending the confirmation email. Your information was saved, but please check your email address.';
      } else if (errorMessage) {
        message = errorMessage;
      }
      
      setError(message);
      setSubmitting(false);
    }
  };

  const isFormValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    countryCode.trim() &&
    phoneNumber.trim() &&
    targetLanguage.trim() &&
    baseLanguage.trim() &&
    reason.trim();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background-light rounded-lg max-w-lg w-full p-6 relative border border-gray-200">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          aria-label="Close waitlist form"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text mb-2 font-display">
            Join the TalkBuddy Wait List
          </h2>
          <p className="text-text-muted font-body text-sm">
            Your interest in TalkBuddy has been registered and you will soon hear from us for
            trial conversations on the application.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address<span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number<span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-32 px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                  required
                >
                  {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language you want to learn<span className="text-red-500">*</span>
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                  required
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Language of Communication<span className="text-red-500">*</span>
                </label>
                <select
                  value={baseLanguage}
                  onChange={(e) => setBaseLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                  required
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for learning this language<span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-background-light border border-gray-200 rounded-md focus:ring-2 focus:ring-text focus:border-text transition-all font-body"
                required
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="w-full py-3 px-6 btn-glossy rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-base"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit'}
            </button>
          </form>
      </div>
    </div>
  );
}


