# Environment Variable Configuration Guide

## OpenAI API Key Setup

The pronunciation analysis feature uses OpenAI Whisper API for audio transcription and pronunciation assessment.

## Correct Secret Name in Supabase

### Required: `OPENAI_API_KEY` (all caps, underscores)

**Why?**
- Supabase environment variables use underscores, not hyphens
- All uppercase is standard convention
- This is the format required by OpenAI API

### How to Set in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Click **"Add new secret"** or **"Create secret"**
3. Enter:
   - **Name**: `OPENAI_API_KEY` (exactly like this, all caps, underscores)
   - **Value**: Your OpenAI API key (starts with `sk-`)
4. Click **"Save"** or **"Add secret"**

### Getting Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (you'll only see it once!)
5. Paste it into Supabase Secrets

## Verification Steps

After setting the secret:

1. **Check Secret Name**: Make sure it's exactly `OPENAI_API_KEY` (case-sensitive)
2. **Wait 10-30 seconds**: Supabase secrets may take a moment to propagate
3. **Redeploy Function** (if needed): If you just updated the code, redeploy the function
4. **Test**: Try the pronunciation analysis feature again
5. **Check Logs**: If still failing, check Supabase Dashboard → Edge Functions → pronunciation-analysis → Logs

## Common Mistakes to Avoid

❌ **Wrong**: `OPENAI_API_KEY` with spaces before/after
❌ **Wrong**: `OpenAI_API_Key` (wrong case)
❌ **Wrong**: `OPENAI-API-KEY` (hyphens instead of underscores)
❌ **Wrong**: Missing `sk-` prefix in the API key value
✅ **Correct**: `OPENAI_API_KEY` (all caps, underscores, no spaces)

## API Usage

The pronunciation analysis function:
- Uses OpenAI Whisper API for audio transcription
- Compares transcribed text with expected text
- Generates pronunciation scores algorithmically
- Provides detailed feedback on 6 dimensions:
  - Sound Accuracy
  - Stress & Emphasis
  - Smoothness (Fluency)
  - Correct Speed
  - Intonation & Rhythm
  - Understandability

## Troubleshooting

If you're still getting errors after setting `OPENAI_API_KEY`:

1. **Double-check spelling**: Copy-paste `OPENAI_API_KEY` to avoid typos
2. **Verify secret exists**: Check Supabase Dashboard → Secrets to confirm it's there
3. **Check secret value**: Make sure the API key value is correct (starts with `sk-`, no extra spaces)
4. **Verify API key is valid**: Test your API key at https://platform.openai.com/api-keys
5. **Check billing**: Ensure your OpenAI account has credits/billing set up
6. **Redeploy function**: After setting secret, redeploy the function
7. **Check function logs**: Look for error messages in Supabase function logs

## Cost Considerations

OpenAI Whisper API pricing:
- Pay per minute of audio transcribed
- Check current pricing at https://openai.com/pricing
- Monitor usage in OpenAI Dashboard

## Security Notes

- Never commit API keys to version control
- Always use Supabase Secrets for environment variables
- Rotate API keys periodically
- Use separate API keys for development and production if possible
