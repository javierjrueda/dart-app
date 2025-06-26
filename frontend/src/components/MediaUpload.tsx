"use client";

import { useState, useRef } from "react";
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
  faCloudUpload,
  faImage,
  faVideo,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

interface MediaUploadProps {
  projectId: string;
  onUploadSuccess: (media: any) => void;
  onClose?: () => void;
}

export default function MediaUpload({
  projectId,
  onUploadSuccess,
  onClose,
}: MediaUploadProps) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loraTraining, setLoraTraining] = useState("");
  const [promptDescription, setPromptDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setError("");

    // Validate file type
    const allowedTypes = [
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

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Please upload an image or video.");
      return;
    }

    // Validate file size (50MB limit)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size too large. Please upload a file smaller than 50MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("media", file);
      if (loraTraining) formData.append("loraTraining", loraTraining);
      if (promptDescription)
        formData.append("promptDescription", promptDescription);
      formData.append("extractionMethod", "filename");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/projects/${projectId}/media/upload`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${(session as any)?.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      onUploadSuccess(result.media);
      setFile(null);
      setLoraTraining("");
      setPromptDescription("");

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return faImage;
    } else if (fileType.startsWith("video/")) {
      return faVideo;
    }
    return faCloudUpload;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-primary-500">Upload Media</CardTitle>
        <CardDescription>
          Upload images or videos to your project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-primary-500 bg-primary-50"
              : "border-neutral-300 hover:border-primary-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
          />

          <div className="space-y-2">
            <FontAwesomeIcon
              icon={faCloudUpload}
              className="text-3xl text-neutral-400"
            />
            <p className="text-neutral-600">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-neutral-400">
              Images and videos up to 50MB
            </p>
          </div>
        </div>

        {/* Selected File Display */}
        {file && (
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon
                icon={getFileIcon(file.type)}
                className="text-primary-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && <p className="text-error-600 text-sm">{error}</p>}

        {/* Input Fields */}
        <div className="space-y-4">
          <Label htmlFor="loraTraining">Lora Training</Label>
          <Input
            id="loraTraining"
            value={loraTraining}
            onChange={(e) => setLoraTraining(e.target.value)}
          />

          <Label htmlFor="promptDescription">Prompt Description</Label>
          <Input
            id="promptDescription"
            value={promptDescription}
            onChange={(e) => setPromptDescription(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="animate-spin mr-2"
                />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>

          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
