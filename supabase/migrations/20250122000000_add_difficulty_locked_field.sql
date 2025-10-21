/*
  # Add difficulty_locked field to conversations table

  1. Database Changes
    - Add `difficulty_locked` column (boolean, default false) to the `conversations` table
    - This field tracks whether the difficulty level has been locked for a conversation
    - Once locked, the difficulty cannot be changed for that conversation

  2. Purpose
    - Prevents users from changing difficulty level mid-conversation
    - Ensures consistent AI coaching based on selected difficulty level
    - Maintains conversation integrity and learning objectives
*/

-- Add difficulty_locked column to conversations table
ALTER TABLE conversations 
ADD COLUMN difficulty_locked boolean DEFAULT false;

-- Create index for better performance when querying locked conversations
CREATE INDEX IF NOT EXISTS conversations_difficulty_locked_idx 
  ON conversations(difficulty_locked);

-- Add comment to document the field's purpose
COMMENT ON COLUMN conversations.difficulty_locked IS 'Indicates whether the difficulty level has been locked after the first message was sent';
