// Register module aliases first (for production)
import "module-alias/register";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { connectDatabase } from "@/infrastructure/database/connection";
import { routes } from "@/presentation/routes";

// Load environment variables
// In production (Railway), environment variables are provided by the platform
// In development, load from .env file
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../.env") });
} else {
  // In production, just initialize dotenv without a specific path
  // This allows Railway's environment variables to be used
  dotenv.config();
}

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 for development
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://localhost:3000",
      "https://dart.dreamshot.io",
      "https://dart-frontend.vercel.app",
      process.env.FRONTEND_URL || "http://localhost:3000",
    ],
    credentials: true,
  })
);
app.use(limiter);

// Logging - much cleaner format for development
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined")); // Full logs in production
} else {
  // Clean, minimal logs for development
  app.use(morgan("dev")); // Format: "GET /api/v1/projects 200 1.234 ms - 1096"

  // OR use this for even cleaner logs:
  // app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

  // OR disable completely during development:
  // (no morgan middleware = no HTTP logs)
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api", routes);

// Global error handler for database connection issues
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    console.error("Global error handler:", error);

    // Handle MongoDB connection errors
    if (
      error.name === "MongooseError" ||
      error.message?.includes("MongoDB") ||
      error.message?.includes("ECONNREFUSED")
    ) {
      res.status(503).json({
        error: "Database Connection Error",
        message: "Unable to connect to database. Please try again later.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Handle other errors
    const statusCode = error.statusCode || error.status || 500;
    res.status(statusCode).json({
      error: error.name || "Internal Server Error",
      message: error.message || "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Start server
const startServer = async () => {
  try {
    // Debug environment variables in production
    if (process.env.NODE_ENV === "production") {
      console.log("🔧 Environment check:");
      console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`PORT: ${process.env.PORT}`);
      console.log(
        `MONGODB_URI: ${process.env.MONGODB_URI ? "✅ Set" : "❌ Missing"}`
      );
      console.log(
        `JWT_SECRET: ${process.env.JWT_SECRET ? "✅ Set" : "❌ Missing"}`
      );
    }

    // Connect to database once at startup
    await connectDatabase();
    console.log("✅ Database connection established");

    const HOST =
      process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

    server = app.listen(PORT, HOST, () => {
      console.log(`🚀 DART Backend running on ${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Keep track of server instance
let server: any;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`👋 Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log("🛑 HTTP server closed");
    });
  }

  // Give ongoing requests 30 seconds to complete
  setTimeout(() => {
    console.log("⏱️  Forcing shutdown after timeout");
    process.exit(0);
  }, 30000);

  try {
    const { disconnectDatabase } = await import(
      "./infrastructure/database/connection"
    );
    await disconnectDatabase();
    console.log("🔌 Database disconnected");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer();
