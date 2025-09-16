# Supabase Storage Setup - Dashboard UI Method

Instead of SQL, use the Supabase Dashboard UI (much easier and no errors):

## Step 1: Create Storage Buckets

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/qjrxvrxeskknweqqarhr
2. Click **"Storage"** in the left sidebar
3. Click **"Create a new bucket"**

### Create Profile Bucket:
- **Name:** `profile`
- **Public bucket:** ✅ **Check this box**
- **File size limit:** `5242880` (5MB)
- **Allowed MIME types:** `image/jpeg,image/png,image/gif`
- Click **"Save"**

### Create Cover Bucket:
- **Name:** `cover` 
- **Public bucket:** ✅ **Check this box**
- **File size limit:** `10485760` (10MB)
- **Allowed MIME types:** `image/jpeg,image/png,image/gif`
- Click **"Save"**

## Step 2: Set Up Policies (Simple SQL)

1. Go to **"SQL Editor"** in the left sidebar
2. Copy and paste this SIMPLE SQL:

```sql
-- Simple policies for storage buckets
-- Profile bucket policies
CREATE POLICY "Anyone can view profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'profile');

CREATE POLICY "Users can upload profile images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile');

-- Cover bucket policies  
CREATE POLICY "Anyone can view cover images" ON storage.objects
FOR SELECT USING (bucket_id = 'cover');

CREATE POLICY "Users can upload cover images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cover');
```

3. Click **"Run"**

## Step 3: Enable Supabase in App

After completing the above steps, edit `config/supabaseClient.js` and uncomment the supabase client code.

That's it! Much simpler than the complex SQL approach.
