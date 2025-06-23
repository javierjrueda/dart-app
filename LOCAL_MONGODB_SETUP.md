# 🗄️ Local MongoDB Setup Guide

## Why Use Local MongoDB?

- ✅ **No SSL/TLS issues** - Simple local connection
- ✅ **Faster development** - No network latency
- ✅ **Works offline** - No internet dependency
- ✅ **Easy reset** - Fresh database anytime
- ✅ **Free** - No cloud usage limits

## Quick Setup

### 1. Update Your Environment

**Manually update your `.env` file:**

```bash
# Open your .env file and change the MONGODB_URI line from:
MONGODB_URI=mongodb+srv://javier:VDwt0DJ5Yn6UnEos@cluster0.wzh5eff.mongodb.net/dart-db?retryWrites=true&w=majority&appName=Cluster0

# To:
MONGODB_URI=mongodb://dart-user:dart-password@localhost:27017/dart-db
```

### 2. Start Local Development

```bash
# Start with local MongoDB (automatically starts Docker container)
mise run dev:local

# Or start MongoDB separately first
mise run dev:mongo-local
# Then start the app
mise run dev
```

## Local MongoDB Credentials

- **Host**: localhost:27017
- **Username**: dart-user
- **Password**: dart-password
- **Database**: dart-db
- **Connection String**: `mongodb://dart-user:dart-password@localhost:27017/dart-db`

## Available Commands

```bash
# Start local development (includes MongoDB)
mise run dev:local

# Start only MongoDB
mise run dev:mongo-local

# Stop MongoDB
mise run dev:mongo-stop

# Reset MongoDB (delete all data)
mise run dev:mongo-reset

# Check what type of MongoDB you're using
mise run env:check
```

## What Gets Created

The local setup creates:

- **Docker container**: `dart-mongodb` running MongoDB 7.0
- **Database**: `dart-db` with proper user permissions
- **Collections**: `users`, `dreamshots`, `sessions`, `accounts`
- **Persistent storage**: Data survives container restarts

## Switching Back to Cloud

If you want to switch back to MongoDB Atlas:

1. Update your `.env` file:

   ```bash
   # Change back to:
   MONGODB_URI=mongodb+srv://javier:VDwt0DJ5Yn6UnEos@cluster0.wzh5eff.mongodb.net/dart-db?retryWrites=true&w=majority&appName=Cluster0
   ```

2. Stop local MongoDB:

   ```bash
   mise run dev:mongo-stop
   ```

3. Use regular dev command:
   ```bash
   mise run dev
   ```

## Troubleshooting

### Port 27017 Already in Use

```bash
# Check what's using the port
lsof -i :27017

# Stop any existing MongoDB
brew services stop mongodb-community
# Or
sudo systemctl stop mongod
```

### Docker Issues

```bash
# Restart Docker Desktop
# Or reset Docker containers
docker-compose down -v
docker system prune -f
```

### Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Check logs
docker logs dart-mongodb

# Test connection
docker exec -it dart-mongodb mongosh -u dart-user -p dart-password dart-db
```

## Benefits Over Cloud

1. **No Network Issues**: No SSL certificates, no IP whitelisting
2. **Instant Reset**: Fresh database in seconds
3. **Development Speed**: No network latency
4. **Offline Work**: Works without internet
5. **Cost**: Completely free for development

Your backend code automatically detects local vs cloud MongoDB and uses appropriate connection settings!
