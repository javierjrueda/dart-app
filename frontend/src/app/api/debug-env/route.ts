import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      // Don't expose secrets, just check if they exist
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
      MONGODB_URI: process.env.MONGODB_URI ? "SET" : "NOT SET",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
        ? "SET"
        : "NOT SET",
    },
    headers: {
      host: request.headers.get("host"),
      "user-agent": request.headers.get("user-agent"),
      origin: request.headers.get("origin"),
    },
    url: request.url,
  };

  return NextResponse.json(debugInfo);
}
