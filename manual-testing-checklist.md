# Manual Testing Checklist - Pronunciation Features

## Pre-Testing Setup
1. ✅ Ensure development server is running (`npm run dev`)
2. ✅ Open browser to `http://localhost:5173`
3. ✅ Complete login/onboarding if needed

## Core Existing Functionality Tests

### Chat Mode Tests
- [ ] **Text Input**: Type a German message and verify AI responds correctly
- [ ] **English Translation**: Type English text and verify German translation
- [ ] **Message Rendering**: Check that messages display with proper formatting
- [ ] **Timestamps**: Verify message timestamps appear correctly
- [ ] **Audio Playback**: Click speaker icon on AI messages to test TTS

### Voice Mode Tests  
- [ ] **Microphone Recording**: Click microphone button and record German speech
- [ ] **Transcription**: Verify speech is transcribed correctly
- [ ] **Language Detection**: Test with English speech to verify language mismatch detection
- [ ] **Voice Correction**: Test the voice correction flow if applicable

### Toolbar Navigation Tests
- [ ] **Vocabulary Tab**: Switch to vocabulary tab and verify it loads
- [ ] **Explain Tab**: Switch to explain tab and verify grammar explanations load
- [ ] **Pronunciation Tab**: Switch to pronunciation tab and verify it loads
- [ ] **Tab Switching**: Switch between all tabs multiple times smoothly

### Vocabulary Management Tests
- [ ] **Add Vocabulary**: Click star icon on words to add to vocabulary
- [ ] **Remove Vocabulary**: Remove words from vocabulary list
- [ ] **Filter Functionality**: Test "All" and "Conversation" filters
- [ ] **New Words Display**: Verify new vocabulary items appear correctly

### Grammar Analysis Tests
- [ ] **Grammar Explanations**: Verify grammar explanations load for German text
- [ ] **Speaking Tips**: Check that speaking tips appear
- [ ] **Loading States**: Verify loading indicators work correctly
- [ ] **Error Handling**: Test with invalid input to check error handling

## New Pronunciation Features Tests

### Pronunciation Guide Button Test
1. **Send German Message**: Type "Hallo, wie geht es dir?" in chat
2. **Click Pronunciation Guide**: Click "Get pronunciation guide" button
3. **Verify Tab Switch**: Confirm Pronunciation tab opens automatically
4. **Check Toolbar**: Verify toolbar expands and shows pronunciation content

### Word Breakdown Display Test
1. **Check Word Display**: Verify each word shows:
   - Original German word (e.g., "Hallo")
   - IPA phonetic transcription (e.g., "[ˈhaloː]")
   - English transliteration (e.g., "HAH-loh")
   - Syllable breakdown (e.g., ["Hal", "lo"])

### Listen Button with Speed Control Test
1. **Click Listen Button**: Click "Listen" button next to any word
2. **Verify Audio**: Confirm German pronunciation plays
3. **Test Speed Down**: Click down arrow (↓) to decrease speed
4. **Test Speed Up**: Click up arrow (↑) to increase speed
5. **Check Speed Display**: Verify speed value updates (0.5x - 2.0x)
6. **Test Multiple Words**: Test listen button on different words

### Practice Button and Recording Test
1. **Click Practice Button**: Click "Practice" button next to any word
2. **Verify Microphone**: Confirm microphone recording starts
3. **Check Stop Button**: Verify "Stop Recording" button appears
4. **Record Word**: Speak the German word clearly
5. **Stop Recording**: Click "Stop Recording" button
6. **Wait for Analysis**: Wait for pronunciation analysis to complete

### Immediate Assessment with RAG Scoring Test
1. **Check Score Display**: Verify score appears (0-100)
2. **Verify Color Coding**:
   - Red background for scores < 70
   - Yellow background for scores 70-89  
   - Green background for scores 90+
3. **Check Feedback**: Verify feedback text appears
4. **Test Multiple Words**: Practice multiple words to see different scores

## Edge Cases and Error Handling Tests

### Empty State Tests
- [ ] **No Message**: Verify pronunciation tab shows "no message" state
- [ ] **No Breakdown**: Test with message that has no phonetic breakdown
- [ ] **Empty Words**: Test with empty word list

### Audio Permission Tests
- [ ] **Microphone Permission**: Test when microphone permission is denied
- [ ] **Audio Playback**: Test when audio playback fails
- [ ] **Network Issues**: Test with poor network connection

### Speed Control Edge Cases
- [ ] **Minimum Speed**: Test speed at 0.5x minimum
- [ ] **Maximum Speed**: Test speed at 2.0x maximum
- [ ] **Speed Persistence**: Verify speed setting persists across words

## Performance Tests

### Load Time Tests
- [ ] **Initial Load**: Verify app loads quickly
- [ ] **Tab Switching**: Check tab switching is smooth
- [ ] **Audio Loading**: Verify audio loads quickly

### Memory Tests
- [ ] **Multiple Recordings**: Record multiple words and check memory usage
- [ ] **Long Sessions**: Use app for extended period
- [ ] **Tab Switching**: Switch tabs multiple times

## Cross-Browser Tests (Optional)

### Chrome Tests
- [ ] **All Features**: Test all pronunciation features in Chrome
- [ ] **Audio Playback**: Verify audio works correctly
- [ ] **Microphone**: Test microphone recording

### Edge Tests (if available)
- [ ] **All Features**: Test all pronunciation features in Edge
- [ ] **Compatibility**: Verify features work the same

## Final Verification

### Complete User Flow Test
1. **Login**: Complete login process
2. **Send Message**: Send German text message
3. **Get Pronunciation Guide**: Click pronunciation guide button
4. **Practice Words**: Practice pronunciation of multiple words
5. **Check Scores**: Verify RAG scoring works correctly
6. **Switch Tabs**: Test all toolbar tabs still work
7. **Voice Mode**: Test voice recording and transcription
8. **Vocabulary**: Add/remove vocabulary items

### Regression Verification
- [ ] **Chat Still Works**: Verify chat functionality unchanged
- [ ] **Voice Still Works**: Verify voice mode unchanged  
- [ ] **Translation Still Works**: Verify translation unchanged
- [ ] **Toolbar Still Works**: Verify all toolbar features unchanged
- [ ] **Audio Still Works**: Verify TTS and audio playback unchanged

## Success Criteria

### ✅ All Tests Must Pass
- [ ] All existing functionality works exactly as before
- [ ] All new pronunciation features work correctly
- [ ] No errors in browser console
- [ ] No broken UI elements
- [ ] Performance is acceptable

### 🎯 New Features Working
- [ ] Pronunciation guide button opens correct tab
- [ ] Word breakdown shows phonetic information
- [ ] Listen button plays audio with speed control
- [ ] Practice button enables microphone recording
- [ ] Immediate assessment shows RAG color-coded scores

## Reporting Issues

If any test fails, please report:
1. **Test Step**: Which test step failed
2. **Expected Behavior**: What should have happened
3. **Actual Behavior**: What actually happened
4. **Browser**: Which browser you're using
5. **Console Errors**: Any errors in browser console
6. **Screenshots**: If applicable

---

**Testing Status**: [ ] All tests passed | [ ] Some tests failed  
**Ready for Production**: [ ] Yes | [ ] No  
**Issues Found**: [ ] None | [ ] List issues below

---
*Testing checklist created: October 18, 2025*
