import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OnboardingGameProps {
  learningLanguage: string;
  focusGroup: 'travelers' | 'business';
  onComplete: () => void;
}

export default function OnboardingGame({ learningLanguage, focusGroup, onComplete }: OnboardingGameProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const phrases = {
    german: {
      travelers: {
        phrase: 'Hallo, wie geht es dir?',
        translation: 'Hello, how are you?',
      },
      business: {
        phrase: 'Guten Tag, wie geht es Ihnen?',
        translation: 'Good day, how are you?',
      }
    },
    english: {
      travelers: {
        phrase: 'Hello, how are you?',
        translation: 'Hallo, wie geht es dir?',
      },
      business: {
        phrase: 'Good morning, how can I help you?',
        translation: 'Guten Morgen, wie kann ich Ihnen helfen?',
      }
    }
  };

  const currentPhrase = phrases[learningLanguage as keyof typeof phrases]?.[focusGroup] || phrases.german.travelers;

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playPhrase = async () => {
    try {
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(currentPhrase.phrase);
      utterance.lang = learningLanguage === 'german' ? 'de-DE' : 'en-US';
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error playing phrase:', error);
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processRecording();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setHasRecorded(false);
      setTranscription('');
      setShowSuccess(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please allow microphone access to continue.');
    }
};

const stopRecording = () => {
  if (mediaRecorderRef.current && isRecording) {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }
};

const processRecording = async () => {
  setIsProcessing(true);
  try {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      
      try {
        const { data, error } = await supabase.functions.invoke('whisper', {
          body: {
            audioData: base64Audio,
            language: learningLanguage === 'german' ? 'de' : 'en'
          }
        });

        if (error) throw error;

        if (data?.text) {
          setTranscription(data.text);
          setHasRecorded(true);
          const normalizedTranscription = data.text.toLowerCase().trim();
          const normalizedPhrase = currentPhrase.phrase.toLowerCase().trim();
          
          const phraseWords = normalizedPhrase.split(/\s+/);
          const matchingWords = phraseWords.filter(word => 
            normalizedTranscription.includes(word.replace(/[.,!?]/g, ''))
          );
          
          if (matchingWords.length >= phraseWords.length * 0.6) {
            setShowSuccess(true);
          }
        }
      } catch (error) {
        console.error('Error transcribing:', error);
        setTranscription('Could not process audio. That\'s okay - you can continue!');
        setHasRecorded(true);
        setShowSuccess(true);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(audioBlob);
  } catch (error) {
    console.error('Error processing recording:', error);
    setIsProcessing(false);
    setHasRecorded(true);
    setTranscription('Recording captured! Ready to continue.');
    setShowSuccess(true);
  }
};

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
          Let's practice speaking! 🎤
        </h2>
        <p className="text-gray-700 max-w-2xl mx-auto">
          Try saying this phrase out loud. Don't worry about being perfect - this is just to get you started!
        </p>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-xl border-2 border-orange-100">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Try saying:</p>
            <p className="text-3xl font-bold text-gray-900">{currentPhrase.phrase}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Translation:</p>
            <p className="text-lg text-gray-700">{currentPhrase.translation}</p>
          </div>

          <button
            onClick={playPhrase}
            disabled={isPlaying}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:scale-105 disabled:opacity-50"
          >
            {isPlaying ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
            <span>{isPlaying ? 'Playing...' : 'Listen'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {!hasRecorded ? (
          <div className="text-center space-y-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-white transition-all duration-300 shadow-2xl ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 scale-100 hover:scale-110'
              }`}
            >
              {isRecording ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
            </button>
            <p className="text-gray-600">
              {isRecording ? 'Click to stop recording' : 'Click to record your voice'}
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            {showSuccess && (
              <div className="flex items-center justify-center space-x-2 text-green-600 mb-4">
                <CheckCircle className="h-6 w-6" />
                <span className="text-lg font-semibold">Great job! 🎉</span>
              </div>
            )}
            
            {isProcessing ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                <p className="text-gray-600">Processing your recording...</p>
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                <p className="text-gray-700 font-medium mb-2">You said:</p>
                <p className="text-lg text-gray-900">{transcription || 'Recording captured!'}</p>
              </div>
            )}

            <button
              onClick={() => {
                setHasRecorded(false);
                setTranscription('');
                setShowSuccess(false);
              }}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {showSuccess && (
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
            <div className="flex items-center justify-center space-x-2 text-orange-600 mb-2">
              <Sparkles className="h-6 w-6" />
              <p className="text-xl font-bold">You're all set!</p>
            </div>
            <p className="text-gray-700">
              Great job giving it a try! Ready to start learning? Click the button below to finish setup.
            </p>
          </div>
        </div>
      )}

      {!hasRecorded && (
        <div className="text-center">
          <button
            onClick={() => {
              setShowSuccess(true);
              setHasRecorded(true);
              setTranscription('Skipped - ready to continue!');
            }}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
