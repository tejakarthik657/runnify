# 🔐 GitHub Secrets - Copy & Paste

**Go to:** https://github.com/tejakarthik657/runnify/settings/secrets/actions

Click **"New repository secret"** for each secret below:

---

## ✅ CRITICAL SECRETS (Add These First - 8 Total)

### Secret 1: MONGODB_URI_TEST
```
mongodb+srv://tejakarthik5505_db_user:c0fwNFeIMxkDnvbb@cluster0.qxxncvx.mongodb.net/territory-test?appName=Cluster0
```

### Secret 2: UPSTASH_REDIS_URL
```
https://leading-llama-39169.upstash.io
```

### Secret 3: UPSTASH_REDIS_TOKEN
```
AZkBAAIncDJjY2ExYTA1NGE2OGI0NzJlYTljMDNjNTdjZTFjNGQyNnAyMzkxNjk
```

### Secret 4: GROQ_API_KEY
```
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
```

### Secret 5: ALCHEMY_RPC_URL
```
https://eth-sepolia.g.alchemy.com/v2/uKiUksazucZlmLgUAI1Qj
```

### Secret 6: WALLET_PRIVATE_KEY
```
042467a131e561566a968f67028454028f61c6bddf4f3278fcf9901338b5b416
```

### Secret 7: NEXT_PUBLIC_API_URL
```
http://localhost:4000
```
*Note: This is temporary. After setting up Render, replace with your real backend URL*

### Secret 8: NEXT_PUBLIC_SOCKET_URL
```
http://localhost:4000
```
*Note: Same as above - will be your Render backend URL*

---

## 🚀 DEPLOYMENT SECRETS (Add Later - 7 Total)

These are needed for automatic deployment to Vercel and Render.
You can skip these for now if you want to just test the CI/CD pipeline first.

### Vercel Secrets (Frontend Deployment)

#### Secret 9: VERCEL_TOKEN
**Where to get:**
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions CI/CD"
4. Copy the token value

#### Secret 10: VERCEL_ORG_ID
**Where to get:**
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Click Settings (in left sidebar)
3. Look for "Team ID" or "Organization ID"
4. Copy the value (starts with "team_" or similar)

#### Secret 11: VERCEL_PROJECT_ID
**Where to get:**
1. Create a new project on Vercel by importing your GitHub repo
2. Select the `frontend` folder as the root directory
3. After project is created, go to: Project Settings → General
4. Copy the "Project ID" value

---

### Render Secrets (Backend Deployment)

#### Secret 12: RENDER_SERVICE_ID_PROD
**Where to get:**
1. Sign up at: https://render.com/signup
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Select branch: `main`
5. Root Directory: `backend`
6. Build Command: `npm install`
7. Start Command: `node api-gateway/index.js`
8. After created, the URL will be: `https://dashboard.render.com/web/srv-XXXXX`
9. Copy the `srv-XXXXX` part (Service ID)

#### Secret 13: RENDER_SERVICE_ID_STAGING
**Same as above, but:**
- Name it: `territoryrun-api-staging`
- Select branch: `test`
- Copy the Service ID

#### Secret 14: RENDER_DEPLOY_KEY_PROD
**Where to get:**
1. In your Render service (production), go to: Settings → Deploy Hook
2. Copy the entire URL, it looks like: `https://api.render.com/deploy/srv-xxxxx?key=DEPLOY_KEY_HERE`
3. Extract only the `DEPLOY_KEY_HERE` part (after `?key=`)

#### Secret 15: RENDER_DEPLOY_KEY_STAGING
**Same as above, but for your staging service**

---

## ✅ Quick Start Checklist

**For testing workflows only (without deployment):**
- [ ] Add secrets 1-8 (the critical ones above)
- [ ] Re-run the failed GitHub Actions workflow
- [ ] Verify tests pass ✅

**For full deployment:**
- [ ] Add all 15 secrets
- [ ] Push code again or re-run workflow
- [ ] Verify deployment to Vercel and Render ✅

---

## 🎯 Next Steps After Adding Secrets

### Option A: Just Test First (Recommended)
1. Add secrets 1-8 above
2. Go back to GitHub Actions
3. Click "Re-run jobs" button
4. Watch the workflow turn green ✅

### Option B: Full Deployment
1. Add all 15 secrets
2. Set up Vercel project
3. Set up Render services (production + staging)
4. Re-run the workflow
5. Your app goes live! 🚀

---

## 💡 Pro Tip

Start with **Option A** to verify your tests work, then add deployment secrets later when you're ready to go live.
