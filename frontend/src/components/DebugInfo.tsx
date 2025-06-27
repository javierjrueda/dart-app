"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export default function DebugInfo() {
  const { data: session, status } = useSession();
  const [debugData, setDebugData] = useState<any>(null);

  const checkEnvironment = async () => {
    try {
      const response = await fetch("/api/debug-env");
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      setDebugData({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const testBackendConnection = async () => {
    try {
      const accessToken = (session as any)?.accessToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects`,
        {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
        }
      );

      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };

      setDebugData({ backendTest: result });
    } catch (error) {
      setDebugData({
        backendTest: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>🔍 Production Debug Info</CardTitle>
        <CardDescription>
          Temporary debug component to troubleshoot production issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={checkEnvironment} variant="outline">
            Check Environment
          </Button>
          <Button onClick={testBackendConnection} variant="outline">
            Test Backend Connection
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Session Status: {status}</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(
                {
                  session: session
                    ? {
                        user: session.user,
                        expires: session.expires,
                        accessToken: (session as any)?.accessToken
                          ? "Present"
                          : "Missing",
                      }
                    : null,
                },
                null,
                2
              )}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Environment (Client-side):</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(
                {
                  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
                  NODE_ENV: process.env.NODE_ENV,
                  currentURL:
                    typeof window !== "undefined"
                      ? window.location.href
                      : "N/A",
                },
                null,
                2
              )}
            </pre>
          </div>

          {debugData && (
            <div>
              <h3 className="font-semibold mb-2">Debug Results:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
