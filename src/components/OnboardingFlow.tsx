import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  ChevronRight,
  ChevronLeft,
  Heart,
  Briefcase,
  Plane,
  Users,
  Plus,
  X,
  Check,
  Star,
  Target,
  Clock,
  MessageCircle,
  Sparkles,
  Coffee,
  Music,
  Book,
  Gamepad2,
  Palette,
  Dumbbell,
  Car,
  TreePine,
  Utensils,
  Camera as CameraIcon,
  Code,
  Stethoscope,
  GraduationCap,
  Building,
  Scissors,
  Wrench,
  TrendingUp,
  Globe,
  Smile,
  Frown,
  Meh,
  ThumbsUp,
  Calendar,
  Trophy,
  Brain,
  Zap,
  Shield,
  Sun,
  Moon,
  Compass,
  Lightbulb,
  Loader2
} from 'lucide-react';
import { AuthUser, supabase } from '../lib/supabase';

interface OnboardingFlowProps {
  user: AuthUser;
  onComplete: (data: OnboardingData) => void;
  existingData?: OnboardingData | null;
  isEditing?: boolean;
}

interface OnboardingData {
  profilePictureUrl?: string;
  motivations: string[];
  customMotivation?: string;
  hobbies: string[];
  customHobbies: string[];
  hasWork: boolean;
  workDomain?: string;
  germanLevel: string;
  speakingFears: string[];
  customFears: string[];
  timeline: string;
  goals: string[];
  personalityTraits: string[];
  secretDetails?: string;
  conversationTopics: string[];
}

const motivationOptions = [
  { id: 'career', label: 'Career Growth', icon: Briefcase, description: 'Advance professionally with German skills' },
  { id: 'travel', label: 'Travel & Culture', icon: Plane, description: 'Explore German-speaking countries confidently' },
  { id: 'personal', label: 'Personal Growth', icon: Heart, description: 'Challenge yourself and expand your mind' },
  { id: 'family', label: 'Family & Relationships', icon: Users, description: 'Connect with German-speaking loved ones' }
];

const hobbyOptions = [
  { id: 'cooking', label: 'Cooking', icon: Utensils },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'reading', label: 'Reading', icon: Book },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'art', label: 'Art & Design', icon: Palette },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'travel', label: 'Travel', icon: Car },
  { id: 'nature', label: 'Nature', icon: TreePine },
  { id: 'photography', label: 'Photography', icon: CameraIcon },
  { id: 'technology', label: 'Technology', icon: Code },
  { id: 'coffee', label: 'Coffee', icon: Coffee }
];

const workDomains = [
  { id: 'tech', label: 'Technology', icon: Code },
  { id: 'healthcare', label: 'Healthcare', icon: Stethoscope },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'business', label: 'Business', icon: Building },
  { id: 'creative', label: 'Creative Arts', icon: Palette },
  { id: 'service', label: 'Service Industry', icon: Scissors },
  { id: 'engineering', label: 'Engineering', icon: Wrench },
  { id: 'finance', label: 'Finance', icon: TrendingUp },
  { id: 'other', label: 'Other', icon: Globe }
];

const germanLevels = [
  { id: 'absolute-beginner', label: 'Absolute Beginner', description: 'I know very little German', emoji: '🌱' },
  { id: 'beginner', label: 'Beginner', description: 'I know some basic words and phrases', emoji: '🌿' },
  { id: 'elementary', label: 'Elementary (A2)', description: 'I can have simple conversations', emoji: '🌳' },
  { id: 'intermediate', label: 'Intermediate (B1)', description: 'I can discuss familiar topics', emoji: '🌲' }
];

const speakingFears = [
  { id: 'pronunciation', label: 'Pronunciation worries', icon: Frown, description: 'Afraid of sounding wrong' },
  { id: 'grammar', label: 'Grammar mistakes', icon: Meh, description: 'Worried about making errors' },
  { id: 'vocabulary', label: 'Limited vocabulary', icon: Smile, description: 'Not knowing enough words' },
  { id: 'confidence', label: 'Lack of confidence', icon: ThumbsUp, description: 'Feeling shy or nervous' },
  { id: 'speed', label: 'Speaking too slowly', icon: Clock, description: 'Taking too long to respond' },
  { id: 'none', label: 'I feel pretty confident!', icon: Star, description: 'Ready to start speaking' }
];

const timelineOptions = [
  { id: '1-month', label: '1 Month', description: 'Quick progress boost' },
  { id: '3-months', label: '3 Months', description: 'Solid foundation building' },
  { id: '6-months', label: '6 Months', description: 'Comprehensive improvement' },
  { id: '1-year', label: '1 Year+', description: 'Long-term mastery' }
];

const goalOptions = [
  { id: 'conversation', label: 'Hold conversations', icon: MessageCircle },
  { id: 'travel', label: 'Travel confidently', icon: Plane },
  { id: 'work', label: 'Use at work', icon: Briefcase },
  { id: 'culture', label: 'Understand culture', icon: Heart },
  { id: 'family', label: 'Talk with family', icon: Users },
  { id: 'fluency', label: 'Become fluent', icon: Trophy }
];

const personalityOptions = [
  { id: 'extrovert', label: 'Extrovert', icon: Sun, description: 'I love meeting new people and socializing' },
  { id: 'introvert', label: 'Introvert', icon: Moon, description: 'I prefer quiet, thoughtful conversations' },
  { id: 'analytical', label: 'Analytical', icon: Brain, description: 'I like to understand the why behind things' },
  { id: 'creative', label: 'Creative', icon: Lightbulb, description: 'I think outside the box and love new ideas' },
  { id: 'adventurous', label: 'Adventurous', icon: Compass, description: 'I love trying new things and taking risks' },
  { id: 'cautious', label: 'Cautious', icon: Shield, description: 'I prefer to think things through carefully' },
  { id: 'energetic', label: 'Energetic', icon: Zap, description: 'I have lots of enthusiasm and energy' },
  { id: 'calm', label: 'Calm', icon: Heart, description: 'I stay composed and prefer peaceful environments' }
];

export default function OnboardingFlow({ user, onComplete, existingData, isEditing = false }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const totalSteps = 9;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    profilePictureUrl: existingData?.profilePictureUrl || '',
    motivations: existingData?.motivations || [],
    customMotivation: existingData?.customMotivation || '',
    hobbies: existingData?.hobbies || [],
    customHobbies: existingData?.customHobbies || [],
    hasWork: existingData?.hasWork || false,
    workDomain: existingData?.workDomain || '',
    germanLevel: existingData?.germanLevel || '',
    speakingFears: existingData?.speakingFears || [],
    customFears: existingData?.customFears || [],
    timeline: existingData?.timeline || '',
    goals: existingData?.goals || [],
    personalityTraits: existingData?.personalityTraits || [],
    secretDetails: existingData?.secretDetails || '',
    conversationTopics: existingData?.conversationTopics || []
  });
  
  const [showCustomMotivation, setShowCustomMotivation] = useState(false);
  const [customMotivationText, setCustomMotivationText] = useState('');
  const [showCustomHobby, setShowCustomHobby] = useState(false);
  const [customHobbyText, setCustomHobbyText] = useState('');
  const [showCustomFear, setShowCustomFear] = useState(false);
  const [customFearText, setCustomFearText] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const firstName = user.user_metadata?.first_name || 'there';

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

  const uploadProfilePicture = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create user folder path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update form data with the public URL
      updateData({ profilePictureUrl: publicUrl });

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const addCustomMotivation = () => {
    if (customMotivationText.trim()) {
      const customId = `custom-${Date.now()}`;
      updateData({ 
        customMotivation: customMotivationText.trim(),
        motivations: [...data.motivations, customId]
      });
      setShowCustomMotivation(false);
      setCustomMotivationText('');
    }
  };

  const addCustomHobby = () => {
    if (customHobbyText.trim()) {
      updateData({ 
        customHobbies: [...data.customHobbies, customHobbyText.trim()]
      });
      setShowCustomHobby(false);
      setCustomHobbyText('');
    }
  };

  const addCustomFear = () => {
    if (customFearText.trim()) {
      updateData({ 
        customFears: [...data.customFears, customFearText.trim()]
      });
      setShowCustomFear(false);
      setCustomFearText('');
    }
  };

  const removeCustomHobby = (hobby: string) => {
    updateData({
      customHobbies: data.customHobbies.filter(h => h !== hobby)
    });
  };

  const removeCustomFear = (fear: string) => {
    updateData({
      customFears: data.customFears.filter(f => f !== fear)
    });
  };

  const toggleMotivation = (motivationId: string) => {
    const newMotivations = data.motivations.includes(motivationId)
      ? data.motivations.filter(m => m !== motivationId)
      : [...data.motivations, motivationId];
    updateData({ motivations: newMotivations });
  };

  const toggleHobby = (hobbyId: string) => {
    const newHobbies = data.hobbies.includes(hobbyId)
      ? data.hobbies.filter(h => h !== hobbyId)
      : [...data.hobbies, hobbyId];
    updateData({ hobbies: newHobbies });
  };

  const toggleFear = (fearId: string) => {
    if (fearId === 'none') {
      updateData({ speakingFears: ['none'], customFears: [] });
      return;
    }
    
    const newFears = data.speakingFears.includes(fearId)
      ? data.speakingFears.filter(f => f !== fearId)
      : [...data.speakingFears.filter(f => f !== 'none'), fearId];
    updateData({ speakingFears: newFears });
  };

  const toggleGoal = (goalId: string) => {
    const newGoals = data.goals.includes(goalId)
      ? data.goals.filter(g => g !== goalId)
      : [...data.goals, goalId];
    updateData({ goals: newGoals });
  };

  const togglePersonalityTrait = (traitId: string) => {
    const newTraits = data.personalityTraits.includes(traitId)
      ? data.personalityTraits.filter(t => t !== traitId)
      : [...data.personalityTraits, traitId];
    updateData({ personalityTraits: newTraits });
  };

  const generateConversationTopics = () => {
    const topics = [];
    
    // Add hobby-based topics
    data.hobbies.forEach(hobby => {
      const hobbyObj = hobbyOptions.find(h => h.id === hobby);
      if (hobbyObj) {
        topics.push(`Discussing ${hobbyObj.label.toLowerCase()}`);
      }
    });
    
    data.customHobbies.forEach(hobby => {
      topics.push(`Talking about ${hobby.toLowerCase()}`);
    });
    
    // Add work-based topics
    if (data.hasWork && data.workDomain) {
      const domain = workDomains.find(w => w.id === data.workDomain);
      if (domain) {
        topics.push(`${domain.label} workplace conversations`);
      }
    }
    
    // Add motivation-based topics
    if (data.motivations.includes('travel')) {
      topics.push('Travel planning and experiences');
    }
    if (data.motivations.includes('family')) {
      topics.push('Family gatherings and relationships');
    }
    
    // Add personality-based topics
    if (data.personalityTraits.includes('extrovert')) {
      topics.push('Meeting new people and networking');
    }
    if (data.personalityTraits.includes('creative')) {
      topics.push('Creative projects and artistic expression');
    }
    
    // Add level-appropriate topics
    if (data.germanLevel.includes('beginner')) {
      topics.push('Daily routines and activities', 'Shopping and errands');
    } else {
      topics.push('Current events discussion', 'Cultural differences');
    }
    
    return topics.slice(0, 8); // Limit to 8 topics
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
          motivations: finalData.motivations,
          custom_motivation: finalData.customMotivation,
          hobbies: finalData.hobbies,
          custom_hobbies: finalData.customHobbies,
          has_work: finalData.hasWork,
          work_domain: finalData.workDomain,
          german_level: finalData.germanLevel,
          speaking_fears: finalData.speakingFears,
          custom_fears: finalData.customFears,
          timeline: finalData.timeline,
          goals: finalData.goals,
          personality_traits: finalData.personalityTraits,
          secret_details: finalData.secretDetails,
          conversation_topics: finalData.conversationTopics,
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
    const conversationTopics = generateConversationTopics();
    const finalData = { ...data, conversationTopics };
    
    const success = await saveToDatabase(finalData);
    if (success) {
      onComplete(finalData);
    } else {
      // Handle error - maybe show a toast notification
      alert('There was an error saving your data. Please try again.');
    }
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
    <div className="w-full bg-white/30 rounded-full h-2 mb-8">
      <div 
        className="progress-bar-orange h-2 rounded-full transition-all duration-500 ease-out"
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
              <h1 className="text-3xl font-bold text-glass">
                Welcome to TalkBuddy, {firstName}! 🎉
              </h1>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                We're so excited you're here! Let's get to know you better so we can create the perfect German learning experience just for you.
              </p>
            </div>

            <div className="max-w-sm mx-auto">
              <div className="relative">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center overflow-hidden border-4 border-white shadow-glass">
                  {profilePreview || data.profilePictureUrl ? (
                    <img src={profilePreview || data.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-12 w-12 text-orange-600" />
                  )}
                </div>
                {isUploading ? (
                  <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2 bg-orange-500 text-white p-3 rounded-full shadow-glass opacity-75 cursor-not-allowed flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <label className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full cursor-pointer shadow-glass hover:scale-110 transition-all duration-200 flex items-center justify-center">
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
              <p className="text-sm text-gray-600 mt-4">
                Add a profile picture to personalize your experience (optional)
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-glass">
                What's inspiring your German journey? ✨
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                Understanding your motivation helps us create conversations that truly matter to you. Pick all that apply!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {motivationOptions.map((motivation) => {
                const Icon = motivation.icon;
                const isSelected = data.motivations.includes(motivation.id);
                
                return (
                  <button
                    key={motivation.id}
                    onClick={() => toggleMotivation(motivation.id)}
                    className={`card-glass rounded-xl p-6 text-left transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-orange-100' : 'bg-white/50'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          isSelected ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {motivation.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {motivation.description}
                        </p>
                        {isSelected && <Check className="h-5 w-5 text-orange-600 mt-2" />}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Custom motivations display */}
              {data.customMotivation && (
                <div className="card-glass rounded-xl p-6 text-left ring-2 ring-orange-400 bg-orange-50/50">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-orange-100">
                      <Plus className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {data.customMotivation}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Your personal motivation
                      </p>
                      <Check className="h-5 w-5 text-orange-600 mt-2" />
                    </div>
                    <button
                      onClick={() => {
                        updateData({ 
                          customMotivation: undefined, 
                          motivations: data.motivations.filter(m => !m.startsWith('custom-'))
                        });
                      }}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Add custom motivation button */}
              <button
                onClick={() => setShowCustomMotivation(true)}
                className="card-glass rounded-xl p-6 text-center transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-orange-400"
              >
                <div className="flex items-center justify-center space-x-3">
                  <Plus className="h-6 w-6 text-gray-600" />
                  <span className="font-semibold text-gray-900">Add Your Own</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Tell us what else drives you
                </p>
              </button>
            </div>

            {showCustomMotivation && (
              <div className="max-w-md mx-auto card-glass rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Tell us more!</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customMotivationText}
                    onChange={(e) => setCustomMotivationText(e.target.value)}
                    placeholder="What's driving your German journey?"
                    className="w-full px-4 py-2 input-glass rounded-lg focus-glass"
                    style={{ color: '#1f2937' }}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addCustomMotivation}
                      className="flex-1 btn-glossy text-white py-2 rounded-lg"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowCustomMotivation(false)}
                      className="px-4 py-2 glass rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-glass">
                What do you love doing? 🎨
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                Your hobbies and interests will help us create conversations about topics you're passionate about!
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {hobbyOptions.map((hobby) => {
                const Icon = hobby.icon;
                const isSelected = data.hobbies.includes(hobby.id);
                
                return (
                  <button
                    key={hobby.id}
                    onClick={() => toggleHobby(hobby.id)}
                    className={`card-glass rounded-xl p-4 text-center transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-orange-100' : 'bg-white/50'
                    }`}>
                      <Icon className={`h-6 w-6 ${
                        isSelected ? 'text-orange-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {hobby.label}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-orange-600 mx-auto mt-1" />
                    )}
                  </button>
                );
              })}

              {/* Custom hobbies display */}
              {data.customHobbies.map((hobby, index) => (
                <div
                  key={`custom-${index}`}
                  className="card-glass rounded-xl p-4 text-center ring-2 ring-orange-400 bg-orange-50/50 relative"
                >
                  <div className="w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center bg-orange-100">
                    <Plus className="h-6 w-6 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {hobby}
                  </span>
                  <Check className="h-4 w-4 text-orange-600 mx-auto mt-1" />
                  <button
                    onClick={() => removeCustomHobby(hobby)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              <button
                onClick={() => setShowCustomHobby(true)}
                className="card-glass rounded-xl p-4 text-center transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-orange-400"
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-white/50 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  Add Custom
                </span>
              </button>
            </div>

            {showCustomHobby && (
              <div className="max-w-md mx-auto card-glass rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Add your hobby</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customHobbyText}
                    onChange={(e) => setCustomHobbyText(e.target.value)}
                    placeholder="What do you love doing?"
                    className="w-full px-4 py-2 input-glass rounded-lg focus-glass"
                    style={{ color: '#1f2937' }}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addCustomHobby}
                      className="flex-1 btn-glossy text-white py-2 rounded-lg"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowCustomHobby(false)}
                      className="px-4 py-2 glass rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-glass">
                Do you work? 💼
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                If you work, we can include workplace conversations in your practice sessions!
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateData({ hasWork: true })}
                  className={`card-glass rounded-xl p-6 text-center transition-all duration-300 ${
                    data.hasWork ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                  }`}
                >
                  <Briefcase className={`h-8 w-8 mx-auto mb-2 ${
                    data.hasWork ? 'text-orange-600' : 'text-gray-600'
                  }`} />
                  <span className="font-semibold text-gray-900">Yes, I work</span>
                </button>
                
                <button
                  onClick={() => updateData({ hasWork: false, workDomain: undefined })}
                  className={`card-glass rounded-xl p-6 text-center transition-all duration-300 ${
                    data.hasWork === false ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                  }`}
                >
                  <Heart className={`h-8 w-8 mx-auto mb-2 ${
                    data.hasWork === false ? 'text-orange-600' : 'text-gray-600'
                  }`} />
                  <span className="font-semibold text-gray-900">Not currently</span>
                </button>
              </div>

              {data.hasWork && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 text-center">
                    What field do you work in?
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {workDomains.map((domain) => {
                      const Icon = domain.icon;
                      const isSelected = data.workDomain === domain.id;
                      
                      return (
                        <button
                          key={domain.id}
                          onClick={() => updateData({ workDomain: domain.id })}
                          className={`card-glass rounded-lg p-3 text-center transition-all duration-300 ${
                            isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                          }`}
                        >
                          <Icon className={`h-5 w-5 mx-auto mb-1 ${
                            isSelected ? 'text-orange-600' : 'text-gray-600'
                          }`} />
                          <span className="text-xs font-medium text-gray-900">
                            {domain.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-glass">
                What's your German level? 🌱
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                Don't worry about being perfect - we'll adjust our conversations to match exactly where you are!
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              {germanLevels.map((level) => {
                const isSelected = data.germanLevel === level.id;
                
                return (
                  <button
                    key={level.id}
                    onClick={() => updateData({ germanLevel: level.id })}
                    className={`w-full card-glass rounded-xl p-6 text-left transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{level.emoji}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {level.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {level.description}
                        </p>
                      </div>
                      {isSelected && <Check className="h-6 w-6 text-orange-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-glass">
                What makes you nervous about speaking? 😊
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                It's totally normal to have concerns! Knowing what worries you helps us create a more supportive experience. Select all that apply.
              </p>
            </div>

            <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-4">
              {speakingFears.map((fear) => {
                const Icon = fear.icon;
                const isSelected = data.speakingFears.includes(fear.id);
                
                return (
                  <button
                    key={fear.id}
                    onClick={() => toggleFear(fear.id)}
                    className={`card-glass rounded-xl p-6 text-left transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-orange-100' : 'bg-white/50'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          isSelected ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {fear.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {fear.description}
                        </p>
                        {isSelected && <Check className="h-5 w-5 text-orange-600 mt-2" />}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Custom fears display */}
              {data.customFears.map((fear, index) => (
                <div
                  key={`custom-fear-${index}`}
                  className="card-glass rounded-xl p-6 text-left ring-2 ring-orange-400 bg-orange-50/50 relative"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-orange-100">
                      <Plus className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {fear}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Your personal concern
                      </p>
                      <Check className="h-5 w-5 text-orange-600 mt-2" />
                    </div>
                    <button
                      onClick={() => removeCustomFear(fear)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add custom fear button */}
              <button
                onClick={() => setShowCustomFear(true)}
                className="card-glass rounded-xl p-6 text-center transition-all duration-300 border-2 border-dashed border-gray-300 hover:border-orange-400"
              >
                <div className="flex items-center justify-center space-x-3">
                  <Plus className="h-6 w-6 text-gray-600" />
                  <span className="font-semibold text-gray-900">Add Your Own</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Tell us what else concerns you
                </p>
              </button>
            </div>

            {showCustomFear && (
              <div className="max-w-md mx-auto card-glass rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">What else worries you?</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customFearText}
                    onChange={(e) => setCustomFearText(e.target.value)}
                    placeholder="What makes you nervous about speaking?"
                    className="w-full px-4 py-2 input-glass rounded-lg focus-glass"
                    style={{ color: '#1f2937' }}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addCustomFear}
                      className="flex-1 btn-glossy text-white py-2 rounded-lg"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowCustomFear(false)}
                      className="px-4 py-2 glass rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Remember: TalkBuddy is a judgment-free zone where you can practice at your own pace! 💙
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-glass">
                What's your timeline? ⏰
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                When would you like to see meaningful progress? This helps us suggest the right practice frequency.
              </p>
            </div>

            <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-4">
              {timelineOptions.map((timeline) => {
                const isSelected = data.timeline === timeline.id;
                
                return (
                  <button
                    key={timeline.id}
                    onClick={() => updateData({ timeline: timeline.id })}
                    className={`card-glass rounded-xl p-6 text-center transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {timeline.label}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {timeline.description}
                      </p>
                      {isSelected && <Check className="h-6 w-6 text-orange-600 mx-auto mt-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                What are your main goals? 🎯
              </h3>
              <p className="text-gray-600">Select all that matter to you</p>
              
              <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3">
                {goalOptions.map((goal) => {
                  const Icon = goal.icon;
                  const isSelected = data.goals.includes(goal.id);
                  
                  return (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className={`card-glass rounded-lg p-4 text-center transition-all duration-300 ${
                        isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                      }`}
                    >
                      <Icon className={`h-6 w-6 mx-auto mb-2 ${
                        isSelected ? 'text-orange-600' : 'text-gray-600'
                      }`} />
                      <span className="text-sm font-medium text-gray-900">
                        {goal.label}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-orange-600 mx-auto mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-glass">
                Tell us about your personality! 🌟
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                Understanding your personality helps us create conversations that feel natural and comfortable for you. Select all that describe you!
              </p>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
              {personalityOptions.map((trait) => {
                const Icon = trait.icon;
                const isSelected = data.personalityTraits.includes(trait.id);
                
                return (
                  <button
                    key={trait.id}
                    onClick={() => togglePersonalityTrait(trait.id)}
                    className={`card-glass rounded-xl p-6 text-left transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-orange-400 bg-orange-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-orange-100' : 'bg-white/50'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          isSelected ? 'text-orange-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {trait.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {trait.description}
                        </p>
                        {isSelected && <Check className="h-5 w-5 text-orange-600 mt-2" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Share something special about yourself (optional) 💫
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This could be a fun fact, a secret talent, a dream you have, or anything that makes you unique. We'll use this to make conversations more personal and engaging!
                </p>
                <textarea
                  value={data.secretDetails || ''}
                  onChange={(e) => updateData({ secretDetails: e.target.value })}
                  placeholder="I secretly love to sing in the shower, I dream of opening a bakery, I collect vintage postcards..."
                  className="w-full px-4 py-3 input-glass rounded-lg focus-glass resize-none"
                  style={{ color: '#1f2937' }}
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 8:
        const conversationTopics = generateConversationTopics();
        
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-glass">
                You're all set, {firstName}! 🎉
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Based on your responses, we've created a personalized learning experience just for you. Here's what we've prepared:
              </p>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
              {/* Personal Summary */}
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Sparkles className="h-6 w-6 text-orange-600 mr-2" />
                  Your Profile
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Level:</span>
                    <span className="ml-2 text-gray-900">
                      {germanLevels.find(l => l.id === data.germanLevel)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Timeline:</span>
                    <span className="ml-2 text-gray-900">
                      {timelineOptions.find(t => t.id === data.timeline)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Main Goals:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {data.goals.map(goalId => {
                        const goal = goalOptions.find(g => g.id === goalId);
                        return goal ? (
                          <span key={goalId} className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                            {goal.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Personality:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {data.personalityTraits.map(traitId => {
                        const trait = personalityOptions.find(t => t.id === traitId);
                        return trait ? (
                          <span key={traitId} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                            {trait.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation Topics */}
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageCircle className="h-6 w-6 text-blue-600 mr-2" />
                  Your Conversation Topics
                </h3>
                <div className="space-y-2">
                  {conversationTopics.map((topic, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      <span className="text-gray-900">{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motivations */}
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Heart className="h-6 w-6 text-red-500 mr-2" />
                  What Drives You
                </h3>
                <div className="space-y-2">
                  {data.motivations.map(motivationId => {
                    if (motivationId.startsWith('custom-') && data.customMotivation) {
                      return (
                        <div key="custom" className="flex items-center space-x-2 text-sm">
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                          <span className="text-gray-900">"{data.customMotivation}"</span>
                        </div>
                      );
                    }
                    const motivation = motivationOptions.find(m => m.id === motivationId);
                    return motivation ? (
                      <div key={motivationId} className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-red-400 rounded-full" />
                        <span className="text-gray-900">{motivation.label}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Support Areas */}
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="h-6 w-6 text-green-600 mr-2" />
                  We'll Help You With
                </h3>
                <div className="space-y-2">
                  {data.speakingFears.includes('none') ? (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-gray-900">Building on your confidence!</span>
                    </div>
                  ) : (
                    <>
                      {data.speakingFears.map(fearId => {
                        const fear = speakingFears.find(f => f.id === fearId);
                        return fear ? (
                          <div key={fearId} className="flex items-center space-x-2 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="text-gray-900">{fear.label}</span>
                          </div>
                        ) : null;
                      })}
                      {data.customFears.map((fear, index) => (
                        <div key={`custom-fear-${index}`} className="flex items-center space-x-2 text-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          <span className="text-gray-900">{fear}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {data.secretDetails && (
              <div className="max-w-2xl mx-auto">
                <div className="card-glass rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Sparkles className="h-6 w-6 text-purple-600 mr-2" />
                    Your Special Touch
                  </h3>
                  <p className="text-gray-700 italic">"{data.secretDetails}"</p>
                  <p className="text-sm text-gray-600 mt-2">
                    We'll weave this into your conversations to make them uniquely yours! ✨
                  </p>
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={completeOnboarding}
                disabled={saving}
                className="px-8 py-4 btn-glossy text-white rounded-lg font-semibold text-lg shadow-glass-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Saving Your Journey...
                  </>
                ) : (
                  'Start My German Journey! 🚀'
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-continuous-hero">
      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="modal-glass rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-glass">Discard Changes?</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to close without saving your changes? All modifications will be lost.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 px-4 py-2 btn-glossy-secondary rounded-lg"
              >
                Continue Editing
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Close Button for Editing Mode */}
        {isEditing && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 glass rounded-full flex items-center justify-center hover:glass-strong transition-all duration-200 z-10"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        )}

        {renderProgressBar()}
        
        <div className="min-h-[600px] flex flex-col">
          <div className="flex-1">
            {renderStep()}
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/20">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'btn-glossy-secondary hover:scale-105'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {isEditing ? 'Editing Profile' : `${currentStep + 1} of ${totalSteps}`}
              </span>
            </div>

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center space-x-2 px-6 py-3 btn-glossy text-white rounded-lg hover:scale-105 transition-transform duration-200"
              >
                <span>Continue</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-24" /> // Spacer for layout
            )}
          </div>
        </div>
      </div>
    </div>
  );
}