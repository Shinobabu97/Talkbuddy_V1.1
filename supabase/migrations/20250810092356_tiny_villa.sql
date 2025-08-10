/*
  # Create onboarding tables

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `profile_picture_url` (text, optional)
      - `first_name` (text)
      - `last_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_onboarding`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `motivations` (jsonb array)
      - `custom_motivation` (text, optional)
      - `hobbies` (jsonb array)
      - `custom_hobbies` (jsonb array)
      - `has_work` (boolean)
      - `work_domain` (text, optional)
      - `german_level` (text)
      - `speaking_fears` (jsonb array)
      - `custom_fears` (jsonb array)
      - `timeline` (text)
      - `goals` (jsonb array)
      - `personality_traits` (jsonb array)
      - `secret_details` (text, optional)
      - `conversation_topics` (jsonb array)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_picture_url text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  motivations jsonb DEFAULT '[]'::jsonb,
  custom_motivation text,
  hobbies jsonb DEFAULT '[]'::jsonb,
  custom_hobbies jsonb DEFAULT '[]'::jsonb,
  has_work boolean DEFAULT false,
  work_domain text,
  german_level text,
  speaking_fears jsonb DEFAULT '[]'::jsonb,
  custom_fears jsonb DEFAULT '[]'::jsonb,
  timeline text,
  goals jsonb DEFAULT '[]'::jsonb,
  personality_traits jsonb DEFAULT '[]'::jsonb,
  secret_details text,
  conversation_topics jsonb DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for user_onboarding
CREATE POLICY "Users can read own onboarding"
  ON user_onboarding
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON user_onboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON user_onboarding
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();