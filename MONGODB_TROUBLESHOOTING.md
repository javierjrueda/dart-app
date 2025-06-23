# MongoDB Atlas SSL/TLS Error Troubleshooting

## Current Issue

You're experiencing an SSL/TLS certificate error when connecting to MongoDB Atlas:

```
SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

## This is NOT an IP whitelisting issue!

Your IP whitelist is correctly configured with 0.0.0.0/0 (allows all IPs).

## Common Causes & Solutions

### 1. **Check Cluster Status** (Most Common)

- Go to [MongoDB Atlas](https://cloud.mongodb.com)
- Check if your cluster shows:
  - ⏸️ **Paused** - Click "Resume" to restart it
  - 🔄 **Configuring** - Wait for it to finish
  - ❌ **Error** - Check cluster logs

### 2. **Verify Credentials**

Your connection string uses:

- Username: `javier`
- Password: `VDwt0DJ5Yn6UnEos`
- Database: `dart-db`

Ensure these are correct in MongoDB Atlas:

- Go to **Database Access** → Check user exists
- Go to **Database** → Verify database name

### 3. **Try Alternative Connection String**

If the cluster is M0 (free tier), try using the legacy connection string:

1. In MongoDB Atlas, click "Connect" on your cluster
2. Choose "Connect your application"
3. Select "Driver: Node.js" and "Version: 3.6 or later"
4. Toggle to view the **legacy connection string** (starts with `mongodb://` not `mongodb+srv://`)

Update your `.env` with the legacy format:

```
MONGODB_URI=mongodb://javier:password@shard1.mongodb.net:27017,shard2.mongodb.net:27017,shard3.mongodb.net:27017/dart-db?ssl=true&replicaSet=atlas-xxx&authSource=admin
```

### 4. **Network/Firewall Issues**

Try:

- Disable VPN if using one
- Check if corporate firewall blocks port 27017
- Try from a different network (mobile hotspot)

### 5. **Quick Test with MongoDB Compass**

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Use your connection string to test connectivity
3. If Compass connects but your app doesn't, it's a Node.js/driver issue

### 6. **Node.js SSL Configuration**

If nothing else works, try temporarily bypassing SSL validation:

```javascript
// In backend/src/infrastructure/database/connection.ts
await mongoose.connect(mongoUri, {
  tls: true,
  tlsAllowInvalidCertificates: true, // Only for testing!
  serverSelectionTimeoutMS: 10000,
});
```

⚠️ **WARNING**: Only use `tlsAllowInvalidCertificates: true` for debugging. Never in production!

## Next Steps

1. **First**: Check cluster status in MongoDB Atlas
2. **Then**: Try the legacy connection string
3. **Finally**: Test with MongoDB Compass

The SSL error typically means the cluster is having issues, not your code!
