"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faFolder,
  faSpinner,
  faCog,
  faExclamationTriangle,
  faTimes,
  faCheckCircle,
  faTimesCircle,
  faImages,
} from "@fortawesome/free-solid-svg-icons";

interface BulkUploadModalProps {
  projectId: string;
  onClose: () => void;
  onUploadComplete?: () => void;
}

interface UploadProgress {
  status: string;
  totalFiles: number;
  processedFiles: number;
  successfulUploads: number;
  failedUploads: number;
  skippedUploads?: number;
  retriedUploads?: number;
  currentFile: string;
  startTime: string;
  errors: Array<{
    fileName: string;
    error: string;
    errorType?: string;
    retryCount?: number;
  }>;
  completed: boolean;
  cancelled?: boolean;
  lastUpdate?: string;
}

export default function BulkUploadModal({
  projectId,
  onClose,
  onUploadComplete,
}: BulkUploadModalProps) {
  const { data: session } = useSession();
  const [folderPath, setFolderPath] = useState("");
  const [batchSize, setBatchSize] = useState(10); // Optimal batch size based on testing
  const [delay, setDelay] = useState(15000); // Optimal delay to avoid rate limiting
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState("");

  // Poll for progress updates with exponential backoff
  useEffect(() => {
    if (!uploadSessionId || !uploading) return;

    let pollInterval = 10000; // Start with 10 seconds
    let timeoutId: NodeJS.Timeout;
    let consecutiveErrors = 0;

    const pollProgress = async () => {
      try {
        const response = await fetch(
          `http://localhost:3001/api/v1/bulk-upload/${uploadSessionId}/progress`,
          {
            headers: {
              Authorization: `Bearer ${(session as any)?.accessToken}`,
            },
          }
        );

        if (response.ok) {
          const progressData = await response.json();
          setProgress(progressData);
          consecutiveErrors = 0; // Reset error count on success
          pollInterval = 10000; // Reset to normal interval

          // If completed, stop polling
          if (progressData.completed) {
            setUploading(false);
            if (onUploadComplete) {
              onUploadComplete();
            }
            return;
          }
        } else if (response.status === 429) {
          // Rate limited - exponential backoff
          consecutiveErrors++;
          pollInterval = Math.min(pollInterval * 2, 60000); // Max 1 minute
          console.warn(`Rate limited, backing off to ${pollInterval}ms`);
        }
      } catch (error) {
        consecutiveErrors++;
        pollInterval = Math.min(pollInterval * 1.5, 30000); // Max 30 seconds for network errors
        console.error("Error polling progress:", error);
      }

      // Schedule next poll if still uploading
      if (uploading) {
        timeoutId = setTimeout(pollProgress, pollInterval);
      }
    };

    // Initial poll
    pollProgress();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [uploadSessionId, uploading, session, onUploadComplete]);

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderPath.trim()) {
      setError("Please enter a folder path");
      return;
    }

    setUploading(true);
    setError("");
    setProgress(null);
    setUploadSessionId(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/projects/${projectId}/media/bulk-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session as any)?.accessToken}`,
          },
          body: JSON.stringify({
            folderPath: folderPath.trim(),
            batchSize,
            delay,
            skipDuplicates,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Bulk upload failed");
      }

      const data = await response.json();
      setUploadSessionId(data.uploadSessionId);
    } catch (error) {
      console.error("Bulk upload error:", error);
      setError(error instanceof Error ? error.message : "Bulk upload failed");
      setUploading(false);
    }
  };

  const formatElapsedTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const calculateETA = (progress: UploadProgress) => {
    if (progress.processedFiles === 0) return "Calculating...";

    const elapsed =
      (new Date().getTime() - new Date(progress.startTime).getTime()) / 1000;
    const rate = progress.processedFiles / elapsed;
    const remaining = progress.totalFiles - progress.processedFiles;
    const eta = remaining / rate;

    const hours = Math.floor(eta / 3600);
    const minutes = Math.floor((eta % 3600) / 60);
    const seconds = Math.floor(eta % 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const progressPercentage = progress
    ? progress.totalFiles > 0
      ? (progress.processedFiles / progress.totalFiles) * 100
      : 0
    : 0;

  // Cancel upload function
  const handleCancelUpload = async () => {
    if (!uploadSessionId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/bulk-upload/${uploadSessionId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(session as any)?.accessToken}`,
          },
        }
      );

      if (response.ok) {
        console.log("Upload cancelled successfully");
        // Update local state immediately
        setUploading(false);
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                status: "cancelled",
                completed: true,
                cancelled: true,
              }
            : null
        );
      } else {
        console.error("Failed to cancel upload");
        setError("Failed to cancel upload. Please try again.");
      }
    } catch (error) {
      console.error("Error cancelling upload:", error);
      setError("Error cancelling upload. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUpload} className="text-accent-600" />
                <CardTitle className="text-accent-700">Bulk Upload</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={uploading}
                className="h-8 w-8 p-0"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </Button>
            </div>
            <CardDescription className="text-accent-600">
              Upload thousands of images from a local folder path
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Development Warning */}
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-warning-700">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  className="text-sm"
                />
                <span className="text-sm font-medium">Development Feature</span>
              </div>
              <p className="text-xs text-warning-600 mt-1">
                Only available in development mode with server-side file access.
              </p>
            </div>

            {/* Progress Display */}
            {progress && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-primary-800 flex items-center gap-2">
                    <FontAwesomeIcon icon={faImages} />
                    Upload Progress
                  </h4>
                  <div className="flex items-center gap-2">
                    {progress.completed ? (
                      progress.status === "completed" ? (
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="text-success-600"
                        />
                      ) : progress.status === "cancelled" ? (
                        <FontAwesomeIcon
                          icon={faTimes}
                          className="text-warning-600"
                        />
                      ) : (
                        <FontAwesomeIcon
                          icon={faTimesCircle}
                          className="text-error-600"
                        />
                      )
                    ) : (
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="animate-spin text-primary-600"
                      />
                    )}
                    <span className="text-sm font-medium text-primary-700">
                      {progress.completed
                        ? progress.status === "completed"
                          ? "Completed"
                          : progress.status === "cancelled"
                          ? "Cancelled"
                          : "Failed"
                        : "Processing..."}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-primary-100 rounded-full h-3 mb-3">
                  <div
                    className="bg-primary-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {/* Progress Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-primary-800">
                      {progressPercentage.toFixed(1)}%
                    </div>
                    <div className="text-primary-600">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-primary-800">
                      {progress.processedFiles}/{progress.totalFiles}
                    </div>
                    <div className="text-primary-600">Files</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-success-700">
                      {progress.successfulUploads}
                    </div>
                    <div className="text-primary-600">Success</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-error-700">
                      {progress.failedUploads}
                    </div>
                    <div className="text-primary-600">Failed</div>
                  </div>
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                  {progress.skippedUploads !== undefined &&
                    progress.skippedUploads > 0 && (
                      <div className="text-center">
                        <div className="font-medium text-warning-700">
                          {progress.skippedUploads}
                        </div>
                        <div className="text-primary-600">Skipped</div>
                      </div>
                    )}
                  {progress.retriedUploads !== undefined &&
                    progress.retriedUploads > 0 && (
                      <div className="text-center">
                        <div className="font-medium text-secondary-600">
                          {progress.retriedUploads}
                        </div>
                        <div className="text-primary-600">Retried</div>
                      </div>
                    )}
                </div>

                {/* Time Info */}
                <div className="mt-3 flex justify-between text-sm text-primary-600">
                  <span>Elapsed: {formatElapsedTime(progress.startTime)}</span>
                  {!progress.completed && (
                    <span>ETA: {calculateETA(progress)}</span>
                  )}
                </div>

                {/* Current File */}
                {progress.currentFile && !progress.completed && (
                  <div className="mt-2 text-xs text-primary-600">
                    <span className="font-medium">Current:</span>{" "}
                    {progress.currentFile}
                  </div>
                )}

                {/* Success Rate Warning */}
                {/* Rate Limit Warning */}
                {progress.processedFiles > 5 &&
                  progress.failedUploads > 0 &&
                  progress.errors.some(
                    (e) =>
                      e.error.includes("429") ||
                      e.error.includes("Too many requests") ||
                      e.error.includes("ECONNRESET")
                  ) && (
                    <div className="mt-3 bg-error-50 border border-error-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-error-700">
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          className="text-sm"
                        />
                        <span className="text-sm font-medium">
                          Rate Limiting Detected
                        </span>
                      </div>
                      <p className="text-xs text-error-600 mt-1">
                        Server is rate limiting requests. Try reducing batch
                        size to 1 and increasing delay to 5000ms or higher.
                      </p>
                    </div>
                  )}

                {/* Low Success Rate Warning */}
                {progress.processedFiles > 50 &&
                  progress.successfulUploads / progress.processedFiles <
                    0.5 && (
                    <div className="mt-3 bg-warning-50 border border-warning-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-warning-700">
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          className="text-sm"
                        />
                        <span className="text-sm font-medium">
                          Low Success Rate
                        </span>
                      </div>
                      <p className="text-xs text-warning-600 mt-1">
                        High failure rate detected. Consider reducing batch size
                        or increasing delays.
                      </p>
                    </div>
                  )}

                {/* Errors */}
                {progress.errors && progress.errors.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-error-700">
                      {progress.errors.length} Errors (click to view)
                    </summary>
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs">
                      {progress.errors.slice(0, 15).map((error, index) => (
                        <div key={index} className="text-error-600 mb-1">
                          <span className="font-medium">{error.fileName}:</span>{" "}
                          {error.errorType && (
                            <span className="inline-block bg-error-100 text-error-800 px-1 rounded text-xs mr-1">
                              {error.errorType}
                            </span>
                          )}
                          {error.error}
                          {error.retryCount !== undefined &&
                            error.retryCount > 0 && (
                              <span className="text-secondary-600 ml-1">
                                (retry {error.retryCount})
                              </span>
                            )}
                        </div>
                      ))}
                      {progress.errors.length > 15 && (
                        <div className="text-error-500">
                          ...and {progress.errors.length - 15} more
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-3">
                <p className="text-error-700 text-sm">{error}</p>
              </div>
            )}

            {/* Upload Form */}
            {!uploading && (
              <form onSubmit={handleBulkUpload} className="space-y-4">
                {/* Folder Path */}
                <div>
                  <Label
                    htmlFor="folderPath"
                    className="flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faFolder} className="text-sm" />
                    Local Folder Path
                  </Label>
                  <Input
                    id="folderPath"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="/Users/yourname/flux-images"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Full path to folder containing your images
                  </p>
                </div>

                {/* Duplicate Detection */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Label htmlFor="skipDuplicates" className="text-sm">
                    Skip duplicate files (recommended)
                  </Label>
                </div>

                {/* Advanced Settings */}
                <details className="border border-neutral-200 rounded-lg">
                  <summary className="p-3 cursor-pointer hover:bg-neutral-50 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCog} className="text-sm" />
                    <span className="font-medium">Advanced Settings</span>
                  </summary>
                  <div className="p-3 border-t border-neutral-200 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="batchSize">Batch Size</Label>
                        <Input
                          id="batchSize"
                          type="number"
                          value={batchSize}
                          onChange={(e) =>
                            setBatchSize(parseInt(e.target.value))
                          }
                          min="1"
                          max="25"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Files per batch. Optimal: 10-15. Use 1-5 for large
                          uploads (1000+ files).
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="delay">Delay (ms)</Label>
                        <Input
                          id="delay"
                          type="number"
                          value={delay}
                          onChange={(e) => setDelay(parseInt(e.target.value))}
                          min="1000"
                          max="60000"
                          step="1000"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          Wait between batches. Optimal: 10-15s. Use 20-30s for
                          1000+ files.
                        </p>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!folderPath.trim()}
                  className="w-full bg-accent-500 hover:bg-accent-600 text-white"
                >
                  <FontAwesomeIcon icon={faUpload} className="mr-2" />
                  Start Bulk Upload
                </Button>
              </form>
            )}

            {/* Cancel button when uploading is in progress */}
            {uploading && !progress?.completed && (
              <Button
                onClick={handleCancelUpload}
                className="w-full bg-error-500 hover:bg-error-600 text-white"
                variant="destructive"
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Stop Upload
              </Button>
            )}

            {/* Close button when uploading is done */}
            {uploading && progress?.completed && (
              <Button onClick={onClose} className="w-full" variant="outline">
                Close
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
