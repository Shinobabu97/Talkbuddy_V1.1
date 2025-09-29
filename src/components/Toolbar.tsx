import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Lightbulb, Volume2, Star, X, Play, Mic, MicOff, Loader2, AlertCircle, CheckCircle, Target, Trophy } from 'lucide-react';

interface ToolbarProps {
  isVisible: boolean;
  currentMessage?: string;
  onAddToVocab: (word: string, meaning: string) => void;
  autoLoadExplanations?: boolean;
  comprehensiveAnalysis?: any;
  activeTab?: 'vocab' | 'explain' | 'pronunciation';
  onTabChange?: (tab: 'vocab' | 'explain' | 'pronunciation') => void;
  newVocabItems?: Array<{word: string, meaning: string, context: string}>;
  persistentVocab?: Array<{word: string, meaning: string, context: string}>;
  onUpdatePersistentVocab?: (vocab: Array<{word: string, meaning: string, context: string}>) => void;
}

interface VocabItem {
  word: string;
  meaning: string;
  timestamp: string;
  chatId?: string;
  category?: string;
  theme?: string;
}

interface PronunciationWord {
  word: string;
  score: number;
  needsPractice: boolean;
  feedback: string;
  commonMistakes?: string[];
  difficulty?: string;
  soundsToFocus?: string[];
  improvementTips?: string[];
  userAudio?: string;
  referenceAudio?: string;
}

interface ComprehensiveAnalysis {
  hasErrors: boolean;
  errorTypes: {
    grammar: boolean;
    vocabulary: boolean;
    pronunciation: boolean;
  };
  corrections: {
    grammar?: string;
    vocabulary?: Array<{wrong: string, correct: string, meaning: string}>;
    pronunciation?: string;
  };
  suggestions: {
    grammar?: string;
    vocabulary?: string;
    pronunciation?: string;
  };
  wordsForPractice?: Array<{
    word: string;
    needsPractice: boolean;
    score?: number;
  }>;
}

export default function Toolbar({ isVisible, currentMessage, onAddToVocab, autoLoadExplanations = false, comprehensiveAnalysis, activeTab: externalActiveTab, onTabChange, newVocabItems, persistentVocab = [], onUpdatePersistentVocab }: ToolbarProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'vocab' | 'explain' | 'pronunciation'>('explain');
  
  // Use external activeTab if provided, otherwise use internal state
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = onTabChange || setInternalActiveTab;
  // Use persistent vocabulary from props instead of local state
  const vocabItems = persistentVocab.map(item => ({
    word: item.word,
    meaning: item.meaning,
    timestamp: new Date().toISOString(),
    chatId: 'current',
    category: 'conversation',
    theme: 'general'
  }));
  const [grammarExplanation, setGrammarExplanation] = useState<string>('');
  const [speakingTips, setSpeakingTips] = useState<string>('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [vocabFilter, setVocabFilter] = useState<string>('all');
  const [explanationCache, setExplanationCache] = useState<{[key: string]: {grammar: string, tips: string}}>({});
  const [showGrammarSection, setShowGrammarSection] = useState<boolean>(false);
  const [showSpeakingSection, setShowSpeakingSection] = useState<boolean>(false);

  // New state for comprehensive analysis
  const [analysisData, setAnalysisData] = useState<ComprehensiveAnalysis | null>(null);
  const [pronunciationWords, setPronunciationWords] = useState<PronunciationWord[]>([]);
  const [practicingWord, setPracticingWord] = useState<string | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [maxAttempts] = useState(3);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioStorage, setAudioStorage] = useState<{[key: string]: string}>({});
  const [practiceHistory, setPracticeHistory] = useState<Array<{
    word: string;
    score: number;
    attempts: number;
    timestamp: string;
    audioId: string;
  }>>([]);
  const [masteredWords, setMasteredWords] = useState<Set<string>>(new Set());
  const [currentSession, setCurrentSession] = useState<{
    sessionId: string;
    startTime: string;
    wordsPracticed: string[];
    totalScore: number;
    averageScore: number;
  } | null>(null);
  const [userProgress, setUserProgress] = useState<{
    level: number;
    xp: number;
    totalWordsMastered: number;
    totalSessions: number;
    streak: number;
    achievements: string[];
  }>({
    level: 1,
    xp: 0,
    totalWordsMastered: 0,
    totalSessions: 0,
    streak: 0,
    achievements: []
  });

  // Speak text function
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Vocabulary is now conversation-specific, no localStorage persistence

  // Handle comprehensive analysis data
  useEffect(() => {
    if (comprehensiveAnalysis && comprehensiveAnalysis.errorTypes) {
      // Auto-switch to pronunciation tab if pronunciation errors detected
      if (comprehensiveAnalysis.errorTypes.pronunciation) {
        setActiveTab('pronunciation');
        
        // Set pronunciation words for practice
        if (comprehensiveAnalysis.pronunciationWords) {
          setPronunciationWords(comprehensiveAnalysis.pronunciationWords);
        }
      }
      
      // Set comprehensive analysis data
      setAnalysisData(comprehensiveAnalysis);
    }
  }, [comprehensiveAnalysis]);

  // Track processed vocabulary items to prevent infinite loops
  const processedVocabRef = useRef<Set<string>>(new Set());

  // Handle new vocabulary items from Dashboard - optimized
  useEffect(() => {
    const processVocabItems = async () => {
      if (newVocabItems && newVocabItems.length > 0 && onUpdatePersistentVocab) {
        console.log('📚 === TOOLBAR PROCESSING VOCAB ITEMS ===');
        console.log('New vocab items:', newVocabItems);
        
        // Create a unique key for this batch of items
        const itemsKey = newVocabItems.map(item => `${item.word}-${item.meaning}`).join('|');
        
        // Check if we've already processed this batch
        if (!processedVocabRef.current.has(itemsKey)) {
          console.log('📚 === PROCESSING NEW VOCAB BATCH ===');
          // Mark this batch as processed
          processedVocabRef.current.add(itemsKey);
          
          // Don't filter out items - process all new items to generate meanings
          const uniqueNewItems = newVocabItems;
          
          console.log('📚 === PROCESSING ALL NEW ITEMS ===');
          console.log('Items to process:', uniqueNewItems);
          
          if (uniqueNewItems.length > 0) {
            // Generate meanings for items that don't have them
            const itemsWithMeanings = await Promise.all(uniqueNewItems.map(async (item) => {
              console.log(`📚 === PROCESSING ITEM: ${item.word} ===`);
              console.log('Current meaning:', item.meaning);
              
              if (!item.meaning || item.meaning.trim() === '') {
                console.log(`📚 === GENERATING MEANING FOR: ${item.word} ===`);
                try {
                  console.log(`📚 === MAKING API CALL FOR ${item.word} ===`);
                  console.log('API URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`);
                  console.log('Request body:', {
                    messages: [{
                      role: 'user',
                      content: `Provide the English translation for this German word: "${item.word}". Just return the English meaning, nothing else.`
                    }],
                    conversationId: 'word_meaning',
                    systemInstruction: "Provide only the English translation of the German word. Be concise and accurate."
                  });
                  
                  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      messages: [{
                        role: 'user',
                        content: `Provide the English translation for this German word: "${item.word}". Just return the English meaning, nothing else.`
                      }],
                      conversationId: 'word_meaning',
                      systemInstruction: "Provide only the English translation of the German word. Be concise and accurate."
                    })
                  });

                  console.log(`📚 === API RESPONSE FOR ${item.word} ===`);
                  console.log('Response status:', response.status);
                  console.log('Response ok:', response.ok);
                  console.log('Response headers:', Object.fromEntries(response.headers.entries()));

                  if (response.ok) {
                    const data = await response.json();
                    console.log(`📚 === API DATA FOR ${item.word} ===`);
                    console.log('Response data:', data);
                    const meaning = data.message.trim();
                    console.log(`📚 === GENERATED MEANING FOR ${item.word}: ${meaning} ===`);
                    return { ...item, meaning };
                  } else {
                    const errorText = await response.text();
                    console.error(`📚 === FAILED TO GET MEANING FOR ${item.word} ===`);
                    console.error('Error response:', errorText);
                    return { ...item, meaning: 'Meaning not found' };
                  }
                } catch (error) {
                  console.error(`📚 === ERROR GENERATING MEANING FOR ${item.word} ===`);
                  console.error('Error details:', error);
                  return { ...item, meaning: 'Meaning not found' };
                }
              }
              console.log(`📚 === ITEM ALREADY HAS MEANING: ${item.word} = ${item.meaning} ===`);
              return item;
            }));
            
            console.log('📚 === PROCESSED ITEMS WITH MEANINGS ===');
            console.log('Final items:', itemsWithMeanings);
            console.log('Items with meanings details:');
            itemsWithMeanings.forEach((item, index) => {
              console.log(`Item ${index}:`, {
                word: item.word,
                meaning: item.meaning,
                context: item.context
              });
            });
            
            // Only update items that don't already have meanings in persistentVocab
            const itemsToUpdate = itemsWithMeanings.filter(newItem => {
              const existingItem = persistentVocab.find(existing => existing.word === newItem.word);
              const needsUpdate = !existingItem || !existingItem.meaning || existingItem.meaning.trim() === '';
              console.log(`📚 === CHECKING IF ${newItem.word} NEEDS UPDATE ===`);
              console.log(`Existing item:`, existingItem);
              console.log(`Needs update:`, needsUpdate);
              return needsUpdate;
            });
            
            console.log('📚 === ITEMS THAT NEED UPDATING ===');
            console.log('Items to update:', itemsToUpdate);
            
            if (itemsToUpdate.length > 0) {
              // Add new items or update existing ones that need meanings
              const updatedVocab = [...persistentVocab];
              
              itemsToUpdate.forEach(itemToUpdate => {
                const existingIndex = updatedVocab.findIndex(existing => existing.word === itemToUpdate.word);
                if (existingIndex >= 0) {
                  // Update existing item
                  console.log(`📚 === UPDATING EXISTING ITEM: ${itemToUpdate.word} ===`);
                  updatedVocab[existingIndex] = itemToUpdate;
                } else {
                  // Add new item
                  console.log(`📚 === ADDING NEW ITEM: ${itemToUpdate.word} ===`);
                  updatedVocab.unshift(itemToUpdate);
                }
              });
              
              console.log('📚 === UPDATING PERSISTENT VOCAB ===');
              console.log('Updated vocab count:', updatedVocab.length);
              console.log('Updated vocab items:');
              updatedVocab.forEach((item, index) => {
                console.log(`Updated item ${index}:`, {
                  word: item.word,
                  meaning: item.meaning,
                  context: item.context
                });
              });
              console.log('Calling onUpdatePersistentVocab with:', updatedVocab);
              onUpdatePersistentVocab(updatedVocab);
              console.log('📚 === ONUPDATE PERSISTENT VOCAB CALLED ===');
            } else {
              console.log('📚 === NO ITEMS NEED UPDATING - SKIPPING ===');
            }
          }
        } else {
          console.log('📚 === SKIPPING ALREADY PROCESSED BATCH ===');
        }
      }
    };

    processVocabItems();
  }, [newVocabItems, onUpdatePersistentVocab, persistentVocab]);

  // Reset newVocabItems after processing to prevent re-processing
  useEffect(() => {
    if (newVocabItems && newVocabItems.length > 0) {
      // Clear the items after processing
      setTimeout(() => {
        // This will be handled by the parent component
      }, 100);
    }
  }, [newVocabItems]);

  // Cleanup processed items when component unmounts
  useEffect(() => {
    return () => {
      processedVocabRef.current.clear();
    };
  }, []);

  // Load cached explanation when switching to explain tab
  useEffect(() => {
    if (currentMessage && activeTab === 'explain' && explanationCache[currentMessage]) {
      setGrammarExplanation(explanationCache[currentMessage].grammar);
      setSpeakingTips(explanationCache[currentMessage].tips);
      // Show both sections if both are cached
      if (explanationCache[currentMessage].grammar && explanationCache[currentMessage].tips) {
        setShowGrammarSection(true);
        setShowSpeakingSection(true);
      } else if (explanationCache[currentMessage].grammar) {
        setShowGrammarSection(true);
        setShowSpeakingSection(false);
      } else if (explanationCache[currentMessage].tips) {
        setShowGrammarSection(false);
        setShowSpeakingSection(true);
      }
    }
  }, [currentMessage, activeTab, explanationCache]);

  // Auto-load explanations when opened via help button - but only if user manually clicks explain tab
  // Removed automatic API call on toolbar expand

  const generateGrammarExplanation = async (message: string) => {
    setIsLoadingExplanation(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grammar-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGrammarExplanation(data.analysis);
        setShowGrammarSection(true);
        setShowSpeakingSection(false);
        
        // Cache the grammar explanation
        setExplanationCache(prev => ({
          ...prev,
          [message]: {
            ...prev[message],
            grammar: data.analysis
          }
        }));
      } else {
        setGrammarExplanation('Unable to generate grammar explanation at this time.');
        setShowGrammarSection(true);
        setShowSpeakingSection(false);
      }
    } catch (error) {
      console.error('Error generating grammar explanation:', error);
      setGrammarExplanation('Unable to generate grammar explanation at this time.');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const generateSpeakingTips = async (message: string) => {
    setIsLoadingExplanation(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speaking-tips`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSpeakingTips(data.tips);
        setShowSpeakingSection(true);
        setShowGrammarSection(false);
        
        // Cache the speaking tips
        setExplanationCache(prev => ({
          ...prev,
          [message]: {
            ...prev[message],
            tips: data.tips
          }
        }));
      } else {
        setSpeakingTips('Speaking tips unavailable.');
        setShowSpeakingSection(true);
        setShowGrammarSection(false);
      }
    } catch (error) {
      console.error('Error generating speaking tips:', error);
      setSpeakingTips('Speaking tips unavailable.');
    } finally {
      setIsLoadingExplanation(false);
    }
  };


  const generateWordMeaning = async (word: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Provide the English translation and a brief explanation for this German word: "${word}". Format as: WORD: [German word] MEANING: [English translation] EXPLANATION: [Brief explanation]`
          }],
          conversationId: 'vocab_helper',
          systemInstruction: "Provide clear German-English translations and brief explanations for vocabulary words."
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.message;
        
        // Parse the response
        const wordMatch = content.match(/WORD:\s*(.+?)(?=MEANING:|$)/);
        const meaningMatch = content.match(/MEANING:\s*(.+?)(?=EXPLANATION:|$)/);
        const explanationMatch = content.match(/EXPLANATION:\s*(.+)/);
        
        const meaning = meaningMatch ? meaningMatch[1].trim() : word;
        const explanation = explanationMatch ? explanationMatch[1].trim() : '';
        
        const newVocabItem: VocabItem = {
          word: wordMatch ? wordMatch[1].trim() : word,
          meaning,
          timestamp: new Date().toISOString(),
          chatId: 'current_session',
          category: 'General',
          theme: 'Current Chat'
        };
        
        // Add to persistent vocabulary
        if (onUpdatePersistentVocab) {
          onUpdatePersistentVocab([...persistentVocab, newVocabItem]);
        }
        onAddToVocab(newVocabItem.word, newVocabItem.meaning);
      }
    } catch (error) {
      console.error('Error generating word meaning:', error);
      // Add with basic meaning
      const newVocabItem: VocabItem = {
        word,
        meaning: word,
        timestamp: new Date().toISOString(),
        chatId: 'current_session',
        category: 'General',
        theme: 'Current Chat'
      };
      // Add to persistent vocabulary
      if (onUpdatePersistentVocab) {
        onUpdatePersistentVocab([...persistentVocab, newVocabItem]);
      }
      onAddToVocab(word, word);
    }
  };

  // Remove vocabulary item
  const removeVocabItem = (index: number) => {
    if (onUpdatePersistentVocab) {
      const updatedVocab = persistentVocab.filter((_, i) => i !== index);
      onUpdatePersistentVocab(updatedVocab);
    }
  };

  // Comprehensive analysis function
  const analyzeComprehensive = async (message: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comprehensive-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          userLevel: 'Intermediate',
          source: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComprehensiveAnalysis(data);
        
        // Auto-add vocabulary words if found
        if (data.corrections.vocabulary) {
          data.corrections.vocabulary.forEach((word: any) => {
            const newVocabItem: VocabItem = {
              word: word.correct,
              meaning: word.meaning,
              timestamp: new Date().toISOString(),
              chatId: 'current_session',
              category: 'Correction',
              theme: 'Grammar Help'
            };
            // Add to persistent vocabulary
            if (onUpdatePersistentVocab) {
              onUpdatePersistentVocab([...persistentVocab, newVocabItem]);
            }
            onAddToVocab(word.correct, word.meaning);
          });
        }
        
        // Set up pronunciation words for practice
        if (data.wordsForPractice) {
          const pronunciationData: PronunciationWord[] = data.wordsForPractice.map((word: any) => ({
            word: word.word,
            score: word.score || 0,
            needsPractice: word.needsPractice,
            feedback: `Practice this word for better pronunciation`,
            commonMistakes: []
          }));
          setPronunciationWords(pronunciationData);
        }
        
        // Show relevant sections based on errors
        if (data.errorTypes.grammar) {
          setShowGrammarSection(true);
          setShowSpeakingSection(false);
        }
        if (data.errorTypes.pronunciation) {
          setShowSpeakingSection(true);
          setShowGrammarSection(false);
        }
      }
    } catch (error) {
      console.error('Error in comprehensive analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Word segmentation function
  const segmentWords = async (audioData: string, transcription: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/word-segmentation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData,
          transcription,
          language: 'de'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.segments;
      }
    } catch (error) {
      console.error('Error segmenting words:', error);
    }
    return [];
  };

  // Pronunciation practice functions
  const practiceWord = (word: string) => {
    setPracticingWord(word);
    setCurrentAttempt(0);
  };

  const startWordPractice = async () => {
    if (!practicingWord) return;
    
    try {
      // Start recording for specific word
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processWordPractice(audioBlob, practicingWord);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      
      // Auto-stop after 3 seconds for word practice
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error starting word practice:', error);
    }
  };

  const processWordPractice = async (audioBlob: Blob, word: string) => {
    try {
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Store audio for practice session
      const storageResponse = await storeAudio(audioBlob, word, 'word');
      
      // Send to pronunciation analysis
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pronunciation-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          transcription: word,
          language: 'de'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const wordScore = data.words?.[0]?.score || 0;
        
        // Update the word score
        updateWordScore(word, wordScore);
        
        // Update progress tracking
        updateProgress(word, wordScore);
        
        // Update session progress
        updateSessionProgress(word, wordScore);
        
        // Store practice history
        const practiceEntry = {
          word,
          score: wordScore,
          attempts: currentAttempt + 1,
          timestamp: new Date().toISOString(),
          audioId: storageResponse.audioId
        };
        setPracticeHistory(prev => [...prev, practiceEntry]);
        
        // Check if word is mastered or max attempts reached
        if (wordScore >= 80 || currentAttempt >= maxAttempts - 1) {
          setPracticingWord(null);
          setCurrentAttempt(0);
          
          // Check if all words are mastered
          const allWordsMastered = pronunciationWords.every(w => 
            w.word === word ? wordScore >= 80 : w.score >= 80
          );
          
          if (allWordsMastered) {
            // End practice session
            endPracticeSession();
          }
        } else {
          setCurrentAttempt(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error processing word practice:', error);
    }
  };

  const storeAudio = async (audioBlob: Blob, word: string, practiceType: string) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audio-storage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          word,
          practiceType,
          metadata: {
            timestamp: new Date().toISOString(),
            attempts: currentAttempt + 1
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAudioStorage(prev => ({
          ...prev,
          [data.audioId]: data.url
        }));
        return data;
      }
    } catch (error) {
      console.error('Error storing audio:', error);
    }
    return { audioId: '', url: '' };
  };

  const getAudioUrl = (audioId: string) => {
    return audioStorage[audioId] || '';
  };

  // Visual feedback components
  const ErrorBadge = ({ type, hasError }: { type: string, hasError: boolean }) => {
    if (!hasError) return null;
    
    const badgeConfig = {
      grammar: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Grammar' },
      vocabulary: { color: 'bg-blue-100 text-blue-800', icon: BookOpen, label: 'Vocabulary' },
      pronunciation: { color: 'bg-green-100 text-green-800', icon: Volume2, label: 'Pronunciation' }
    };
    
    const config = badgeConfig[type as keyof typeof badgeConfig];
    if (!config) return null;
    
    const Icon = config.icon;

  return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const ProgressBar = ({ score, maxScore = 100 }: { score: number, maxScore?: number }) => {
    const percentage = Math.min((score / maxScore) * 100, 100);
    const color = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const ScoreDisplay = ({ score, label }: { score: number, label: string }) => {
    const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">{label}:</span>
        <span className={`text-sm font-bold ${color}`}>{score}/100</span>
        {score >= 80 && <CheckCircle className="h-4 w-4 text-green-500" />}
      </div>
    );
  };

  const AchievementBadge = ({ type, unlocked }: { type: string, unlocked: boolean }) => {
    if (!unlocked) return null;
    
    const achievements = {
      'first_practice': { icon: Target, label: 'First Practice', color: 'bg-blue-100 text-blue-800' },
      'perfect_score': { icon: Trophy, label: 'Perfect Score', color: 'bg-yellow-100 text-yellow-800' },
      'word_master': { icon: Star, label: 'Word Master', color: 'bg-purple-100 text-purple-800' }
    };
    
    const achievement = achievements[type as keyof typeof achievements];
    if (!achievement) return null;
    
    const Icon = achievement.icon;
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${achievement.color} animate-pulse`}>
        <Icon className="h-4 w-4 mr-2" />
        {achievement.label}
      </div>
    );
  };

  const updateWordScore = (word: string, score: number) => {
    setPronunciationWords(prev => prev.map(w => 
      w.word === word 
        ? { ...w, score, needsPractice: score < 80 }
        : w
    ));
    
    // Check if word is mastered
    if (score >= 80) {
      setMasteredWords(prev => new Set([...prev, word]));
    }
  };

  // Session management functions
  const startPracticeSession = () => {
    const sessionId = `session_${Date.now()}`;
    const newSession = {
      sessionId,
      startTime: new Date().toISOString(),
      wordsPracticed: [],
      totalScore: 0,
      averageScore: 0
    };
    setCurrentSession(newSession);
    return sessionId;
  };

  const endPracticeSession = () => {
    if (currentSession) {
      const sessionData = {
        ...currentSession,
        endTime: new Date().toISOString(),
        duration: Date.now() - new Date(currentSession.startTime).getTime()
      };
      
      // Store session in localStorage
      const savedSessions = JSON.parse(localStorage.getItem('practice_sessions') || '[]');
      savedSessions.push(sessionData);
      localStorage.setItem('practice_sessions', JSON.stringify(savedSessions));
      
      setCurrentSession(null);
      return sessionData;
    }
    return null;
  };

  const updateSessionProgress = (word: string, score: number) => {
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        wordsPracticed: [...currentSession.wordsPracticed, word],
        totalScore: currentSession.totalScore + score,
        averageScore: (currentSession.totalScore + score) / (currentSession.wordsPracticed.length + 1)
      };
      setCurrentSession(updatedSession);
    }
  };

  const getSessionStats = () => {
    if (!currentSession) return null;
    
    return {
      wordsPracticed: currentSession.wordsPracticed.length,
      averageScore: Math.round(currentSession.averageScore),
      duration: Date.now() - new Date(currentSession.startTime).getTime(),
      masteredInSession: currentSession.wordsPracticed.filter(word => masteredWords.has(word)).length
    };
  };

  // Progress tracking and gamification functions
  const addXP = (amount: number) => {
    setUserProgress(prev => {
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / 100) + 1;
      const leveledUp = newLevel > prev.level;
      
      return {
        ...prev,
        xp: newXP,
        level: newLevel,
        achievements: leveledUp ? [...prev.achievements, 'level_up'] : prev.achievements
      };
    });
  };

  const checkAchievements = (newWord: string, score: number) => {
    const newAchievements: string[] = [];
    
    // First word mastered
    if (score >= 80 && !userProgress.achievements.includes('first_mastery')) {
      newAchievements.push('first_mastery');
    }
    
    // Perfect score
    if (score >= 100 && !userProgress.achievements.includes('perfect_score')) {
      newAchievements.push('perfect_score');
    }
    
    // Streak achievements
    if (userProgress.streak >= 5 && !userProgress.achievements.includes('streak_5')) {
      newAchievements.push('streak_5');
    }
    
    if (newAchievements.length > 0) {
      setUserProgress(prev => ({
        ...prev,
        achievements: [...prev.achievements, ...newAchievements]
      }));
    }
  };

  const updateProgress = (word: string, score: number) => {
    // Add XP based on score
    const xpGained = Math.floor(score / 10);
    addXP(xpGained);
    
    // Update word mastery count
    if (score >= 80) {
      setUserProgress(prev => ({
        ...prev,
        totalWordsMastered: prev.totalWordsMastered + 1,
        streak: prev.streak + 1
      }));
    } else {
      setUserProgress(prev => ({
        ...prev,
        streak: 0
      }));
    }
    
    // Check for achievements
    checkAchievements(word, score);
  };

  const getProgressStats = () => {
    return {
      level: userProgress.level,
      xp: userProgress.xp,
      xpToNextLevel: (userProgress.level * 100) - userProgress.xp,
      totalWordsMastered: userProgress.totalWordsMastered,
      streak: userProgress.streak,
      achievements: userProgress.achievements
    };
  };

  if (!isVisible) return null;

  return (
    <div className="w-full bg-white flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'vocab'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Vocabulary
        </button>
        <button
          onClick={() => {
            setActiveTab('explain');
            // Only call API when user manually clicks explain tab
            if (currentMessage && !explanationCache[currentMessage]) {
              generateGrammarExplanation(currentMessage);
            }
          }}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'explain'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Lightbulb className="h-4 w-4 inline mr-2" />
          Explain
        </button>
        <button
          onClick={() => setActiveTab('pronunciation')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'pronunciation'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Volume2 className="h-4 w-4 inline mr-2" />
          Pronunciation
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'vocab' && (
          <div className="space-y-6">
            {vocabItems.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 text-base">Collected Vocabulary</h4>
                  <select
                    value={vocabFilter}
                    onChange={(e) => setVocabFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="all">All</option>
                    <option value="General">General</option>
                    <option value="Current Chat">Current Chat</option>
                  </select>
                </div>
                {vocabItems
                  .filter(item => vocabFilter === 'all' || item.category === vocabFilter || item.theme === vocabFilter)
                  .map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-base">{item.word}</div>
                        <div className="text-sm text-gray-600 mt-1">{item.meaning}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {item.category} • {item.theme}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => speakText(item.word)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Listen"
                        >
                          <Volume2 className="h-4 w-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => removeVocabItem(index)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vocabulary Yet</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Start a conversation and use the translate feature to collect German words
                </p>
                <div className="bg-blue-50 rounded-xl p-6 text-center">
                  <p className="text-sm text-blue-700">
                    💡 Click the "EN" button on any AI message, then "Add words to vocab" to start building your vocabulary!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'explain' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 max-h-[600px]" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6'
            }}>
              {isLoadingExplanation ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Analyzing grammar...</p>
                </div>
              ) : (showGrammarSection || showSpeakingSection) ? (
                <div className="space-y-6 pb-6 relative">
                  {/* Scroll indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
                  
                  {/* Grammar Structure */}
                  {showGrammarSection && grammarExplanation && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <h4 className="font-bold text-blue-900 mb-6 flex items-center text-lg">
                        <Lightbulb className="h-6 w-6 mr-3" />
                        Grammar Analysis
                      </h4>
                      <div className="prose prose-sm max-w-none">
                        <div 
                          className="text-sm text-blue-800 leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: grammarExplanation
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br/>')
                          }}
                        />
                      </div>
                      
                      {/* Show Speaking Like a Local button after grammar analysis */}
                      {!showSpeakingSection && (
                        <div className="mt-6">
                          <button
                            onClick={() => generateSpeakingTips(currentMessage)}
                            disabled={!currentMessage || isLoadingExplanation}
                            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                          >
                            <span className="text-sm">🗣️</span>
                            <span>Speaking Like a Local</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Speaking Tips */}
                  {showSpeakingSection && speakingTips && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <h4 className="font-bold text-green-900 mb-4 flex items-center text-lg">
                        <span className="text-sm bg-green-200 text-green-800 px-3 py-1 rounded-full mr-3 font-semibold">TIP</span>
                        Speaking Like a Local
                      </h4>
                      <div 
                        className="text-sm text-green-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: speakingTips
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-6">
                    Get grammar analysis and speaking tips for the current message
                  </p>
                  <div className="space-y-3">
                    {!showGrammarSection && (
                      <button
                        onClick={() => generateGrammarExplanation(currentMessage)}
                        disabled={!currentMessage || isLoadingExplanation}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <Lightbulb className="h-4 w-4" />
                        <span>Grammar Analysis</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pronunciation' && (
          <div className="space-y-6">
            {currentMessage ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 text-base">Pronunciation Practice</h4>
                  <div className="flex space-x-2">
                    {!currentSession ? (
                      <button
                        onClick={startPracticeSession}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
                      >
                        <Target className="h-4 w-4" />
                        <span>Start Session</span>
                      </button>
                    ) : (
                      <button
                        onClick={endPracticeSession}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center space-x-2"
                      >
                        <Trophy className="h-4 w-4" />
                        <span>End Session</span>
                      </button>
                    )}
                    <button
                      onClick={() => analyzeComprehensive(currentMessage)}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                      <span>Analyze</span>
                    </button>
                  </div>
                </div>

                {/* Progress Stats */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
                  <h5 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Your Progress
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-purple-700">Level:</span>
                      <span className="ml-2 font-bold text-purple-900">{getProgressStats().level}</span>
                    </div>
                    <div>
                      <span className="text-purple-700">XP:</span>
                      <span className="ml-2 font-bold text-purple-900">{getProgressStats().xp}</span>
                    </div>
                    <div>
                      <span className="text-purple-700">Words Mastered:</span>
                      <span className="ml-2 font-bold text-green-600">{getProgressStats().totalWordsMastered}</span>
                    </div>
                    <div>
                      <span className="text-purple-700">Streak:</span>
                      <span className="ml-2 font-bold text-orange-600">{getProgressStats().streak}</span>
                    </div>
                  </div>
                  
                  {/* XP Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-purple-600 mb-1">
                      <span>Level {getProgressStats().level}</span>
                      <span>{getProgressStats().xpToNextLevel} XP to next level</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(getProgressStats().xp % 100) / 100 * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Recent Achievements */}
                  {getProgressStats().achievements.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <p className="text-xs text-purple-600 mb-2">Recent Achievements:</p>
                      <div className="flex flex-wrap gap-1">
                        {getProgressStats().achievements.slice(-3).map((achievement, idx) => (
                          <AchievementBadge key={idx} type={achievement} unlocked={true} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Session Stats */}
                {currentSession && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h5 className="font-semibold text-blue-900 mb-2">Practice Session</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Words Practiced:</span>
                        <span className="ml-2 font-bold">{getSessionStats()?.wordsPracticed || 0}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Average Score:</span>
                        <span className="ml-2 font-bold">{getSessionStats()?.averageScore || 0}/100</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Mastered:</span>
                        <span className="ml-2 font-bold text-green-600">{getSessionStats()?.masteredInSession || 0}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Duration:</span>
                        <span className="ml-2 font-bold">{Math.round((getSessionStats()?.duration || 0) / 1000 / 60)}m</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Message */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-700">Current Message</span>
                    <button
                      onClick={() => speakText(currentMessage)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Volume2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Listen</span>
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{currentMessage}</p>
                </div>
                
                {/* Error Badges */}
                {analysisData && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <ErrorBadge type="grammar" hasError={analysisData.errorTypes.grammar} />
                    <ErrorBadge type="vocabulary" hasError={analysisData.errorTypes.vocabulary} />
                    <ErrorBadge type="pronunciation" hasError={analysisData.errorTypes.pronunciation} />
                  </div>
                )}

                {/* Words for Practice */}
                {pronunciationWords.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-gray-700">Words to Practice</h5>
                      <div className="flex space-x-2">
                        <AchievementBadge type="first_practice" unlocked={practiceHistory.length > 0} />
                        <AchievementBadge type="perfect_score" unlocked={pronunciationWords.some(w => w.score >= 100)} />
                      </div>
                    </div>
                    {pronunciationWords.map((wordData, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-semibold">{wordData.word}</span>
                          <div className="flex items-center space-x-2">
                            <ScoreDisplay score={wordData.score} label="Score" />
                            {wordData.needsPractice && (
                              <button
                                onClick={() => practiceWord(wordData.word)}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center space-x-1"
                              >
                                <Mic className="h-3 w-3" />
                                <span>Practice</span>
                              </button>
                            )}
                            {wordData.score >= 80 && (
                              <AchievementBadge type="word_master" unlocked={true} />
                            )}
                          </div>
                        </div>
                        
                        {/* Enhanced Progress bar */}
                        <div className="mb-3">
                          <ProgressBar score={wordData.score} />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0</span>
                            <span>50</span>
                            <span>100</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">{wordData.feedback}</p>
                          
                          {/* Difficulty and sounds to focus on */}
                          {wordData.difficulty && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Difficulty:</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                wordData.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                wordData.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {wordData.difficulty}
                              </span>
                            </div>
                          )}
                          
                          {wordData.soundsToFocus && wordData.soundsToFocus.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Focus on:</span>
                              <div className="flex space-x-1">
                                {wordData.soundsToFocus.map((sound, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                    {sound}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Common mistakes */}
                          {wordData.commonMistakes && wordData.commonMistakes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Common mistakes:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {wordData.commonMistakes.map((mistake, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-red-500 mr-1">•</span>
                                    {mistake}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Improvement tips */}
                          {wordData.improvementTips && wordData.improvementTips.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Tips:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {wordData.improvementTips.map((tip, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-blue-500 mr-1">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {/* Practice History for this word */}
                        {practiceHistory.filter(h => h.word === wordData.word).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-2">Practice History:</p>
                            <div className="flex space-x-2">
                              {practiceHistory
                                .filter(h => h.word === wordData.word)
                                .slice(-3) // Show last 3 attempts
                                .map((history, idx) => (
                                  <div key={idx} className="flex items-center space-x-1">
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      history.score >= 80 ? 'bg-green-100 text-green-800' : 
                                      history.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {history.score}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Practice Session */}
                {practicingWord && (
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h5 className="font-semibold mb-4">Practice: {practicingWord}</h5>
                    <div className="space-y-4">
                      <button
                        onClick={startWordPractice}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
                      >
                        Record "{practicingWord}"
                      </button>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">
                          Attempt {currentAttempt} of {maxAttempts}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* General Practice Tips */}
                <div className="space-y-3">
                  <h5 className="text-sm font-semibold text-gray-700">Practice Tips</h5>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Listen to the pronunciation first
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Repeat the sentence slowly
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Focus on difficult sounds
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Practice with rhythm and intonation
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Volume2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Pronunciation practice will be available when the AI sends a message
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
