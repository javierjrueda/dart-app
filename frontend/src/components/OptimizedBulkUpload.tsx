"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faImages,
  faRocket,
} from "@fortawesome/free-solid-svg-icons";

interface UploadResults {
  totalFiles: number;
  successful: number;
  failed: number;
  skippedDuplicates: number;
  duration: number;
}

interface OptimizedBulkUploadProps {
  projectId: string;
  onClose: (results?: UploadResults) => void;
  onUploadComplete?: () => void;
}

interface FileUploadStatus {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
  mediaType?: string;
}

export default function OptimizedBulkUpload({
  projectId,
  onClose,
  onUploadComplete,
}: OptimizedBulkUploadProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [concurrency, setConcurrency] = useState(10); // Concurrent uploads
  const [error, setError] = useState("");
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);

  const handleClose = (results?: UploadResults) => {
    onClose(results);
  };

  const supportedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const validFiles = selectedFiles.filter((file) =>
      supportedTypes.includes(file.type)
    );

    const fileStatuses: FileUploadStatus[] = validFiles.map((file) => ({
      file,
      status: "pending",
      progress: 0,
    }));

    setFiles(fileStatuses);
    setError("");

    if (validFiles.length !== selectedFiles.length) {
      setError(
        `${
          selectedFiles.length - validFiles.length
        } files were skipped (unsupported format)`
      );
    }
  };

  const uploadFileToR2 = async (
    file: File,
    uploadUrl: string,
    onProgress: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const processConcurrentUploads = async (
    filesToUpload: FileUploadStatus[],
    maxConcurrency: number
  ) => {
    const results: Array<{
      success: boolean;
      fileIndex: number;
      error?: string;
    }> = [];

    const uploadQueue = [...filesToUpload];
    const activeUploads: Promise<void>[] = [];

    while (uploadQueue.length > 0 || activeUploads.length > 0) {
      // Start new uploads up to the concurrency limit
      while (activeUploads.length < maxConcurrency && uploadQueue.length > 0) {
        const fileStatus = uploadQueue.shift()!;
        const fileIndex = filesToUpload.indexOf(fileStatus);

        const uploadPromise = (async () => {
          try {
            // Update status to uploading
            setFiles((prev) =>
              prev.map((f, i) =>
                i === fileIndex ? { ...f, status: "uploading" } : f
              )
            );

            if (!fileStatus.uploadUrl) {
              throw new Error("No upload URL available");
            }

            await uploadFileToR2(
              fileStatus.file,
              fileStatus.uploadUrl,
              (progress) => {
                setFiles((prev) =>
                  prev.map((f, i) => (i === fileIndex ? { ...f, progress } : f))
                );
              }
            );

            // Mark as successful
            setFiles((prev) =>
              prev.map((f, i) =>
                i === fileIndex ? { ...f, status: "success", progress: 100 } : f
              )
            );

            results.push({ success: true, fileIndex });
          } catch (error) {
            // Mark as failed
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            setFiles((prev) =>
              prev.map((f, i) =>
                i === fileIndex
                  ? { ...f, status: "error", error: errorMessage }
                  : f
              )
            );

            results.push({ success: false, fileIndex, error: errorMessage });
            console.error(
              `❌ Upload failed for "${fileStatus.file.name}":`,
              error
            );
          }
        })();

        activeUploads.push(uploadPromise);
      }

      // Wait for at least one upload to complete
      if (activeUploads.length > 0) {
        await Promise.race(activeUploads);

        // Remove completed uploads
        for (let i = activeUploads.length - 1; i >= 0; i--) {
          const upload = activeUploads[i];
          try {
            await Promise.race([upload, Promise.resolve()]);
            activeUploads.splice(i, 1);
          } catch {
            // Upload is still in progress
          }
        }
      }
    }

    return results;
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    setUploading(true);
    setError("");
    setUploadStartTime(Date.now());

    try {
      // Step 1: Get presigned URLs for all files
      console.log("📋 Getting presigned URLs for", files.length, "files...");

      const fileMetadata = files.map((f) => ({
        fileName: f.file.name,
        contentType: f.file.type,
        size: f.file.size,
      }));

      const response = await fetch(
        `http://localhost:3001/api/v1/projects/${projectId}/media/batch-presigned-urls`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session as any)?.accessToken}`,
          },
          body: JSON.stringify({ files: fileMetadata }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get upload URLs");
      }

      const {
        presignedUrls,
        skippedDuplicates,
        skippedInvalidTypes,
        skippedTotal,
        skippedDetails,
      } = await response.json();

      console.log(
        `🔗 Got ${
          presignedUrls.length
        } presigned URLs, skipped ${skippedDuplicates} duplicates, ${
          skippedInvalidTypes || 0
        } invalid types`
      );

      // Log skipped file details for debugging
      if (skippedDetails && skippedDetails.length > 0) {
        console.log("📋 Skipped files details:", skippedDetails);
      }

      // Debug: Log first presigned URL to check format
      if (presignedUrls.length > 0) {
        console.log(`📋 Sample presigned URL:`, {
          fileName: presignedUrls[0].fileName,
          uploadUrl: presignedUrls[0].uploadUrl?.substring(0, 100) + "...",
          mediaType: presignedUrls[0].mediaType,
        });
      }

      // Update files with presigned URLs or mark as skipped
      const updatedFiles = files.map((fileStatus) => {
        const presignedData = presignedUrls.find(
          (p: any) => p.fileName === fileStatus.file.name
        );

        if (presignedData) {
          return {
            ...fileStatus,
            uploadUrl: presignedData.uploadUrl,
            publicUrl: presignedData.publicUrl,
            key: presignedData.key,
            mediaType: presignedData.mediaType,
          };
        }

        // Check if this file was explicitly skipped
        const skippedInfo = skippedDetails?.find(
          (s: any) => s.fileName === fileStatus.file.name
        );

        if (skippedInfo) {
          return {
            ...fileStatus,
            status: "error" as const,
            error:
              skippedInfo.reason === "Duplicate file"
                ? "🔄 File already exists (duplicate)"
                : skippedInfo.reason === "Invalid file type"
                ? "❌ Invalid file type"
                : skippedInfo.reason,
          };
        }

        // Fallback for unknown skip reason
        return {
          ...fileStatus,
          status: "error" as const,
          error: "File skipped (duplicate or invalid format)",
        };
      });

      setFiles(updatedFiles);

      // Step 2: Upload files directly to R2 with concurrency control
      const filesToUpload = updatedFiles.filter((f) => f.uploadUrl);
      console.log(
        `🚀 Starting concurrent upload of ${filesToUpload.length} files (max ${concurrency} at once)...`
      );

      const uploadResults = await processConcurrentUploads(
        filesToUpload,
        concurrency
      );

      // Step 3: Confirm successful uploads with the backend
      const successfulUploads = updatedFiles.filter((f, i) =>
        uploadResults.some((r) => r.success && r.fileIndex === i)
      );

      if (successfulUploads.length > 0) {
        console.log(
          `✅ Confirming ${successfulUploads.length} successful uploads...`
        );

        const confirmData = successfulUploads.map((f) => ({
          fileName: f.file.name,
          key: f.key!,
          publicUrl: f.publicUrl!,
          mediaType: f.mediaType!,
        }));

        const confirmResponse = await fetch(
          `http://localhost:3001/api/v1/projects/${projectId}/media/confirm-batch-upload`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(session as any)?.accessToken}`,
            },
            body: JSON.stringify({ uploadedFiles: confirmData }),
          }
        );

        if (!confirmResponse.ok) {
          console.warn("Warning: Some uploads may not be recorded in database");
        }
      }

      setCompleted(true);
      console.log("🎉 Bulk upload completed!");

      // Store final results for toast notification
      const finalStats = getStats();
      const duplicateFiles = files.filter(
        (f) =>
          f.status === "error" &&
          f.error?.includes("already exists (duplicate)")
      ).length;

      const finalResults: UploadResults = {
        totalFiles: finalStats.total,
        successful: finalStats.success,
        failed: finalStats.errors - duplicateFiles, // Don't count duplicates as failures
        skippedDuplicates: duplicateFiles,
        duration: uploadStartTime ? (Date.now() - uploadStartTime) / 1000 : 0,
      };

      // Store results in state for the close button
      (window as any)._lastUploadResults = finalResults;

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      setError(error instanceof Error ? error.message : "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getStats = () => {
    const total = files.length;
    const pending = files.filter((f) => f.status === "pending").length;
    const uploading = files.filter((f) => f.status === "uploading").length;
    const success = files.filter((f) => f.status === "success").length;
    const errors = files.filter((f) => f.status === "error").length;

    return { total, pending, uploading, success, errors };
  };

  const stats = getStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faRocket} className="text-blue-500" />
            Optimized Bulk Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fast direct uploads to cloud storage with smart duplicate detection
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Files</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov"
              onChange={handleFileSelect}
              className="w-full p-2 border rounded"
              disabled={uploading}
            />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                Max Concurrent Uploads
              </label>
              <select
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                disabled={uploading}
                className="w-full p-2 border rounded"
              >
                <option value={5}>5 (Conservative)</option>
                <option value={10}>10 (Recommended)</option>
                <option value={20}>20 (Aggressive)</option>
                <option value={30}>30 (Maximum)</option>
              </select>
            </div>
          </div>

          {/* Progress Stats */}
          {files.length > 0 && (
            <div className="grid grid-cols-6 gap-2 text-center">
              <div className="p-2 bg-neutral-100 rounded">
                <div className="font-semibold">{stats.total}</div>
                <div className="text-xs text-neutral-600">Total</div>
              </div>
              <div className="p-2 bg-yellow-100 rounded">
                <div className="font-semibold">{stats.pending}</div>
                <div className="text-xs text-neutral-600">Pending</div>
              </div>
              <div className="p-2 bg-primary-100 rounded">
                <div className="font-semibold">{stats.uploading}</div>
                <div className="text-xs text-primary-600">Uploading</div>
              </div>
              <div className="p-2 bg-success-100 rounded">
                <div className="font-semibold">{stats.success}</div>
                <div className="text-xs text-success-600">Success</div>
              </div>
              <div className="p-2 bg-secondary-100 rounded">
                <div className="font-semibold">
                  {
                    files.filter(
                      (f) =>
                        f.status === "error" &&
                        f.error?.includes("already exists (duplicate)")
                    ).length
                  }
                </div>
                <div className="text-xs text-secondary-600">Duplicates</div>
              </div>
              <div className="p-2 bg-error-100 rounded">
                <div className="font-semibold">
                  {
                    files.filter(
                      (f) =>
                        f.status === "error" &&
                        !f.error?.includes("already exists (duplicate)")
                    ).length
                  }
                </div>
                <div className="text-xs text-error-600">Errors</div>
              </div>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="max-h-64 overflow-y-auto border rounded">
              {files.map((fileStatus, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border-b last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {fileStatus.file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(fileStatus.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                    {/* Show error details for failed files */}
                    {fileStatus.status === "error" && fileStatus.error && (
                      <div
                        className="text-xs text-red-600 mt-1 truncate"
                        title={fileStatus.error}
                      >
                        Error: {fileStatus.error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {fileStatus.status === "uploading" && (
                      <>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${fileStatus.progress}%` }}
                          />
                        </div>
                        <FontAwesomeIcon
                          icon={faSpinner}
                          spin
                          className="text-blue-500"
                        />
                      </>
                    )}
                    {fileStatus.status === "success" && (
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-green-500"
                      />
                    )}
                    {fileStatus.status === "error" && (
                      <FontAwesomeIcon
                        icon={faTimesCircle}
                        className="text-red-500"
                        title={fileStatus.error || "Upload failed"}
                      />
                    )}
                    {fileStatus.status === "pending" && (
                      <FontAwesomeIcon
                        icon={faImages}
                        className="text-gray-400"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (completed) {
                  // Get stored results or calculate them
                  const storedResults = (window as any)._lastUploadResults;
                  if (storedResults) {
                    handleClose(storedResults);
                    delete (window as any)._lastUploadResults;
                  } else {
                    const results: UploadResults = {
                      totalFiles: stats.total,
                      successful: stats.success,
                      failed: stats.errors,
                      skippedDuplicates: 0,
                      duration: uploadStartTime
                        ? (Date.now() - uploadStartTime) / 1000
                        : 0,
                    };
                    handleClose(results);
                  }
                } else {
                  handleClose();
                }
              }}
              disabled={uploading}
            >
              {completed ? "Close" : "Cancel"}
            </Button>

            <Button
              onClick={handleBulkUpload}
              disabled={uploading || files.length === 0}
              className="min-w-[120px]"
            >
              {uploading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUpload} className="mr-2" />
                  Upload {files.length} Files
                </>
              )}
            </Button>
          </div>

          {/* Results Summary */}
          {completed && (
            <div className="space-y-3">
              {/* Success Message */}
              {stats.success > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2 text-green-700">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <span className="font-medium">Upload Complete!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Successfully uploaded {stats.success} files
                  </p>
                </div>
              )}

              {/* Duplicates Summary */}
              {files.filter(
                (f) =>
                  f.status === "error" &&
                  f.error?.includes("already exists (duplicate)")
              ).length > 0 && (
                <div className="p-4 bg-secondary-50 border border-secondary-200 rounded">
                  <div className="flex items-center gap-2 text-secondary-700 mb-2">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <span className="font-medium">
                      Duplicates Skipped (
                      {
                        files.filter(
                          (f) =>
                            f.status === "error" &&
                            f.error?.includes("already exists (duplicate)")
                        ).length
                      }
                      )
                    </span>
                  </div>
                  <p className="text-sm text-secondary-600">
                    These files already exist in your project and were
                    automatically skipped to prevent duplicates.
                  </p>
                </div>
              )}

              {/* Error Summary */}
              {files.filter(
                (f) =>
                  f.status === "error" &&
                  !f.error?.includes("already exists (duplicate)")
              ).length > 0 && (
                <div className="p-4 bg-error-50 border border-error-200 rounded">
                  <div className="flex items-center gap-2 text-error-700 mb-2">
                    <FontAwesomeIcon icon={faTimesCircle} />
                    <span className="font-medium">
                      Upload Errors (
                      {
                        files.filter(
                          (f) =>
                            f.status === "error" &&
                            !f.error?.includes("already exists (duplicate)")
                        ).length
                      }
                      )
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-error-600">
                    {/* Group errors by type */}
                    {(() => {
                      const errorGroups: Record<string, number> = {};
                      files
                        .filter(
                          (f) =>
                            f.status === "error" &&
                            !f.error?.includes("already exists (duplicate)")
                        )
                        .forEach((f) => {
                          const errorType = f.error?.includes("CORS")
                            ? "CORS Policy"
                            : f.error?.includes("403")
                            ? "Access Denied"
                            : f.error?.includes("Network")
                            ? "Network Error"
                            : f.error?.includes("No upload URL")
                            ? "Missing Upload URL"
                            : f.error?.includes("Invalid file type")
                            ? "Invalid File Type"
                            : "Other Error";
                          errorGroups[errorType] =
                            (errorGroups[errorType] || 0) + 1;
                        });

                      return Object.entries(errorGroups).map(
                        ([type, count]) => (
                          <div key={type}>
                            • {type}: {count} files
                          </div>
                        )
                      );
                    })()}
                    <div className="mt-2 text-xs">
                      💡 Check browser console (F12) for detailed error logs
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
