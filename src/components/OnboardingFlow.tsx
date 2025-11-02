import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  ChevronRight,
  ChevronLeft,
  Plane,
  Briefcase,
  Mic,
  MicOff,
  Play,
  Sparkles,
  Loader2,
  X,
  Check,
  Globe
} from 'lucide-react';
import { AuthUser, supabase } from '../lib/supabase';
import OnboardingWelcome from './OnboardingWelcome';

interface OnboardingFlowProps {
  user: AuthUser;
  onComplete: (data: OnboardingData) => void;
  existingData?: OnboardingData | null;
  isEditing?: boolean;
}

interface OnboardingData {
  profilePictureUrl?: string;
  learningLanguage?: string;
  nativeLanguage?: string;
  focusGroup?: 'travelers' | 'business';
  // Keep old fields for backward compatibility
  motivations?: string[];
  customMotivation?: string;
  hobbies?: string[];
  customHobbies?: string[];
  hasWork?: boolean;
  workDomain?: string;
  germanLevel?: string;
  speakingFears?: string[];
  customFears?: string[];
  timeline?: string;
  goals?: string[];
  personalityTraits?: string[];
  secretDetails?: string;
  conversationTopics?: string[];
}

const languages = [
  { code: 'german', label: 'German', flag: '🇩🇪', available: true },
  { code: 'english', label: 'English', flag: '🇬🇧', available: true },
  { code: 'french', label: 'French', flag: '🇫🇷', available: false },
  { code: 'spanish', label: 'Spanish', flag: '🇪🇸', available: false },
  { code: 'italian', label: 'Italian', flag: '🇮🇹', available: false },
  { code: 'portuguese', label: 'Portuguese', flag: '🇵🇹', available: false },
  { code: 'dutch', label: 'Dutch', flag: '🇳🇱', available: false },
  { code: 'russian', label: 'Russian', flag: '🇷🇺', available: false },
  { code: 'japanese', label: 'Japanese', flag: '🇯🇵', available: false },
  { code: 'chinese', label: 'Chinese', flag: '🇨🇳', available: false },
];

const focusGroups = [
  {
    id: 'travelers' as const,
    label: 'Travelers',
    icon: Plane,
    description: 'I want to practice for travel and casual conversations',
    contextLevel: 'Casual'
  },
  {
    id: 'business' as const,
    label: 'Business People',
    icon: Briefcase,
    description: 'I need German for professional and business contexts',
    contextLevel: 'Professional'
  }
];

export default function OnboardingFlow({ user, onComplete, existingData, isEditing = false }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [welcomeCompleted, setWelcomeCompleted] = useState(false);
  const totalSteps = 5;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    profilePictureUrl: existingData?.profilePictureUrl || '',
    learningLanguage: existingData?.learningLanguage || '',
    nativeLanguage: existingData?.nativeLanguage || '',
    focusGroup: existingData?.focusGroup || undefined,
    // Keep backward compatibility
    motivations: existingData?.motivations || [],
    conversationTopics: existingData?.conversationTopics || []
  });
  
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const firstName = user.user_metadata?.first_name || 'there';

  useEffect(() => {
    if (isEditing && existingData) {
      setData({
        profilePictureUrl: existingData.profilePictureUrl || '',
        learningLanguage: existingData.learningLanguage || '',
        nativeLanguage: existingData.nativeLanguage || '',
        focusGroup: existingData.focusGroup,
        motivations: existingData.motivations || [],
        conversationTopics: existingData.conversationTopics || []
      });
      setCurrentStep(1);
      loadExistingProfilePicture();
    }
  }, [isEditing, existingData]);

  const loadExistingProfilePicture = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('profile_picture_url')
        .eq('user_id', user.id)
        .single();

      if (profileData?.profile_picture_url && !error) {
        setData(prev => ({
          ...prev,
          profilePictureUrl: profileData.profile_picture_url
        }));
      }
    } catch (error) {
      console.error('Error loading existing profile picture:', error);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const deleteOldProfilePicture = async (oldUrl: string) => {
    try {
      const url = new URL(oldUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('profile-pictures');
      
      if (bucketIndex === -1) {
        console.error('Invalid profile picture URL format');
        return;
      }
      
      const filePath = pathParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from('profile-pictures')
        .remove([filePath]);
        
      if (error) {
        console.error('Error deleting old profile picture:', error);
      }
    } catch (error) {
      console.error('Error deleting old profile picture:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      if (data.profilePictureUrl) {
        await deleteOldProfilePicture(data.profilePictureUrl);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      updateData({ profilePictureUrl: publicUrl });
      setProfilePreview(publicUrl);

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveToDatabase = async (finalData: OnboardingData) => {
    try {
      setSaving(true);

      // Save user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          profile_picture_url: finalData.profilePictureUrl,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || ''
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Save onboarding data
      const { error: onboardingError } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          learning_language: finalData.learningLanguage,
          native_language: finalData.nativeLanguage,
          focus_group: finalData.focusGroup,
          // Keep old fields for backward compatibility
          motivations: finalData.motivations || [],
          conversation_topics: finalData.conversationTopics || [],
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (onboardingError) throw onboardingError;

      return true;
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async () => {
    const success = await saveToDatabase(data);
    if (success) {
      onComplete(data);
    } else {
      alert('There was an error saving your data. Please try again.');
    }
  };

  const handleWelcomeComplete = async () => {
    setWelcomeCompleted(true);
    // Automatically complete onboarding when welcome is confirmed
    await completeOnboarding();
  };

  const handleClose = () => {
    if (isEditing) {
      setShowCloseConfirm(true);
    }
  };

  const confirmClose = () => {
    onComplete(existingData || data);
  };

  const renderProgressBar = () => (
    <div className="w-full bg-white rounded-full h-2 mb-4 border border-gray-200 shadow-sm">
      <div 
        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
        style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
      />
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">
                Welcome to TalkBuddy, {firstName}! 🎉
              </h1>
              <p className="text-lg text-text max-w-2xl mx-auto">
                Let's get you started! This will only take a minute.
              </p>
            </div>

            <div className="max-w-sm mx-auto">
              <div className="relative">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                  {profilePreview || data.profilePictureUrl ? (
                    <img src={profilePreview || data.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-12 w-12 text-primary" />
                  )}
                </div>
                {isUploading ? (
                  <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2 bg-primary text-white p-3 rounded-full shadow-lg opacity-75 cursor-not-allowed flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <label className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2 btn-glossy p-3 cursor-pointer hover:scale-110 transition-all duration-200 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {uploadError && (
                <p className="mt-2 text-sm text-red-600 text-center">
                  {uploadError}
                </p>
              )}
              <p className="text-sm text-text-muted mt-4">
                Add a profile picture (optional) ✨
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">
                What language do you want to learn? 🌍
              </h2>
              <p className="text-text max-w-2xl mx-auto">
                Choose the language you'd like to practice speaking!
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {languages.map((lang) => {
                const isSelected = data.learningLanguage === lang.code;
                const isDisabled = !lang.available;
                
                return (
                  <button
                    key={lang.code}
                    onClick={() => !isDisabled && updateData({ learningLanguage: lang.code })}
                    disabled={isDisabled}
                    className={`relative bg-white border-2 rounded-xl p-4 text-center transition-all duration-300 ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-50 scale-105 shadow-lg' 
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-4xl mb-2">{lang.flag}</div>
                    <div className="font-semibold text-text">{lang.label}</div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary-600" />
                      </div>
                    )}
                    {isDisabled && (
                      <div className="absolute -top-2 -right-2 bg-gray-400 text-white text-xs px-2 py-1 rounded-full">
                        Coming Soon
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">
                What's your native language? 🗣️
              </h2>
              <p className="text-text max-w-2xl mx-auto">
                Tell us the language you're most comfortable with!
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {languages.map((lang) => {
                const isSelected = data.nativeLanguage === lang.code;
                const isDisabled = !lang.available;
                
                return (
                  <button
                    key={lang.code}
                    onClick={() => !isDisabled && updateData({ nativeLanguage: lang.code })}
                    disabled={isDisabled}
                    className={`relative bg-white border-2 rounded-xl p-4 text-center transition-all duration-300 ${
                      isSelected 
                        ? 'border-primary-500 bg-primary-50 scale-105 shadow-lg' 
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    <div className="text-4xl mb-2">{lang.flag}</div>
                    <div className="font-semibold text-text">{lang.label}</div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-primary-600" />
                      </div>
                    )}
                    {isDisabled && (
                      <div className="absolute -top-2 -right-2 bg-gray-400 text-white text-xs px-2 py-1 rounded-full">
                        Coming Soon
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">
                Why are you using TalkBuddy? 🎯
              </h2>
              <p className="text-text max-w-2xl mx-auto">
                This helps us personalize your learning experience!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {focusGroups.map((group) => {
                const Icon = group.icon;
                const isSelected = data.focusGroup === group.id;
                
                return (
                  <button
                    key={group.id}
                    onClick={() => updateData({ focusGroup: group.id })}
                    className={`relative bg-white border-2 rounded-2xl p-8 text-center transition-all duration-300 ${
                      isSelected 
                        ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 scale-105 shadow-xl' 
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-lg'
                    }`}
                  >
                    <div className={`inline-flex p-4 rounded-2xl mb-4 ${
                      isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-text-muted'
                    }`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-text mb-2">
                      {group.label}
                    </h3>
                    <p className="text-text-muted mb-4">
                      {group.description}
                    </p>
                    {isSelected && (
                      <div className="flex items-center justify-center space-x-2 text-primary-600">
                        <Check className="h-6 w-6" />
                        <span className="font-semibold">Selected</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <OnboardingWelcome
            firstName={firstName}
            learningLanguage={data.learningLanguage || 'german'}
            onComplete={handleWelcomeComplete}
          />
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true; // Profile picture is optional
      case 1:
        return !!data.learningLanguage;
      case 2:
        return !!data.nativeLanguage;
      case 3:
        return !!data.focusGroup;
      case 4:
        return welcomeCompleted;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #faf9ff 0%, #f5f5f5 100%)' }}>
      {/* Animated Background - Matching Dashboard */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(rgba(105, 73, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(105, 73, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-move 20s linear infinite'
        }}></div>
        
        {/* Floating Geometric Shapes */}
        <div className="absolute top-20 left-20 w-16 h-16 bg-primary/30 rounded-2xl rotate-45 animate-bounce-slow shadow-lg"></div>
        <div className="absolute top-40 right-32 w-12 h-12 bg-accent/35 rounded-full animate-bounce-medium shadow-lg" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 left-32 w-20 h-20 bg-primary/25 rounded-lg rotate-12 animate-bounce-slow shadow-lg" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-text">Discard Changes?</h3>
            <p className="text-text-muted mb-6">
              Are you sure you want to close without saving your changes?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-text hover:bg-gray-300 rounded-2xl transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Close Button for Editing Mode */}
        {isEditing && (
          <button
            onClick={handleClose}
            className="absolute top-8 right-8 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-primary/10 transition-all duration-200 z-10 shadow-lg border border-gray-200"
          >
            <X className="h-5 w-5 text-text-muted" />
          </button>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          {renderProgressBar()}
        </div>
        
        {/* Main Content Card */}
        <div className="card-glass p-8 md:p-12 min-h-[600px]">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              {renderStep()}
            </div>
            
            {/* Navigation - Hide on last step */}
            {currentStep < totalSteps - 1 && (
              <div className="flex flex-col space-y-4 mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all duration-200 ${
                      currentStep === 0
                        ? 'text-text-muted cursor-not-allowed opacity-50'
                        : 'bg-white border-2 border-gray-200 text-text hover:border-primary/30 hover:shadow-md'
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-text-muted">
                      {isEditing ? 'Editing Profile' : `Step ${currentStep + 1} of ${totalSteps}`}
                    </span>
                  </div>

                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className={`btn-glossy flex items-center space-x-2 ${
                      !canProceed() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span>Continue</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Skip Button - Footer Center */}
                {!isEditing && (
                  <div className="flex justify-center">
                    <button
                      onClick={async () => {
                        // Save minimal data and skip onboarding
                        const skipData: OnboardingData = {
                          profilePictureUrl: data.profilePictureUrl,
                          learningLanguage: data.learningLanguage || 'german',
                          nativeLanguage: data.nativeLanguage || 'english',
                          focusGroup: data.focusGroup || 'travelers'
                        };
                        const success = await saveToDatabase(skipData);
                        if (success) {
                          onComplete(skipData);
                        } else {
                          alert('There was an error skipping onboarding. Please try again.');
                        }
                      }}
                      className="text-sm text-text-muted hover:text-primary transition-colors underline"
                    >
                      Skip onboarding
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
