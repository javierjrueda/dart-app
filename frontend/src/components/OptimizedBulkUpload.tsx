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
  expectedInJson?: boolean; // Whether this file was expected in the JSON
  jsonMetadata?: any; // Metadata from JSON for this file
}

interface JsonConfig {
  combinations: Array<{
    id: number;
    completed: boolean;
    failed: boolean;
    image_filename: string;
    prompt_short: string;
    prompt_full: string;
    lora_name?: string;
    lora_strength?: number;
    upscale_model?: string;
    sampler?: string;
    scheduler?: string;
    denoise?: number;
    generation_time_seconds?: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export default function OptimizedBulkUpload({
  projectId,
  onClose,
  onUploadComplete,
}: OptimizedBulkUploadProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [concurrency, setConcurrency] = useState(10); // Concurrent uploads
  const [promptNumber, setPromptNumber] = useState<number | undefined>(
    undefined
  ); // Prompt number for grouping tests
  const [jsonConfig, setJsonConfig] = useState<JsonConfig | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
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

  const handleJsonSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".json")) {
      setError("Please select a valid JSON file");
      return;
    }

    try {
      const text = await selectedFile.text();
      const config = JSON.parse(text) as JsonConfig;

      // Validate JSON structure
      if (!config.combinations || !Array.isArray(config.combinations)) {
        throw new Error(
          "Invalid JSON format: 'combinations' array is required"
        );
      }

      if (config.combinations.length === 0) {
        throw new Error("JSON configuration is empty");
      }

      // Filter out combinations without image_filename (they are errors/incomplete)
      const validCombinations = config.combinations.filter(
        (c) => c.image_filename && c.image_filename.trim() !== ""
      );

      const skippedCount =
        config.combinations.length - validCombinations.length;

      if (validCombinations.length === 0) {
        throw new Error("No valid combinations found with image_filename");
      }

      // Update the config with only valid combinations
      const cleanConfig = {
        ...config,
        combinations: validCombinations,
      };

      setJsonConfig(cleanConfig);
      setJsonFile(selectedFile);
      setError("");

      console.log(
        `📋 Loaded JSON config with ${validCombinations.length} valid files`
      );
      if (skippedCount > 0) {
        console.log(
          `⚠️ Skipped ${skippedCount} combinations without image_filename (generation errors)`
        );
      }
      console.log(
        `📋 Sample expected file:`,
        validCombinations[0].image_filename
      );

      // Show info about skipped combinations
      if (skippedCount > 0) {
        setError(
          `Info: Filtered out ${skippedCount} incomplete combinations without image files. Using ${validCombinations.length} valid combinations.`
        );
      }
    } catch (error) {
      console.error("JSON parsing error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to parse JSON file"
      );
      setJsonConfig(null);
      setJsonFile(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const validFiles = selectedFiles.filter((file) =>
      supportedTypes.includes(file.type)
    );

    // Handle files without JSON config
    if (!jsonConfig) {
      const fileStatuses: FileUploadStatus[] = validFiles.map((file) => ({
        file,
        status: "pending",
        progress: 0,
        expectedInJson: false, // No JSON to match against
        jsonMetadata: undefined,
      }));

      setFiles(fileStatuses);
      setError("");

      console.log(
        `📊 Files selected without JSON config: ${validFiles.length}`
      );

      if (validFiles.length !== selectedFiles.length) {
        setError(
          `${
            selectedFiles.length - validFiles.length
          } files were skipped (unsupported format)`
        );
      }
      return;
    }

    // Match files against JSON expectations
    const expectedFilenames = new Set(
      jsonConfig.combinations.map((c) => c.image_filename.toLowerCase())
    );

    const fileStatuses: FileUploadStatus[] = validFiles.map((file) => {
      const fileName = file.name.toLowerCase();
      const expectedInJson = expectedFilenames.has(fileName);

      // Find corresponding JSON metadata
      const jsonMetadata = jsonConfig.combinations.find(
        (c) => c.image_filename.toLowerCase() === fileName
      );

      return {
        file,
        status: "pending",
        progress: 0,
        expectedInJson,
        jsonMetadata,
      };
    });

    setFiles(fileStatuses);
    setError("");

    // Report on matching
    const expectedCount = jsonConfig.combinations.length;
    const foundExpected = fileStatuses.filter((f) => f.expectedInJson).length;
    const unexpectedFiles = fileStatuses.filter(
      (f) => !f.expectedInJson
    ).length;
    const missingFiles = expectedCount - foundExpected;

    console.log(`📊 File matching results:`);
    console.log(`   Expected files: ${expectedCount}`);
    console.log(`   Found expected: ${foundExpected}`);
    console.log(`   Missing files: ${missingFiles}`);
    console.log(`   Unexpected files: ${unexpectedFiles}`);

    if (validFiles.length !== selectedFiles.length) {
      setError(
        `${
          selectedFiles.length - validFiles.length
        } files were skipped (unsupported format)`
      );
    }

    if (missingFiles > 0) {
      setError(
        `Warning: ${missingFiles} expected files are missing from your selection. Check that all generated images are included.`
      );
    }

    if (unexpectedFiles > 0) {
      const unexpectedList = fileStatuses
        .filter((f) => !f.expectedInJson)
        .map((f) => f.file.name)
        .slice(0, 3)
        .join(", ");
      setError(
        `Info: ${unexpectedFiles} files were not found in the JSON config (${unexpectedList}${
          unexpectedFiles > 3 ? "..." : ""
        }). They will still be uploaded.`
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

    // Process files in batches for cleaner concurrent handling
    for (let i = 0; i < filesToUpload.length; i += maxConcurrency) {
      const batch = filesToUpload.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (fileStatus) => {
        const fileIndex = filesToUpload.indexOf(fileStatus);

        try {
          // Update status to uploading
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, status: "uploading" } : f
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
                prev.map((f, idx) =>
                  idx === fileIndex ? { ...f, progress } : f
                )
              );
            }
          );

          // Mark as successful
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, status: "success", progress: 100 } : f
            )
          );

          console.log(`✅ Upload successful: ${fileStatus.file.name}`);
          return { success: true, fileIndex };
        } catch (error) {
          // Mark as failed
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? { ...f, status: "error", error: errorMessage }
                : f
            )
          );

          console.error(
            `❌ Upload failed for "${fileStatus.file.name}":`,
            error
          );
          return { success: false, fileIndex, error: errorMessage };
        }
      });

      // Wait for all uploads in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Extract results from settled promises
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error("Batch promise error:", result.reason);
        }
      });
    }

    return results;
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    // Validate prompt number is provided
    if (promptNumber === undefined || promptNumber === null) {
      setError(
        "Test Group / Prompt Number is required. Please enter a number to group these images."
      );
      return;
    }

    // JSON config is now optional
    // if (!jsonConfig) {
    //   setError("Please upload a JSON configuration file first");
    //   return;
    // }

    setUploading(true);
    setError("");
    setUploadStartTime(Date.now());

    try {
      // Step 1: Get presigned URLs for all files with JSON metadata
      console.log("📋 Getting presigned URLs for", files.length, "files...");

      const fileMetadata = files.map((f) => {
        // Use JSON metadata instead of filename extraction
        const generationParams = f.jsonMetadata
          ? {
              prompt_short: f.jsonMetadata.prompt_short,
              prompt_full: f.jsonMetadata.prompt_full,
              lora_name: f.jsonMetadata.lora_name,
              lora_strength: f.jsonMetadata.lora_strength,
              upscale_model: f.jsonMetadata.upscale_model,
              sampler: f.jsonMetadata.sampler,
              scheduler: f.jsonMetadata.scheduler,
              denoise: f.jsonMetadata.denoise,
              generation_time_seconds: f.jsonMetadata.generation_time_seconds,
              combination_id: f.jsonMetadata.id,
              completed: f.jsonMetadata.completed,
              failed: f.jsonMetadata.failed,
            }
          : {};

        return {
          fileName: f.file.name,
          contentType: f.file.type,
          size: f.file.size,
          generationParams,
          expectedInJson: f.expectedInJson,
        };
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/media/batch-presigned-urls`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session as any)?.accessToken}`,
          },
          body: JSON.stringify({
            files: fileMetadata,
            promptNumber: promptNumber,
            jsonConfig: jsonConfig
              ? {
                  source: jsonFile?.name,
                  totalExpected: jsonConfig.combinations.length,
                }
              : null,
          }),
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

        // Enhanced logging: categorize skipped files
        const duplicates = skippedDetails.filter(
          (s: any) => s.reason === "Duplicate file"
        );
        const invalidTypes = skippedDetails.filter(
          (s: any) => s.reason === "Invalid file type"
        );
        const otherSkips = skippedDetails.filter(
          (s: any) =>
            s.reason !== "Duplicate file" && s.reason !== "Invalid file type"
        );

        if (duplicates.length > 0) {
          console.log(
            `🔄 ${duplicates.length} files skipped as smart duplicates:`
          );
          duplicates.forEach((dup: any) => console.log(`   - ${dup.fileName}`));
        }

        if (invalidTypes.length > 0) {
          console.log(
            `❌ ${invalidTypes.length} files skipped due to invalid type:`
          );
          invalidTypes.forEach((inv: any) =>
            console.log(`   - ${inv.fileName}`)
          );
        }

        if (otherSkips.length > 0) {
          console.log(
            `⚠️ ${otherSkips.length} files skipped for other reasons:`
          );
          otherSkips.forEach((other: any) =>
            console.log(`   - ${other.fileName}: ${other.reason}`)
          );
        }
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
          prompt: promptNumber,
          // Send JSON metadata instead of extracting from filename
          generationParams: f.jsonMetadata
            ? {
                prompt_short: f.jsonMetadata.prompt_short,
                prompt_full: f.jsonMetadata.prompt_full,
                lora_name: f.jsonMetadata.lora_name,
                lora_strength: f.jsonMetadata.lora_strength,
                upscale_model: f.jsonMetadata.upscale_model,
                sampler: f.jsonMetadata.sampler,
                scheduler: f.jsonMetadata.scheduler,
                denoise: f.jsonMetadata.denoise,
                generation_time_seconds: f.jsonMetadata.generation_time_seconds,
                combination_id: f.jsonMetadata.id,
                completed: f.jsonMetadata.completed,
                failed: f.jsonMetadata.failed,
                extraction_method: "json",
              }
            : {
                extraction_method: "manual", // For files not in JSON
              },
          expectedInJson: f.expectedInJson,
        }));

        console.log(
          `📤 Sending ${confirmData.length} files to confirm with prompt: ${promptNumber}`
        );
        console.log(`📋 Sample confirm data:`, confirmData[0]);

        const confirmResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/media/confirm-batch-upload`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(session as any)?.accessToken}`,
            },
            body: JSON.stringify({
              uploadedFiles: confirmData,
              jsonConfig: jsonConfig
                ? {
                    source: jsonFile?.name,
                    totalExpected: jsonConfig.combinations.length,
                    foundExpected: successfulUploads.filter(
                      (f) => f.expectedInJson
                    ).length,
                    foundExtra: successfulUploads.filter(
                      (f) => !f.expectedInJson
                    ).length,
                  }
                : null,
            }),
          }
        );

        console.log(`📥 Confirm response status:`, confirmResponse.status);
        if (confirmResponse.ok) {
          const confirmResult = await confirmResponse.json();
          console.log(`📊 Confirm result:`, confirmResult);
        } else {
          const confirmError = await confirmResponse.text();
          console.error(
            "❌ Confirm batch upload failed:",
            confirmResponse.status,
            confirmError
          );
          setError(
            `Upload confirmation failed: ${confirmResponse.status} - ${confirmError}`
          );
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
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faRocket} className="text-primary-500" />
            Optimized Bulk Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fast direct uploads to cloud storage with smart duplicate detection
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-4 px-6">
          {/* JSON Configuration Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              1. Upload JSON Configuration File{" "}
              <span className="text-sm text-neutral-500">(optional)</span>
            </label>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonSelect}
              className="w-full p-2 border rounded"
              disabled={uploading}
            />
            {jsonConfig && jsonFile && (
              <div className="p-3 bg-success-50 border border-success-200 rounded">
                <div className="text-sm text-success-700">
                  ✅ Loaded: {jsonFile.name}
                </div>
                <div className="text-xs text-success-600 mt-1">
                  Expected files: {jsonConfig.combinations.length}
                </div>
              </div>
            )}
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              2. Select Generated Files <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov"
              onChange={handleFileSelect}
              className="w-full p-2 border rounded"
              disabled={uploading}
            />
            <div className="text-xs text-neutral-500">
              {jsonConfig
                ? "Select files that match your JSON configuration"
                : "Select any supported image/video files"}
            </div>
          </div>

          {/* File Summary */}
          {files.length > 0 && (
            <div className="p-3 bg-neutral-50 border rounded">
              {jsonConfig ? (
                // JSON Config Mode - Show matching summary
                <>
                  <div className="text-sm font-medium mb-2">
                    File Matching Summary
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-primary-100 rounded">
                      <div className="font-semibold">
                        {jsonConfig.combinations.length}
                      </div>
                      <div className="text-xs text-primary-600">Expected</div>
                    </div>
                    <div className="p-2 bg-success-100 rounded">
                      <div className="font-semibold">
                        {files.filter((f) => f.expectedInJson).length}
                      </div>
                      <div className="text-xs text-success-600">Found</div>
                    </div>
                    <div className="p-2 bg-warning-100 rounded">
                      <div className="font-semibold">
                        {jsonConfig.combinations.length -
                          files.filter((f) => f.expectedInJson).length}
                      </div>
                      <div className="text-xs text-warning-600">Missing</div>
                    </div>
                    <div className="p-2 bg-secondary-100 rounded">
                      <div className="font-semibold">
                        {files.filter((f) => !f.expectedInJson).length}
                      </div>
                      <div className="text-xs text-secondary-600">Extra</div>
                    </div>
                  </div>
                </>
              ) : (
                // No JSON Config - Show simple file count
                <>
                  <div className="text-sm font-medium mb-2">Files Selected</div>
                  <div className="flex justify-center">
                    <div className="p-2 bg-primary-100 rounded text-center">
                      <div className="font-semibold text-lg">
                        {files.length}
                      </div>
                      <div className="text-xs text-primary-600">
                        Files Ready
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500 mt-2 text-center">
                    All files will be uploaded without JSON metadata
                  </div>
                </>
              )}
            </div>
          )}

          {/* Prompt Number Field - Prominent */}
          <div className="space-y-2 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <label className="text-sm font-medium text-primary-700">
              3. Test Group / Prompt Number{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={promptNumber ?? ""}
              onChange={(e) =>
                setPromptNumber(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              disabled={uploading}
              className={`w-full p-3 border rounded focus:ring-1 ${
                error && error.includes("Test Group / Prompt Number")
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-primary-300 focus:border-primary-500 focus:ring-primary-500"
              }`}
              placeholder="Enter a number to group these images (e.g., 1, 2, 3...)"
              min="0"
              required
            />
            <div className="text-xs text-primary-600 space-y-1">
              <p>
                <strong>Important:</strong> This number groups all images from
                the same {jsonConfig ? "JSON configuration" : "upload batch"}.
              </p>
              <p>
                Images with the same prompt number will only compete against
                each other in battles.
              </p>
              <p>
                <strong>Example:</strong> First upload = Prompt 1, Second upload
                = Prompt 2, etc.
              </p>
              <p className="text-red-600 font-medium">
                * This field is required
              </p>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-2">
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
            <div className="max-h-48 overflow-y-auto border rounded">
              {files.map((fileStatus, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-3 border-b last:border-b-0 ${
                    !fileStatus.expectedInJson ? "bg-warning-50" : ""
                  }`}
                >
                  {/* File Info - Reduced width */}
                  <div className="flex-1 min-w-0 max-w-[40%]">
                    <div
                      className="text-sm font-medium truncate"
                      title={fileStatus.file.name}
                    >
                      {fileStatus.file.name}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {(fileStatus.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                    {/* Metadata info moved to separate line */}
                    {fileStatus.jsonMetadata && (
                      <div className="text-xs text-primary-600 mt-1 truncate">
                        {fileStatus.jsonMetadata.prompt_short}
                        {fileStatus.jsonMetadata.sampler &&
                          ` • ${fileStatus.jsonMetadata.sampler}`}
                      </div>
                    )}
                    {/* Show error details for failed files */}
                    {fileStatus.status === "error" && fileStatus.error && (
                      <div
                        className="text-xs text-error-600 mt-1 truncate"
                        title={fileStatus.error}
                      >
                        Error: {fileStatus.error}
                      </div>
                    )}
                  </div>

                  {/* Status Badge - More prominent */}
                  <div className="flex-shrink-0">
                    {fileStatus.expectedInJson ? (
                      <div className="flex items-center gap-1 text-xs bg-success-100 text-success-700 px-3 py-2 rounded-md font-medium">
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="text-success-600"
                        />
                        Expected
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs bg-warning-100 text-warning-700 px-3 py-2 rounded-md font-medium">
                        <FontAwesomeIcon
                          icon={faImages}
                          className="text-warning-600"
                        />
                        Extra
                      </div>
                    )}
                  </div>

                  {/* Progress/Status Area - More space */}
                  <div className="flex items-center gap-3 min-w-[120px]">
                    {fileStatus.status === "uploading" && (
                      <>
                        <div className="flex-1 min-w-[80px]">
                          <div className="w-full bg-neutral-200 rounded-full h-3">
                            <div
                              className="bg-primary-600 h-3 rounded-full transition-all flex items-center justify-center"
                              style={{ width: `${fileStatus.progress}%` }}
                            >
                              {fileStatus.progress > 20 && (
                                <span className="text-xs text-white font-medium">
                                  {Math.round(fileStatus.progress)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <FontAwesomeIcon
                          icon={faSpinner}
                          spin
                          className="text-primary-500 text-lg"
                        />
                      </>
                    )}
                    {fileStatus.status === "success" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-success-600 font-medium">
                          Complete
                        </span>
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="text-success-500 text-lg"
                        />
                      </div>
                    )}
                    {fileStatus.status === "error" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-error-600 font-medium">
                          Failed
                        </span>
                        <FontAwesomeIcon
                          icon={faTimesCircle}
                          className="text-error-500 text-lg"
                          title={fileStatus.error || "Upload failed"}
                        />
                      </div>
                    )}
                    {fileStatus.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 font-medium">
                          Pending
                        </span>
                        <FontAwesomeIcon
                          icon={faImages}
                          className="text-neutral-400 text-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-error-50 border border-error-200 rounded text-error-700">
              {error}
            </div>
          )}

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

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 p-6 pt-0">
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
        </div>
      </Card>
    </div>
  );
}
