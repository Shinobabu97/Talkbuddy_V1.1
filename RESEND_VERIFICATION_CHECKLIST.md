# Resend API Key and Email Configuration Verification Checklist

## Current Configuration (From Code)

Based on the Edge Function code analysis:

### ✅ Code Configuration Verified

**Email Sender Address:**
- **Configured in code**: `no-reply@talkbuddy.co.in`
- **Location**: `supabase/functions/waitlist-email/index.ts` (line 29)
- **Format**: `TalkBuddy <no-reply@talkbuddy.co.in>`

**API Key Usage:**
- ✅ Function correctly uses `RESEND_API_KEY` from environment variables
- ✅ Error handling in place if API key is missing
- ✅ Code structure is correct

**Domain Required:**
- **Domain**: `talkbuddy.co.in`
- **Must be verified in Resend** for emails to send successfully

---

## Manual Verification Steps

### Step 1: Verify RESEND_API_KEY in Supabase ✅/❌

**Check if the secret exists:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your TalkBuddy project
3. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
4. Look for a secret named: `RESEND_API_KEY`

**Expected Result:**
- ✅ **Found**: Secret exists with name `RESEND_API_KEY` (exact match, case-sensitive)
- ❌ **Not Found**: Secret doesn't exist - you need to add it

**If Not Found - Add the Secret:**
1. Click **"Add new secret"** or **"Create secret"**
2. **Name**: `RESEND_API_KEY` (exactly like this, all caps, underscores)
3. **Value**: Your Resend API key (starts with `re_`)
4. Click **"Save"**

**Verify the Value:**
- The value should start with `re_` (Resend API key prefix)
- It should be a long string (typically 32+ characters)
- ⚠️ **Note**: You cannot see the full value after saving (for security), but you can verify it exists

---

### Step 2: Verify Domain in Resend Dashboard ✅/❌

**Check if domain is verified:**

1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Log in to your Resend account
3. Navigate to **Domains** in the sidebar
4. Look for the domain: `talkbuddy.co.in`

**Expected Result:**
- ✅ **Found & Verified**: Domain `talkbuddy.co.in` exists and shows "Verified" status
- ⚠️ **Found but Not Verified**: Domain exists but needs DNS verification
- ❌ **Not Found**: Domain doesn't exist - you need to add and verify it

**If Domain is Not Verified or Not Found:**

1. Click **"Add Domain"** or **"Verify Domain"**
2. Enter domain: `talkbuddy.co.in`
3. Follow the DNS verification steps:
   - Add the required DNS records to your domain's DNS settings
   - Wait for DNS propagation (can take a few minutes to 48 hours)
   - Resend will automatically verify once DNS records are correct

**Alternative: Use Resend's Test Domain (For Testing Only)**

If you don't have `talkbuddy.co.in` verified yet, you can temporarily use Resend's test domain:
- Update the code to use: `onboarding@resend.dev`
- This works immediately but is only for testing
- For production, you must verify your own domain

---

### Step 3: Verify Email Address Configuration ✅/❌

**Check if sender email matches verified domain:**

**Current Configuration:**
- **Sender Email**: `no-reply@talkbuddy.co.in`
- **Required Domain**: `talkbuddy.co.in` must be verified in Resend

**Verification:**
1. ✅ Domain `talkbuddy.co.in` is verified in Resend (from Step 2)
2. ✅ Email address `no-reply@talkbuddy.co.in` uses the verified domain
3. ✅ No additional email setup needed (Resend allows any email from verified domain)

**If Using Different Domain:**
- If you want to use a different email address, update line 29 in `supabase/functions/waitlist-email/index.ts`
- Make sure the domain part (after `@`) matches a verified domain in Resend

---

### Step 4: Verify Edge Function is Deployed ✅/❌

**Check if function is deployed:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your TalkBuddy project
3. Navigate to **Edge Functions** in the sidebar
4. Look for: `waitlist-email`

**Expected Result:**
- ✅ **Found**: Function `waitlist-email` exists and shows as deployed
- ❌ **Not Found**: Function is not deployed - you need to deploy it

**If Not Deployed:**
```bash
# From your project root directory
cd "C:\Users\Paras Sachdeva\TalkBuddy_Nov\Talkbuddy_V1.1"
supabase functions deploy waitlist-email --no-verify-jwt
```

---

## Test Procedure

### Test 1: Check Function Logs

1. Go to Supabase Dashboard → **Edge Functions** → `waitlist-email` → **Logs**
2. Submit the waitlist form from your application
3. Check the logs for:
   - ✅ **Success**: `success: true` response
   - ❌ **Error**: Look for error messages like:
     - `RESEND_API_KEY is not configured` → Secret is missing
     - `Domain not verified` → Domain needs verification
     - `Invalid API key` → API key is incorrect

### Test 2: Submit Waitlist Form

1. Open your application (localhost or deployed)
2. Click **"Join the Wait List"**
3. Fill out the form with a test email address
4. Submit the form

**Expected Behavior:**
- ✅ Form closes and shows success popup
- ✅ Database entry is created (check `waitlist_leads` table)
- ✅ Email is sent to the provided address (check inbox/spam)

**If Email Not Received:**
- Check spam/junk folder
- Verify email address is correct
- Check Edge Function logs for errors
- Verify domain is verified in Resend

### Test 3: Direct Function Test (Optional)

You can test the function directly using curl:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test"
  }'
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key

**Expected Response:**
```json
{"success": true}
```

---

## Verification Summary

Use this checklist to track your setup:

- [ ] **RESEND_API_KEY** exists in Supabase Secrets
- [ ] **Domain `talkbuddy.co.in`** is verified in Resend
- [ ] **Email `no-reply@talkbuddy.co.in`** matches verified domain
- [ ] **Edge Function `waitlist-email`** is deployed
- [ ] **Function logs** show no errors
- [ ] **Test submission** works end-to-end
- [ ] **Test email** is received

---

## Common Issues and Solutions

### Issue: "RESEND_API_KEY is not configured"

**Solution:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add secret: `RESEND_API_KEY` = your Resend API key
3. Redeploy the function: `supabase functions deploy waitlist-email --no-verify-jwt`

### Issue: "Domain not verified" or "Invalid sender"

**Solution:**
1. Go to Resend Dashboard → Domains
2. Verify `talkbuddy.co.in` is added and verified
3. If not verified, add DNS records as instructed by Resend
4. Wait for DNS propagation

### Issue: Emails not sending but no errors

**Solution:**
1. Check Resend Dashboard → Logs for delivery status
2. Verify domain is fully verified (not pending)
3. Check spam folder
4. Verify email address format is correct

### Issue: Function not found (404 error)

**Solution:**
1. Deploy the function: `supabase functions deploy waitlist-email --no-verify-jwt`
2. Verify function appears in Supabase Dashboard → Edge Functions
3. Check function URL matches your project reference

---

## Quick Reference

**Resend Dashboard:** https://resend.com/dashboard
**Supabase Dashboard:** https://supabase.com/dashboard
**Function Code:** `supabase/functions/waitlist-email/index.ts`
**Current Sender:** `no-reply@talkbuddy.co.in`
**Required Domain:** `talkbuddy.co.in`

---

## Next Steps After Verification

Once everything is verified:

1. ✅ Test the waitlist form end-to-end
2. ✅ Verify emails are being received
3. ✅ Monitor Edge Function logs for any issues
4. ✅ Check Resend dashboard for email delivery statistics

If all checks pass, your waitlist email system is fully configured and ready to use! 🎉

