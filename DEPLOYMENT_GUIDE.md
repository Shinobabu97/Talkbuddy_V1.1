# Supabase Function Deployment Guide

## Troubleshooting Summary

### Issue Identified
- **Supabase CLI**: Installed but commands are being canceled (likely authentication/prompt issues)
- **Function Code**: ✅ Verified - CORS fix is correct and matches working functions
- **Code Quality**: ✅ No linter errors, structure matches other functions

### Function Status
- **File**: `supabase/functions/pronunciation-analysis/index.ts`
- **CORS Fix**: ✅ Complete - OPTIONS handler properly implemented
- **API Integration**: ✅ Complete - OpenAI Whisper API integrated
- **Ready for Deployment**: ✅ Yes

## Deployment Method 1: Supabase Dashboard (Recommended)

Since CLI is having issues, use the web dashboard:

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions** in the sidebar

### Step 2: Deploy Function
1. Click **"Create a new function"** or find **"pronunciation-analysis"**
2. If function exists, click **"Edit"**; if not, click **"Create"**
3. Function name: `pronunciation-analysis`

### Step 3: Copy Function Code
Copy the entire contents of `supabase/functions/pronunciation-analysis/index.ts` into the editor

### Step 4: Set Environment Variables
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add secret: `OPENAI_API_KEY` = `your-openai-api-key-value`
   - Your OpenAI API key (starts with `sk-`)
   - Get it from https://platform.openai.com/api-keys
3. Save the secret

### Step 5: Deploy
1. Click **"Deploy"** or **"Save"**
2. Wait for deployment to complete
3. Verify function is active

## Deployment Method 2: CLI (If Fixed)

Once CLI authentication is resolved:

```bash
# 1. Login to Supabase
supabase login

# 2. Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# 3. Set environment variable
supabase secrets set OPENAI_API_KEY=your-openai-api-key-value

# 4. Deploy function
supabase functions deploy pronunciation-analysis
```

## Verification Steps

After deployment, verify:

1. **Function is accessible**: Check Supabase Dashboard → Edge Functions → pronunciation-analysis
2. **CORS is working**: Test OPTIONS request from browser console:
   ```javascript
   fetch('https://your-project.supabase.co/functions/v1/pronunciation-analysis', {
     method: 'OPTIONS'
   }).then(r => console.log('Status:', r.status));
   ```
   Should return `200 OK`

3. **Function works**: Test with actual pronunciation data from the app

## Function Code Location

The function code is ready at:
- **Path**: `supabase/functions/pronunciation-analysis/index.ts`
- **CORS Fix**: Lines 11-20 (OPTIONS handler)
- **API Integration**: Lines 84-167 (OpenAI Whisper API call)
- **Response Mapping**: Lines 224-459 (generatePronunciationScoresFromComparison)

## Troubleshooting CLI Issues

If you want to fix CLI:

1. **Check CLI version**: Try running `supabase --version` directly (not via script)
2. **Authentication**: CLI may need browser authentication - allow popups
3. **Project Linking**: May need to link project: `supabase link`
4. **Alternative**: Use Dashboard method (Method 1) - it's simpler and more reliable

## Next Steps

1. ✅ Function code is ready
2. ⏭️ Deploy via Dashboard (Method 1)
3. ⏭️ Set `OPENAI_API_KEY` environment variable
4. ⏭️ Test CORS and pronunciation analysis

The CORS fix is complete and the function is ready for deployment!

## API Key Setup

Make sure you have:
- An OpenAI API key (get from https://platform.openai.com/api-keys)
- The key set in Supabase Secrets as `OPENAI_API_KEY`
- Billing enabled on your OpenAI account (required for API usage)

## Cost Considerations

OpenAI Whisper API pricing:
- Pay per minute of audio transcribed
- Check current pricing at https://openai.com/pricing
- Monitor usage in OpenAI Dashboard
