import { Media } from "@/domain/entities/media.entity";
import { MediaRepository } from "@/domain/repositories/media.repository";

export class MediaUseCases {
  constructor(private mediaRepository: MediaRepository) {}

  async getAllMedia(): Promise<Media[]> {
    return await this.mediaRepository.findAll();
  }

  async getMediaById(id: string): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }
    return await this.mediaRepository.findById(id);
  }

  async getMediaByProjectId(projectId: string): Promise<Media[]> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }
    return await this.mediaRepository.findByProjectId(projectId);
  }

  async createMedia(data: {
    projectId: string;
    mediaUrl: string;
    mediaType: "image" | "video";
    elo?: number;
    loraTraining?: string;
    promptDescription?: string;
    generationParams?: Record<string, any>;
    extractionMethod?: "filename" | "metadata" | "manual";
    filename?: string;
  }): Promise<Media> {
    // Validation
    if (!data.projectId || !data.mediaUrl || !data.mediaType) {
      throw new Error("Project ID, media URL, and media type are required");
    }

    if (!["image", "video"].includes(data.mediaType)) {
      throw new Error("Media type must be either 'image' or 'video'");
    }

    // Optionally check for duplicate filename if skipDuplicates is enabled
    // Note: This check can be bypassed during bulk upload if skipDuplicates is false

    const media = Media.create({
      projectId: data.projectId,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      elo: data.elo || 1200,
      loraTraining: data.loraTraining,
      promptDescription: data.promptDescription,
      generationParams: data.generationParams,
      extractionMethod: data.extractionMethod || "filename",
      filename: data.filename,
    });

    return await this.mediaRepository.create(media);
  }

  async updateMedia(
    id: string,
    updateData: Partial<Media>
  ): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new Error("Media not found");
    }

    return await this.mediaRepository.update(id, updateData);
  }

  async deleteMedia(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    const existingMedia = await this.mediaRepository.findById(id);
    if (!existingMedia) {
      throw new Error("Media not found");
    }

    return await this.mediaRepository.delete(id);
  }

  async updateElo(id: string, newElo: number): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    if (typeof newElo !== "number" || newElo < 0) {
      throw new Error("ELO must be a non-negative number");
    }

    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new Error("Media not found");
    }

    media.updateElo(newElo);
    return await this.mediaRepository.update(id, media);
  }

  async updateQuality(id: string, quality: number): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    if (quality !== -1 && quality !== 0 && quality !== 1) {
      throw new Error("Quality must be -1, 0, or 1");
    }

    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new Error("Media not found");
    }

    media.updateQuality(quality);
    return await this.mediaRepository.update(id, media);
  }

  async bulkUpdateQuality(
    mediaIds: string[],
    quality: number
  ): Promise<{ updated: number; failed: number }> {
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      throw new Error("Media IDs must be a non-empty array");
    }

    if (quality !== -1 && quality !== 0 && quality !== 1) {
      throw new Error("Quality must be -1, 0, or 1");
    }

    let updated = 0;
    let failed = 0;

    // Process updates in parallel with batching to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < mediaIds.length; i += batchSize) {
      const batch = mediaIds.slice(i, i + batchSize);
      const promises = batch.map(async (id) => {
        try {
          const media = await this.mediaRepository.findById(id);
          if (media) {
            media.updateQuality(quality);
            await this.mediaRepository.update(id, media);
            return true;
          }
          return false;
        } catch (error) {
          console.error(`Failed to update media ${id}:`, error);
          return false;
        }
      });

      const results = await Promise.all(promises);
      updated += results.filter((r) => r).length;
      failed += results.filter((r) => !r).length;
    }

    return { updated, failed };
  }

  async getMediaByType(mediaType: "image" | "video"): Promise<Media[]> {
    if (!["image", "video"].includes(mediaType)) {
      throw new Error("Media type must be either 'image' or 'video'");
    }
    return await this.mediaRepository.findByMediaType(mediaType);
  }

  async getMediaByEloRange(minElo: number, maxElo: number): Promise<Media[]> {
    if (typeof minElo !== "number" || typeof maxElo !== "number") {
      throw new Error("ELO range values must be numbers");
    }

    if (minElo > maxElo) {
      throw new Error("Minimum ELO cannot be greater than maximum ELO");
    }

    return await this.mediaRepository.findByEloRange(minElo, maxElo);
  }

  async getMediaByPromptDescription(
    promptDescription: string
  ): Promise<Media[]> {
    if (!promptDescription) {
      throw new Error("Prompt description is required");
    }
    return await this.mediaRepository.findByPromptDescription(
      promptDescription
    );
  }

  async updateMediaMetadata(
    id: string,
    data: {
      loraTraining?: string;
      promptDescription?: string;
      generationParams?: Record<string, any>;
    }
  ): Promise<Media | null> {
    if (!id) {
      throw new Error("Media ID is required");
    }

    const media = await this.mediaRepository.findById(id);
    if (!media) {
      throw new Error("Media not found");
    }

    if (data.loraTraining !== undefined) {
      media.updateLoraTraining(data.loraTraining);
    }
    if (data.promptDescription !== undefined) {
      media.updatePromptDescription(data.promptDescription);
    }
    if (data.generationParams !== undefined) {
      media.updateGenerationParams(data.generationParams);
    }

    return await this.mediaRepository.update(id, media);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async checkDuplicateFilename(
    projectId: string,
    filename: string
  ): Promise<boolean> {
    const existingMedia = await this.mediaRepository.findByFilename(
      projectId,
      filename
    );
    return !!existingMedia;
  }

  async getExistingFilenames(projectId: string): Promise<string[]> {
    return await this.mediaRepository.findExistingFilenames(projectId);
  }

  async getUniqueGenerationParams(projectId: string): Promise<
    {
      paramName: string;
      values: Array<{
        value: any;
        count: number;
        goodCount: number;
        badCount: number;
      }>;
    }[]
  > {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const media = await this.mediaRepository.findByProjectId(projectId);

    // Collect all unique parameters and their values with quality counts
    const paramMap = new Map<
      string,
      Map<any, { total: number; good: number; bad: number }>
    >();

    media.forEach((item) => {
      if (item.generationParams && typeof item.generationParams === "object") {
        Object.entries(item.generationParams).forEach(([key, value]) => {
          if (!paramMap.has(key)) {
            paramMap.set(key, new Map());
          }

          const valueMap = paramMap.get(key)!;
          const valueKey = JSON.stringify(value); // Handle complex values

          if (!valueMap.has(valueKey)) {
            valueMap.set(valueKey, { total: 0, good: 0, bad: 0 });
          }

          const stats = valueMap.get(valueKey)!;
          stats.total++;

          if (item.quality === 1) {
            stats.good++;
          } else if (item.quality === -1) {
            stats.bad++;
          }
        });
      }
    });

    // Convert to array format
    const result: Array<{
      paramName: string;
      values: Array<{
        value: any;
        count: number;
        goodCount: number;
        badCount: number;
      }>;
    }> = [];

    paramMap.forEach((valueMap, paramName) => {
      const values: Array<{
        value: any;
        count: number;
        goodCount: number;
        badCount: number;
      }> = [];

      valueMap.forEach((stats, valueKey) => {
        try {
          const value = JSON.parse(valueKey);
          values.push({
            value,
            count: stats.total,
            goodCount: stats.good,
            badCount: stats.bad,
          });
        } catch (e) {
          // Handle parsing errors gracefully
          console.error(`Failed to parse value for ${paramName}: ${valueKey}`);
        }
      });

      // Sort values by count (most common first)
      values.sort((a, b) => b.count - a.count);

      result.push({ paramName, values });
    });

    // Sort parameters alphabetically
    result.sort((a, b) => a.paramName.localeCompare(b.paramName));

    return result;
  }

  async getProjectAnalytics(projectId: string): Promise<{
    overview: {
      totalImages: number;
      goodImages: number;
      badImages: number;
      unratedImages: number;
      averageElo: number;
      totalBattles: number;
    };
    parameterAnalysis: Array<{
      paramName: string;
      values: Array<{
        value: any;
        totalCount: number;
        goodCount: number;
        badCount: number;
        unratedCount: number;
        goodRate: number;
        averageElo: number;
        averageEloGoodOnly: number;
        minSampleSize: number;
      }>;
      correlation: number;
      significance: number;
    }>;
    topCombinations: Array<{
      combination: Record<string, any>;
      totalCount: number;
      goodCount: number;
      goodRate: number;
      averageElo: number;
      averageEloGoodOnly: number;
    }>;
    dataQuality: {
      averageBattlesPerImage: number;
      imagesWithMinimumBattles: number;
      parameterCoverage: number;
    };
  }> {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const media = await this.mediaRepository.findByProjectId(projectId);

    if (media.length === 0) {
      return {
        overview: {
          totalImages: 0,
          goodImages: 0,
          badImages: 0,
          unratedImages: 0,
          averageElo: 1200,
          totalBattles: 0,
        },
        parameterAnalysis: [],
        topCombinations: [],
        dataQuality: {
          averageBattlesPerImage: 0,
          imagesWithMinimumBattles: 0,
          parameterCoverage: 0,
        },
      };
    }

    // Calculate overview statistics
    const goodImages = media.filter((m) => m.quality === 1);
    const badImages = media.filter((m) => m.quality === -1);
    const unratedImages = media.filter(
      (m) => m.quality === 0 || m.quality === undefined
    );

    const totalElo = media.reduce((sum, m) => sum + (m.elo || 1200), 0);
    const averageElo = totalElo / media.length;

    // Estimate battles based on ELO deviation from starting value (rough estimate)
    const eloDeviations = media.map((m) => Math.abs((m.elo || 1200) - 1200));
    const estimatedTotalBattles = Math.round(
      eloDeviations.reduce((sum, dev) => sum + dev / 50, 0)
    );

    // Parameter analysis
    const paramMap = new Map<
      string,
      Map<
        string,
        {
          values: any[];
          elos: number[];
          goodElos: number[];
          total: number;
          good: number;
          bad: number;
          unrated: number;
        }
      >
    >();

    media.forEach((item) => {
      if (item.generationParams && typeof item.generationParams === "object") {
        Object.entries(item.generationParams).forEach(([key, value]) => {
          if (!paramMap.has(key)) {
            paramMap.set(key, new Map());
          }

          const valueMap = paramMap.get(key)!;
          const valueKey = JSON.stringify(value);

          if (!valueMap.has(valueKey)) {
            valueMap.set(valueKey, {
              values: [],
              elos: [],
              goodElos: [],
              total: 0,
              good: 0,
              bad: 0,
              unrated: 0,
            });
          }

          const stats = valueMap.get(valueKey)!;
          stats.values.push(value);
          stats.elos.push(item.elo || 1200);
          stats.total++;

          if (item.quality === 1) {
            stats.good++;
            stats.goodElos.push(item.elo || 1200);
          } else if (item.quality === -1) {
            stats.bad++;
          } else {
            stats.unrated++;
          }
        });
      }
    });

    // Calculate correlations and build parameter analysis
    const parameterAnalysis = [];

    for (const [paramName, valueMap] of paramMap.entries()) {
      const values = [];
      let correlationData: { paramValues: number[]; elos: number[] } = {
        paramValues: [],
        elos: [],
      };

      for (const [valueKey, stats] of valueMap.entries()) {
        const value = JSON.parse(valueKey);
        const averageElo =
          stats.elos.reduce((sum, elo) => sum + elo, 0) / stats.elos.length;
        const averageEloGoodOnly =
          stats.goodElos.length > 0
            ? stats.goodElos.reduce((sum, elo) => sum + elo, 0) /
              stats.goodElos.length
            : 0;
        const goodRate = stats.total > 0 ? stats.good / stats.total : 0;

        values.push({
          value,
          totalCount: stats.total,
          goodCount: stats.good,
          badCount: stats.bad,
          unratedCount: stats.unrated,
          goodRate,
          averageElo,
          averageEloGoodOnly,
          minSampleSize: Math.min(stats.total, 10), // Indicator of data reliability
        });

        // For correlation calculation (if numeric parameter)
        if (typeof value === "number") {
          stats.elos.forEach((elo) => {
            correlationData.paramValues.push(value);
            correlationData.elos.push(elo);
          });
        }
      }

      // Calculate correlation coefficient for numeric parameters
      let correlation = 0;
      let significance = 0;

      if (
        correlationData.paramValues.length > 2 &&
        typeof correlationData.paramValues[0] === "number"
      ) {
        correlation = this.calculateCorrelation(
          correlationData.paramValues,
          correlationData.elos
        );
        significance = correlationData.paramValues.length; // Simple significance proxy
      }

      // Sort values by average ELO (best performing first), then by good rate as tiebreaker
      values.sort((a, b) => {
        // Primary sort: Average ELO (descending)
        if (b.averageElo !== a.averageElo) {
          return b.averageElo - a.averageElo;
        }
        // Secondary sort: Good rate (descending) as tiebreaker
        return b.goodRate - a.goodRate;
      });

      parameterAnalysis.push({
        paramName,
        values,
        correlation,
        significance,
      });
    }

    // Find top parameter combinations
    const combinationMap = new Map<
      string,
      {
        combination: Record<string, any>;
        total: number;
        good: number;
        elos: number[];
        goodElos: number[];
      }
    >();

    media.forEach((item) => {
      if (item.generationParams && typeof item.generationParams === "object") {
        const combinationKey = JSON.stringify(item.generationParams);

        if (!combinationMap.has(combinationKey)) {
          combinationMap.set(combinationKey, {
            combination: item.generationParams,
            total: 0,
            good: 0,
            elos: [],
            goodElos: [],
          });
        }

        const stats = combinationMap.get(combinationKey)!;
        stats.total++;
        stats.elos.push(item.elo || 1200);

        if (item.quality === 1) {
          stats.good++;
          stats.goodElos.push(item.elo || 1200);
        }
      }
    });

    const topCombinations = Array.from(combinationMap.values())
      .filter((combo) => combo.total >= 2) // Only combinations with at least 2 samples
      .map((combo) => ({
        combination: combo.combination,
        totalCount: combo.total,
        goodCount: combo.good,
        goodRate: combo.good / combo.total,
        averageElo:
          combo.elos.reduce((sum, elo) => sum + elo, 0) / combo.elos.length,
        averageEloGoodOnly:
          combo.goodElos.length > 0
            ? combo.goodElos.reduce((sum, elo) => sum + elo, 0) /
              combo.goodElos.length
            : 0,
      }))
      .sort((a, b) => {
        // First sort by average ELO (descending)
        if (b.averageElo !== a.averageElo) {
          return b.averageElo - a.averageElo;
        }
        // Then sort by good rate (descending) as tiebreaker
        return b.goodRate - a.goodRate;
      })
      .slice(0, 10); // Top 10 combinations

    // Data quality metrics
    const averageBattlesPerImage = estimatedTotalBattles / media.length;
    const imagesWithMinimumBattles = media.filter(
      (m) => Math.abs((m.elo || 1200) - 1200) >= 100 // Rough estimate of 2+ battles
    ).length;

    const totalPossibleCombinations = Array.from(paramMap.values()).reduce(
      (product, valueMap) => product * valueMap.size,
      1
    );
    const actualCombinations = combinationMap.size;
    const parameterCoverage =
      totalPossibleCombinations > 0
        ? actualCombinations / totalPossibleCombinations
        : 0;

    return {
      overview: {
        totalImages: media.length,
        goodImages: goodImages.length,
        badImages: badImages.length,
        unratedImages: unratedImages.length,
        averageElo,
        totalBattles: estimatedTotalBattles,
      },
      parameterAnalysis,
      topCombinations,
      dataQuality: {
        averageBattlesPerImage,
        imagesWithMinimumBattles,
        parameterCoverage,
      },
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
