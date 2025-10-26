-- Add conversation_context column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS conversation_context text;

-- Create index for better performance when querying conversations with context
CREATE INDEX IF NOT EXISTS conversations_context_idx 
  ON conversations(conversation_context);

-- Add comment to document the field's purpose
COMMENT ON COLUMN conversations.conversation_context IS 'Stores the cumulative conversation context to maintain topic alignment and enhance suggestion relevance';

