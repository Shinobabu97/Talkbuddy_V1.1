/*
  # Create user_message_analyses table

  1. New Tables
    - `user_message_analyses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `conversation_id` (uuid, foreign key to conversations)
      - `message_id` (text) - client-side message ID
      - `message_content` (text)
      - `message_type` (text) - 'voice' or 'text'
      - `timestamp` (timestamptz)
      - `pronunciation_data` (jsonb) - stores word-level pronunciation scores
      - `grammar_topic` (text) - grammar topic if analyzed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on user_message_analyses table
    - Add policies for authenticated users to manage their own analyses
*/

CREATE TABLE IF NOT EXISTS user_message_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  message_id text NOT NULL,
  message_content text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('voice', 'text')),
  timestamp timestamptz NOT NULL,
  pronunciation_data jsonb,
  grammar_topic text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_message_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for user_message_analyses
CREATE POLICY "Users can read own message analyses"
  ON user_message_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own message analyses"
  ON user_message_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own message analyses"
  ON user_message_analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own message analyses"
  ON user_message_analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_message_analyses_updated_at
  BEFORE UPDATE ON user_message_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_message_analyses_user_id_idx 
  ON user_message_analyses(user_id);

CREATE INDEX IF NOT EXISTS user_message_analyses_conversation_id_idx 
  ON user_message_analyses(conversation_id);

CREATE INDEX IF NOT EXISTS user_message_analyses_message_id_idx 
  ON user_message_analyses(message_id);

CREATE INDEX IF NOT EXISTS user_message_analyses_timestamp_idx 
  ON user_message_analyses(timestamp DESC);

-- Add comments to document the fields
COMMENT ON TABLE user_message_analyses IS 'Stores pronunciation and grammar analysis data for user messages';
COMMENT ON COLUMN user_message_analyses.message_id IS 'Client-side message ID for frontend reference';
COMMENT ON COLUMN user_message_analyses.message_type IS 'Type of message: voice or text';
COMMENT ON COLUMN user_message_analyses.pronunciation_data IS 'JSONB storing word-level pronunciation scores and analysis';
COMMENT ON COLUMN user_message_analyses.grammar_topic IS 'Grammar topic identified during analysis (e.g., "Perfect Tense", "Word Order")';
