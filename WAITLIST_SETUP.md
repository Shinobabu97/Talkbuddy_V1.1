# Waitlist Setup Guide

This guide explains how to set up the waitlist feature for TalkBuddy, including creating the database table and deploying the email function.

## Prerequisites

- Access to your Supabase project dashboard
- Supabase CLI installed (optional, for CLI method)
- Resend account and API key (for email functionality)

## Step 1: Create the Waitlist Table

The waitlist form requires a `waitlist_leads` table in your Supabase database. Choose one of the following methods:

### Option 1: Using Supabase Dashboard (Recommended - Fastest)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
CREATE TABLE IF NOT EXISTS public.waitlist_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  target_language TEXT NOT NULL,
  base_language TEXT NOT NULL,
  reason TEXT NOT NULL
);

-- Disable RLS to allow anonymous inserts
ALTER TABLE public.waitlist_leads DISABLE ROW LEVEL SECURITY;
```

6. Click **Run** (or press `Ctrl+Enter`)
7. Verify the table was created by checking **Table Editor** → `waitlist_leads`

### Option 2: Using Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
# Make sure you're in the project root directory
cd /path/to/Talkbuddy_V1.1

# Apply the migration
supabase db push

# Or apply a specific migration
supabase migration up
```

### Option 3: Using Migration File Directly

The migration file is located at:
```
supabase/migrations/20251116000000_create_waitlist_leads.sql
```

You can copy the contents of this file and run it in the Supabase Dashboard SQL Editor (same as Option 1).

## Step 2: Deploy the Email Edge Function

The waitlist feature sends acknowledgement emails via a Supabase Edge Function. Follow these steps:

### 2.1: Set Up Resend API Key

1. Sign up for a [Resend account](https://resend.com) if you don't have one
2. Create an API key in your Resend dashboard
3. In Supabase Dashboard, go to **Project Settings** → **Edge Functions** → **Secrets**
4. Click **Add new secret**
5. Enter:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key
6. Click **Save**

### 2.2: Deploy the Edge Function

From your project root directory, run:

```bash
# Deploy the waitlist-email function
supabase functions deploy waitlist-email --no-verify-jwt
```

**Note**: The `--no-verify-jwt` flag allows the function to be called without authentication, which is needed for the public waitlist form.

### 2.3: Verify Function Deployment

1. In Supabase Dashboard, go to **Edge Functions**
2. You should see `waitlist-email` in the list
3. Click on it to view logs and verify it's deployed

**Verify Function is Accessible:**

You can test the function directly to ensure it's deployed and CORS is working:

1. **Test OPTIONS request (CORS preflight):**
   ```bash
   curl -X OPTIONS https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist-email \
     -H "Origin: http://localhost:5174" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: content-type" \
     -v
   ```
   
   Expected response: `200 OK` with CORS headers

2. **Check function URL:**
   - Your function URL should be: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/waitlist-email`
   - Replace `YOUR_PROJECT_REF` with your actual Supabase project reference (found in your project settings)

3. **Verify in browser console:**
   - After deployment, try submitting the waitlist form
   - Check browser console - you should NOT see CORS errors
   - If you see CORS errors, the function may not be deployed or the URL is incorrect

## Step 3: Test the Waitlist Form

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your landing page
3. Click **"Join the Wait List"** button
4. Fill out the form with test data
5. Submit the form

### Expected Behavior

- ✅ Form closes immediately after successful submission
- ✅ A success popup appears: "Your waitlist form has been submitted successfully. Please check your email."
- ✅ A new row appears in the `waitlist_leads` table in Supabase
- ✅ An acknowledgement email is sent to the email address provided

### Troubleshooting

#### Error: "404 - Could not find the table 'public.waitlist_leads'"

**Solution**: The table hasn't been created yet. Follow **Step 1** above to create it.

#### Error: "Failed to send acknowledgement email" or CORS errors

**Possible causes**:
- Edge function is not deployed
- `RESEND_API_KEY` secret is not set in Supabase
- CORS preflight request is failing
- Resend API key is invalid

**Solution**:
1. **Verify function is deployed:**
   - Go to Supabase Dashboard → Edge Functions
   - Confirm `waitlist-email` appears in the list
   - If not deployed, run: `supabase functions deploy waitlist-email --no-verify-jwt`

2. **Test CORS preflight:**
   - Open browser console and check for CORS errors
   - If you see "Response to preflight request doesn't pass access control check", the function may not be deployed or OPTIONS handler is failing
   - Verify the function URL matches your Supabase project reference

3. **Verify secrets:**
   - Check that `RESEND_API_KEY` secret exists in Supabase Dashboard → Edge Functions → Secrets
   - If missing, add it and redeploy the function

4. **Check function logs:**
   - Go to Supabase Dashboard → Edge Functions → waitlist-email → Logs
   - Look for error messages that indicate what's wrong

5. **Note:** The form will still work even if email fails - the database insert is the critical operation. Email errors are logged but don't block the user experience.

#### Form submits successfully but no email received

**Note:** The form will show success even if email sending fails. This is intentional - the database insert is the critical operation.

**📖 For detailed troubleshooting, see:** [`EMAIL_TROUBLESHOOTING.md`](./EMAIL_TROUBLESHOOTING.md)

**Quick Steps:**
1. **Check Supabase Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions → waitlist-email → Logs
   - Look for detailed email sending logs (now includes step-by-step logging)
   - Check for errors related to Resend API

2. **Check Resend Dashboard logs:**
   - Go to Resend Dashboard → Logs
   - See if emails are being sent and their delivery status

3. **Verify configuration:**
   - Check that `RESEND_API_KEY` is set in Supabase secrets
   - Verify domain `talkbuddy.co.in` is verified in Resend
   - Check spam/junk folder
   - Verify email address is correct

**The improved logging will show exactly where the email sending process fails.**

## Verification Checklist

- [ ] `waitlist_leads` table exists in Supabase
- [ ] Table has all required columns (id, created_at, first_name, last_name, email, phone_country_code, phone_number, target_language, base_language, reason)
- [ ] RLS is disabled on the table (or appropriate policy allows anonymous inserts)
- [ ] `RESEND_API_KEY` secret is set in Supabase
- [ ] `waitlist-email` Edge Function is deployed
- [ ] Test submission works end-to-end
- [ ] Acknowledgement email is received

## Database Schema Reference

The `waitlist_leads` table structure:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Submission timestamp |
| first_name | TEXT | NOT NULL | User's first name |
| last_name | TEXT | NOT NULL | User's last name |
| email | TEXT | NOT NULL | User's email address |
| phone_country_code | TEXT | NOT NULL | Country code (e.g., +1, +44) |
| phone_number | TEXT | NOT NULL | Phone number without country code |
| target_language | TEXT | NOT NULL | Language user wants to learn |
| base_language | TEXT | NOT NULL | User's current language |
| reason | TEXT | NOT NULL | Reason for learning |

## Security Notes

- The table currently has RLS disabled to allow anonymous inserts. For production, consider:
  - Enabling RLS with a policy that allows anonymous inserts
  - Adding rate limiting to prevent spam
  - Adding email validation/verification
  - Implementing CAPTCHA for the form

## Support

If you encounter issues not covered in this guide:
1. Check Supabase Dashboard → Logs for detailed error messages
2. Review browser console for client-side errors
3. Verify all environment variables are set correctly
4. Ensure your Supabase project is active and not paused

