<!-- 1f39fc2c-849b-40e0-b894-1492c9687466 3c799198-6254-4efc-a2be-c56f44113f44 -->
# Redesign Explain Tab: Sentence-Specific Grammar & Speaking Tips

## Overview

Transform the Explain tab into a focused, educational tool with two sections: Grammar Explanation (sentence-specific grammar concepts) and Speak Like a Local (cultural speaking tips), removing Practice Tips completely.

## Phase 1: Analyze Current System

### Understand Current Architecture

- Study how Tutor and User sentences are captured and passed to analysis functions
- Document current API endpoints: `grammar-analysis` and `speaking-tips`
- Map existing caching mechanism (`explanationCache`)
- Identify current content parsing logic in `parseGrammarExplanation`, `parseSpeakingTips`
- Review how Practice Tips are currently implemented for complete removal

## Phase 2: Update Backend Prompts

### Update Grammar Analysis Prompt

**File**: `supabase/functions/prompts/grammar-analysis.ts`

- Focus on 1-2 most significant grammar concepts in the specific sentence
- Analyze actual grammar patterns found in Tutor/User sentences
- Provide clear explanations + German examples from conversation context
- Remove all numbered prefixes and technical labels
- Structure: Concept explanation + contextual German examples

### Update Speaking Tips Prompt  

**File**: `supabase/functions/prompts/speaking-tips.ts`

- Focus on expressions, phrasal verbs, specific sayings, and cultural particularities in specific sentences
- Analyze speaking patterns and idiomatic expressions in actual Tutor/User sentences
- Provide cultural context that makes speech sound local + German examples
- Remove all numbered prefixes and technical labels
- Structure: Cultural tip (English) + German examples from conversation
- **CRITICAL**: Do NOT focus on pronunciation (separate tab exists for this)

## Phase 3: Remove Practice Tips Completely

### Clean Up Frontend

**File**: `src/components/Toolbar.tsx`

- Remove `grammarPracticeTips` state variable
- Remove `loadGrammarPracticeTips` function
- Remove Practice Tips UI section (around line 2856)
- Update `explanationCache` type to only include `{grammar, tips}` (remove `practiceTips`)

### Clean Up Backend (if exists)

- Remove `supabase/functions/grammar-practice-tips/` directory if it exists
- Remove `supabase/functions/prompts/grammar-practice-tips.ts` if it exists

## Phase 4: Redesign UI Structure

### Grammar Explanation Section

**File**: `src/components/Toolbar.tsx` (around line 2708)

- Single card with blue theme: `bg-white border border-blue-200`
- Header: Lightbulb icon + "Grammar Explanation"
- Content structure: Clean explanation + German examples
- Remove all parsing that creates multiple sub-sections
- Simple, focused design showing sentence-specific grammar

### Speak Like a Local Section

**File**: `src/components/Toolbar.tsx` (around line 2790)

- Single card with purple theme: `bg-white border border-purple-200`
- Header: Volume2 icon + "Speak Like a Local"
- Content structure: Cultural tip + German examples
- Highlight German text appropriately
- Simple, focused design showing sentence-specific speaking tips

## Phase 5: Simplify Content Parsing

### Update parseGrammarExplanation

**File**: `src/components/Toolbar.tsx` (around line 640)

- Remove complex parsing logic
- Simply display the content as-is (no section extraction)
- Remove all numbered prefix removal logic
- Focus: Show grammar explanation directly

### Update parseSpeakingTips

**File**: `src/components/Toolbar.tsx` (around line 673)

- Simplify to extract tips without complex parsing
- Highlight German text in quotes or bold
- Focus: Show speaking tips directly

## Phase 6: Update API Calls

### Ensure Sentence-Specific Analysis

**File**: `src/components/Toolbar.tsx`

- Verify `loadGrammarExplanation` passes the actual sentence
- Verify `loadSpeakingTips` passes the actual sentence
- Ensure caching works with simplified structure
- Maintain error handling

## Phase 7: Apply Consistent Styling

### Blue Theme for Grammar

- Card: `bg-white border border-blue-200 rounded-lg p-6 shadow-sm`
- Header: `flex items-center space-x-3 mb-4`
- Icon: `h-6 w-6 text-blue-600`
- Title: `text-lg font-semibold text-gray-900`
- Content: `text-sm text-gray-700 leading-relaxed`

### Purple Theme for Speaking

- Card: `bg-white border border-purple-200 rounded-lg p-6 shadow-sm`
- Header: `flex items-center space-x-3 mb-4`
- Icon: `h-6 w-6 text-purple-600`
- Title: `text-lg font-semibold text-gray-900`
- Content: `text-sm text-gray-700 leading-relaxed`

### German Text Highlighting

- Use `font-medium text-blue-900` for German in Grammar section
- Use `font-medium text-purple-900` for German in Speaking section

## Phase 8: Enhance Empty & Loading States

### Loading States

- Consistent card wrapper with skeleton animation
- Match card styling of content state
- Clear "Loading..." feedback

### Empty States

- Meaningful message: "Grammar explanations will appear when the AI sends a message"
- Consistent with app design
- Proper icon and typography

## Testing & Validation

### Functional Testing

- Verify grammar analysis shows sentence-specific concepts
- Verify speaking tips relate to actual conversation
- Confirm Practice Tips completely removed
- Test caching with new structure
- Validate error handling

### UI Testing

- Check responsive design on different screens
- Verify German text highlighting
- Test loading and empty states
- Confirm consistent styling with app

### Content Testing

- Test with various Tutor/User sentence combinations
- Verify grammar concepts are sentence-specific
- Confirm speaking tips are contextually relevant
- Validate German examples are appropriate

## Critical Preservation

- All API endpoints unchanged
- Caching mechanism preserved
- Error handling maintained
- German language support intact
- Responsive design preserved
- Performance characteristics maintained

### To-dos

- [ ] Update grammar-analysis.ts prompt with enhanced German grammar context
- [ ] Update speaking-tips.ts prompt to focus on 'Speak Like a Local'