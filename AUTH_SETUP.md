# DART Authentication Setup with Better Auth

This guide will help you set up Google OAuth authentication for the DART application using Better Auth.

## Prerequisites

1. A Google Cloud Console account
2. MongoDB database running
3. Node.js environment

## Authentication Options

DART supports two authentication methods:

1. **Email & Password** - Works immediately with localhost (no additional setup needed)
2. **Google OAuth** - Requires Google Cloud Console setup (optional)

### Google OAuth Setup (Optional)

**Note:** Google OAuth requires ngrok or a public URL for development. If you only want email/password auth, skip this section.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google People API)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen if prompted
6. For "Application type", select "Web application"
7. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/callback/google` (or your ngrok URL)
   - Production: `https://your-domain.com/api/auth/callback/google`
8. Save and copy your Client ID and Client Secret

### Backend Environment Variables

**For Email/Password Auth Only:**
The mise configuration handles environment variables automatically. No manual .env setup needed!

**For Google OAuth (Optional):**
If you want Google OAuth, update the Google credentials in `mise.toml`:

```toml
GOOGLE_CLIENT_ID = "your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"
```

**Manual .env setup (alternative to mise):**
If you prefer manual setup, create a `.env` file in the `backend` directory:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/dart-db

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-hex-32
BETTER_AUTH_URL=http://localhost:3001

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Server
PORT=3001
NODE_ENV=development
```

To generate the `BETTER_AUTH_SECRET`, run:

```bash
openssl rand -hex 32
```

### 3. Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Google OAuth (optional for client-side)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Environment
NODE_ENV=development
```

## Installation and Setup

### Using mise (Recommended)

```bash
# Install dependencies
mise run install

# Start everything (MongoDB + Backend + Frontend)
mise run dev
```

### Manual Setup (Alternative)

**1. Install Dependencies:**

```bash
cd backend && npm install
cd ../frontend && npm install
```

**2. Start MongoDB:**

```bash
docker run -d --name dart-mongo -p 27017:27017 mongo:7.0
```

**3. Start Servers (in separate terminals):**

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Testing the Authentication

1. Open your browser and go to `http://localhost:3000`
2. Click "Sign In" or "Get Started"
3. You should be redirected to `/auth/signin`
4. Click "Continue with Google"
5. Complete the Google OAuth flow
6. You should be redirected to the dashboard at `/dashboard`

## Available Routes

- `/` - Home page (public)
- `/auth/signin` - Sign in page (public)
- `/dashboard` - Protected dashboard (requires authentication)

## API Endpoints

The backend provides these auth endpoints:

- `POST /api/auth/sign-in/social` - Social sign in
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session
- `GET /api/auth/callback/google` - Google OAuth callback

## Protecting Routes

### Backend Routes

Use the middleware in your protected routes:

```typescript
import { requireAuth } from "@/middleware/auth.middleware";

router.get("/protected-route", requireAuth, (req, res) => {
  // req.user and req.session are available here
  res.json({ user: req.user });
});
```

### Frontend Pages

Use the `useSession` hook:

```typescript
import { useSession } from "@/lib/auth-client";

export default function ProtectedPage() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Please sign in</div>;

  return <div>Welcome {session.user.name}!</div>;
}
```

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**

   - Make sure your redirect URI in Google Console matches exactly: `http://localhost:3001/api/auth/callback/google`

2. **CORS errors**

   - Ensure `FRONTEND_URL` is set correctly in backend `.env`
   - Check that the frontend is running on the expected port

3. **Session not persisting**

   - Verify `BETTER_AUTH_SECRET` is set and consistent
   - Check that cookies are being set (inspect browser dev tools)

4. **MongoDB connection issues**
   - Ensure MongoDB is running
   - Verify `MONGODB_URI` is correct

### Logs

Check the console logs in both backend and frontend terminals for detailed error messages.

## Production Deployment

When deploying to production:

1. Update the Google OAuth redirect URI to your production domain
2. Set production environment variables
3. Use HTTPS for all URLs
4. Set secure cookie settings in Better Auth configuration

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for `BETTER_AUTH_SECRET`
- Regularly rotate your Google OAuth credentials
- Use HTTPS in production
- Consider implementing rate limiting for auth endpoints
