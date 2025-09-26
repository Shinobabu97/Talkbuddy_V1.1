import React, { useState, useEffect } from 'react';
import { BookOpen, Lightbulb, Volume2, Star, X } from 'lucide-react';

interface ToolbarProps {
  isVisible: boolean;
  onClose: () => void;
  currentMessage?: string;
  onAddToVocab: (word: string, meaning: string) => void;
  autoLoadExplanations?: boolean;
}

interface VocabItem {
  word: string;
  meaning: string;
  timestamp: string;
  chatId?: string;
  category?: string;
  theme?: string;
}

export default function Toolbar({ isVisible, onClose, currentMessage, onAddToVocab, autoLoadExplanations = false }: ToolbarProps) {
  const [activeTab, setActiveTab] = useState<'vocab' | 'explain' | 'pronunciation'>('explain');
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [grammarExplanation, setGrammarExplanation] = useState<string>('');
  const [speakingTips, setSpeakingTips] = useState<string>('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [vocabFilter, setVocabFilter] = useState<string>('all');
  const [explanationCache, setExplanationCache] = useState<{[key: string]: {grammar: string, tips: string}}>({});
  const [showGrammarSection, setShowGrammarSection] = useState<boolean>(false);
  const [showSpeakingSection, setShowSpeakingSection] = useState<boolean>(false);

  // Load vocabulary from localStorage on component mount
  useEffect(() => {
    const savedVocab = localStorage.getItem('talkbuddy_vocab');
    if (savedVocab) {
      setVocabItems(JSON.parse(savedVocab));
    }
  }, []);

  // Save vocabulary to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('talkbuddy_vocab', JSON.stringify(vocabItems));
  }, [vocabItems]);

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

  // Auto-load explanations when opened via help button
  useEffect(() => {
    if (autoLoadExplanations && currentMessage && activeTab === 'explain' && !explanationCache[currentMessage]) {
      // Auto-generate grammar explanation
      generateGrammarExplanation(currentMessage);
    }
  }, [autoLoadExplanations, currentMessage, activeTab, explanationCache]);

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
        
        setVocabItems(prev => [...prev, newVocabItem]);
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
      setVocabItems(prev => [...prev, newVocabItem]);
      onAddToVocab(word, word);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const removeVocabItem = (index: number) => {
    setVocabItems(prev => prev.filter((_, i) => i !== index));
  };

  if (!isVisible) return null;

  return (
    <div className="w-[600px] bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Toolbox</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'vocab'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Vocab
        </button>
        <button
          onClick={() => setActiveTab('explain')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'explain'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-6">
                Vocabulary collection feature will be available soon
              </p>
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-500">
                  Vocabulary management coming soon
                </p>
              </div>
            </div>

            {vocabItems.length > 0 && (
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
                <h4 className="font-semibold text-gray-900 text-base">Pronunciation Practice</h4>
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
