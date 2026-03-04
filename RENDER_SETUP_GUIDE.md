# 🚀 Render Backend Deployment Setup Guide

## Phase 2: Deploy Backend to Render

Your frontend is now live on Vercel! Now let's deploy the backend API to Render.

---

## STEP 1️⃣: Create Production Web Service

1. **Sign up / Login to Render:**
   - Go to: https://render.com
   - Sign up with GitHub (recommended) or create account
   - Click "New +" → "Web Service"

2. **Connect Your Repository:**
   - Select: `tejakarthik657/runnify`
   - Confirm access

3. **Configure Production Service:**
   - **Name:** `territoryrun-api` (or similar)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node api-gateway/index.js`
   - **Environment Type:** Node
   - **Plan:** (select based on your needs - Free tier available)

4. **Add Environment Variables:**
   In the service settings, add these environment variables:
   ```
   MONGODB_URI = [from GitHub Secret MONGODB_URI_TEST]
   UPSTASH_REDIS_URL = [from GitHub Secret UPSTASH_REDIS_URL]
   UPSTASH_REDIS_TOKEN = [from GitHub Secret UPSTASH_REDIS_TOKEN]
   GROQ_API_KEY = [from GitHub Secret GROQ_API_KEY]
   ALCHEMY_RPC_URL = [from GitHub Secret ALCHEMY_RPC_URL]
   WALLET_PRIVATE_KEY = [from GitHub Secret WALLET_PRIVATE_KEY]
   NODE_ENV = production
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete (takes ~2-5 minutes)
   - You'll get a URL like: `https://territoryrun-api.onrender.com`

6. **Copy Service ID:**
   - After deployment, go to service dashboard
   - URL will be: `https://dashboard.render.com/web/srv-XXXXX`
   - **Copy the `srv-XXXXX` part** → Save as `RENDER_SERVICE_ID_PROD`

---

## STEP 2️⃣: Create Staging Web Service (Optional but Recommended)

Repeat STEP 1 but:
   - **Name:** `territoryrun-api-staging`
   - **Branch:** `test`
   - Same environment variables
   - **Copy Service ID** → Save as `RENDER_SERVICE_ID_STAGING`

---

## STEP 3️⃣: Get Deploy Keys

Deploy keys allow GitHub Actions to trigger deployments automatically.

1. **For Production Service:**
   - Go to your production service dashboard
   - Click "Settings" (gear icon)
   - Find "Deploy Hook" section
   - Click "Create Deploy Hook"
   - A URL will appear like: 
     ```
     https://api.render.com/deploy/srv-xxxxx?key=DEPLOY_KEY_HERE
     ```
   - **Copy only the `DEPLOY_KEY_HERE` part** (after `?key=`)
   - Save as `RENDER_DEPLOY_KEY_PROD`

2. **For Staging Service:**
   - Repeat the same for staging service
   - Save as `RENDER_DEPLOY_KEY_STAGING`

---

## STEP 4️⃣: Add Render Secrets to GitHub

Go to: https://github.com/tejakarthik657/runnify/settings/secrets/actions

Click "New repository secret" for each:

### Secret 12: RENDER_SERVICE_ID_PROD
```
srv-xxxxx  (from STEP 1️⃣ step 6)
```

### Secret 13: RENDER_SERVICE_ID_STAGING
```
srv-xxxxx  (from STEP 2️⃣)
```

### Secret 14: RENDER_DEPLOY_KEY_PROD
```
DEPLOY_KEY_HERE  (from STEP 3️⃣.1)
```

### Secret 15: RENDER_DEPLOY_KEY_STAGING
```
DEPLOY_KEY_HERE  (from STEP 3️⃣.2)
```

---

## STEP 5️⃣: Update Frontend Environment Variables

Once you have your Render backend URL (from STEP 1️⃣):

1. **Go to Vercel Dashboard**
2. **Select your project:** `runnify-ktk`
3. **Settings** → **Environment Variables**
4. **Update or Add:**
   - `NEXT_PUBLIC_API_URL` = `https://territoryrun-api.onrender.com` (your actual Render URL)
   - `NEXT_PUBLIC_SOCKET_URL` = `https://territoryrun-api.onrender.com` (same)
5. **Save**
6. **Redeploy** in Vercel (it will auto-redeploy on next push)

---

## STEP 6️⃣: Verify Deployment

After all secrets are added and Render services are running:

1. **Check Backend is Live:**
   ```
   curl https://territoryrun-api.onrender.com/health
   ```
   (Should return a response, not 404)

2. **Check GitHub Actions:**
   - Go to: https://github.com/tejakarthik657/runnify/actions
   - Check `backend-ci.yml` workflow
   - Should show backend deployment step (green ✅)

3. **Test Frontend + Backend:**
   - Visit: https://runnify-ktk.vercel.app (or your custom domain)
   - Try to log in / create account
   - Verify data loads from backend

---

## 🎯 Summary

After completing these steps, you'll have:
- ✅ Frontend live on Vercel
- ✅ Backend live on Render
- ✅ Both staging and production environments
- ✅ Automatic deployment on every push to `main` and `test`
- ✅ Full CI/CD pipeline working

Your deployment model:`
- **Push to `test` branch** → Auto-deploys to staging (Vercel + Render staging)
- **Push to `main` branch** → Auto-deploys to production (Vercel + Render production)
- **Hotfix commits** → Can deploy directly to production

**Can you make changes after deployment?** ✅ YES! Just push new code to your branch and CI/CD handles the rest.

---

## ⚠️ Troubleshooting

**Backend won't deploy:**
- Check environment variables are set in Render
- Verify `backend/package.json` exists
- Check logs in Render dashboard

**Frontend can't reach backend:**
- Verify `NEXT_PUBLIC_API_URL` is set in Vercel
- Check backend URL is correct (no extra slashes)
- Test backend URL directly in browser

**GitHub Actions failing:**
- Verify all 4 Render secrets are added correctly
- Check service IDs match your actual Render services
- Redeploy button should work manually in Render dashboard

---

Let me know when you've completed the Render setup and I'll verify everything is connected! 🚀
