# OAuth Configuration Fix Checklist

## ⚠️ CRITICAL ISSUE: Mismatched Google OAuth Credentials

### Current Situation:

- **Railway Backend**: `323904879974-0moegra5un79f16do8p7r9rk4jih1f99.apps.googleusercontent.com`
- **Vercel Frontend**: `750207794294-kp15690funlm5stial0dqq191rrtdujo.apps.googleusercontent.com`

**This mismatch is causing authentication failures!**

## Steps to Fix:

### 1. Choose ONE Google OAuth App

Decide which OAuth app to use (Railway's or Vercel's) and update both environments to use the same credentials.

### 2. Update Google Console

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and ensure your OAuth app has these redirect URIs:

**For Production:**

- `https://dart.dreamshot.io/api/auth/callback/google`
- `https://dart-frontend.vercel.app/api/auth/callback/google` (if using separate domain)

**For Development:**

- `http://localhost:3000/api/auth/callback/google`

### 3. Update Environment Variables

#### Option A: Use Railway's OAuth App

Update Vercel environment variables:

```
GOOGLE_CLIENT_ID=323904879974-0moegra5un79f16do8p7r9rk4jih1f99.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

#### Option B: Use Vercel's OAuth App

Update Railway environment variables:

```
GOOGLE_CLIENT_ID=750207794294-kp15690funlm5stial0dqq191rrtdujo.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 4. Verify NEXTAUTH_URL

Ensure Vercel has the correct NEXTAUTH_URL:

- Should be: `https://dart.dreamshot.io` (your main domain)
- NOT: `https://dart-frontend.vercel.app`

### 5. Redeploy Both Services

After updating environment variables:

1. Redeploy backend: `cd backend && railway up`
2. Redeploy frontend: `cd frontend && vercel --prod`

## Railway Container Fix

The backend is getting killed by Railway. This could be due to:

1. Memory limits
2. Failed health checks
3. Incorrect configuration

### Check Railway Dashboard:

1. Go to Railway dashboard
2. Check the service logs for more details
3. Look for memory usage spikes
4. Verify health check settings

### Possible Solutions:

1. Increase memory limits in Railway
2. Add `nixpacks.toml` file to backend:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[start]
cmd = "npm start"
```

## Testing After Fixes

1. Clear browser cookies/session
2. Try logging in with Google OAuth
3. Check browser console for access token
4. Verify API calls include Authorization header

## Debug Endpoints

- Backend health: https://dart-backend-production.up.railway.app/health
- Frontend debug: https://dart.dreamshot.io/api/debug-env
