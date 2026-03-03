# GitHub Secrets Configuration for CI/CD

To enable the GitHub Actions CI/CD pipelines to work properly, you need to add the following secrets to your GitHub repository.

## ✅ How to Add GitHub Secrets

1. Go to your repository on GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret" for each variable below
4. Add Name and Value exactly as shown
5. Click "Add secret"

---

## 🔐 Required Secrets (Add All of These)

### Backend Build & Test Secrets

| Secret Name | Value | Where to Get |
|---|---|---|
| `MONGODB_URI_TEST` | `mongodb+srv://test_user:password@cluster-test.mongodb.net/territory-run-test` | MongoDB Atlas → Create test cluster |
| `UPSTASH_REDIS_URL` | `https://xxx.upstash.io` | Upstash Dashboard → Database Details |
| `UPSTASH_REDIS_TOKEN` | `AZkBAAInc...` | Upstash Dashboard → Token |
| `GROQ_API_KEY` | `gsk_xxxxxxxxxxxxx` | Groq Console → API Keys |

### Frontend Deployment Secrets (Vercel)

| Secret Name | Value | Where to Get |
|---|---|---|
| `VERCEL_TOKEN` | Personal API token | https://vercel.com/account/tokens → Create Token |
| `VERCEL_ORG_ID` | Organization ID | Vercel Dashboard → Settings → Organization ID |
| `VERCEL_PROJECT_ID` | Project ID | Vercel Dashboard → Project Settings → Project ID |

### Backend Deployment Secrets (Render)

| Secret Name | Value | Where to Get |
|---|---|---|
| `RENDER_SERVICE_ID` | Service ID from URL | Render Dashboard → Service → URL: srv-xxxxx |
| `RENDER_DEPLOY_KEY` | Deploy hook key | Render Dashboard → Service → Settings → Deploy Hook |

---

## 🚀 How to Get Each Secret

### MongoDB Test Cluster

```
1. MongoDB Atlas → Create NEW cluster for testing (separate from production)
2. Cluster name: "cluster-test"
3. Create database user: "test_user"
4. Get connection string
5. Copy to GitHub Secrets as MONGODB_URI_TEST
```

### Vercel Token

```
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "github-ci"
4. Scope: Full Account
5. Copy token (long string starting with 'vercel_')
6. Add to GitHub Secrets as VERCEL_TOKEN
```

### Vercel IDs

```
1. Go to https://vercel.com/dashboard
2. Click on your project
3. Settings → URLs or Advanced
4. Organization ID: Found in Settings → General
5. Project ID: Found in Settings → General under "Project ID"
```

### Render Service ID & Deploy Key

```
1. Go to Render Dashboard
2. Select your "territoryrun-api-prod" service
3. Copy Service ID from URL (srv-xxxxx)
4. Go to Service → Settings → Deploy Hook
5. Copy the Deploy Key (not the full URL, just the key part)
```

---

## ✅ Verify It's Working

After adding all secrets:

```
1. Make a small change to backend code
2. Push to a feature branch: git push origin feature/test
3. Create a Pull Request to main
4. GitHub Actions should automatically:
   • Run npm ci
   • Run npm test
   • Run npm run test:integration
5. Check Actions tab to see logs
```

---

## 🔄 Auto-Deployment on Main Push

After secrets are configured:

```
1. Push to main branch
2. GitHub Actions runs:
   • Backend CI (build + test)
   • If passing → Deploy to Vercel
   • If passing → Deploy to Render
```

**NO MANUAL DEPLOY NEEDED after this point!**

---

## 🆘 Troubleshooting

| Error | Reason | Fix |
|-------|--------|-----|
| "Secret not found" | Typo in secret name | Verify exact name in workflow YAML |
| "Deployment failed" | Wrong token/ID | Test token/ID in Vercel/Render first |
| "MongoDB connection error" | Wrong test URI | Verify test cluster exists and IPs are whitelisted |
| "Rate limit exceeded" | Too many deployments | Wait a few minutes before retrying |

---

Last Updated: March 3, 2026
