# ✅ GitHub Secrets Setup (Enhanced CI/CD)

**Add these secrets to your GitHub repository to enable automatic staging + production deployments.**

---

## 📍 Where to Add Secrets

1. Go to: **GitHub Repository → Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Enter **Name** and **Value** exactly as shown below
4. Click **"Add secret"**

---

## 🔐 Required Secrets (11 Total)

### Group 1: Testing Credentials (for CI)

| Secret Name | Value | Where to Get |
|---|---|---|
| `MONGODB_URI_TEST` | `mongodb+srv://test_user:password@cluster-test.mongodb.net/territory-run-test` | MongoDB Atlas → separate **test cluster** |
| `UPSTASH_REDIS_URL` | `https://xxx.upstash.io` | Upstash Console → Your database |
| `UPSTASH_REDIS_TOKEN` | `AZkBAAInc...` | Upstash Console → Token field |
| `GROQ_API_KEY` | `gsk_xxxxx...` | Console.groq.com → API Keys |
| `ALCHEMY_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/xxxxx` | Alchemy Dashboard → Ethereum Sepolia app |
| `WALLET_PRIVATE_KEY` | `042467a131e561...` | MetaMask → Account Details → Export Private Key |

### Group 2: Frontend Deployment (Vercel)

| Secret Name | Value | Where to Get |
|---|---|---|
| `VERCEL_TOKEN` | Personal API token | https://vercel.com/account/tokens → Create Token |
| `VERCEL_ORG_ID` | Organization ID | Vercel Dashboard → Settings → Organization ID |
| `VERCEL_PROJECT_ID` | Project ID | Vercel Dashboard → Project Settings → Project ID |
| `NEXT_PUBLIC_API_URL` | `https://api.territoryrun.onrender.com` | (or staging URL for test branch) |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.territoryrun.onrender.com` | (same as above) |

### Group 3: Backend Deployment (Render) - PRODUCTION

| Secret Name | Value | Where to Get |
|---|---|---|
| `RENDER_SERVICE_ID_PROD` | `srv-xxxxx` | Render Dashboard → territoryrun-api-prod → URL |
| `RENDER_DEPLOY_KEY_PROD` | Deploy key | Render → Service → Settings → Deploy Hook (key part only) |

### Group 4: Backend Deployment (Render) - STAGING

| Secret Name | Value | Where to Get |
|---|---|---|
| `RENDER_SERVICE_ID_STAGING` | `srv-xxxxx` | Render Dashboard → territoryrun-api-staging → URL |
| `RENDER_DEPLOY_KEY_STAGING` | Deploy key | Render → Service → Settings → Deploy Hook |

---

## 📚 Step-by-Step: Get Each Secret

### MONGODB_URI_TEST
```
1. MongoDB Atlas → Create NEW cluster named "cluster-test"
2. Cluster → Create Database User
   • Username: test_user
   • Password: [Strong password]
3. Get connection string: Database → Connect → Drivers
4. Replace <username> and <password> in connection string
5. Copy to GitHub as MONGODB_URI_TEST
```

### UPSTASH_REDIS_URL & UPSTASH_REDIS_TOKEN
```
1. Upstash Console (console.upstash.com)
2. Select your "territory-run" Redis database
3. Click "Details" tab
4. Copy URL → UPSTASH_REDIS_URL
5. Copy Token → UPSTASH_REDIS_TOKEN
```

### GROQ_API_KEY
```
1. Go to https://console.groq.com
2. Click API Keys
3. Create New API Key
4. Copy the key value
5. Add to GitHub as GROQ_API_KEY
```

### ALCHEMY_RPC_URL
```
1. Go to https://dashboard.alchemy.com
2. Apps → Create New App → Ethereum Sepolia
3. Copy the API Key
4. Create full URL: https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
5. Add to GitHub as ALCHEMY_RPC_URL
```

### WALLET_PRIVATE_KEY
```
1. Open MetaMask
2. Click Account Icon → Account Details
3. Click "Export Private Key"
4. Enter password, copy the key
5. Add to GitHub as WALLET_PRIVATE_KEY
```

### VERCEL_TOKEN
```
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "github-actions"
4. Scope: Full Account
5. Copy token (long string starting with "vercel_")
6. Add to GitHub as VERCEL_TOKEN
```

### VERCEL_ORG_ID & VERCEL_PROJECT_ID
```
1. Go to https://vercel.com/dashboard
2. Project Settings → General
3. Copy "Project ID" → VERCEL_PROJECT_ID
4. Go to Settings → Organization Settings
5. Copy Organization ID → VERCEL_ORG_ID
```

### RENDER_SERVICE_ID_PROD & RENDER_SERVICE_ID_STAGING
```
1. Render Dashboard → Select "territoryrun-api-prod" service
2. Look at URL in browser: dashboard.render.com/srv-XXXXX
3. The "XXXXX" part is the Service ID
4. Copy → RENDER_SERVICE_ID_PROD
5. Repeat for "territoryrun-api-staging" → RENDER_SERVICE_ID_STAGING
```

### RENDER_DEPLOY_KEY_PROD & RENDER_DEPLOY_KEY_STAGING
```
1. Render Dashboard → territoryrun-api-prod → Settings
2. Look for "Deploy Hook" section
3. Copy the URL: https://api.render.com/deploy/srv-XXXXX?key=YYYYYYY
4. Extract just the "YYYYYYY" part (the key)
5. Add to GitHub as RENDER_DEPLOY_KEY_PROD
6. Repeat for staging → RENDER_DEPLOY_KEY_STAGING
```

### NEXT_PUBLIC_API_URL & NEXT_PUBLIC_SOCKET_URL
```
Production version:
  https://api.territoryrun.onrender.com

Staging version (for test branch):
  https://api.territoryrun-api-staging.onrender.com

For now, both can point to production since staging will be created automatically.
```

---

## ✅ Verification Checklist

After adding all secrets, verify:

```bash
# 1. Make a small code change
git checkout test
echo "// test" >> backend/api-gateway/index.js

# 2. Commit and push
git add backend/api-gateway/index.js
git commit -m "test: trigger CI"
git push origin test

# 3. Watch GitHub Actions
# Go to: GitHub repo → Actions
# Should see "Backend CI/CD (All Branches)" running tests

# 4. Check logs
# Click on the workflow → backend-ci.yml
# Should see:
# ✅ Install dependencies
# ✅ Run unit tests
# ✅ Run integration tests
# 🟡 Lint check (warnings OK)

# If all pass, GitHub Actions are working!
```

---

## 🚦 What Each Workflow Does

### Frontend CI/CD Workflow
```
Trigger: Push to main, test, or develop branch with frontend/* changes
Steps:
  1. Install npm dependencies
  2. Build Next.js app
  3. Run linter
  4. Deploy to Vercel (main → production, test → staging)
  5. Verify deployment successful
```

### Backend CI/CD Workflow
```
Trigger: Push to main, test, or develop branch with backend/* changes
Steps:
  1. Install npm dependencies
  2. Run unit tests (npm test)
  3. Run integration tests
  4. Run linter
  5. Deploy to Render (main → production, test → staging)
  6. Verify health check passes
```

### Hotfix Workflow
```
Trigger: Push to hotfix/* branch
Steps:
  1. Run critical tests only (auth, blockchain, anticheat)
  2. Deploy directly to PRODUCTION (bypass staging)
  3. Verify health check
  4. Alert (if Slack webhook configured)
```

---

## 📊 Deployment Matrix

After all secrets are added, here's what happens:

| Branch Push | Frontend | Backend | Frontend Target | Backend Target |
|---|---|---|---|---|
| `main` | ✅ Deploy | ✅ Deploy | Vercel Production | Render Production |
| `test` | ✅ Deploy | ✅ Deploy | Vercel Staging | Render Staging |
| `develop` | ✅ Build | ✅ Build | Preview only | No auto-deploy |
| `hotfix/*` | ✅ Deploy | ✅ Deploy | Vercel Production | Render Production |

---

## 🔄 Environment Variables for CI

These are automatically set during GitHub Actions runs:

| Env Var | CI Testing Value | Production Vercel Value |
|---------|---|---|
| `JWT_SECRET` | `ci_test_secret_github_actions_v1` | From Render Environment |
| `NODE_ENV` | `test` | `production` |
| `MONGODB_URI` | `${{ secrets.MONGODB_URI_TEST }}` | From Render Environment |

---

## 🆘 Troubleshooting

### Secret Not Found Error
```
Error: "Secret not found"
Fix: Check exact spelling of secret name (case-sensitive)
     Verify secret is in: Settings → Secrets and variables → Actions
```

### Deployment Failed
```
Check GitHub Actions logs:
  1. Go to repo → Actions tab
  2. Click failed workflow
  3. Expand failed step
  4. Read error message
  5. Common causes:
     - Test failed: Fix code and re-push
     - Render unavailable: Wait and retry
     - Health check timeout: Check backend logs
```

### Staging Deploy Not Working
```
Ensure you have:
  1. Created Render staging service (territoryrun-api-staging)
  2. Added RENDER_SERVICE_ID_STAGING secret
  3. Added RENDER_DEPLOY_KEY_STAGING secret
  4. Created Vercel staging project
```

---

## 🎯 After Setup Complete

Once all secrets are added and you push to main:

```bash
# 1. Push your code
git push origin main

# 2. Watch automatic deployment
# GitHub → Actions → See workflow running

# 3. Check deployment status
# Frontend: https://territoryrun.vercel.app
# Backend: curl https://api.territoryrun.onrender.com/health

# 4. That's it! App is updated automatically 🚀
```

---

## 📝 Secret Names Reference (Copy-Paste)

Use these exact names when creating secrets:

```
MONGODB_URI_TEST
UPSTASH_REDIS_URL
UPSTASH_REDIS_TOKEN
GROQ_API_KEY
ALCHEMY_RPC_URL
WALLET_PRIVATE_KEY

VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SOCKET_URL

RENDER_SERVICE_ID_PROD
RENDER_DEPLOY_KEY_PROD
RENDER_SERVICE_ID_STAGING
RENDER_DEPLOY_KEY_STAGING
```

---

**All set! Your CI/CD pipeline is ready.** ✅

Once secrets are added, just:
```bash
git push origin main  # Auto-deploys to production
git push origin test  # Auto-deploys to staging
```

No more manual deployments needed! 🎉

Last Updated: March 3, 2026
