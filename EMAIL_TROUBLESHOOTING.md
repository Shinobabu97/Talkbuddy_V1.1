# Email Delivery Troubleshooting Guide

## Problem: Emails Not Being Received

If the waitlist form shows success but recipients are not receiving acknowledgement emails, follow this diagnostic guide.

---

## Quick Diagnostic Checklist

- [ ] Check Supabase Edge Function logs
- [ ] Check Resend Dashboard logs
- [ ] Verify RESEND_API_KEY is set
- [ ] Verify domain is verified in Resend
- [ ] Check spam/junk folder
- [ ] Verify email address is correct

---

## Step 1: Check Supabase Edge Function Logs

This is the **most important** step to diagnose the issue.

### How to Access Logs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your TalkBuddy project
3. Navigate to **Edge Functions** in the sidebar
4. Click on **`waitlist-email`**
5. Click on **Logs** tab

### What to Look For

#### ✅ Success Indicators

If email is being sent successfully, you should see:
```
🚀 [xxxx] waitlist-email function called
📥 [xxxx] Payload received: { email: "...", firstName: "..." }
📧 [xxxx] Starting email send process
✅ [xxxx] RESEND_API_KEY found (length: XX characters)
📧 [xxxx] Sending request to Resend API...
📧 [xxxx] Resend API response status: 200
✅ [xxxx] Email sent successfully!
✅ [xxxx] Email ID: re_xxxxx
```

#### ❌ Error Indicators

**Error 1: API Key Not Configured**
```
❌ [EMAIL] RESEND_API_KEY is not configured in environment variables
```
**Solution:** Add `RESEND_API_KEY` secret in Supabase Dashboard → Project Settings → Edge Functions → Secrets

**Error 2: Domain Not Verified**
```
❌ [EMAIL] Resend API error response: {"message":"Domain not verified"}
```
**Solution:** Verify domain `talkbuddy.co.in` in Resend Dashboard → Domains

**Error 3: Invalid API Key**
```
❌ [EMAIL] Resend API error response: {"message":"Invalid API key"}
```
**Solution:** Check that your Resend API key is correct and active

**Error 4: Function Not Being Called**
- No logs appear when submitting the form
- **Solution:** Check if function is deployed and check browser console for CORS errors

**Error 5: Function Failing Silently**
- Logs show function is called but no email logs
- **Solution:** Check if there are any errors in the logs before email sending starts

### Understanding the Logs

The improved logging now includes:
- **Request ID**: Each request has a unique ID (first 8 chars of UUID) for tracking
- **Step-by-step logging**: See exactly where the process fails
- **Error details**: Full error messages and stack traces
- **Email ID**: Resend's email ID if successful (for tracking in Resend dashboard)

---

## Step 2: Check Resend Dashboard Logs

If Supabase logs show the email was sent, check Resend to see delivery status.

### How to Access Resend Logs

1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Navigate to **Logs** or **Emails** in the sidebar
3. Look for recent emails sent to your test address

### What to Check

#### Email Status

- ✅ **Delivered**: Email was successfully delivered
- ⚠️ **Pending**: Email is queued for delivery
- ❌ **Bounced**: Email address is invalid or rejected
- ❌ **Failed**: Delivery failed (check reason)
- ⚠️ **Spam**: Email was marked as spam

#### Email Details

Click on an email to see:
- **Status**: Current delivery status
- **Recipient**: Email address
- **Subject**: Email subject
- **Sent At**: Timestamp
- **Events**: Delivery events (sent, delivered, opened, etc.)

### If Email Shows as "Delivered" but Not Received

1. **Check Spam/Junk Folder**: Most common issue
2. **Check Email Filters**: Some email providers filter emails
3. **Wait a Few Minutes**: Delivery can take 1-5 minutes
4. **Check Email Address**: Verify the address is correct

### If Email Shows as "Failed" or "Bounced"

1. **Invalid Email Address**: Check if the email address is valid
2. **Domain Issues**: Sender domain might not be verified
3. **Rate Limiting**: Too many emails sent (check Resend limits)

---

## Step 3: Verify Configuration

### Check RESEND_API_KEY

1. Go to Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
2. Verify `RESEND_API_KEY` exists
3. If missing, add it with your Resend API key

**How to Get Resend API Key:**
1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Navigate to **API Keys**
3. Create a new key or use an existing one
4. Copy the key (starts with `re_`)

### Check Domain Verification

1. Go to Resend Dashboard → **Domains**
2. Look for `talkbuddy.co.in`
3. Verify it shows **"Verified"** status (not "Pending" or missing)

**If Domain is Not Verified:**
1. Click **"Add Domain"** or **"Verify Domain"**
2. Add DNS records as instructed
3. Wait for DNS propagation (can take up to 48 hours)
4. Resend will automatically verify once DNS is correct

**Alternative for Testing:**
- Temporarily change sender to `onboarding@resend.dev` (Resend's test domain)
- This works immediately but is only for testing

---

## Step 4: Test Email Sending

### Test 1: Submit Waitlist Form

1. Open your application
2. Click **"Join the Wait List"**
3. Fill out the form with a test email
4. Submit the form
5. Immediately check:
   - Supabase Edge Function logs
   - Resend Dashboard logs
   - Email inbox (and spam folder)

### Test 2: Direct Function Test

You can test the function directly using curl:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "your-test-email@example.com",
    "firstName": "Test"
  }'
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key
- `your-test-email@example.com` with a real email address you can check

**Expected Response:**
```json
{
  "success": true,
  "emailId": "re_xxxxx",
  "message": "Email sent successfully"
}
```

### Test 3: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Submit the waitlist form
4. Look for:
   - ✅ No CORS errors
   - ✅ No network errors
   - ⚠️ Warnings about email (these are expected if email fails but DB insert succeeds)

---

## Common Issues and Solutions

### Issue 1: "RESEND_API_KEY is not configured"

**Symptoms:**
- Logs show: `❌ [EMAIL] RESEND_API_KEY is not configured`
- Function returns error

**Solution:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add secret: `RESEND_API_KEY` = your Resend API key
3. Redeploy function: `supabase functions deploy waitlist-email --no-verify-jwt`

### Issue 2: "Domain not verified"

**Symptoms:**
- Logs show: `Resend error: Domain not verified`
- Resend API returns 422 or 400 error

**Solution:**
1. Go to Resend Dashboard → Domains
2. Verify `talkbuddy.co.in` is added and verified
3. If not verified, add DNS records as instructed
4. Wait for DNS propagation

### Issue 3: Function Not Being Called

**Symptoms:**
- No logs appear in Supabase
- Browser console shows CORS errors
- Form shows success but no email attempt

**Solution:**
1. Check if function is deployed: Supabase Dashboard → Edge Functions
2. Verify function URL is correct
3. Check browser console for CORS errors
4. Redeploy function if needed

### Issue 4: Email Sent but Not Received

**Symptoms:**
- Logs show email sent successfully
- Resend shows "Delivered"
- But email not in inbox

**Solution:**
1. **Check spam/junk folder** (most common)
2. Check email filters and rules
3. Wait a few minutes (delivery can be delayed)
4. Verify email address is correct
5. Try a different email provider (Gmail, Outlook, etc.)

### Issue 5: Function Failing Silently

**Symptoms:**
- Form shows success
- No errors visible
- But no email logs

**Solution:**
1. Check Supabase Edge Function logs thoroughly
2. Look for any errors before email sending
3. Check if function is actually being called
4. Verify function is deployed and active

---

## Understanding the Email Flow

Here's how the email sending works:

1. **User submits form** → Frontend calls Supabase
2. **Database insert** → Waitlist entry saved to `waitlist_leads` table
3. **Email function call** → Frontend calls `waitlist-email` Edge Function
4. **Edge Function** → Retrieves `RESEND_API_KEY` from secrets
5. **Resend API** → Sends email via Resend service
6. **Email delivery** → Resend delivers to recipient

**Important:** The form shows success even if email fails (by design). The database insert is the critical operation. Email errors are logged but don't block the user experience.

---

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] **Supabase Logs**: Function is being called
- [ ] **Supabase Logs**: API key is found
- [ ] **Supabase Logs**: Email sending starts
- [ ] **Supabase Logs**: Resend API returns 200
- [ ] **Supabase Logs**: Email ID is returned
- [ ] **Resend Logs**: Email appears in Resend dashboard
- [ ] **Resend Logs**: Email status is "Delivered"
- [ ] **Email Inbox**: Email is received (check spam too)
- [ ] **Email Content**: Email content is correct

---

## Getting Help

If you've checked everything and emails still aren't working:

1. **Collect Information:**
   - Screenshot of Supabase Edge Function logs
   - Screenshot of Resend Dashboard logs
   - Error messages from browser console
   - Email address you're testing with

2. **Check Resend Status:**
   - Go to Resend Dashboard → Status
   - Check if there are any service issues

3. **Verify Configuration:**
   - RESEND_API_KEY is set correctly
   - Domain is verified
   - Function is deployed
   - Email address is valid

---

## Quick Reference

**Supabase Logs:** Dashboard → Edge Functions → waitlist-email → Logs
**Resend Logs:** Dashboard → Logs or Emails
**Supabase Secrets:** Dashboard → Project Settings → Edge Functions → Secrets
**Resend Domains:** Dashboard → Domains
**Function Code:** `supabase/functions/waitlist-email/index.ts`

---

## Next Steps After Fixing

Once emails are working:

1. ✅ Monitor logs for a few days
2. ✅ Check Resend dashboard for delivery rates
3. ✅ Monitor spam complaints
4. ✅ Set up email alerts for failures (optional)

The improved logging will help you quickly identify any future issues! 🎉

