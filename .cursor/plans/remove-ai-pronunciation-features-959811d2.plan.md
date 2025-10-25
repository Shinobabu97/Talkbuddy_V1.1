<!-- 959811d2-ee12-481e-8fb4-25772ce4515e 266d3fb3-c043-4ff7-ba61-84b7a6e1ffd7 -->
# Remove AI Message Pronunciation Features

## Overview

Remove pronunciation guide functionality for AI tutor messages while completely preserving all user pronunciation analysis features.

## What Will Be Removed

### 1. Pronunciation Guide Below AI Messages

- "Get pronunciation guide" button below AI messages
- Phonetic breakdown display (IPA, transliteration, syllables)
- Word-by-word pronunciation with audio playback
- Speed controls for individual AI message words

### 2. Word-Level Practice in Toolbar

- Word breakdown section showing AI message words
- WordPracticeCard components for AI message words
- Listen/practice/analyze buttons for AI message words
- Related state and functions

### 3. Backend Function

- `phonetic-breakdown` Supabase function (no longer needed)

## What Will Be Preserved (Unchanged)

### User Pronunciation Analysis

- All user voice message recording
- Pronunciation analysis of user audio (`analyzePronunciation`)
- Sentence-level practice (`analyzeSentencePronunciation`)
- Word-level practice (`analyzeWordPronunciation`)
- PronunciationSentenceView component
- All scoring, feedback, and RAG indicators
- Gamification (points, streaks, levels, library)

### Other Features

- Grammar analysis
- Vocabulary features
- Chat functionality
- All other toolbar tabs

## Implementation Steps

### Step 0: Create Backup and Safety Branch

**CRITICAL**: Before making any changes, create a safety backup to enable easy rollback.

**Actions**:

1. Create a new Git branch from current state: `git checkout -b backup-before-ai-pronunciation-removal`
2. Commit any current changes: `git add -A && git commit -m "Backup: Save state before removing AI pronunciation features"`
3. Push backup branch to remote: `git push origin backup-before-ai-pronunciation-removal`
4. Return to working branch: `git checkout pronunciation-try-Ela` (or current branch)
5. Create implementation branch: `git checkout -b remove-ai-pronunciation-features`

**Rollback Strategy** (if something goes wrong):

- **Quick rollback**: `git checkout backup-before-ai-pronunciation-removal`
- **Cherry-pick specific files**: `git checkout backup-before-ai-pronunciation-removal -- <file-path>`
- **Full reset**: `git reset --hard backup-before-ai-pronunciation-removal`
- **Restore from remote**: `git fetch origin backup-before-ai-pronunciation-removal && git checkout backup-before-ai-pronunciation-removal`

**File-Level Backup** (alternative/additional):

Create manual copies of critical files before editing:

```bash
# Create backup directory
mkdir -p .backups/ai-pronunciation-removal

# Copy files that will be modified
cp src/components/Dashboard.tsx .backups/ai-pronunciation-removal/Dashboard.tsx.backup
cp src/components/Toolbar.tsx .backups/ai-pronunciation-removal/Toolbar.tsx.backup
cp -r supabase/functions/phonetic-breakdown .backups/ai-pronunciation-removal/phonetic-breakdown-backup
```

**To restore from file backup**:

```bash
cp .backups/ai-pronunciation-removal/Dashboard.tsx.backup src/components/Dashboard.tsx
cp .backups/ai-pronunciation-removal/Toolbar.tsx.backup src/components/Toolbar.tsx
cp -r .backups/ai-pronunciation-removal/phonetic-breakdown-backup supabase/functions/phonetic-breakdown
```

### Step 1: Remove Pronunciation Guide from Dashboard.tsx

**File**: `src/components/Dashboard.tsx`

Remove lines 4939-5062 (entire pronunciation breakdown section below AI messages):

- Remove the conditional block: `{message.role === 'assistant' && (<div className="mt-3">...`
- This includes "Get pronunciation guide" button, phonetic data display, and all related UI

### Step 2: Remove Phonetic State and Functions from Dashboard.tsx

**File**: `src/components/Dashboard.tsx`

Remove state variables:

- Line 326: `phoneticBreakdowns` state
- Line 327: `showPronunciationBreakdown` state
- Lines 311-325: `wordSpeeds` state and related functions (`getWordSpeed`, `setWordSpeed`)

Remove functions:

- Lines 933-1002: `getPhoneticBreakdown` function
- `togglePronunciationBreakdown` function (search and remove)
- `playWordAudio` function (if it only plays AI message words)

Remove prop passing to Toolbar (around line 5340):

- Remove `phoneticBreakdowns={phoneticBreakdowns}`
- Remove `onPlayWordAudio={playWordAudio}`
- Remove `globalPlaybackSpeed={globalPlaybackSpeed}`
- Remove `onSpeedChange={setGlobalPlaybackSpeed}`

### Step 3: Remove WordPracticeCard Component from Toolbar.tsx

**File**: `src/components/Toolbar.tsx`

Remove lines 6-340 (entire WordPracticeCard component):

- Remove `WordPracticeCardProps` interface (lines 7-33)
- Remove `WordPracticeCard` component definition (lines 35-340)

### Step 4: Remove Word-Level Practice Section from Toolbar.tsx

**File**: `src/components/Toolbar.tsx`

Remove lines 3184-3255 (Word-Level Practice section in pronunciation tab):

- Remove entire `<div className="bg-gradient-to-r from-green-50 to-blue-50...` block
- This includes word breakdown display and all WordPracticeCard renderings

### Step 5: Clean Up Toolbar Props and State

**File**: `src/components/Toolbar.tsx`

Remove from ToolbarProps interface (around lines 344-354):

- `phoneticBreakdowns` prop
- `onPlayWordAudio` prop
- `globalPlaybackSpeed` prop
- `onSpeedChange` prop

Remove from function parameters (around lines 409-427):

- `phoneticBreakdowns = {}`
- `onPlayWordAudio`
- `globalPlaybackSpeed = 1.0`
- `onSpeedChange`

Remove related state and functions:

- `individualWordAnalysis` state (if only used for AI words)
- `wordsAnalyzed` state (if only used for AI words)
- `wordsAnalysisComplete` state (if only used for AI words)
- `analyzeIndividualWord` function (if only used for AI words)
- Any other word-level analysis logic specific to AI message words

### Step 6: Update Pronunciation Tab Logic

**File**: `src/components/Toolbar.tsx`

Simplify the pronunciation tab (starting around line 2852):

- Remove the conditional check for `hasPhoneticData` (lines 2930-2944)
- Keep only the "Analyze Your Pronunciation" section (lines 2855-2927)
- The pronunciation tab should only show:
- User voice message analysis section
- Sentence-level practice section (if currently visible)

### Step 7: Remove Phonetic Breakdown Function

**File**: `supabase/functions/phonetic-breakdown/index.ts`

Options:

- Delete the entire file/directory, OR
- Comment out the functionality with a note explaining it's no longer used

### Step 8: Verify and Test

- Confirm no broken imports or references
- Check for console errors
- Verify all user pronunciation features still work
- Verify chat and other features unchanged

## Files to Modify

1. `src/components/Dashboard.tsx` - Remove pronunciation guide UI, state, functions, and prop passing
2. `src/components/Toolbar.tsx` - Remove WordPracticeCard component, word-level practice section, and related props/state
3. `supabase/functions/phonetic-breakdown/index.ts` - Delete or disable

## Testing Checklist

- No pronunciation guide appears below AI messages
- Pronunciation tab only shows user analysis section
- User can still analyze their own voice messages
- Sentence and word practice for user audio still works
- Gamification features still work
- No console errors or broken functionality
- Grammar and vocabulary features unchanged

### To-dos

- [ ] Remove pronunciation guide section from Dashboard.tsx (lines 4939-5062)
- [ ] Remove phoneticBreakdowns, showPronunciationBreakdown, wordSpeeds state and related functions from Dashboard.tsx
- [ ] Remove WordPracticeCard component definition from Toolbar.tsx (lines 6-340)
- [ ] Remove Word-Level Practice section from Toolbar.tsx pronunciation tab (lines 3184-3255)
- [ ] Remove phoneticBreakdowns, onPlayWordAudio, globalPlaybackSpeed, onSpeedChange props from Toolbar interface and parameters
- [ ] Simplify pronunciation tab to only show user voice analysis section
- [ ] Delete or disable phonetic-breakdown Supabase function
- [ ] Test that user pronunciation features work and AI pronunciation features are removed