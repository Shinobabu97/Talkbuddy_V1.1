import React, { useState, useEffect } from 'react';
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
  partOfSpeech?: string;
  gender?: string;
  number?: string;
  tense?: string;
  case?: string;
  pronunciationHint?: string;
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
      { word: 'Hallo', meaning: 'Hello', context: 'Basic greeting', partOfSpeech: 'interjection', pronunciationHint: 'ha-loh' },
      { word: 'Guten Morgen', meaning: 'Good morning', context: 'Morning greeting', partOfSpeech: 'phrase', pronunciationHint: 'goo-ten mor-gen' },
      { word: 'Guten Tag', meaning: 'Good day', context: 'Daytime greeting', partOfSpeech: 'phrase', pronunciationHint: 'goo-ten tahk' },
      { word: 'Guten Abend', meaning: 'Good evening', context: 'Evening greeting', partOfSpeech: 'phrase', pronunciationHint: 'goo-ten ah-bent' },
      { word: 'Tschüss', meaning: 'Goodbye', context: 'Informal farewell', partOfSpeech: 'interjection', pronunciationHint: 'chues' },
      { word: 'Auf Wiedersehen', meaning: 'Goodbye', context: 'Formal farewell', partOfSpeech: 'phrase', pronunciationHint: 'ouf vee-der-zay-en' },
      { word: 'Bitte', meaning: 'Please / You\'re welcome', context: 'Polite expression', partOfSpeech: 'adverb', pronunciationHint: 'bit-teh' },
      { word: 'Danke', meaning: 'Thank you', context: 'Gratitude expression', partOfSpeech: 'interjection', pronunciationHint: 'dank-eh' },
      { word: 'Entschuldigung', meaning: 'Excuse me / Sorry', context: 'Apology or attention-getting', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'ent-shul-dee-gung' },
      { word: 'Ja', meaning: 'Yes', context: 'Affirmative response', partOfSpeech: 'adverb', pronunciationHint: 'yah' },
      { word: 'Nein', meaning: 'No', context: 'Negative response', partOfSpeech: 'adverb', pronunciationHint: 'nyne' },
    ]
  },
  {
    id: 'food',
    name: 'Food & Dining',
    icon: Utensils,
    description: 'Words related to food, drinks, and dining',
    words: [
      { word: 'das Brot', meaning: 'Bread', context: 'Staple food', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das broht' },
      { word: 'die Butter', meaning: 'Butter', context: 'Dairy product', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee but-ter' },
      { word: 'der Käse', meaning: 'Cheese', context: 'Dairy product', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr kay-zeh' },
      { word: 'das Wasser', meaning: 'Water', context: 'Beverage', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das vas-ser' },
      { word: 'der Kaffee', meaning: 'Coffee', context: 'Hot beverage', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr kaf-fay' },
      { word: 'der Tee', meaning: 'Tea', context: 'Hot beverage', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr tay' },
      { word: 'das Bier', meaning: 'Beer', context: 'Alcoholic beverage', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das beer' },
      { word: 'der Wein', meaning: 'Wine', context: 'Alcoholic beverage', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr vine' },
      { word: 'das Fleisch', meaning: 'Meat', context: 'Food category', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das flysh' },
      { word: 'der Fisch', meaning: 'Fish', context: 'Seafood', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr fish' },
      { word: 'das Gemüse', meaning: 'Vegetables', context: 'Food category', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das geh-mue-zeh' },
      { word: 'das Obst', meaning: 'Fruit', context: 'Food category', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das ohpst' },
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Transportation',
    icon: Plane,
    description: 'Words for travel, directions, and transportation',
    words: [
      { word: 'der Bahnhof', meaning: 'Train station', context: 'Transportation hub', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr bahn-hohf' },
      { word: 'der Flughafen', meaning: 'Airport', context: 'Transportation hub', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr floog-hah-fen' },
      { word: 'das Auto', meaning: 'Car', context: 'Vehicle', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das ou-toh' },
      { word: 'der Zug', meaning: 'Train', context: 'Vehicle', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr tsoog' },
      { word: 'der Bus', meaning: 'Bus', context: 'Vehicle', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr bus' },
      { word: 'das Taxi', meaning: 'Taxi', context: 'Vehicle', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das tak-see' },
      { word: 'die Straße', meaning: 'Street', context: 'Location', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee shtrah-seh' },
      { word: 'die Stadt', meaning: 'City', context: 'Location', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee shtat' },
      { word: 'das Hotel', meaning: 'Hotel', context: 'Accommodation', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das ho-tel' },
      { word: 'die Karte', meaning: 'Map / Card / Ticket', context: 'Navigation or payment', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee kar-teh' },
      { word: 'links', meaning: 'Left', context: 'Direction', partOfSpeech: 'adverb', pronunciationHint: 'links' },
      { word: 'rechts', meaning: 'Right', context: 'Direction', partOfSpeech: 'adverb', pronunciationHint: 'rekhts' },
    ]
  },
  {
    id: 'shopping',
    name: 'Shopping & Money',
    icon: ShoppingBag,
    description: 'Words for shopping, prices, and transactions',
    words: [
      { word: 'der Laden', meaning: 'Shop', context: 'Retail location', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr lah-den' },
      { word: 'das Geschäft', meaning: 'Store / Business', context: 'Retail location', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das geh-sheft' },
      { word: 'der Supermarkt', meaning: 'Supermarket', context: 'Grocery store', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr zoo-per-markt' },
      { word: 'das Geld', meaning: 'Money', context: 'Currency', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das gelt' },
      { word: 'der Preis', meaning: 'Price', context: 'Cost', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr price' },
      { word: 'teuer', meaning: 'Expensive', context: 'Price description', partOfSpeech: 'adjective', pronunciationHint: 'toy-er' },
      { word: 'billig', meaning: 'Cheap', context: 'Price description', partOfSpeech: 'adjective', pronunciationHint: 'bil-likh' },
      { word: 'kaufen', meaning: 'To buy', context: 'Action', partOfSpeech: 'verb', tense: 'infinitive', pronunciationHint: 'kou-fen' },
      { word: 'verkaufen', meaning: 'To sell', context: 'Action', partOfSpeech: 'verb', tense: 'infinitive', pronunciationHint: 'fer-kou-fen' },
      { word: 'bezahlen', meaning: 'To pay', context: 'Action', partOfSpeech: 'verb', tense: 'infinitive', pronunciationHint: 'beh-tsah-len' },
      { word: 'die Rechnung', meaning: 'Bill / Invoice', context: 'Document', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee rekh-nung' },
    ]
  },
  {
    id: 'daily',
    name: 'Daily Life',
    icon: Coffee,
    description: 'Common words for everyday activities',
    words: [
      { word: 'das Haus', meaning: 'House', context: 'Building', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das hous' },
      { word: 'die Wohnung', meaning: 'Apartment', context: 'Dwelling', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee voh-nung' },
      { word: 'das Zimmer', meaning: 'Room', context: 'Space', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das tsim-mer' },
      { word: 'die Arbeit', meaning: 'Work', context: 'Employment', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee ar-bite' },
      { word: 'die Schule', meaning: 'School', context: 'Education', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee shoo-leh' },
      { word: 'die Zeit', meaning: 'Time', context: 'Temporal concept', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee tsite' },
      { word: 'der Tag', meaning: 'Day', context: 'Time period', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr tahk' },
      { word: 'die Woche', meaning: 'Week', context: 'Time period', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee vokh-eh' },
      { word: 'das Jahr', meaning: 'Year', context: 'Time period', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das yahr' },
      { word: 'heute', meaning: 'Today', context: 'Time reference', partOfSpeech: 'adverb', pronunciationHint: 'hoy-teh' },
      { word: 'morgen', meaning: 'Tomorrow', context: 'Time reference', partOfSpeech: 'adverb', pronunciationHint: 'mor-gen' },
      { word: 'gestern', meaning: 'Yesterday', context: 'Time reference', partOfSpeech: 'adverb', pronunciationHint: 'ges-tern' },
    ]
  },
  {
    id: 'hospital',
    name: 'At the Hospital',
    icon: Heart,
    description: 'Medical and healthcare vocabulary',
    words: [
      { word: 'der Arzt', meaning: 'Doctor', context: 'Medical professional', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr artst' },
      { word: 'die Krankenschwester', meaning: 'Nurse', context: 'Medical professional', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee kran-ken-shves-ter' },
      { word: 'das Krankenhaus', meaning: 'Hospital', context: 'Medical facility', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das kran-ken-hous' },
      { word: 'der Schmerz', meaning: 'Pain', context: 'Symptom', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr shmerts' },
      { word: 'die Medizin', meaning: 'Medicine', context: 'Treatment', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee meh-dee-tseen' },
      { word: 'der Termin', meaning: 'Appointment', context: 'Scheduling', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr ter-meen' },
      { word: 'die Notaufnahme', meaning: 'Emergency room', context: 'Medical facility', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee noht-ouf-nah-meh' },
      { word: 'das Rezept', meaning: 'Prescription', context: 'Medical document', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das reh-tsept' },
      { word: 'krank', meaning: 'Sick', context: 'Health status', partOfSpeech: 'adjective', pronunciationHint: 'krank' },
      { word: 'gesund', meaning: 'Healthy', context: 'Health status', partOfSpeech: 'adjective', pronunciationHint: 'geh-zunt' },
      { word: 'der Verband', meaning: 'Bandage', context: 'Medical supply', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr fer-bant' },
      { word: 'die Spritze', meaning: 'Injection', context: 'Medical procedure', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee shprit-seh' },
    ]
  },
  {
    id: 'emergency',
    name: 'During an Emergency',
    icon: AlertTriangle,
    description: 'Essential emergency and safety vocabulary',
    words: [
      { word: 'Hilfe', meaning: 'Help', context: 'Emergency call', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'hil-feh' },
      { word: 'der Notfall', meaning: 'Emergency', context: 'Urgent situation', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr noht-fal' },
      { word: 'die Polizei', meaning: 'Police', context: 'Emergency service', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee po-lee-tsye' },
      { word: 'die Feuerwehr', meaning: 'Fire department', context: 'Emergency service', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee foy-er-vehr' },
      { word: 'der Krankenwagen', meaning: 'Ambulance', context: 'Emergency vehicle', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr kran-ken-vah-gen' },
      { word: 'Vorsicht', meaning: 'Caution', context: 'Warning', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'for-zikht' },
      { word: 'Feuer', meaning: 'Fire', context: 'Emergency situation', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'foy-er' },
      { word: 'Gefahr', meaning: 'Danger', context: 'Warning', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'geh-fahr' },
      { word: 'der Unfall', meaning: 'Accident', context: 'Emergency situation', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr un-fal' },
      { word: 'schnell', meaning: 'Quick / Fast', context: 'Speed descriptor', partOfSpeech: 'adjective', pronunciationHint: 'shnel' },
      { word: 'rufen', meaning: 'To call', context: 'Action', partOfSpeech: 'verb', tense: 'infinitive', pronunciationHint: 'roo-fen' },
      { word: 'retten', meaning: 'To rescue', context: 'Action', partOfSpeech: 'verb', tense: 'infinitive', pronunciationHint: 'ret-ten' },
    ]
  },
  {
    id: 'airport-train',
    name: 'At the Airport/Train Station',
    icon: Train,
    description: 'Travel hub vocabulary',
    words: [
      { word: 'der Flug', meaning: 'Flight', context: 'Air travel', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr floog' },
      { word: 'der Zug', meaning: 'Train', context: 'Rail travel', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr tsoog' },
      { word: 'das Gleis', meaning: 'Platform / Track', context: 'Rail station', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das glice' },
      { word: 'der Abflug', meaning: 'Departure', context: 'Travel timing', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr ab-floog' },
      { word: 'die Ankunft', meaning: 'Arrival', context: 'Travel timing', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee an-kunft' },
      { word: 'das Gepäck', meaning: 'Luggage', context: 'Travel item', partOfSpeech: 'noun', gender: 'neuter', number: 'singular', case: 'nominative', pronunciationHint: 'das geh-pek' },
      { word: 'der Koffer', meaning: 'Suitcase', context: 'Travel item', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr kof-fer' },
      { word: 'die Bordkarte', meaning: 'Boarding pass', context: 'Travel document', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee bort-kar-teh' },
      { word: 'verspätet', meaning: 'Delayed', context: 'Travel status', partOfSpeech: 'adjective', pronunciationHint: 'fer-shpeh-tet' },
      { word: 'pünktlich', meaning: 'On time', context: 'Travel status', partOfSpeech: 'adjective', pronunciationHint: 'puenkt-likh' },
      { word: 'die Durchsage', meaning: 'Announcement', context: 'Communication', partOfSpeech: 'noun', gender: 'feminine', number: 'singular', case: 'nominative', pronunciationHint: 'dee durkh-zah-geh' },
      { word: 'der Schalter', meaning: 'Counter', context: 'Service location', partOfSpeech: 'noun', gender: 'masculine', number: 'singular', case: 'nominative', pronunciationHint: 'dehr shal-ter' },
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
  const [flashcardWords, setFlashcardWords] = useState<Array<{word: string, meaning: string, context?: string}> | null>(null);

  // Migration: Fetch missing grammar details from API for words that don't have them
  useEffect(() => {
    const migrateExistingWords = async () => {
      const savedDetails = JSON.parse(localStorage.getItem('myVocabDetails') || '[]');
      const savedWordsMap = new Map(savedDetails.map((w: any) => [w.word, w]));
      
      let needsMigration = false;
      const updatedDetails: any[] = [];
      
      // Check each word in myVocabWords
      for (const wordText of myVocabWords) {
        const existingWord = savedWordsMap.get(wordText);
        
        // Check if word needs grammar update (missing partOfSpeech means it needs update)
        const needsGrammarUpdate = !existingWord || !existingWord.partOfSpeech;
        
        if (needsGrammarUpdate) {
          // First try to find in persistentVocab
          let found = persistentVocab.find(w => w.word === wordText);
          
          // If not found, search all TOPICS
          if (!found) {
            for (const topic of TOPICS) {
              found = topic.words.find(w => w.word === wordText);
              if (found) break;
            }
          }
          
          // If found with grammar details in TOPICS, use it
          if (found && found.partOfSpeech) {
            updatedDetails.push(found);
            needsMigration = true;
            console.log('🔄 Migrating word with grammar from TOPICS:', wordText, found);
          } 
          // Otherwise, try to fetch from API for words from vocab tab
          else if (existingWord) {
            console.log('🔍 Word needs grammar, fetching from API:', wordText);
            try {
              const { fetchGrammarDetails } = await import('../utils/languageTool');
              const grammarDetails = await fetchGrammarDetails(wordText);
              const updatedWord = {
                ...existingWord,
                ...grammarDetails
              };
              updatedDetails.push(updatedWord);
              needsMigration = true;
              console.log('✅ Updated word with API grammar:', wordText, updatedWord);
            } catch (error) {
              console.error('❌ Failed to fetch grammar for:', wordText, error);
              // Keep existing word without grammar
              updatedDetails.push(existingWord);
            }
          } else {
            console.log('⚠️ Word not found anywhere:', wordText);
          }
        } else {
          // Word already has grammar, keep it
          updatedDetails.push(existingWord);
        }
      }
      
      // Save if any migration occurred
      if (needsMigration) {
        localStorage.setItem('myVocabDetails', JSON.stringify(updatedDetails));
        console.log('✅ Migration complete. Updated', updatedDetails.length, 'word details with grammar.');
      }
    };
    
    // Run migration once on mount
    migrateExistingWords();
  }, []); // Empty dependency array - runs once on mount

  // Get full word details for flashcard (prioritize localStorage for complete grammar details)
  const myVocabDetails = myVocabWords
    .map(wordText => {
      let wordDetails;
      
      // First try localStorage - it has the complete grammar details
      try {
        const savedDetails = localStorage.getItem('myVocabDetails');
        if (savedDetails) {
          const allDetails = JSON.parse(savedDetails);
          wordDetails = allDetails.find((w: any) => w.word === wordText);
        }
      } catch (e) {
        console.error('Error loading vocab details from localStorage:', e);
      }
      
      // If not found in localStorage, fallback to persistentVocab (basic details only)
      if (!wordDetails) {
        wordDetails = persistentVocab.find(w => w.word === wordText);
      }
      
      return wordDetails;
    })
    .filter((w): w is { 
      word: string; 
      meaning: string; 
      context?: string;
      partOfSpeech?: string;
      gender?: string;
      number?: string;
      tense?: string;
      case?: string;
      pronunciationHint?: string;
    } => w !== undefined);
  
  console.log('📚 My Vocab Details:', {
    myVocabWords,
    persistentVocab: persistentVocab.length,
    myVocabDetails: myVocabDetails.length,
    details: myVocabDetails,
    firstWordGrammar: myVocabDetails[0] ? {
      word: myVocabDetails[0].word,
      hasPartOfSpeech: !!myVocabDetails[0].partOfSpeech,
      hasGender: !!myVocabDetails[0].gender,
      hasCase: !!myVocabDetails[0].case,
      hasPronunciation: !!myVocabDetails[0].pronunciationHint
    } : 'No words'
  });
  
  // Log localStorage content for debugging
  try {
    const localStorageDetails = localStorage.getItem('myVocabDetails');
    console.log('💾 localStorage myVocabDetails (RAW):', localStorageDetails);
    if (localStorageDetails) {
      const parsed = JSON.parse(localStorageDetails);
      console.log('💾 localStorage myVocabDetails (PARSED - first item):', parsed[0]);
    }
  } catch (e) {
    console.error('❌ Error reading localStorage:', e);
  }

  const handleWordClick = (index: number) => {
    const wordAtIndex = myVocabDetails[index];
    console.log('🃏 Flashcard - Word clicked:', {
      clickedIndex: index,
      totalWords: myVocabDetails.length,
      wordAtIndex: wordAtIndex?.word,
      allWords: myVocabDetails.map(w => w.word),
      word: wordAtIndex,
      allGrammarFields: wordAtIndex ? {
        hasPartOfSpeech: !!wordAtIndex.partOfSpeech,
        hasGender: !!wordAtIndex.gender,
        hasNumber: !!wordAtIndex.number,
        hasTense: !!wordAtIndex.tense,
        hasCase: !!wordAtIndex.case,
        hasPronunciation: !!wordAtIndex.pronunciationHint,
        actualValues: {
          partOfSpeech: wordAtIndex.partOfSpeech,
          gender: wordAtIndex.gender,
          case: wordAtIndex.case
        }
      } : 'NO WORD FOUND'
    });
    
    // Safety check - don't open flashcard if no word at index
    if (!wordAtIndex) {
      console.error('❌ Cannot open flashcard - no word at index', index);
      return;
    }
    
    setSelectedWordIndex(index);
    setShowFlashcard(true);
  };

  const handleNextWord = () => {
    const wordCount = flashcardWords ? flashcardWords.length : myVocabDetails.length;
    if (selectedWordIndex < wordCount - 1) {
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

  const handleReturnToFlashcards = (incorrectWords?: Array<{word: string, meaning: string, context?: string}>) => {
    setShowTestMode(false);
    
    // If incorrect words provided, filter flashcards to show only those
    if (incorrectWords && incorrectWords.length > 0) {
      setFlashcardWords(incorrectWords);
      console.log('📝 Reviewing incorrect words:', incorrectWords);
    } else {
      // Otherwise show all words
      setFlashcardWords(null);
    }
    
    setShowFlashcard(true);
    setSelectedWordIndex(0);
  };

  const handleSaveToMyVocab = (
    word: string, 
    meaning?: string, 
    context?: string,
    partOfSpeech?: string,
    gender?: string,
    number?: string,
    tense?: string,
    caseValue?: string,
    pronunciationHint?: string
  ) => {
    const updatedSet = new Set(myVocabSet);
    updatedSet.add(word);
    setMyVocabSet(updatedSet);
    
    // Save word name to localStorage (for backward compatibility)
    const currentVocab = JSON.parse(localStorage.getItem('myVocab') || '[]');
    if (!currentVocab.includes(word)) {
      currentVocab.push(word);
      localStorage.setItem('myVocab', JSON.stringify(currentVocab));
    }
    
    // Save full word details with grammar info to localStorage for persistence
    if (meaning) {
      try {
        const savedDetails = JSON.parse(localStorage.getItem('myVocabDetails') || '[]');
        const exists = savedDetails.find((w: any) => w.word === word);
        if (!exists) {
          const wordDetails: any = { 
            word, 
            meaning, 
            context: context || ''
          };
          
          // Add grammar details if provided
          if (partOfSpeech) wordDetails.partOfSpeech = partOfSpeech;
          if (gender) wordDetails.gender = gender;
          if (number) wordDetails.number = number;
          if (tense) wordDetails.tense = tense;
          if (caseValue) wordDetails.case = caseValue;
          if (pronunciationHint) wordDetails.pronunciationHint = pronunciationHint;
          
          savedDetails.push(wordDetails);
          localStorage.setItem('myVocabDetails', JSON.stringify(savedDetails));
          console.log('💾 Saved word details with grammar to localStorage:', wordDetails);
        }
      } catch (e) {
        console.error('Error saving vocab details:', e);
      }
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
    
    // Update localStorage (word names)
    localStorage.setItem('myVocab', JSON.stringify(Array.from(updatedSet)));
    
    // Remove from localStorage details
    try {
      const savedDetails = JSON.parse(localStorage.getItem('myVocabDetails') || '[]');
      const filtered = savedDetails.filter((w: any) => w.word !== word);
      localStorage.setItem('myVocabDetails', JSON.stringify(filtered));
      console.log('🗑️ Removed word from My Vocab:', word);
    } catch (e) {
      console.error('Error removing vocab details:', e);
    }
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
                  {myVocabWords.map((wordText, displayIndex) => {
                    let wordDetails;
                    
                    // First try localStorage - it has the complete grammar details
                    try {
                      const savedDetails = localStorage.getItem('myVocabDetails');
                      if (savedDetails) {
                        const allDetails = JSON.parse(savedDetails);
                        wordDetails = allDetails.find((w: any) => w.word === wordText);
                      }
                    } catch (e) {
                      console.error('Error loading vocab details:', e);
                    }
                    
                    // If not found in localStorage, fallback to persistentVocab
                    if (!wordDetails) {
                      wordDetails = persistentVocab.find(w => w.word === wordText);
                    }
                    
                    if (!wordDetails) return null;
                    
                    // Find the actual index in myVocabDetails array (which might be filtered)
                    const actualIndex = myVocabDetails.findIndex(w => w.word === wordText);
                    
                    return (
                      <div
                        key={displayIndex}
                        onClick={() => handleWordClick(actualIndex >= 0 ? actualIndex : displayIndex)}
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
                              onClick={() => handleSaveToMyVocab(
                                word.word, 
                                word.meaning, 
                                word.context,
                                word.partOfSpeech,
                                word.gender,
                                word.number,
                                word.tense,
                                word.case,
                                word.pronunciationHint
                              )}
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

      {/* Flashcard Modal - Full overlay */}
      {showFlashcard && (flashcardWords ? flashcardWords.length > 0 : myVocabDetails.length > 0) && (
        <FlashcardModal
          words={flashcardWords || myVocabDetails}
          currentIndex={selectedWordIndex}
          onClose={() => {
            setShowFlashcard(false);
            setFlashcardWords(null); // Reset filter when closing
          }}
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

