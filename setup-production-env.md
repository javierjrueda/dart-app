# 🚀 Production Environment Setup Guide

## ✅ **Your Google OAuth Callback URL is Correct:**

```
https://dart-frontend-nls7hmhvm-dreamshot-7e44ef0e.vercel.app/api/auth/callback/google
```

## 🔧 **Required Environment Variables for Vercel**

Set these in your Vercel project dashboard under "Settings" → "Environment Variables":

### 1. NextAuth Configuration (REQUIRED)

```bash
NEXTAUTH_URL=https://dart-frontend-nls7hmhvm-dreamshot-7e44ef0e.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
```

### 2. Google OAuth (for social login)

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Backend API (REQUIRED)

```bash
NEXT_PUBLIC_API_URL=https://dart-backend-production.railway.app
```

### 4. Database (REQUIRED)

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## 🔑 **Steps to Fix Current Issues:**

### 1. **Generate NEXTAUTH_SECRET**

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

### 2. **Set up Google OAuth** (Optional but recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   ```
   https://dart-frontend-nls7hmhvm-dreamshot-7e44ef0e.vercel.app/api/auth/callback/google
   ```
7. Copy your Client ID and Client Secret

### 3. **Find your Railway backend URL**

- Go to your Railway dashboard
- Find your backend service URL (should be like: `https://dart-backend-production.railway.app`)

### 4. **Set Environment Variables in Vercel**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above
3. Set environment to "Production, Preview, and Development"

### 5. **Redeploy**

After setting environment variables, trigger a new deployment in Vercel.

## ✅ **CSP and CSS Issues Fixed**

I've updated your configuration to fix:

- ❌ Content Security Policy blocking 'eval'
- ❌ CSS @import rules causing issues
- ✅ Optimized font loading with Next.js
- ✅ Proper CSP headers for production

## 🔍 **Quick Test Steps:**

1. **Test regular login:**

   - Go to: `https://your-app.vercel.app/auth/signin`
   - Try email/password login

2. **Test Google OAuth:**

   - Click "Sign in with Google"
   - Should redirect properly

3. **Check environment:**
   - All environment variables set in Vercel
   - No console errors about missing variables

## 🚨 **Quick Fix (If OAuth Still Not Working):**

If you want to get basic auth working immediately:

1. **Set these minimal variables in Vercel:**

   ```bash
   NEXTAUTH_URL=https://dart-frontend-nls7hmhvm-dreamshot-7e44ef0e.vercel.app
   NEXTAUTH_SECRET=your-generated-secret
   NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
   MONGODB_URI=your-mongodb-connection
   ```

2. **Temporarily disable Google OAuth** by commenting out the GoogleProvider in `route.ts`

3. **Redeploy and test email/password login first**

## 📋 **Final Checklist:**

- [ ] NEXTAUTH_URL set to actual Vercel URL (not localhost)
- [ ] NEXTAUTH_SECRET generated and set
- [ ] Backend URL updated and accessible
- [ ] MongoDB connection string working
- [ ] Google OAuth credentials (if using social login)
- [ ] Redeployed after setting variables
- [ ] Tested login flow
