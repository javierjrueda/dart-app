# 🚀 Getting Started with DART

Welcome to DART! This guide will get you up and running with the unified development environment using mise.

## 📋 Prerequisites

- [mise](https://mise.jdx.dev/) - Modern development environment manager
- [orbstack](https://orbstack.dev/) - Optional, for enhanced Docker performance

### Install mise (if not already installed)

```bash
curl https://mise.jdx.dev/install.sh | sh
```

## ⚡ Quick Start

### 1. Clone and Trust Configuration

```bash
# Navigate to your project directory
cd dart

# Trust the mise configuration
mise trust
```

### 2. Install Dependencies

```bash
# This installs Node.js and all project dependencies
mise run install
```

### 3. Start Development

```bash
# Start both backend and frontend servers
mise run dev
```

That's it! 🎉

**Your application is now running:**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## 🛠️ Development Commands

```bash
# Install all dependencies
mise run install

# Start development servers with hot reload
mise run dev

# Clean project (remove node_modules, build files, .env files)
mise run clean

# Clean and reinstall everything
mise run reset
```

## 🌍 Environment Configuration

All environment variables are managed through `mise.toml`. When you run `mise run dev`, it automatically:

1. Creates `backend/.env` with backend configuration
2. Creates `frontend/.env.local` with frontend configuration
3. Uses your MongoDB Atlas connection string
4. Sets up proper CORS and API endpoints

### Key Configuration (in mise.toml)

- **MongoDB**: Atlas cloud database connection
- **JWT Secret**: Authentication token signing
- **Ports**: Backend (3001), Frontend (3000)
- **API URLs**: Automatic configuration between services

## 🔧 Development Features

### Hot Reload

- **Backend**: Automatic restart on TypeScript changes
- **Frontend**: Next.js hot module replacement

### Environment Management

- **Unified Config**: Single `mise.toml` manages everything
- **Auto-generated**: `.env` files created automatically
- **Type Safety**: Full TypeScript support throughout

### Architecture

- **Domain Driven Design**: Clean backend architecture
- **Modern Stack**: Next.js, Node.js, MongoDB Atlas
- **TypeScript**: Full type safety across frontend and backend

## 🚨 Troubleshooting

### Port Already in Use

If you get port conflicts:

```bash
# Check what's using the ports
lsof -i :3000
lsof -i :3001

# Kill the processes
kill -9 <PID>
```

### MongoDB Connection Issues

The app uses MongoDB Atlas. If you see connection errors:

1. Check your internet connection
2. Verify your IP is whitelisted in MongoDB Atlas
3. Ensure the connection string in `mise.toml` is correct

### TypeScript Errors

If you encounter TypeScript compilation errors:

```bash
# Clean and restart
mise run clean
mise run install
mise run dev
```

### mise Issues

```bash
# Update mise
mise self-update

# Re-trust configuration
mise trust
```

## 📁 Project Structure

```
dart/
├── backend/           # Node.js API with DDD architecture
│   ├── src/
│   │   ├── domain/    # Entities, repositories (interfaces)
│   │   ├── application/ # Use cases, business logic
│   │   ├── infrastructure/ # Database, external integrations
│   │   └── presentation/ # Controllers, routes
│   └── package.json
├── frontend/          # Next.js React application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   └── components/ # Reusable UI components
│   └── package.json
└── mise.toml          # Development environment configuration
```

## ✨ What's Next?

1. **Explore the API**: Visit http://localhost:3001/health
2. **Check the Frontend**: Open http://localhost:3000
3. **Review the Code**: Explore the Domain Driven Design structure
4. **Add Features**: Start building with the dreamshot entity
5. **Learn the Architecture**: Understand the DDD patterns in use

## 🎯 Key Benefits

- **⚡ Fast Setup**: One command to start everything
- **🔄 Hot Reload**: Instant feedback on code changes
- **🛡️ Type Safe**: Full TypeScript throughout the stack
- **🏗️ Clean Architecture**: Domain Driven Design principles
- **🌍 Unified Config**: Single source of truth for environment
- **📦 Dependency Management**: Automatic Node.js version handling

Happy coding! 🚀
