# DART Deployment Guide

This guide covers deploying the DART application (frontend and backend) to production.

## Architecture Overview

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: Express.js API (can be deployed on Railway, Render, or as a separate Vercel project)
- **Database**: MongoDB (use MongoDB Atlas for production)
- **File Storage**: Cloudflare R2 (already configured)

## Prerequisites

1. MongoDB Atlas account (free tier available)
2. Vercel account
3. Backend hosting account (Railway/Render/etc.)
4. Environment variables configured
5. **Mise installed** (for automated deployment - optional but recommended)

## Step 1: Set up MongoDB Atlas

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier is fine for starting)
3. Set up database access:
   - Create a database user
   - Add your IP address to the whitelist (or allow access from anywhere for production)
4. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   ```

## Step 2: Deploy Backend

### Option A: Deploy to Railway (Recommended)

1. **Fix TypeScript Path Aliases**: First, ensure your backend can resolve TypeScript path aliases in production by installing `module-alias`:

   ```bash
   cd backend
   npm install module-alias
   ```

2. **Update package.json**: Add the module aliases configuration:

   ```json
   {
     "_moduleAliases": {
       "@": "dist"
     }
   }
   ```

3. **Update server.ts**: Add the module alias registration at the top:

   ```typescript
   // Register module aliases first (for production)
   import "module-alias/register";
   ```

4. Install Railway CLI: `npm install -g @railway/cli`
5. In the backend directory:
   ```bash
   cd backend
   railway login
   railway init
   ```
6. Set environment variables in Railway dashboard:
   ```
   MONGODB_URI=<your-atlas-connection-string>
   JWT_SECRET=<your-jwt-secret>
   NODE_ENV=production
   PORT=3001
   CLOUDFLARE_ACCOUNT_ID=<your-cf-account-id>
   CLOUDFLARE_ACCESS_KEY_ID=<your-cf-access-key>
   CLOUDFLARE_SECRET_ACCESS_KEY=<your-cf-secret-key>
   CLOUDFLARE_BUCKET_NAME=<your-bucket-name>
   ```
7. Deploy:
   ```bash
   railway up
   ```
8. Note your backend URL (e.g., `https://your-app.railway.app`)

## 🚀 Quick Deployment with Mise (Recommended)

If you have mise installed, you can deploy both frontend and backend simultaneously:

### **One-Command Deployment:**

```bash
# Deploy everything at once
mise run deploy:all
```

### **Step-by-step with Mise:**

1. **Setup deployment tools** (first time only):

   ```bash
   mise run deploy:setup
   ```

2. **Check prerequisites**:

   ```bash
   mise run deploy:check
   ```

3. **Deploy both apps**:
   ```bash
   mise run deploy:all
   ```

### **Individual Deployment Commands:**

```bash
# Deploy only backend to Railway
mise run deploy:backend

# Deploy only frontend to Vercel
mise run deploy:frontend

# Check deployment status
mise run deploy:status

# View deployment logs
mise run deploy:logs
```

### **Build Commands:**

```bash
# Build both applications
mise run build:all

# Build only backend
mise run build:backend

# Build only frontend
mise run build:frontend
```

---

## Manual Deployment Options

### Option B: Deploy to Render

1. Create a `render.yaml` in the backend directory:
   ```yaml
   services:
     - type: web
       name: dart-backend
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: MONGODB_URI
           sync: false
         - key: JWT_SECRET
           generateValue: true
   ```
2. Connect your GitHub repo to Render
3. Deploy and set environment variables in Render dashboard

### Option C: Deploy Backend to Vercel (Serverless)

Create a separate Vercel project for the backend with custom configuration.

## Step 3: Deploy Frontend to Vercel

1. Update frontend environment variables:
   Create `.env.production` in the frontend directory:

   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   NEXTAUTH_URL=https://your-frontend.vercel.app
   NEXTAUTH_SECRET=<your-nextauth-secret>
   MONGODB_URI=<your-atlas-connection-string>
   ```

2. Push to GitHub (Vercel will auto-deploy)

3. Or deploy manually:

   ```bash
   cd frontend
   npm install -g vercel
   vercel
   ```

4. Set environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from `.env.production`

## Step 4: Update CORS Settings

Update your backend CORS configuration to allow your Vercel frontend URL:

```typescript
// backend/src/server.ts
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://your-app.vercel.app", // Add your Vercel URL
      process.env.FRONTEND_URL,
    ],
    credentials: true,
  })
);
```

## Step 5: Update API URLs in Frontend

Ensure all API calls in the frontend use the production backend URL:

```typescript
// frontend/src/lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

## Environment Variables Summary

### Backend (.env)

```
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-app.vercel.app
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_ACCESS_KEY_ID=...
CLOUDFLARE_SECRET_ACCESS_KEY=...
CLOUDFLARE_BUCKET_NAME=...
```

### Frontend (.env.production)

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
MONGODB_URI=mongodb+srv://...
```

## Post-Deployment Checklist

- [ ] Test authentication flow
- [ ] Test file uploads to Cloudflare R2
- [ ] Verify database connections
- [ ] Check CORS is working properly
- [ ] Test all API endpoints
- [ ] Monitor logs for errors
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure rate limiting for production
- [ ] Set up SSL certificates (usually automatic)
- [ ] Configure custom domain if needed

## Monitoring and Maintenance

1. **Logs**: Check platform-specific logs

   - Railway: `railway logs`
   - Render: Dashboard logs
   - Vercel: Function logs in dashboard

2. **Database**: Monitor in MongoDB Atlas dashboard

   - Set up alerts for high usage
   - Regular backups

3. **Performance**: Use Vercel Analytics for frontend monitoring

## Troubleshooting

### Module Resolution Issues (TypeScript Path Aliases)

**Error**: `Cannot find module '@/infrastructure/database/connection'`

**Solution**:

1. Install `module-alias`: `npm install module-alias`
2. Add `"_moduleAliases": { "@": "dist" }` to package.json
3. Add `import "module-alias/register";` at the top of server.ts
4. Rebuild and redeploy

### CORS Issues

- Ensure backend CORS includes your frontend URL
- Check credentials are enabled in CORS config

### Database Connection Issues

- Verify MongoDB Atlas whitelist includes your backend IP
- Check connection string format
- Ensure database user has correct permissions

### Authentication Issues

- Verify JWT_SECRET matches between frontend and backend
- Check NEXTAUTH_URL is set correctly
- Ensure cookies are configured for cross-domain if needed
