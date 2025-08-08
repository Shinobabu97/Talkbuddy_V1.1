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
  }
}