/*
  # Create user_stats table for gamification progress tracking

  1. New Tables
    - `user_stats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users, unique)
      - `level` (int, default 1)
      - `experience` (int, default 0)
      - `total_points` (int, default 0)
      - `conversations_completed` (int, default 0)
      - `words_learned` (int, default 0)
      - `current_streak` (int, default 0)
      - `longest_streak` (int, default 0)
      - `perfect_conversations` (int, default 0)
      - `achievements` (jsonb, array of achievement IDs)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on user_stats table
    - Add policies for authenticated users to manage their own stats
*/

CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  level int DEFAULT 1 NOT NULL,
  experience int DEFAULT 0 NOT NULL,
  total_points int DEFAULT 0 NOT NULL,
  conversations_completed int DEFAULT 0 NOT NULL,
  words_learned int DEFAULT 0 NOT NULL,
  current_streak int DEFAULT 0 NOT NULL,
  longest_streak int DEFAULT 0 NOT NULL,
  perfect_conversations int DEFAULT 0 NOT NULL,
  achievements jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stats
CREATE POLICY "Users can read own stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS user_stats_user_id_idx 
  ON user_stats(user_id);

