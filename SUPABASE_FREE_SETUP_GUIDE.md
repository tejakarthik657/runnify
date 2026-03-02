# Supabase Storage Setup Guide (FREE - No Credit Card)

## ✅ What We Changed

Your app now uses **Supabase Storage** instead of Cloudflare R2:
- ✅ **Completely free** - no credit card required
- ✅ **1GB storage** included
- ✅ Unlimited downloads
- ✅ Users upload profile image during registration
- ✅ Users can upload moments (24h photos)
- ✅ Both stored in dedicated Supabase bucket

---

## Step 1️⃣: Create Supabase Account (No Credit Card!)

1. Go to **https://supabase.com**
2. Click **"Sign Up"** 
3. **Sign up with GitHub** (easiest)
   - OR email + password
4. **Skip** any payment/billing screens
5. Click **"New Project"**
6. Fill in:
   - **Name**: `Territory-Run`
   - **Database Password**: (auto-generated, save it)
   - **Region**: Pick closest to you (or US East)
7. Wait ~2 min for project to initialize ✅

---

## Step 3️⃣: Create Storage Bucket

1. In Supabase dashboard, click **Storage** (left menu)
2. Click **"Create a new bucket"**
3. Name it: `territory-run-storage`
4. Click **"Make it public"** ✅
5. Create ✅

### ⚠️ IMPORTANT: Set RLS Policy (REQUIRED for uploads)
By default, Supabase blocks uploads even on public buckets. You MUST add this policy:
1. Go to **SQL Editor** (left menu)
2. Click **"New Query"**
3. Paste and **Run** this:
```sql
-- Allow anyone to upload to the bucket
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'territory-run-storage');
-- Allow anyone to see the files
CREATE POLICY "Public Select" ON storage.objects FOR SELECT USING (bucket_id = 'territory-run-storage');
```
4. Verify it says "Success" ✅

---

## Step 3️⃣: Get Your Credentials

### Get Project URL:
1. Go to **Settings** → **API** (left menu)
2. Copy **Project URL** (looks like: `https://abcdef123456.supabase.co`)
3. Save it ✅

### Get Anon Key:
1. Still in **Settings → API**
2. Scroll down to "Project API keys"
3. Copy **`anon` public key** (NOT secret key!)
4. Save it ✅

---

## Step 4️⃣: Update .env File

In your `backend/.env` file, add:

```env
# Supabase Storage (free: 1GB + unlimited downloads, NO CREDIT CARD!)
SUPABASE_URL=https://yourprojectid.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=territory-run-storage
```

Replace:
- `https://yourprojectid.supabase.co` → your actual Project URL
- `eyJhbG...` → your actual anon key
- Keep bucket name: `territory-run-storage`

---

## Step 5️⃣: Install npm Dependencies

```bash
cd backend
npm install multer
npm install
```

---

## Step 6️⃣: Test It!

### Backend Start:
```bash
cd backend
npm run dev
```

### Test Registration with Profile Image:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -F "username=testuser123" \
  -F "email=test@example.com" \
  -F "password=Password123!" \
  -F "color=#00FF88" \
  -F "city=San Francisco" \
  -F "profileImage=@/path/to/your/image.jpg"
```

Response should include:
```json
{
  "user": {
    "avatarUrl": "https://yourproject.supabase.co/storage/v1/object/public/territory-run-storage/profiles/xxx.jpg",
    ...
  }
}
```

✅ Profile image uploaded to Supabase!

---

## How It Works Now

### Frontend Registration Flow:
```javascript
// User selects profile image
const formData = new FormData();
formData.append('username', 'johndoe');
formData.append('email', 'john@example.com');
formData.append('password', 'Password123!');
formData.append('color', '#00FF88');
formData.append('city', 'SF');
formData.append('profileImage', imageFile); // <-- IMAGE!

fetch('/api/auth/register', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(data => {
  // User profile image now available at: data.user.avatarUrl
  console.log('Profile image:', data.user.avatarUrl);
});
```

### Moment Upload (24h Photos):
```javascript
// User takes a moment photo
const formData = new FormData();
formData.append('file', momentImageFile);
formData.append('caption', 'Just ran 5km!');
formData.append('runId', 'optional-run-id');

fetch('/api/user/me/moments', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
})
.then(r => r.json())
.then(data => {
  // Moment image URL
  console.log('Moment image:', data.moment.imageUrl);
});
```

### Update Profile Image (Anytime):
```javascript
const formData = new FormData();
formData.append('file', newImageFile);

fetch('/api/user/me/profile-image', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
})
.then(r => r.json())
.then(data => {
  console.log('New avatar:', data.avatarUrl);
});
```

---

##📁 Files Modified

✅ **Backend files updated:**
- `/backend/user-service/storage.upload.js` - Supabase upload service
- `/backend/user-service/moment.controller.js` - Uses Supabase upload
- `/backend/user-service/profile.controller.js` - Profile image upload endpoint
- `/backend/user-service/routes.js` - Added profile image route + multer
- `/backend/auth-service/controller.js` - Registration now handles profile images
- `/backend/auth-service/routes.js` - Registration route with multer
- `/env.example` - Supabase credentials template

---

## 💰 Cost Breakdown

| Item | Cost |
|------|--------|
| 1GB storage | **FREE** |
| Unlimited downloads | **FREE** |
| Unlimited API calls | **FREE** |
| No credit card | **100% Free** |

If you exceed 1GB, first tier is 25GB for $5/month. But 1GB is plenty for:
- 500+ profile pictures
- 1000+ moment photos
- All stored as-is, no compression

---

## 🐛 Troubleshooting

### "Missing Supabase credentials"
- Check `.env` file has all 3 variables
- Make sure NO typos in URLs/keys
- Restart backend after updating `.env`

### "Supabase upload failed: 401"
- Your ANON key is wrong
- Go to Settings → API → copy `anon` key again (not secret key!)

### "Supabase upload failed: 403"
- Bucket might not be public
- Go to Storage → bucket → Edit Bucket Policies
- Make sure "Public" is selected

### "File not showing up"
- Check Supabase dashboard → Storage → your bucket
- Files should appear in `profiles/` or `moments/` folders
- If missing, check console logs for upload errors

---

## ✨ What's Next

1. **Test registration** with profile image upload
2. **Test moment creation** with photo uploads
3. **Update frontend** to show avatar images:
   ```jsx
   <img src={user.avatarUrl} alt={user.username} className="w-12 h-12 rounded-full" />
   ```
4. **Update moment display** to show moment images

---

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Your bucket is at: https://app.supabase.com/project/[PROJECT_ID]/storage/buckets
- Files are stored at: `https://[PROJECT_ID].supabase.co/storage/v1/object/public/territory-run-storage/profiles/xxx.jpg`

✅ **That's it! Completely free, no credit card, ready to go!**
