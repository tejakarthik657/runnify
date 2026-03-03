# 🚀 Enhanced CI/CD for Continuous Deployment
> Staging → Production → Hotfixes with Zero-Downtime Updates

---

## 📊 Your New Deployment Flow

```
test branch (Staging)          main branch (Production)
      ↓                               ↓
   Test all changes            Test all changes
      ↓                               ↓
Deploy to staging API          Deploy to production API
(territoryrun-api-staging)      (territoryrun-api-prod)
      ↓                               ↓
Test in staging env            USERS USING v1
(with real data)                    ↓
      ↓                         Users see updates
All looks good?                (new features/fixes)
      ↓                             ↓
Merge to main                   v1.1 → v1.2 → v2.0
      ↓
Auto-deploy to production
```

---

## ✅ Your `.env` File Status

```
✅ MONGODB_URI — Ready
✅ JWT_SECRET — Set (update to strong value)
✅ JWT_REFRESH_SECRET — Set (update to strong value)
✅ UPSTASH_REDIS_URL — Ready
✅ UPSTASH_REDIS_TOKEN — Ready
✅ GROQ_API_KEY — Ready
✅ SUPABASE_URL — Ready
✅ SUPABASE_ANON_KEY — Ready
✅ SUPABASE_SERVICE_ROLE_KEY — Ready
✅ ALCHEMY_RPC_URL — Ready
✅ WALLET_PRIVATE_KEY — Ready
✅ GOOGLE_CLIENT_ID — Set (update with real value)
✅ GOOGLE_CLIENT_SECRET — Set (update with real value)
```

**⚠️ TODO:** Replace placeholder values:
- `JWT_SECRET` (should be 64+ chars, use: https://generate-secret.vercel.app/64)
- `JWT_REFRESH_SECRET` (64+ chars)
- `GOOGLE_CLIENT_ID` (get from https://console.cloud.google.com)
- `GOOGLE_CLIENT_SECRET` (get from same place)

---

## 🔄 NEW CI/CD Workflow (What Gets Built)

### Branch → Environment Mapping

| Branch | Deploys To | Auto-Deploy? | Purpose |
|--------|-----------|--------|---------|
| `test` | Staging API | ✅ Yes | Test new features, v0.x |
| `main` | Production API | ✅ Yes | Users see updates, v1.x+ |
| `feature/*` | Preview URL | ✅ Yes | Show to stakeholders |
| `hotfix/*` | Production (fast-track) | ❌ Manual | Emergency fixes only |

---

## 👉 How to Use This for v1, v2, v3...

### Scenario 1: Deploy v1 (Initial Launch)

```bash
# Your code is currently in test branch
# 1. Make sure all tests pass
cd backend && npm test

# 2. Merge test → main for production
git checkout main
git pull origin main
git merge test
git push origin main

# 3. GitHub Actions automatically:
#    • Runs all tests
#    • Builds frontend and backend
#    • Deploys to Vercel + Render
#    • ✅ v1 is LIVE

# 4. You stay on test branch for next changes
git checkout test
```

---

### Scenario 2: Deploy v1.1 (Bug Fixes While Users Active)

```bash
# Users are currently on v1.0
# You found bugs during testing

# 1. On test branch, make code changes
git checkout test
# ... fix bugs in code ...
git add .
git commit -m "v1.1: Fix chat message bug"

# 2. Run tests to verify fix works
npm test

# 3. When ready to push to live users
git rebase origin/main
git push origin test

# 4. Create Pull Request: test → main
# This triggers staging tests automatically
# Review the PR, then merge

# 5. GitHub Actions auto-deploys to production
# ✅ v1.1 is now LIVE for all users

# 6. Continue working on test branch for v1.2
```

---

### Scenario 3: Deploy v2.0 (Major Feature)

```bash
# Same workflow as v1.1, but bigger changes

# 1. On test branch, add new feature
git checkout test
# ... implement new leaderboard ranking feature ...
git add .
git commit -m "v2.0: Add ranking milestone achievements"

# 2. Test thoroughly (test branch auto-deploys to staging)
# Go to staging: territoryrun-staging.vercel.app
# Verify new feature works with real data

# 3. When confident, merge to main
git rebase origin/main
git push origin test
# Create PR and merge

# 4. Production auto-deploys
# ✅ v2.0 is now LIVE for all users
```

---

### Scenario 4: Deploy Hotfix (Production Emergency)

```bash
# v1.5 is live but critical bug found!
# Users can't login

# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/login-critical

# 2. Fix the bug
# ... fix authentication logic ...
git add .
git commit -m "hotfix: Fix JWT validation race condition"

# 3. Test locally
npm test

# 4. Push hotfix branch
git push origin hotfix/login-critical

# 5. Create PR: hotfix/login-critical → main
# GitHub Actions runs immediate tests
# Merge when tests pass

# 6. Production auto-deploys (no waiting for staging)
# ✅ Users can login again!

# 7. Merge same hotfix into test branch
git checkout test
git merge hotfix/login-critical
git push origin test
```

---

## 🎯 CI/CD Rules Built-In

✅ **Automatic:** No manual deploy commands needed
✅ **Staged:** Test branch gets staging deploy first
✅ **Safe:** Tests must pass before any deploy
✅ **Fast:** Hotfixes go directly to production
✅ **Rollback:** Keep previous version available on Render dashboard

---

## 📋 Git Workflow Summary

```yaml
Your Daily Workflow:
  1. Work on: test branch
  2. Push to: origin test
  3. Auto-deploys to: Staging (territoryrun-staging)
  4. Test everything works
  5. Create PR: test → main
  6. Merge PR
  7. Auto-deploys to: Production (territoryrun-api-prod)
  8. ✅ Users see your changes
  9. Continue on test branch for next version

Emergency Hotfix:
  1. Create: hotfix/name branch
  2. Fix bug
  3. Test locally: npm test
  4. Create PR: hotfix → main
  5. Merge
  6. Auto-deploys immediately
  7. Merge hotfix back to test
```

---

## 🔥 CI/CD Features Explained

### 1. Frontend Deploy Trigger
```yaml
When: PR to main or push to main
What: Builds Next.js, runs tests, deploys to Vercel
Time: ~3 minutes
Result: territoryrun.vercel.app (or preview URL)
```

### 2. Backend Deploy Trigger
```yaml
When: PR to main or push to main
What: Runs npm test, npm run test:integration, deploys to Render
Time: ~5 minutes
Result: api.territoryrun.onrender.com
```

### 3. Staging Deploy (test branch only)
```yaml
When: Push to test branch
What: Same tests, deploys to staging
Time: ~5 minutes
Result: territoryrun-api-staging.onrender.com (for internal testing)
```

### 4. Health Check After Deploy
```yaml
When: After deployment completes
What: Verifies /health endpoint responds
Result: Auto-rollback if health check fails
```

---

## 🔄 How Your Versions Update

### v1.0 → v1.1 → v1.2 → v2.0 Flow

```
TIME    test branch              main branch              USERS SEE
────────────────────────────────────────────────────────────────────
00:00   v1.0 code                v1.0 code               v1.0 ✓
        (working on fixes)

01:00   Fix bug #1               v1.0 code               v1.0 ✓
        Commit to test
        (auto → staging)

02:00   Verified in staging      v1.0 code               v1.0 ✓

02:15   Create PR                v1.0 code               v1.0 ✓
        PR: test → main

02:20   Test & Merge             v1.1 code deployed      v1.0 ✓
                                 (deploying...)

02:25                            v1.1 live! ✓            v1.1 ✓
                                                         (updated!)

03:00   Feature work for v2      v1.1 live               v1.1 ✓

04:00   v2 feature complete      v1.1 live               v1.1 ✓
        Create PR

04:30   Test & Merge             v2.0 deployed           v1.1 ✓

04:35                            v2.0 live! ✓            v2.0 ✓
                                                         (updated!)
```

---

## ✅ What You DON'T Need to Do

❌ Manual git pull/push deployment
❌ Manual server restarts
❌ FTP uploads
❌ SSH into servers
❌ Run `vercel deploy` in terminal
❌ Run `render deploy` in terminal
❌ Copy env vars manually

**It's all automatic! Just `git push` and relax.** 🎉

---

## 📊 Deployment Status Pages

After merging, check status here:

| Platform | URL | What to Look For |
|----------|-----|------------------|
| Vercel | https://vercel.com/dashboard | ✅ "Ready" or 🔵 "Building" |
| Render | https://dashboard.render.com | ✅ "Live" or 🟡 "Deploying" |
| GitHub | Your repo → Actions tab | ✅ Green checkmarks on workflow |

---

## 🆘 If a Deploy Fails

### Frontend Build Failed
```
1. Check: GitHub Actions → frontend-ci.yml logs
2. Common: npm run build failed (TypeScript error)
3. Fix: Correct the error in code, push again
4. Auto-retry: GitHub automatically re-runs
```

### Backend Tests Failed
```
1. Check: GitHub Actions → backend-ci.yml logs
2. Common: npm test failed
3. Fix: Make sure all tests pass locally first
4. Auto-retry: Push again after fix
```

### Database Connection Failed
```
1. Check: MongoDB Atlas cluster is online
2. Check: Network IP is whitelisted (0.0.0.0/0)
3. Check: Connection string in Render env vars
4. Fix: Update env vars, re-deploy from Render dashboard
```

---

## 🎯 Your Next Steps

### TODAY (Deployment Day):

1. **Update `.env` values:**
   ```bash
   JWT_SECRET: [Generate 64 chars: https://generate-secret.vercel.app/64]
   JWT_REFRESH_SECRET: [Generate another 64 chars]
   GOOGLE_CLIENT_ID: [From Google Cloud Console]
   GOOGLE_CLIENT_SECRET: [From Google Cloud Console]
   ```

2. **Ensure all tests pass on test branch:**
   ```bash
   git checkout test
   npm test
   npm run test:integration
   ```

3. **Push test branch (triggers staging deploy):**
   ```bash
   git push origin test
   # Auto-deploys to staging
   ```

4. **Test in staging environment:**
   - Frontend: https://territoryrun-staging.vercel.app
   - Backend: https://territoryrun-api-staging.onrender.com/health
   - Create account, test all features

5. **Merge to main (triggers production deploy):**
   ```bash
   git checkout main
   git merge test
   git push origin main
   # Auto-deploys to production
   ```

6. **Verify production is live:**
   - Frontend: https://territoryrun.vercel.app
   - Backend: https://api.territoryrun.onrender.com/health

### AFTER DEPLOYMENT (Bug Fixes & Features):

**For each bug fix or feature:**
```bash
git checkout test                          # Work on test branch
# ... make code changes ...
git add .
git commit -m "v1.1: Fix [description]"
git push origin test

# When ready for production
git checkout main
git merge test
git push origin main
# Auto-deploys! ✅
```

---

## 📈 Monitoring Your Versions

### See which version is deployed:

```bash
# Check production version
curl https://api.territoryrun.onrender.com/health
# Returns: {"status":"ok","version":"1.x.x"}

# Check staging version
curl https://api.territoryrun-api-staging.onrender.com/health
```

### Monitor errors in real-time:
- Render: Dashboard → Logs (search for ERROR)
- Vercel: Analytics tab

---

## 🎓 Key Concepts

**Staging:** Test environment where you verify changes before users see them
**Production:** Live environment where real users access the app
**CI/CD:** Automatic testing and deployment on every git push
**Hotfix:** Emergency fix deployed directly to production (bypasses staging)
**Rollback:** Revert to previous version if something breaks

---

## Final Checklist

- [ ] `.env` file has real production keys
- [ ] JWT_SECRET and JWT_REFRESH_SECRET are strong (64+ chars)
- [ ] All tests pass locally: `npm test`
- [ ] test branch pushed to GitHub
- [ ] test branch auto-deploys to staging (verify with curl)
- [ ] Create PR: test → main
- [ ] All tests pass in GitHub Actions
- [ ] Merge PR
- [ ] main branch auto-deploys to production
- [ ] Production API responds: `curl https://api.territoryrun.onrender.com/health`
- [ ] Frontend loads at territoryrun.vercel.app
- [ ] Can create account and login

---

**Ready for continuous deployment! 🚀**

For detailed step-by-step, see [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

