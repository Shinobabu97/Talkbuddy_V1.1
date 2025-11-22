<!-- 177778e2-d47c-4140-959c-26819031307f 3935610d-8b01-4329-8dc7-7b59e2519185 -->
# Pronunciation Summary Update

1. Modify `generateConversationSummary` to compute accuracy as the latest `sessionData.lastSentencePronunciationScore` and overall accuracy as the average of all `sentencePronunciationScores` (or the latest score when only one exists).
2. Update the summary modal (and any consumers) to display these adjusted values.
3. Run build to ensure everything compiles.

### To-dos

- [ ] Implement Conversation/Vocabulary Builder tabs in Toolbar and integrate the builder modal
- [ ] Smoke test vocabulary conversation list and builder access after changes
- [ ] Stop inserting the temporary voice message bubble in Dashboard.tsx when mic recording ends
- [ ] Insert the finished voice message into chatMessages after transcription completes and set spinner feedback
- [ ] Test German vs English recordings to confirm single bubble and routed behaviour