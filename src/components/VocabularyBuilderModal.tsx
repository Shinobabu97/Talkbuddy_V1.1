import React, { useState } from 'react';
import { X, BookOpen, Volume2, Star, Coffee, Utensils, Plane, ShoppingBag, Heart, AlertTriangle, Train } from 'lucide-react';
import FlashcardModal from './FlashcardModal';
import TestModeModal from './TestModeModal';

interface VocabularyBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  myVocabWords: string[];
  persistentVocab: Array<{word: string, meaning: string, context: string}>;
  onPlayAudio: (word: string) => void;
  onUpdatePersistentVocab?: (newVocab: Array<{word: string, meaning: string, context: string}>) => void;
}

interface TopicWord {
  word: string;
  meaning: string;
  context?: string;
}

interface Topic {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  words: TopicWord[];
}

// Hardcoded topic-based vocabulary
const TOPICS: Topic[] = [
  {
    id: 'greetings',
    name: 'Greetings & Basics',
    icon: Heart,
    description: 'Essential greetings and daily expressions',
    words: [
      { word: 'Hallo', meaning: 'Hello', context: 'Basic greeting' },
      { word: 'Guten Morgen', meaning: 'Good morning', context: 'Morning greeting' },
      { word: 'Guten Tag', meaning: 'Good day', context: 'Daytime greeting' },
      { word: 'Guten Abend', meaning: 'Good evening', context: 'Evening greeting' },
      { word: 'Tschüss', meaning: 'Goodbye', context: 'Informal farewell' },
      { word: 'Auf Wiedersehen', meaning: 'Goodbye', context: 'Formal farewell' },
      { word: 'Bitte', meaning: 'Please / You\'re welcome', context: 'Polite expression' },
      { word: 'Danke', meaning: 'Thank you', context: 'Gratitude expression' },
      { word: 'Entschuldigung', meaning: 'Excuse me / Sorry', context: 'Apology or attention-getting' },
      { word: 'Ja', meaning: 'Yes', context: 'Affirmative response' },
      { word: 'Nein', meaning: 'No', context: 'Negative response' },
    ]
  },
  {
    id: 'food',
    name: 'Food & Dining',
    icon: Utensils,
    description: 'Words related to food, drinks, and dining',
    words: [
      { word: 'das Brot', meaning: 'Bread', context: 'Staple food' },
      { word: 'die Butter', meaning: 'Butter', context: 'Dairy product' },
      { word: 'der Käse', meaning: 'Cheese', context: 'Dairy product' },
      { word: 'das Wasser', meaning: 'Water', context: 'Beverage' },
      { word: 'der Kaffee', meaning: 'Coffee', context: 'Hot beverage' },
      { word: 'der Tee', meaning: 'Tea', context: 'Hot beverage' },
      { word: 'das Bier', meaning: 'Beer', context: 'Alcoholic beverage' },
      { word: 'der Wein', meaning: 'Wine', context: 'Alcoholic beverage' },
      { word: 'das Fleisch', meaning: 'Meat', context: 'Food category' },
      { word: 'der Fisch', meaning: 'Fish', context: 'Seafood' },
      { word: 'das Gemüse', meaning: 'Vegetables', context: 'Food category' },
      { word: 'das Obst', meaning: 'Fruit', context: 'Food category' },
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Transportation',
    icon: Plane,
    description: 'Words for travel, directions, and transportation',
    words: [
      { word: 'der Bahnhof', meaning: 'Train station', context: 'Transportation hub' },
      { word: 'der Flughafen', meaning: 'Airport', context: 'Transportation hub' },
      { word: 'das Auto', meaning: 'Car', context: 'Vehicle' },
      { word: 'der Zug', meaning: 'Train', context: 'Vehicle' },
      { word: 'der Bus', meaning: 'Bus', context: 'Vehicle' },
      { word: 'das Taxi', meaning: 'Taxi', context: 'Vehicle' },
      { word: 'die Straße', meaning: 'Street', context: 'Location' },
      { word: 'die Stadt', meaning: 'City', context: 'Location' },
      { word: 'das Hotel', meaning: 'Hotel', context: 'Accommodation' },
      { word: 'die Karte', meaning: 'Map / Card / Ticket', context: 'Navigation or payment' },
      { word: 'links', meaning: 'Left', context: 'Direction' },
      { word: 'rechts', meaning: 'Right', context: 'Direction' },
    ]
  },
  {
    id: 'shopping',
    name: 'Shopping & Money',
    icon: ShoppingBag,
    description: 'Words for shopping, prices, and transactions',
    words: [
      { word: 'der Laden', meaning: 'Shop', context: 'Retail location' },
      { word: 'das Geschäft', meaning: 'Store / Business', context: 'Retail location' },
      { word: 'der Supermarkt', meaning: 'Supermarket', context: 'Grocery store' },
      { word: 'das Geld', meaning: 'Money', context: 'Currency' },
      { word: 'der Preis', meaning: 'Price', context: 'Cost' },
      { word: 'teuer', meaning: 'Expensive', context: 'Price description' },
      { word: 'billig', meaning: 'Cheap', context: 'Price description' },
      { word: 'kaufen', meaning: 'To buy', context: 'Action' },
      { word: 'verkaufen', meaning: 'To sell', context: 'Action' },
      { word: 'bezahlen', meaning: 'To pay', context: 'Action' },
      { word: 'die Rechnung', meaning: 'Bill / Invoice', context: 'Document' },
    ]
  },
  {
    id: 'daily',
    name: 'Daily Life',
    icon: Coffee,
    description: 'Common words for everyday activities',
    words: [
      { word: 'das Haus', meaning: 'House', context: 'Building' },
      { word: 'die Wohnung', meaning: 'Apartment', context: 'Dwelling' },
      { word: 'das Zimmer', meaning: 'Room', context: 'Space' },
      { word: 'die Arbeit', meaning: 'Work', context: 'Employment' },
      { word: 'die Schule', meaning: 'School', context: 'Education' },
      { word: 'die Zeit', meaning: 'Time', context: 'Temporal concept' },
      { word: 'der Tag', meaning: 'Day', context: 'Time period' },
      { word: 'die Woche', meaning: 'Week', context: 'Time period' },
      { word: 'das Jahr', meaning: 'Year', context: 'Time period' },
      { word: 'heute', meaning: 'Today', context: 'Time reference' },
      { word: 'morgen', meaning: 'Tomorrow', context: 'Time reference' },
      { word: 'gestern', meaning: 'Yesterday', context: 'Time reference' },
    ]
  },
  {
    id: 'hospital',
    name: 'At the Hospital',
    icon: Heart,
    description: 'Medical and healthcare vocabulary',
    words: [
      { word: 'der Arzt', meaning: 'Doctor', context: 'Medical professional' },
      { word: 'die Krankenschwester', meaning: 'Nurse', context: 'Medical professional' },
      { word: 'das Krankenhaus', meaning: 'Hospital', context: 'Medical facility' },
      { word: 'der Schmerz', meaning: 'Pain', context: 'Symptom' },
      { word: 'die Medizin', meaning: 'Medicine', context: 'Treatment' },
      { word: 'der Termin', meaning: 'Appointment', context: 'Scheduling' },
      { word: 'die Notaufnahme', meaning: 'Emergency room', context: 'Medical facility' },
      { word: 'das Rezept', meaning: 'Prescription', context: 'Medical document' },
      { word: 'krank', meaning: 'Sick', context: 'Health status' },
      { word: 'gesund', meaning: 'Healthy', context: 'Health status' },
      { word: 'der Verband', meaning: 'Bandage', context: 'Medical supply' },
      { word: 'die Spritze', meaning: 'Injection', context: 'Medical procedure' },
    ]
  },
  {
    id: 'emergency',
    name: 'During an Emergency',
    icon: AlertTriangle,
    description: 'Essential emergency and safety vocabulary',
    words: [
      { word: 'Hilfe', meaning: 'Help', context: 'Emergency call' },
      { word: 'der Notfall', meaning: 'Emergency', context: 'Urgent situation' },
      { word: 'die Polizei', meaning: 'Police', context: 'Emergency service' },
      { word: 'die Feuerwehr', meaning: 'Fire department', context: 'Emergency service' },
      { word: 'der Krankenwagen', meaning: 'Ambulance', context: 'Emergency vehicle' },
      { word: 'Vorsicht', meaning: 'Caution', context: 'Warning' },
      { word: 'Feuer', meaning: 'Fire', context: 'Emergency situation' },
      { word: 'Gefahr', meaning: 'Danger', context: 'Warning' },
      { word: 'der Unfall', meaning: 'Accident', context: 'Emergency situation' },
      { word: 'schnell', meaning: 'Quick / Fast', context: 'Speed descriptor' },
      { word: 'rufen', meaning: 'To call', context: 'Action' },
      { word: 'retten', meaning: 'To rescue', context: 'Action' },
    ]
  },
  {
    id: 'airport-train',
    name: 'At the Airport/Train Station',
    icon: Train,
    description: 'Travel hub vocabulary',
    words: [
      { word: 'der Flug', meaning: 'Flight', context: 'Air travel' },
      { word: 'der Zug', meaning: 'Train', context: 'Rail travel' },
      { word: 'das Gleis', meaning: 'Platform / Track', context: 'Rail station' },
      { word: 'der Abflug', meaning: 'Departure', context: 'Travel timing' },
      { word: 'die Ankunft', meaning: 'Arrival', context: 'Travel timing' },
      { word: 'das Gepäck', meaning: 'Luggage', context: 'Travel item' },
      { word: 'der Koffer', meaning: 'Suitcase', context: 'Travel item' },
      { word: 'die Bordkarte', meaning: 'Boarding pass', context: 'Travel document' },
      { word: 'verspätet', meaning: 'Delayed', context: 'Travel status' },
      { word: 'pünktlich', meaning: 'On time', context: 'Travel status' },
      { word: 'die Durchsage', meaning: 'Announcement', context: 'Communication' },
      { word: 'der Schalter', meaning: 'Counter', context: 'Service location' },
    ]
  }
];

const VocabularyBuilderModal: React.FC<VocabularyBuilderModalProps> = ({
  isOpen,
  onClose,
  myVocabWords,
  persistentVocab,
  onPlayAudio,
  onUpdatePersistentVocab
}) => {
  const [activeTab, setActiveTab] = useState<'my-vocab' | 'by-topic'>('my-vocab');
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [myVocabSet, setMyVocabSet] = useState<Set<string>>(new Set(myVocabWords));

  // Get full word details for flashcard
  const myVocabDetails = myVocabWords
    .map(wordText => persistentVocab.find(w => w.word === wordText))
    .filter((w): w is { word: string; meaning: string; context?: string } => w !== undefined);
  
  console.log('📚 My Vocab Details:', {
    myVocabWords,
    persistentVocab: persistentVocab.length,
    myVocabDetails: myVocabDetails.length,
    details: myVocabDetails
  });

  const handleWordClick = (index: number) => {
    console.log('🃏 Flashcard - Word clicked:', {
      index,
      totalWords: myVocabDetails.length,
      word: myVocabDetails[index]
    });
    setSelectedWordIndex(index);
    setShowFlashcard(true);
  };

  const handleNextWord = () => {
    if (selectedWordIndex < myVocabDetails.length - 1) {
      setSelectedWordIndex(selectedWordIndex + 1);
    }
  };

  const handlePreviousWord = () => {
    if (selectedWordIndex > 0) {
      setSelectedWordIndex(selectedWordIndex - 1);
    }
  };

  const handleTestMode = () => {
    setShowFlashcard(false);
    setShowTestMode(true);
  };

  const handleReturnToFlashcards = () => {
    setShowTestMode(false);
    setShowFlashcard(true);
    setSelectedWordIndex(0);
  };

  const handleSaveToMyVocab = (word: string, meaning?: string, context?: string) => {
    const updatedSet = new Set(myVocabSet);
    updatedSet.add(word);
    setMyVocabSet(updatedSet);
    
    // Save to localStorage
    const currentVocab = JSON.parse(localStorage.getItem('myVocab') || '[]');
    if (!currentVocab.includes(word)) {
      currentVocab.push(word);
      localStorage.setItem('myVocab', JSON.stringify(currentVocab));
    }
    
    // Also add to persistentVocab if it doesn't exist
    if (onUpdatePersistentVocab && meaning) {
      const exists = persistentVocab.find(v => v.word === word);
      if (!exists) {
        const newVocab = [...persistentVocab, { word, meaning, context: context || '' }];
        onUpdatePersistentVocab(newVocab);
      }
    }
  };

  const isWordSaved = (word: string) => {
    return myVocabSet.has(word);
  };

  const handleDeleteFromMyVocab = (word: string) => {
    // Remove from myVocabSet
    const updatedSet = new Set(myVocabSet);
    updatedSet.delete(word);
    setMyVocabSet(updatedSet);
    
    // Update localStorage
    localStorage.setItem('myVocab', JSON.stringify(Array.from(updatedSet)));
  };

  return (
    <>
      {/* Vocabulary Builder Panel */}
      <div className="w-[800px] h-full bg-gradient-to-b from-white to-slate-50 border-r border-slate-200 flex flex-col overflow-hidden shadow-lg">
      {/* Header with Close Button */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-display text-slate-800">Vocabulary Builder</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('my-vocab')}
            className={`px-6 py-4 text-sm font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'my-vocab'
                ? 'text-blue-700 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
                : 'text-gray-600 border-transparent hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            My Vocabulary
          </button>
          <button
            onClick={() => setActiveTab('by-topic')}
            className={`px-6 py-4 text-sm font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'by-topic'
                ? 'text-blue-700 border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50'
                : 'text-gray-600 border-transparent hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Vocab By Topic
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'my-vocab' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Saved Words ({myVocabWords.length})
              </h3>
              {myVocabWords.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No words saved yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Star words from the Vocabulary tab to add them here
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {myVocabWords.map((wordText, index) => {
                    const wordDetails = persistentVocab.find(w => w.word === wordText);
                    if (!wordDetails) return null;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => handleWordClick(index)}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-semibold text-gray-900">
                            {wordDetails.word}
                          </span>
                          <div className="flex items-center space-x-6">
                            <span className="text-xl text-gray-700">
                              {wordDetails.meaning}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="relative group">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPlayAudio(wordDetails.word);
                                  }}
                                  className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Volume2 className="h-5 w-5" />
                                </button>
                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                  Listen
                                </div>
                              </div>
                              <div className="relative group">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFromMyVocab(wordDetails.word);
                                  }}
                                  className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                                  Remove word
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedTopic === null ? (
            /* Topic Selection View */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Choose a Topic
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TOPICS.map((topic) => {
                  const IconComponent = topic.icon;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 hover:from-blue-100 hover:to-indigo-200 transition-all shadow-md hover:shadow-lg border border-blue-200 text-left"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="bg-blue-500 p-3 rounded-lg">
                          <IconComponent className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-gray-900 mb-1">{topic.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{topic.description}</p>
                          <p className="text-xs text-blue-600 font-medium">{topic.words.length} words</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Topic Words View */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center space-x-1"
                >
                  <span>←</span>
                  <span>Back to Topics</span>
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedTopic.name}
                </h3>
                <div className="w-24"></div> {/* Spacer for centering */}
              </div>
              
              <div className="grid gap-3">
                {selectedTopic.words.map((word, index) => {
                  const isSaved = isWordSaved(word.word);
                  return (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <span className="text-xl font-semibold text-gray-900 mr-4">
                            {word.word}
                          </span>
                          <span className="text-xl text-gray-700">
                            {word.meaning}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          {/* Audio Button */}
                          <div className="relative group">
                            <button
                              onClick={() => onPlayAudio(word.word)}
                              className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Volume2 className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                              Listen
                            </div>
                          </div>
                          {/* Save Button */}
                          <div className="relative group">
                            <button
                              onClick={() => handleSaveToMyVocab(word.word, word.meaning, word.context)}
                              disabled={isSaved}
                              className={`p-2 rounded-lg transition-colors ${
                                isSaved
                                  ? 'text-yellow-500 bg-yellow-50 cursor-default'
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                              }`}
                            >
                              <Star className={`h-5 w-5 ${isSaved ? 'fill-yellow-500' : ''}`} />
                            </button>
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                              {isSaved ? 'Saved' : 'Save to My Vocabulary'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flashcard Panel - Slides in to the right */}
      {showFlashcard && myVocabDetails.length > 0 && (
        <FlashcardModal
          words={myVocabDetails}
          currentIndex={selectedWordIndex}
          onClose={() => setShowFlashcard(false)}
          onNext={handleNextWord}
          onPrevious={handlePreviousWord}
          onTestMode={handleTestMode}
          onPlayAudio={onPlayAudio}
        />
      )}

      {/* Test Mode Modal - Full overlay */}
      {showTestMode && myVocabDetails.length > 0 && (
        <div className="fixed inset-0 z-50">
          <TestModeModal
            words={myVocabDetails}
            onClose={() => setShowTestMode(false)}
            onReturnToFlashcards={handleReturnToFlashcards}
          />
        </div>
      )}
    </>
  );
};

export default VocabularyBuilderModal;

