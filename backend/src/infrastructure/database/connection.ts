import mongoose from "mongoose";

// Connection state tracking
let isConnected = false;
let isConnecting = false;

export const connectDatabase = async (): Promise<void> => {
  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  // If currently connecting, wait for the connection to complete
  if (isConnecting) {
    while (isConnecting && !isConnected) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return;
  }

  try {
    isConnecting = true;
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    console.log("🔌 Connecting to MongoDB...");

    await mongoose.connect(mongoUri, {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      serverSelectionTimeoutMS: 10000, // How long to try connecting before timing out
      socketTimeoutMS: 45000, // How long to wait for a response from MongoDB
      connectTimeoutMS: 10000, // How long to wait for initial connection
      maxIdleTimeMS: 60000, // Close connections after 60 seconds of inactivity

      // Replica set settings
      retryWrites: true,
      w: "majority",
    });

    isConnected = true;
    console.log("✅ MongoDB connected successfully");

    // Handle connection events
    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
      isConnected = true;
    });

    mongoose.connection.on("close", () => {
      console.log("🔌 MongoDB connection closed");
      isConnected = false;
    });
  } catch (error) {
    isConnected = false;
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  } finally {
    isConnecting = false;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("👋 MongoDB disconnected gracefully");
    }
    isConnected = false;
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error);
    throw error;
  }
};

// Function to check connection status
export const isDatabaseConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

// Function to ensure database connection (safe to call multiple times)
export const ensureDatabaseConnection = async (): Promise<void> => {
  if (!isDatabaseConnected()) {
    await connectDatabase();
  }
};
