# 🔄 Live Deployment Strategy: v1 → v1.1 → v1.2 → v2.0

> **Goal:** Deploy new features and bug fixes while users are actively using the app (ZERO DOWNTIME)

---

## 🎯 Overview

Your app will be live with this workflow:

```
PRODUCTION (Users Active)
├── v1.0 (current)
│   ├── bug found → v1.1 (hotfix, no staging)
│   ├── new feature → v1.2 (tested in staging first)
│   └── major feature → v2.0 (tested in staging first)
│
STAGING (Testing Environment)
├── Test new features
├── Verify bug fixes
├── Load test with real data
└── Then merge to production
```

---

## 📋 Branch Strategy

### Permanent Branches

| Branch | Purpose | Deploy To | Auto-Deploy? |
|--------|---------|-----------|--------|
| `main` | Production code | Live users | ✅ Yes |
| `test` | Staging/testing | Test environment | ✅ Yes |

### Temporary Branches (for collaboration)

| Branch | Purpose | Create From | Merge To |
|--------|---------|-------------|---------|
| `feature/xyz` | New features | test | test (PR) |
| `bugfix/xyz` | Bug fixes | test | test (PR) |
| `hotfix/xyz` | Critical fixes | main | main (fast) |

---

## 🚀 Scenario 1: Deploy v1.0 (Initial Launch)

Your code is currently in the `test` branch. Time to go live!

### Step 1: Final Testing
```bash
git checkout test
git pull origin test

# Run all tests locally
npm test
npm run test:integration

# Open https://territoryrun-staging.vercel.app
# Verify all features work
```

### Step 2: Merge to Main
```bash
# This triggers production deployment
git checkout main
git pull origin main
git merge test
git push origin main

# ✅ GitHub Actions automatically:
# • Runs all tests
# • Builds app
# • Deploys to Vercel (production)
# • Deploys to Render (production)
# • Verifies health check
```

### Step 3: Monitor Live Deployment
```
GitHub Actions tab:
├── frontend-ci.yml ... ✅ Tests pass
├── Build & Deploy to Vercel ... ✅ Complete
├── Verify Health ... ✅ OK
└── App LIVE at https://territoryrun.vercel.app ✅

Render Dashboard:
├── territoryrun-api-prod ... ✅ Live
└── Health: /health returns OK ✅
```

**✅ v1.0 is now LIVE for all users!**

---

## 🐛 Scenario 2: Fix Bug for v1.1 (Users Reporting Issues)

Users found a bug in GPS tracking. You need to deploy a fix ASAP.

### Step 1: Identify & Fix Bug on test branch
```bash
git checkout test
git pull origin test

# Make the fix
# Edit file: backend/run-service/socket.handlers.js
# ... fix GPS timestamp issue ...

# Test locally
npm test -- --testPathPattern="gps"

# Commit with descriptive message
git add -A
git commit -m "v1.1: Fix GPS timestamp sync bug in socket handler"

# Push to test branch (auto-deploys to staging)
git push origin test
```

### Step 2: Verify Fix in Staging
```
Wait ~2 minutes for staging deployment...

Open: https://territoryrun-staging.vercel.app
• Create test account
• Start a run
• Check GPS points are recording correctly
• Watch backend logs at Render dashboard
```

### Step 3: Merge to Production
```bash
# When confident the fix works:
git checkout main
git pull origin main
git merge test
git push origin main

# ✅ Auto-deploy to production starts
# ✅ Health check verifies it works
# ✅ v1.1 is now LIVE (all users see the fix)
```

### Step 4: Post-Deploy Monitoring
```
Monitor for next 5-10 minutes:
• Check Render logs for any new errors
• Verify /health endpoint responds
• Check Vercel Analytics for errors
• If something breaks → rollback (see below)
```

**✅ v1.1 deployed and users can now track GPS correctly!**

---

## ⚡ Scenario 3: Emergency Hotfix (Critical Bug)

Users can't login. This is critical and needs immediate fix!

### Step 1: Create Hotfix Branch
```bash
# Create from main (production)
git checkout main
git pull origin main
git checkout -b hotfix/jwt-validation-race-condition

# Make the emergency fix
# Edit file: backend/auth-service/jwt.js
# ... fix race condition in validation ...

# Test ONLY the critical path
npm test -- --testPathPattern="jwt|login|auth"

# Commit
git add -A
git commit -m "hotfix: Fix JWT validation race condition causing login failures"
```

### Step 2: Deploy Directly to Production (NO STAGING)
```bash
# Push hotfix branch
git push origin hotfix/jwt-validation-race-condition

# GitHub Actions automatically:
# ✅ Runs critical auth tests only
# ✅ Deploys to PRODUCTION (bypasses staging)
# ✅ Verifies health check
# ✅ v1.0.1 is LIVE (users can login again!)

# Check logs to confirm health check passed
```

### Step 3: Merge Hotfix Back to test Branch
```bash
# So staging env also has the fix
git checkout test
git pull origin test
git merge hotfix/jwt-validation-race-condition
git push origin test

# Continue testing other features on test branch
```

### Step 4: Clean Up
```bash
# Delete hotfix branch (no longer needed)
git branch -d hotfix/jwt-validation-race-condition
git push origin --delete hotfix/jwt-validation-race-condition
```

**✅ Critical bug fixed in <5 minutes, users unaffected!**

---

## 🎨 Scenario 4: Major Feature for v2.0 (Weeks of Development)

You're building a new leaderboard ranking system. It takes a week to develop.

### Week 1-4: Development on test Branch
```bash
git checkout test
git pull origin test

# Create feature branch for organizing work
git checkout -b feature/leaderboard-v2

# Develop over multiple commits
git add backend/leaderboard-service/ranking.js
git commit -m "feat: Add ranking calculation engine"

git add frontend/components/Leaderboard.jsx
git commit -m "feat: Add v2 leaderboard UI with rankings"

git add backend/leaderboard-service/routes.js
git commit -m "feat: Add ranking API endpoints"

# Rebase on latest test
git rebase origin/test

# Push feature branch
git push origin feature/leaderboard-v2
```

### Week 4: Create Pull Request for Review
```bash
# On GitHub: Create PR
# Title: "[FEATURE] Leaderboard v2.0 with Ranking System"
# Description: List all changes and test steps

# GitHub Actions automatically:
# ✅ Runs backend tests
# ✅ Runs frontend tests
# ✅ Builds app
# ✅ Creates preview URL

# Share preview URL with team for testing
# Preview: https://territory-run-pr-123-...-vercel.app
```

### Week 4: Team Testing & Feedback
```
Team tests the feature on the preview URL:
• Test leaderboard ranking calculation
• Verify database queries are fast
• Check UI on mobile
• Load test with 100+ users

If issues found:
  → Make fixes on feature branch
  → Push updates
  → GitHub automatically rebuilds preview
  → Team tests again

If everything looks good:
  → Merge PR to test branch
```

### Week 5: Merge to test Branch
```bash
# On GitHub: Click "Merge pull request"
# Or locally:
git checkout test
git pull origin test
git merge feature/leaderboard-v2
git push origin test

# Auto-deploys to staging for final testing
# New URL: https://territoryrun-staging.vercel.app

# Final 8 hour test window:
# • Performance test
# • User acceptance testing
# • Load testing
# • Security check
```

### Week 5: Production Deployment
```bash
# After 8 hours of staging testing:
git checkout main
git pull origin main
git merge test
git push origin main

# ✅ Auto-deploy to production
# All users see v2.0 with new leaderboard
# Old v1.0 still available via rollback if needed
```

**✅ Major feature deployed after thorough testing!**

---

## 🔄 Version Update Timeline Example

```
TIME        test branch          main branch          USERS SEE
──────────────────────────────────────────────────────────────────
March 3
10:00am     v1.0 code            v1.0 code            v1.0 ✓

11:00am     Bug fix #47 commit    v1.0 code            v1.0 ✓
            (pushed to test)

11:30am     Auto-deployed         v1.0 code            v1.0 ✓
            to staging

12:00pm     Merge PR to main                           v1.0 ✓

12:05pm                           v1.1 deploying       v1.0 ✓
                                  (auto)

12:10pm                           v1.1 health OK       v1.0 ✓
                                  (verifying)

12:15pm                           ✅ v1.1 LIVE         v1.1 ✓
                                                       (updated!)

2:00pm      Feature work for     v1.1 live            v1.1 ✓
            v1.2 (new leaderboard feature merged PR    v1.1 ✓
            endpoints)

3:00pm      Auto-deployed        v1.1 live            v1.1 ✓
            to staging

3:30pm      Testing complete      v1.1 live            v1.1 ✓
            Ready for merge

3:45pm      Merge PR to main                           v1.1 ✓

3:50pm                           v1.2 deploying       v1.1 ✓

3:55pm                           v1.2 health OK       v1.1 ✓

4:00pm                           ✅ v1.2 LIVE         v1.2 ✓
                                                       (updated!)
```

---

## 🎯 Your Git Workflow Checklist

### Daily Development
- [ ] Work on `test` branch
- [ ] Make commits regularly: `git commit -m "feat: description"`
- [ ] Push to test: `git push origin test`
- [ ] Auto-tests and staging deploy run
- [ ] Verify in staging UI: https://territoryrun-staging.vercel.app

### Before Production Deploy
- [ ] All tests pass locally: `npm test`
- [ ] No console errors in browser F12
- [ ] Verified in staging (if not a hotfix)
- [ ] Commit message is descriptive

### Production Deploy
- [ ] `git checkout main` → `git merge test` → `git push origin main`
- [ ] Watch GitHub Actions complete successfully
- [ ] Verify production API: `curl https://api.territoryrun.onrender.com/health`
- [ ] Verify frontend: https://territoryrun.vercel.app loads
- [ ] For 5-10 minutes, monitor logs for errors

### If Something Breaks
- [ ] Check Render logs immediately
- [ ] Either fix and push a hotfix quickly, OR
- [ ] Use Render rollback: Dashboard → Select previous version

---

## 🛡️ Rollback Instructions

If v1.1 deployment breaks production:

### Quick Rollback (Render)
```
1. Render Dashboard → territoryrun-api-prod
2. Deployments tab
3. Find previous commit (v1.0)
4. Click "..." → "Redeploy"
5. Wait 3-5 minutes
6. Health check passes → v1.0 restored ✅
```

### Quick Rollback (Vercel)
```
1. Vercel Dashboard → territoryrun → Deployments
2. Find last stable version
3. Click "..." → "Promote to Production"
4. Wait 30 seconds → previous version live ✅
```

### Proper Rollback (If Render Redeploy Fails)
```bash
# Revert the commit
git checkout main
git fetch origin
git revert HEAD           # Reverts last commit
git push origin main

# Auto-deploys reverted code back to production
# Takes 2-5 minutes
```

---

## 📊 Monitoring Checklist

After each production deploy, watch for 10 minutes:

**Backend (Render)**
```
☐ Render → territoryrun-api-prod → Logs
☐ Search for "ERROR" in logs
☐ No connection timeouts
☐ /health endpoint responds
☐ Database queries executing
```

**Frontend (Vercel)**
```
☐ https://territoryrun.vercel.app loads in <3 seconds
☐ F12 → Console tab: No red errors
☐ F12 → Network tab: API calls to correct endpoint
☐ Can login successfully
☐ Maps render
☐ Can start a run
```

**User Feedback**
```
☐ No complaints in Discord/Slack
☐ App performance feels normal
☐ Features work as expected
```

---

## ✅ CI/CD Automation Features

Your pipelines automatically handle:

✅ **Test on every push** - Catches bugs before deploy
✅ **Build app** - Ensures code compiles
✅ **Deploy staging** - Test in staging before production
✅ **Health check** - Verifies endpoint responds
✅ **Automatic rollback** - If health check fails
✅ **No downtime** - Users never see broken version
✅ **Version tracking** - Old versions available for rollback

---

## 🚀 Summary

**Your deployment workflow is now:**

```
1. Code on test branch (feature development)
   ↓
2. Push to test (auto-deploys to staging)
   ↓
3. Test in staging (https://territoryrun-staging.vercel.app)
   ↓
4. Merge to main (auto-deploys to production)
   ↓
5. Verify production (https://territoryrun.vercel.app)
   ↓
6. Monitor for 10 minutes
   ↓
7. Done! Users see updates. ✅
```

**No manual deployments. No server access. No downtime. 100% automated.** 🎉

---

## 📞 Emergency Contact

| Issue | Action | Time |
|-------|--------|------|
| Tests failing | Fix code, re-push to test | 5-10 min |
| Staging broken | Test on local, push hotfix | 10-20 min |
| Production down | Rollback via Render/Vercel | 5-10 min |
| Performance bad | Check Render logs | Real-time |

---

Last Updated: March 3, 2026
Ready to deploy! 🚀
