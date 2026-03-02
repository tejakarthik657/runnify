# Cloudflare R2 Free Image Hosting Setup

## Free Tier Benefits ✅
- **10GB/month** storage (completely free)
- **Unlimited downloads** - no egress fees!
- **Unlimited API requests** - totally free
- Global CDN via Cloudflare edge network
- Perfect for 24-hour moment storage

---

## Step 1: Create Cloudflare Account & R2 Bucket

1. Go to https://dash.cloudflare.com
2. Click **R2** in the left menu → Create Bucket
3. Name it (e.g., `territory-run-moments`)
4. Leave region as default
5. Create bucket ✅

---

## Step 2: Get API Credentials

### Get Account ID
1. In R2 → Click your bucket
2. Go to **Settings** 
3. Copy **Account ID** (looks like: `a1b2c3d4e5f6g7h8`)

### Create API Token
1. Go to https://dash.cloudflare.com/admin/integrations/api-tokens
2. Click **Create Token** → **Custom token**
3. Fill in:
   - **Name**: `Territory Run R2 Upload`
   - **Permissions**:
     - `Account.R2` → `Edit`
     - `Object.r2` → `Edit` (select your bucket)
4. **TTL**: No expiration (or 1 year)
5. Copy the token immediately (you won't see it again!)

---

## Step 3: Install Dependencies

```bash
cd backend
npm install multer
npm install  # Make sure all dependencies are installed
```

---

## Step 4: Configure Environment Variables

Update your `.env` file:

```env
# Cloudflare R2 (free: 10GB/month + unlimited downloads)
CLOUDFLARE_R2_ACCOUNT_ID=<your_account_id_here>
CLOUDFLARE_R2_BUCKET=territory-run-moments
CLOUDFLARE_R2_API_TOKEN=<your_api_token_here>

# Optional: Custom domain (skip for now)
# R2_PUBLIC_URL=https://images.yourdomain.com
```

---

## Step 5: How It Works

### Frontend Upload Flow
```javascript
// Send FormData with file
const formData = new FormData();
formData.append('file', imageFile); // from input[type="file"]
formData.append('caption', 'My epic run!');
formData.append('runId', 'optional-run-id');

fetch('/api/user/me/moments', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
})
.then(r => r.json())
.then(data => console.log('Uploaded:', data.moment.imageUrl));
```

### Backend Upload Flow
1. **Frontend** → sends image file + metadata (multipart/form-data)
2. **multer** → stores file in memory
3. **uploadToR2()** → sends to Cloudflare R2
4. **R2 returns** → public URL (e.g., `https://r2-bucket.xxx.r2.cloudflarestorage.com/moments/xxx.jpg`)
5. **Stored in MongoDB** → only the URL (not the file!)
6. **Frontend displays** → loads from R2 CDN (global edge)

---

## Step 6: Test Upload

```bash
cd backend
npm run dev
```

Then test with cURL:
```bash
curl -X POST http://localhost:4000/api/user/me/moments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=My moment!"
```

Response should include:
```json
{
  "moment": {
    "imageUrl": "https://r2-bucket.xxx.r2.cloudflarestorage.com/moments/xxx.jpg",
    "expiresAt": "2026-03-03T10:30:00Z"
  }
}
```

---

## Step 7: (Optional) Custom Domain for Images

To use `https://images.yourapp.com` instead of the long R2 URL:

1. In Cloudflare **Domain** settings → **DNS**
2. Add CNAME record:
   ```
   images.yourapp.com → CNAME → yourname.r2.cloudflarestorage.com
   ```
3. Update `.env`:
   ```env
   R2_PUBLIC_URL=https://images.yourapp.com
   ```

---

## Cost Breakdown (FREE)
| Item | Cost |
|------|------|
| 10GB/month storage | **$0** |
| Unlimited downloads | **$0** |
| Unlimited API calls | **$0** |
| Global CDN delivery | **$0** |
| **Total** | **$0/month** |

If you exceed 10GB (unlikely), it's only **$0.015 per GB**. Downloads are **always free**.

---

## Frontend Update Example

Old way (Base64 - bloated):
```javascript
const reader = new FileReader();
reader.onload = (e) => {
  setMomentImage(e.target.result); // 1-2MB in MongoDB!
};
```

New way (R2 URL - fast):
```javascript
const handleImageUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/user/me/moments', {
    method: 'POST',
    body: formData,
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  const imageUrl = data.moment.imageUrl; // Cloudflare CDN URL!
  
  // Display image
  setMomentImage(imageUrl);
};
```

---

## Files Modified
✅ `/backend/user-service/r2.upload.js` - New R2 uploader service
✅ `/backend/user-service/moment.controller.js` - Uses R2 upload
✅ `/backend/user-service/routes.js` - Added multer middleware
✅ `/env.example` - Added Cloudflare credentials

## Next: Run Backend & Test!
