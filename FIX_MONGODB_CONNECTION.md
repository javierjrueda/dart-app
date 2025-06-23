# Fix MongoDB Atlas Connection - IP Whitelisting

The backend is failing to connect to MongoDB Atlas because your current IP address is not whitelisted. Follow these steps to fix it:

## Quick Fix: Allow Access from Anywhere (Development Only)

1. **Log in to MongoDB Atlas**

   - Go to https://cloud.mongodb.com
   - Sign in with your account

2. **Navigate to Network Access**

   - In your project, click on "Network Access" in the left sidebar
   - You'll see a list of whitelisted IP addresses

3. **Add Your Current IP**

   - Click the green "ADD IP ADDRESS" button
   - Choose one of these options:
     - **ADD CURRENT IP ADDRESS** - Adds only your current IP
     - **ALLOW ACCESS FROM ANYWHERE** - Adds 0.0.0.0/0 (less secure but good for development)

4. **For Development: Allow Access from Anywhere**

   - Click "ALLOW ACCESS FROM ANYWHERE"
   - Add a comment like "Development access"
   - Click "Confirm"

5. **Wait for Changes to Deploy**
   - MongoDB Atlas needs about 1-2 minutes to apply the changes
   - You'll see a banner saying "We are deploying your changes"

## Alternative: Add Your Specific IP

If you prefer more security:

1. Find your current IP address:

   ```bash
   curl ifconfig.me
   ```

2. In MongoDB Atlas Network Access:
   - Click "ADD IP ADDRESS"
   - Click "ADD CURRENT IP ADDRESS" or manually enter the IP
   - Add a comment with your location/device
   - Click "Confirm"

## Verify the Fix

After the changes deploy:

```bash
# Restart the development servers
mise run dev
```

The backend should now connect successfully to MongoDB Atlas.

## Security Notes

- **Production**: Never use 0.0.0.0/0 in production. Always whitelist specific IPs.
- **Dynamic IPs**: If your IP changes frequently (home internet), you may need to update the whitelist periodically.
- **VPN**: If using a VPN, whitelist your VPN's IP address.

## Still Having Issues?

If you still can't connect after whitelisting:

1. **Check credentials**: Verify the username and password in your MONGODB_URI
2. **Check database name**: Ensure `/dart-db` exists in your cluster
3. **Check cluster status**: Make sure your Atlas cluster is running (not paused)
4. **Network issues**: Try connecting from a different network
