/*
  # Simplify Onboarding Schema
  
  1. Add new fields to user_onboarding table:
     - learning_language (text): Language user wants to learn
     - native_language (text): User's native language  
     - focus_group (text): 'travelers' or 'business'
     - hints_dismissed (boolean): Track if user dismissed hints
*/

-- Add new columns to user_onboarding table
ALTER TABLE user_onboarding 
ADD COLUMN IF NOT EXISTS learning_language text,
ADD COLUMN IF NOT EXISTS native_language text,
ADD COLUMN IF NOT EXISTS focus_group text,
ADD COLUMN IF NOT EXISTS hints_dismissed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_onboarding.learning_language IS 'Language the user wants to learn (e.g., german, english)';
COMMENT ON COLUMN user_onboarding.native_language IS 'User''s native language';
COMMENT ON COLUMN user_onboarding.focus_group IS 'User focus group: travelers or business';
COMMENT ON COLUMN user_onboarding.hints_dismissed IS 'Whether the user has dismissed the onboarding hints';

