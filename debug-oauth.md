# 🔍 Google OAuth Debugging Guide

## 🚨 **Current Issue: `error=OAuthSignin`**

Based on your logs, your actual Vercel URL is:

```
dart-frontend-jfxiuyktj-dreamshot-7e44ef0e.vercel.app
```

## 🔧 **Step-by-Step Debug Process:**

### 1. **Update Environment Variables with Correct URL**

Your **NEXTAUTH_URL** should be:

```bash
NEXTAUTH_URL=https://dart-frontend-jfxiuyktj-dreamshot-7e44ef0e.vercel.app
```

### 2. **Update Google OAuth Redirect URI**

In Google Cloud Console, set the redirect URI to:

```
https://dart-frontend-jfxiuyktj-dreamshot-7e44ef0e.vercel.app/api/auth/callback/google
```

### 3. **Check Current Environment Variables**

In Vercel Dashboard → Settings → Environment Variables, verify you have:

```bash
# ✅ REQUIRED (with your actual URL)
NEXTAUTH_URL=https://dart-frontend-jfxiuyktj-dreamshot-7e44ef0e.vercel.app
NEXTAUTH_SECRET=your-generated-secret

# ✅ REQUIRED (Google OAuth credentials)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ✅ REQUIRED (Backend communication)
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app

# ✅ REQUIRED (Database)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### 4. **Test Environment Variables**

Add this temporary debug endpoint to check if variables are loaded:

```typescript
// Add to frontend/src/app/api/debug-env/route.ts
export async function GET() {
  return Response.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });
}
```

Then visit: `https://dart-frontend-jfxiuyktj-dreamshot-7e44ef0e.vercel.app/api/debug-env`

### 5. **Common OAuth Error Causes**

1. **Wrong Redirect URI**: Must match exactly in Google Console
2. **Missing Environment Variables**: Check all are set in Vercel
3. **Wrong NEXTAUTH_URL**: Must be your actual deployment URL
4. **Invalid Google Credentials**: Double-check Client ID/Secret
5. **Backend OAuth Sync Error**: Check Railway logs for errors

### 6. **Test Backend OAuth Sync Endpoint**

Test if your backend can handle OAuth sync:

```bash
curl -X POST https://your-railway-backend.railway.app/auth/oauth-sync \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### 7. **Enable Debug Mode** (Temporary)

Add debug mode to NextAuth config:

```typescript
// In frontend/src/app/api/auth/[...nextauth]/route.ts
const handler = NextAuth({
  debug: process.env.NODE_ENV === "development", // Add this line
  // ... rest of config
});
```

### 8. **Quick Test Steps**

1. **Check browser console**: Look for any JavaScript errors
2. **Check Network tab**: See if OAuth requests are failing
3. **Test basic auth first**: Try email/password login to ensure backend works
4. **Check Railway logs**: Look for OAuth sync errors

## 🚨 **Quick Fixes to Try:**

### Option 1: Reset Google OAuth Setup

1. Delete current OAuth credentials in Google Console
2. Create new ones with exact redirect URI
3. Update Vercel environment variables
4. Redeploy

### Option 2: Temporarily Disable Google OAuth

```typescript
// Comment out GoogleProvider in route.ts
// GoogleProvider({
//   clientId: process.env.GOOGLE_CLIENT_ID!,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//   allowDangerousEmailAccountLinking: true,
// }),
```

### Option 3: Check for URL Mismatch

- Your logs show different URLs - make sure all configs use the same URL
- Double-check NEXTAUTH_URL matches your actual deployment URL

## 🔍 **What to Check Next:**

1. ✅ Verify exact Vercel URL from your deployment
2. ✅ Update NEXTAUTH_URL with correct URL
3. ✅ Update Google OAuth redirect URI
4. ✅ Check all environment variables are set
5. ✅ Test backend OAuth sync endpoint
6. ✅ Check Railway backend logs for errors
7. ✅ Redeploy after environment variable changes

## 📋 **Checklist for Google OAuth Setup:**

- [ ] Google Cloud Console project created
- [ ] OAuth 2.0 Client ID created (Web application)
- [ ] Correct redirect URI set: `https://dart-frontend-jfxiuyktj-dreamshot-7e44ef0e.vercel.app/api/auth/callback/google`
- [ ] Client ID and Secret copied correctly
- [ ] All environment variables set in Vercel
- [ ] NEXTAUTH_URL matches actual deployment URL
- [ ] Redeployed after environment changes
- [ ] Backend OAuth sync endpoint working
- [ ] No JavaScript console errors
