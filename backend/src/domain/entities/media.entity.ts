export interface MediaProfile {
  id: string;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  quality?: number; // -1 (bad), 0 (unrated), 1 (good)
  loraTraining?: string;
  promptDescription?: string;
  generationParams?: Record<string, any>;
  extractionMethod: "filename" | "metadata" | "manual";
  filename?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for filename extraction patterns
export interface FilenameExtractionResult {
  cfg?: number;
  orient?: number;
  sampler?: string;
  scheduler?: string;
  prompt?: number;
  batch?: number;
  node?: number;
  [key: string]: any;
}

export class Media {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public mediaUrl: string,
    public mediaType: "image" | "video",
    public elo: number = 1200,
    public quality: number = 0, // Default to unrated
    public loraTraining?: string,
    public promptDescription?: string,
    public generationParams?: Record<string, any>,
    public extractionMethod: "filename" | "metadata" | "manual" = "filename",
    public filename?: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static create(data: {
    projectId: string;
    mediaUrl: string;
    mediaType: "image" | "video";
    elo?: number;
    quality?: number;
    loraTraining?: string;
    promptDescription?: string;
    generationParams?: Record<string, any>;
    extractionMethod?: "filename" | "metadata" | "manual";
    filename?: string;
  }): Media {
    const media = new Media(
      Media.generateId(),
      data.projectId,
      data.mediaUrl,
      data.mediaType,
      data.elo || 1200,
      data.quality || 0,
      data.loraTraining,
      data.promptDescription,
      data.generationParams,
      data.extractionMethod || "filename",
      data.filename
    );

    // Extract parameters from filename if not provided manually
    if (
      data.filename &&
      !data.generationParams &&
      data.extractionMethod !== "manual"
    ) {
      media.generationParams = Media.extractParametersFromFilename(
        data.filename
      );
    }

    return media;
  }

  // Method to extract parameters from filename
  static extractParametersFromFilename(filename: string): Record<string, any> {
    const result: Record<string, any> = {};

    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

    // Split by underscores and analyze each part
    const parts = nameWithoutExt.split("_");

    for (const part of parts) {
      // Match patterns like "cfg-7.0", "orient-7.0", etc.
      const paramMatch = part.match(/^([a-zA-Z]+)-(.+)$/);
      if (paramMatch) {
        const [, key, value] = paramMatch;

        // Try to convert to number if possible
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          result[key] = numValue;
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  updateElo(newElo: number): void {
    this.elo = newElo;
    this.updatedAt = new Date();
  }

  updateMediaUrl(newUrl: string): void {
    this.mediaUrl = newUrl;
    this.updatedAt = new Date();
  }

  updateLoraTraining(loraTraining?: string): void {
    this.loraTraining = loraTraining;
    this.updatedAt = new Date();
  }

  updatePromptDescription(promptDescription?: string): void {
    this.promptDescription = promptDescription;
    this.updatedAt = new Date();
  }

  updateGenerationParams(generationParams?: Record<string, any>): void {
    this.generationParams = generationParams;
    this.updatedAt = new Date();
  }

  updateQuality(quality: number): void {
    if (quality !== -1 && quality !== 0 && quality !== 1) {
      throw new Error("Quality must be -1, 0, or 1");
    }
    this.quality = quality;
    this.updatedAt = new Date();
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toProfile(): MediaProfile {
    return {
      id: this.id,
      projectId: this.projectId,
      mediaUrl: this.mediaUrl,
      mediaType: this.mediaType,
      elo: this.elo,
      quality: this.quality,
      loraTraining: this.loraTraining,
      promptDescription: this.promptDescription,
      generationParams: this.generationParams,
      extractionMethod: this.extractionMethod,
      filename: this.filename,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    return this.toProfile();
  }
}
