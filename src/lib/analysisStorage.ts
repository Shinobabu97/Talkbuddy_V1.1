import { supabase } from './supabase';

export interface PronunciationWord {
  word: string;
  score: number;
  needsPractice: boolean;
  feedback: string;
  commonMistakes?: string[];
  difficulty?: string;
  soundsToFocus?: string[];
  improvementTips?: string[];
  syllableAnalysis?: Array<{
    syllable: string;
    score: number;
    feedback: string;
    phoneticExpected: string;
    phoneticActual?: string;
  }>;
}

export interface PronunciationData {
  overallScore: number;
  words: PronunciationWord[];
  hasPronunciationErrors: boolean;
  suggestions: string[];
  scoringBreakdown?: {
    vowelAccuracy: number;
    consonantAccuracy: number;
    rhythm: number;
    stress: number;
  };
}

export interface MessageAnalysis {
  id: string;
  user_id: string;
  conversation_id: string;
  message_id: string;
  message_content: string;
  message_type: 'voice' | 'text';
  timestamp: string;
  pronunciation_data: PronunciationData | null;
  grammar_topic: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  totalMessages: number;
  voiceMessages: number;
  textMessages: number;
  problemWords: Array<{
    word: string;
    count: number;
    averageScore: number;
    lastAnalyzed: string;
  }>;
  grammarTopics: Array<{
    topic: string;
    count: number;
    lastAnalyzed: string;
  }>;
  overallPronunciationScore: number;
  improvementAreas: string[];
}

/**
 * Save message analysis data to the database
 */
export async function saveMessageAnalysis(
  messageId: string,
  userId: string,
  conversationId: string,
  messageContent: string,
  messageType: 'voice' | 'text',
  pronunciationData?: PronunciationData,
  grammarTopic?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_message_analyses')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        message_id: messageId,
        message_content: messageContent,
        message_type: messageType,
        timestamp: new Date().toISOString(),
        pronunciation_data: pronunciationData || null,
        grammar_topic: grammarTopic || null,
      });

    if (error) {
      console.error('Error saving message analysis:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Message analysis saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in saveMessageAnalysis:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all message analyses for a conversation
 */
export async function getMessageAnalyses(conversationId: string): Promise<{
  success: boolean;
  data?: MessageAnalysis[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_message_analyses')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching message analyses:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getMessageAnalyses:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get session summary with aggregated data
 */
export async function getSessionSummary(conversationId: string): Promise<{
  success: boolean;
  data?: SessionSummary;
  error?: string;
}> {
  try {
    const { data: analyses, error } = await supabase
      .from('user_message_analyses')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching analyses for summary:', error);
      return { success: false, error: error.message };
    }

    if (!analyses || analyses.length === 0) {
      return {
        success: true,
        data: {
          totalMessages: 0,
          voiceMessages: 0,
          textMessages: 0,
          problemWords: [],
          grammarTopics: [],
          overallPronunciationScore: 0,
          improvementAreas: [],
        },
      };
    }

    // Aggregate data
    const voiceMessages = analyses.filter(a => a.message_type === 'voice').length;
    const textMessages = analyses.filter(a => a.message_type === 'text').length;
    
    // Process pronunciation data
    const pronunciationAnalyses = analyses.filter(a => a.pronunciation_data);
    const allWords: { [word: string]: { scores: number[]; lastAnalyzed: string } } = {};
    let totalPronunciationScore = 0;
    let pronunciationCount = 0;

    pronunciationAnalyses.forEach(analysis => {
      if (analysis.pronunciation_data) {
        totalPronunciationScore += analysis.pronunciation_data.overallScore;
        pronunciationCount++;

        analysis.pronunciation_data.words.forEach(word => {
          if (word.needsPractice) {
            if (!allWords[word.word]) {
              allWords[word.word] = { scores: [], lastAnalyzed: analysis.timestamp };
            }
            allWords[word.word].scores.push(word.score);
            if (new Date(analysis.timestamp) > new Date(allWords[word.word].lastAnalyzed)) {
              allWords[word.word].lastAnalyzed = analysis.timestamp;
            }
          }
        });
      }
    });

    // Process grammar topics
    const grammarTopics: { [topic: string]: { count: number; lastAnalyzed: string } } = {};
    analyses.forEach(analysis => {
      if (analysis.grammar_topic) {
        if (!grammarTopics[analysis.grammar_topic]) {
          grammarTopics[analysis.grammar_topic] = { count: 0, lastAnalyzed: analysis.timestamp };
        }
        grammarTopics[analysis.grammar_topic].count++;
        if (new Date(analysis.timestamp) > new Date(grammarTopics[analysis.grammar_topic].lastAnalyzed)) {
          grammarTopics[analysis.grammar_topic].lastAnalyzed = analysis.timestamp;
        }
      }
    });

    // Convert to arrays and sort
    const problemWords = Object.entries(allWords)
      .map(([word, data]) => ({
        word,
        count: data.scores.length,
        averageScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
        lastAnalyzed: data.lastAnalyzed,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 problem words

    const grammarTopicsArray = Object.entries(grammarTopics)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        lastAnalyzed: data.lastAnalyzed,
      }))
      .sort((a, b) => b.count - a.count);

    const overallPronunciationScore = pronunciationCount > 0 
      ? Math.round(totalPronunciationScore / pronunciationCount) 
      : 0;

    // Generate improvement areas
    const improvementAreas: string[] = [];
    if (problemWords.length > 0) {
      improvementAreas.push(`Focus on: ${problemWords.slice(0, 3).map(w => w.word).join(', ')}`);
    }
    if (grammarTopicsArray.length > 0) {
      improvementAreas.push(`Review grammar: ${grammarTopicsArray.slice(0, 2).map(g => g.topic).join(', ')}`);
    }
    if (overallPronunciationScore < 70) {
      improvementAreas.push('Practice pronunciation fundamentals');
    }

    const summary: SessionSummary = {
      totalMessages: analyses.length,
      voiceMessages,
      textMessages,
      problemWords,
      grammarTopics: grammarTopicsArray,
      overallPronunciationScore,
      improvementAreas,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error in getSessionSummary:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get analysis for a specific message
 */
export async function getMessageAnalysis(messageId: string): Promise<{
  success: boolean;
  data?: MessageAnalysis;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_message_analyses')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return { success: true, data: undefined };
      }
      console.error('Error fetching message analysis:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getMessageAnalysis:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update existing analysis
 */
export async function updateMessageAnalysis(
  messageId: string,
  pronunciationData?: PronunciationData,
  grammarTopic?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {};
    if (pronunciationData !== undefined) {
      updateData.pronunciation_data = pronunciationData;
    }
    if (grammarTopic !== undefined) {
      updateData.grammar_topic = grammarTopic;
    }

    const { error } = await supabase
      .from('user_message_analyses')
      .update(updateData)
      .eq('message_id', messageId);

    if (error) {
      console.error('Error updating message analysis:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateMessageAnalysis:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
