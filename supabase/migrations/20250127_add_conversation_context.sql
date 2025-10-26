/*
  # Add conversation_context field to conversations table

  1. Database Changes
    - Add `conversation_context` column (text, optional) to the `conversations` table
    - This field stores the cumulative conversation context to maintain topic alignment
    - Context is initialized from user's initial input and enhanced with each exchange
    - Persists throughout the conversation lifecycle

  2. Purpose
    - Ensures suggested responses align with the original conversation topic
    - Maintains context continuity throughout multi-turn conversations
    - Provides better context for suggestion generation
*/

-- Add conversation_context column to conversations table
ALTER TABLE conversations 
ADD COLUMN conversation_context text;

-- Create index for better performance when querying conversations with context
CREATE INDEX IF NOT EXISTS conversations_context_idx 
  ON conversations(conversation_context);

-- Add comment to document the field's purpose
COMMENT ON COLUMN conversations.conversation_context IS 'Stores the cumulative conversation context to maintain topic alignment and enhance suggestion relevance';

