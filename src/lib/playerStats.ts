import { supabase } from './supabase';

export interface PlayerStats {
  level: number;
  experience: number;
  experienceToNext: number;
  totalPoints: number;
  conversationsCompleted: number;
  wordsLearned: number;
  speakingTime: number; // in minutes
  achievements: string[];
  badges: string[];
  currentStreak: number;
  longestStreak: number;
  perfectConversations: number;
  vocabularyMaster: number;
  pronunciationChampion: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  requirement: (stats: PlayerStats) => boolean;
}

// Define all achievements
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_conversation',
    name: 'First Conversation',
    description: 'Completed your first German conversation!',
    emoji: '🎉',
    requirement: (stats) => stats.conversationsCompleted >= 1
  },
  {
    id: 'conversation_master',
    name: 'Conversation Master',
    description: 'Completed 10 conversations!',
    emoji: '💬',
    requirement: (stats) => stats.conversationsCompleted >= 10
  },
  {
    id: 'conversation_expert',
    name: 'Conversation Expert',
    description: 'Completed 50 conversations',
    emoji: '🌟',
    requirement: (stats) => stats.conversationsCompleted >= 50
  },
  {
    id: 'vocabulary_builder',
    name: 'Vocabulary Builder',
    description: 'Learned 50 words!',
    emoji: '📚',
    requirement: (stats) => stats.wordsLearned >= 50
  },
  {
    id: 'word_wizard',
    name: 'Word Wizard',
    description: 'Learn 200 words',
    emoji: '✨',
    requirement: (stats) => stats.wordsLearned >= 200
  },
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: '7-day practice streak',
    emoji: '🔥',
    requirement: (stats) => stats.currentStreak >= 7
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: '30-day practice streak',
    emoji: '🏆',
    requirement: (stats) => stats.currentStreak >= 30
  },
  {
    id: 'perfect_first',
    name: 'Perfect First',
    description: 'Completed a perfect conversation',
    emoji: '⭐',
    requirement: (stats) => stats.perfectConversations >= 1
  },
  {
    id: 'level_up_1',
    name: 'Level Up',
    description: 'Reached level 5',
    emoji: '🎮',
    requirement: (stats) => stats.level >= 5
  },
  {
    id: 'level_up_2',
    name: 'Advanced',
    description: 'Reached level 10',
    emoji: '🚀',
    requirement: (stats) => stats.level >= 10
  }
];

// Load player stats from database
export async function loadPlayerStats(): Promise<PlayerStats | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If user doesn't have stats yet, return default stats
      if (error.code === 'PGRST116') {
        return createDefaultStats();
      }
      console.error('Error loading player stats:', error);
      return createDefaultStats();
    }

    // Transform database stats to PlayerStats format
    const experienceToNext = calculateExperienceToNext(data.level);
    return {
      level: data.level,
      experience: data.experience,
      experienceToNext,
      totalPoints: data.total_points,
      conversationsCompleted: data.conversations_completed,
      wordsLearned: data.words_learned,
      speakingTime: 0, // Can be calculated from conversations if needed
      achievements: data.achievements || [],
      badges: [], // Can be added later
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      perfectConversations: data.perfect_conversations,
      vocabularyMaster: 0, // Can be calculated
      pronunciationChampion: 0 // Can be calculated
    };
  } catch (error) {
    console.error('Error loading player stats:', error);
    return createDefaultStats();
  }
}

// Save player stats to database
export async function savePlayerStats(stats: PlayerStats): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_stats')
      .upsert({
        user_id: user.id,
        level: stats.level,
        experience: stats.experience,
        total_points: stats.totalPoints,
        conversations_completed: stats.conversationsCompleted,
        words_learned: stats.wordsLearned,
        current_streak: stats.currentStreak,
        longest_streak: stats.longestStreak,
        perfect_conversations: stats.perfectConversations,
        achievements: stats.achievements
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving player stats:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving player stats:', error);
    return false;
  }
}

// Calculate experience needed for next level
function calculateExperienceToNext(level: number): number {
  // Linear progression: 100 XP per level
  return 100;
}

// Calculate level from total experience
export function calculateLevelFromExperience(experience: number): number {
  // Each level requires 100 XP
  return Math.floor(experience / 100) + 1;
}

// Calculate experience needed to reach a specific level
export function calculateExperienceForLevel(level: number): number {
  // Level 1: 0-99 XP
  // Level 2: 100-199 XP
  // Level 3: 200-299 XP
  return (level - 1) * 100;
}

// Add experience and check for level up
export function addExperience(
  stats: PlayerStats, 
  experienceGained: number
): { stats: PlayerStats; leveledUp: boolean } {
  const newTotalExperience = stats.experience + experienceGained;
  const currentLevel = stats.level;
  const newLevel = calculateLevelFromExperience(newTotalExperience);
  
  const leveledUp = newLevel > currentLevel;
  
  const newStats = {
    ...stats,
    experience: newTotalExperience,
    level: newLevel,
    experienceToNext: calculateExperienceToNext(newLevel),
    totalPoints: stats.totalPoints + experienceGained
  };
  
  return { stats: newStats, leveledUp };
}

// Check and unlock new achievements
export function checkAchievements(
  stats: PlayerStats
): string[] {
  const newlyUnlocked: string[] = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    // If already unlocked, skip
    if (stats.achievements.includes(achievement.id)) {
      return;
    }
    
    // Check if requirement is met
    if (achievement.requirement(stats)) {
      newlyUnlocked.push(achievement.id);
      stats.achievements.push(achievement.id);
    }
  });
  
  return newlyUnlocked;
}

// Award points for completing a conversation
export function awardConversationCompletion(
  stats: PlayerStats,
  wasPerfect: boolean = false
): PlayerStats {
  let newStats = {
    ...stats,
    conversationsCompleted: stats.conversationsCompleted + 1
  };
  
  // Award experience for completing conversation
  const experienceGained = wasPerfect ? 20 : 10;
  const { stats: updatedStats, leveledUp } = addExperience(newStats, experienceGained);
  newStats = updatedStats;
  
  // Update perfect conversations count
  if (wasPerfect) {
    newStats = {
      ...newStats,
      perfectConversations: stats.perfectConversations + 1
    };
  }
  
  return newStats;
}

// Award points for learning words
export function awardWordsLearned(
  stats: PlayerStats,
  wordsCount: number
): PlayerStats {
  const newStats = {
    ...stats,
    wordsLearned: stats.wordsLearned + wordsCount
  };
  
  // Award 1 XP per word learned
  const { stats: updatedStats } = addExperience(newStats, wordsCount);
  
  return updatedStats;
}

// Update streak
export function updateStreak(
  stats: PlayerStats,
  lastPracticeDate?: Date
): PlayerStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!lastPracticeDate) {
    // First practice or streak broken
    return {
      ...stats,
      currentStreak: 1,
      longestStreak: Math.max(stats.longestStreak, 1)
    };
  }
  
  const lastDate = new Date(lastPracticeDate);
  lastDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    // Same day, keep streak
    return stats;
  } else if (daysDiff === 1) {
    // Consecutive day, increment streak
    const newStreak = stats.currentStreak + 1;
    return {
      ...stats,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak)
    };
  } else {
    // Streak broken, reset to 1
    return {
      ...stats,
      currentStreak: 1,
      longestStreak: Math.max(stats.longestStreak, stats.currentStreak)
    };
  }
}

// Create default stats for new user
function createDefaultStats(): PlayerStats {
  return {
    level: 1,
    experience: 0,
    experienceToNext: 100,
    totalPoints: 0,
    conversationsCompleted: 0,
    wordsLearned: 0,
    speakingTime: 0,
    achievements: [],
    badges: [],
    currentStreak: 0,
    longestStreak: 0,
    perfectConversations: 0,
    vocabularyMaster: 0,
    pronunciationChampion: 0
  };
}

