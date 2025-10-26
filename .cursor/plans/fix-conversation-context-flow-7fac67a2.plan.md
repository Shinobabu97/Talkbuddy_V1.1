<!-- 7fac67a2-4d4c-4902-aceb-a1ee84f658e7 01e99571-9195-4d74-b9bb-29a9da6e9b18 -->
# Fix Conversation Context and Voice Transcription Issues

## Problem Analysis

### Issue 1: First Response Context Acknowledgment

Currently in `Dashboard.tsx` (lines 696-711), the AI receives the user's context but doesn't explicitly acknowledge it and ask if they're ready. The prompt needs modification to ensure proper acknowledgment.

### Issue 2: Suggested Responses Not Context-Aligned

The suggested responses are auto-generated immediately (line 753) without user control. Need to:

- Hide suggestions by default
- Add "Show suggestions" button
- Ensure suggestions align with the conversation context

### Issue 3: AI Response Not Following User Input

The AI needs to maintain conversation context throughout the dialogue. The `conversationContext` field exists but needs better integration in the chat function.

### Issue 4: Voice Transcription Display Issues

In `processAudioMessage` (lines 3710-3812) and `transcribeAudio` (lines 3814-4100), the transcription is being set correctly but may display in wrong message bubbles or show incorrect text during the transcription process.

## Implementation Plan

### 1. Fix First Response Context Acknowledgment

**File**: `src/components/Dashboard.tsx`

Modify `sendInitialMessage` function (line 666) to update the prompt:

- Change the prompt to explicitly request context acknowledgment
- Ask if user is ready before starting roleplay
- Ensure response is in German only
```typescript
// Current line 699 prompt needs to be replaced with:
content: `${contextLevel === 'Professional' ? 'Ich möchte dieses Szenario üben' : 'Ich möchte dieses Szenario üben'}: ${userMessage}. 
WICHTIG: 
1. Bestätigen Sie zunächst, dass Sie den Kontext verstanden haben
2. Fassen Sie kurz zusammen, was wir üben werden
3. Fragen Sie, ob ich bereit bin, mit dem Rollenspiel zu beginnen
4. Antworten Sie NUR auf Deutsch
${contextLevel === 'Professional' ? 'Verwenden Sie "Sie" für formale Anrede.' : 'Verwenden Sie "Du" für lockere Anrede.'}`
```


### 2. Add "Show Suggestions" Button

**File**: `src/components/Dashboard.tsx`

Changes needed:

- Remove automatic suggestion generation (line 753)
- Add state for showing/hiding suggestions per message
- Add button in UI to trigger suggestion generation
- Modify `generateTranslationAndSuggestions` to be user-triggered

Add new state:

```typescript
const [showSuggestionsForMessage, setShowSuggestionsForMessage] = useState<Record<string, boolean>>({});
```

Modify suggestion display logic in the message rendering section (around line 5400-5500) to:

- Show "Show Suggestions" button instead of auto-displaying
- Only call `generateTranslationAndSuggestions` when button is clicked
- Display suggestions after they're loaded

### 3. Improve Conversation Context Flow

**File**: `supabase/functions/chat/index.ts`

Enhance `createSystemPrompt` function (line 221) to:

- Better emphasize the conversationContext in the system prompt
- Ensure AI responses directly address the user's previous message
- Maintain topic continuity

Update lines 222-225 to strengthen context awareness:

```typescript
const contextSection = conversationContext 
  ? `\n\nKONVERSATIONS-KONTEXT: "${conversationContext}"
WICHTIG: 
- Dies ist das Hauptthema dieser Unterhaltung
- Alle Ihre Antworten müssen in diesem Kontext bleiben
- Reagieren Sie DIREKT auf die vorherige Nachricht des Benutzers
- Entwickeln Sie das Gespräch natürlich in Bezug auf diesen Kontext weiter`
  : '';
```

**File**: `src/components/Dashboard.tsx`

Update `sendMessage` function (line 2391) to pass conversation context with every message:

- Retrieve conversation_context from current conversation
- Include it in every chat API call
- Ensure suggested responses also receive this context

### 4. Fix Voice Transcription Display

**File**: `src/components/Dashboard.tsx`

Issues in `transcribeAudio` function (line 3814):

- Transcription updates wrong message bubble
- Need to ensure message ID consistency

Fix the message update logic (around lines 3970-3989):

- Ensure the correct message ID is used when updating transcription
- Update the message content immediately when transcription arrives
- Handle edge cases where message might not exist

For new voice messages (lines 3784-3806):

- Ensure initial placeholder shows "🎤 Recording..." 
- Update to actual transcription when received
- Maintain message ID consistency throughout the process

Specific changes:

```typescript
// After transcription is received (line 3928), update the correct message:
setChatMessages(prev => prev.map(msg => 
  msg.id === messageId 
    ? { ...msg, content: transcription, isTranscribing: false }
    : msg
));
```

### 5. Update Suggestion Generation to Use Context

**File**: `src/components/Dashboard.tsx`

Modify `generateTranslationAndSuggestions` (line 904) to:

- Accept conversation context as parameter
- Pass context to the chat API
- Ensure suggestions align with original topic

Update the system instruction (lines 975-982) to include context alignment:

```typescript
systemInstruction: `Du generierst 3 deutsche Antworten für: "${germanText}"
WICHTIG: Die Konversation handelt von: "${conversationContext}"
- Bleibe im Kontext dieses Themas
- Antworte DIREKT auf die Frage
- Keine generischen Antworten
- Keine Fragen stellen

Format: TRANSLATION: [translation] SUGGESTIONS: [a1] | [a2] | [a3] ENGLISH: [e1] | [e2] | [e3]`
```

## Testing Strategy

After implementation, verify:

1. New conversation starts with proper context acknowledgment and readiness question
2. Suggestions only appear when "Show Suggestions" button is clicked
3. All AI responses directly relate to user's previous message and maintain context
4. Voice recordings display correct transcription in the right message bubble
5. No regression in existing features (error correction, language detection, vocabulary)

### To-dos

- [ ] Update sendInitialMessage prompt to acknowledge context and ask if user is ready
- [ ] Remove auto-suggestion generation and add user-triggered 'Show Suggestions' button with state management
- [ ] Strengthen conversation context in chat function system prompt and ensure context is passed with every message
- [ ] Fix voice transcription display to show correct text in the right message bubble with proper message ID tracking
- [ ] Modify generateTranslationAndSuggestions to receive and use conversation context for aligned suggestions
- [ ] Perform comprehensive manual testing of all changes to ensure no regression