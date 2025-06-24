import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { connectDatabase } from "@/infrastructure/database/connection";
import { routes } from "@/presentation/routes";

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

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
    // Connect to database once at startup
    await connectDatabase();
    console.log("✅ Database connection established");

    app.listen(PORT, () => {
      console.log(`🚀 DART Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("👋 Received SIGINT, gracefully shutting down...");
  const { disconnectDatabase } = await import(
    "@/infrastructure/database/connection"
  );
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("👋 Received SIGTERM, gracefully shutting down...");
  const { disconnectDatabase } = await import(
    "@/infrastructure/database/connection"
  );
  await disconnectDatabase();
  process.exit(0);
});

startServer();
