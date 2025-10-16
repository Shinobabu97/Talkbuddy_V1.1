/*
  # Add context_locked field to conversations table

  1. Database Changes
    - Add `context_locked` column (boolean, default false) to the `conversations` table
    - This field tracks whether the context has been locked for a conversation
    - Once locked, the context cannot be changed for that conversation

  2. Purpose
    - Prevents users from changing context mid-conversation
    - Ensures consistent AI coaching based on selected context
    - Maintains conversation integrity and learning objectives
*/

-- Add context_locked column to conversations table
ALTER TABLE conversations 
ADD COLUMN context_locked boolean DEFAULT false;

-- Create index for better performance when querying locked conversations
CREATE INDEX IF NOT EXISTS conversations_context_locked_idx 
  ON conversations(context_locked);

-- Add comment to document the field's purpose
COMMENT ON COLUMN conversations.context_locked IS 'Indicates whether the conversation context has been locked after the first message was sent';

