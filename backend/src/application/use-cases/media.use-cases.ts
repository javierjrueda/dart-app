import { Media } from "@/domain/entities/media.entity";
import { MediaRepository } from "@/domain/repositories/media.repository";

// Predefined lists of known generation parameters
const PREDEFINED_SAMPLERS = [
  "ddim",
  "dpm_2",
  "dpm_2_ancestral",
  "dpmpp_2m",
  "dpmpp_2m_sde",
  "euler",
  "euler_ancestral",
];

const PREDEFINED_SCHEDULERS = [
  "normal",
  "karras",
  "exponential",
  "sgm_uniform",
  "simple",
  "ddim_uniform",
];

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
    prompt?: number;
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
      prompt: data.prompt,
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

    try {
      console.log(
        `🔄 Bulk updating ${mediaIds.length} media items with quality: ${quality}`
      );

      // Use MongoDB's bulk operations for better performance
      const updated = await this.mediaRepository.bulkUpdateQuality(
        mediaIds,
        quality
      );

      console.log(`✅ Successfully updated ${updated} media items`);

      return {
        updated: updated,
        failed: mediaIds.length - updated,
      };
    } catch (error) {
      console.error("❌ Bulk quality update failed:", error);
      throw new Error(
        `Failed to bulk update quality: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

    // Convert to array format and ensure predefined values are included
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

      // If this is a sampler parameter, ensure all predefined samplers are included
      if (paramName === "sampler") {
        PREDEFINED_SAMPLERS.forEach((predefinedSampler) => {
          const valueKey = JSON.stringify(predefinedSampler);
          const stats = valueMap.get(valueKey) || { total: 0, good: 0, bad: 0 };
          values.push({
            value: predefinedSampler,
            count: stats.total,
            goodCount: stats.good,
            badCount: stats.bad,
          });
        });

        // Add any additional samplers found in data that aren't in predefined list
        valueMap.forEach((stats, valueKey) => {
          try {
            const value = JSON.parse(valueKey);
            if (!PREDEFINED_SAMPLERS.includes(value)) {
              values.push({
                value,
                count: stats.total,
                goodCount: stats.good,
                badCount: stats.bad,
              });
            }
          } catch (e) {
            console.error(`Failed to parse sampler value: ${valueKey}`);
          }
        });
      }
      // If this is a scheduler parameter, ensure all predefined schedulers are included
      else if (paramName === "scheduler") {
        PREDEFINED_SCHEDULERS.forEach((predefinedScheduler) => {
          const valueKey = JSON.stringify(predefinedScheduler);
          const stats = valueMap.get(valueKey) || { total: 0, good: 0, bad: 0 };
          values.push({
            value: predefinedScheduler,
            count: stats.total,
            goodCount: stats.good,
            badCount: stats.bad,
          });
        });

        // Add any additional schedulers found in data that aren't in predefined list
        valueMap.forEach((stats, valueKey) => {
          try {
            const value = JSON.parse(valueKey);
            if (!PREDEFINED_SCHEDULERS.includes(value)) {
              values.push({
                value,
                count: stats.total,
                goodCount: stats.good,
                badCount: stats.bad,
              });
            }
          } catch (e) {
            console.error(`Failed to parse scheduler value: ${valueKey}`);
          }
        });
      }
      // For other parameters, use existing logic
      else {
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
            console.error(
              `Failed to parse value for ${paramName}: ${valueKey}`
            );
          }
        });
      }

      // Sort values by count (most common first)
      values.sort((a, b) => b.count - a.count);

      result.push({ paramName, values });
    });

    // Ensure sampler parameter is always included, even if no media has sampler data
    if (!paramMap.has("sampler")) {
      const samplerValues = PREDEFINED_SAMPLERS.map((sampler) => ({
        value: sampler,
        count: 0,
        goodCount: 0,
        badCount: 0,
      }));

      result.push({
        paramName: "sampler",
        values: samplerValues,
      });
    }

    // Ensure scheduler parameter is always included, even if no media has scheduler data
    if (!paramMap.has("scheduler")) {
      const schedulerValues = PREDEFINED_SCHEDULERS.map((scheduler) => ({
        value: scheduler,
        count: 0,
        goodCount: 0,
        badCount: 0,
      }));

      result.push({
        paramName: "scheduler",
        values: schedulerValues,
      });
    }

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
      badCount: number;
      unratedCount: number;
      goodRate: number;
      badRate: number;
      unratedRate: number;
      averageElo: number;
      averageEloGoodOnly: number;
    }>;
    worstCombinations: Array<{
      combination: Record<string, any>;
      totalCount: number;
      goodCount: number;
      badCount: number;
      unratedCount: number;
      goodRate: number;
      badRate: number;
      unratedRate: number;
      averageElo: number;
      averageEloGoodOnly: number;
    }>;
    unratedCombinations: Array<{
      combination: Record<string, any>;
      totalCount: number;
      goodCount: number;
      badCount: number;
      unratedCount: number;
      goodRate: number;
      badRate: number;
      unratedRate: number;
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
        worstCombinations: [],
        unratedCombinations: [],
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

    // Helper function to create a parameter analysis entry
    const createParameterAnalysis = (
      paramName: string,
      valueMap: Map<string, any>,
      predefinedValues?: string[]
    ) => {
      const values = [];
      let correlationData: { paramValues: number[]; elos: number[] } = {
        paramValues: [],
        elos: [],
      };

      // If predefined values exist, ensure they're all included
      if (predefinedValues) {
        predefinedValues.forEach((predefinedValue) => {
          const valueKey = JSON.stringify(predefinedValue);
          const stats = valueMap.get(valueKey) || {
            values: [],
            elos: [],
            goodElos: [],
            total: 0,
            good: 0,
            bad: 0,
            unrated: 0,
          };

          const averageElo =
            stats.elos.length > 0
              ? stats.elos.reduce((sum: number, elo: number) => sum + elo, 0) /
                stats.elos.length
              : 1200;
          const averageEloGoodOnly =
            stats.goodElos.length > 0
              ? stats.goodElos.reduce(
                  (sum: number, elo: number) => sum + elo,
                  0
                ) / stats.goodElos.length
              : 0;
          const goodRate = stats.total > 0 ? stats.good / stats.total : 0;

          values.push({
            value: predefinedValue,
            totalCount: stats.total,
            goodCount: stats.good,
            badCount: stats.bad,
            unratedCount: stats.unrated,
            goodRate,
            averageElo,
            averageEloGoodOnly,
            minSampleSize: Math.min(stats.total, 10),
          });
        });

        // Add any additional values found in data that aren't in predefined list
        for (const [valueKey, stats] of valueMap.entries()) {
          try {
            const value = JSON.parse(valueKey);
            if (!predefinedValues.includes(value)) {
              const averageElo =
                stats.elos.reduce((sum: number, elo: number) => sum + elo, 0) /
                stats.elos.length;
              const averageEloGoodOnly =
                stats.goodElos.length > 0
                  ? stats.goodElos.reduce(
                      (sum: number, elo: number) => sum + elo,
                      0
                    ) / stats.goodElos.length
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
                minSampleSize: Math.min(stats.total, 10),
              });

              // For correlation calculation (if numeric parameter)
              if (typeof value === "number") {
                stats.elos.forEach((elo: number) => {
                  correlationData.paramValues.push(value);
                  correlationData.elos.push(elo);
                });
              }
            }
          } catch (e) {
            console.error(
              `Failed to parse value for ${paramName}: ${valueKey}`
            );
          }
        }
      } else {
        // For non-predefined parameters, use existing logic
        for (const [valueKey, stats] of valueMap.entries()) {
          const value = JSON.parse(valueKey);
          const averageElo =
            stats.elos.reduce((sum: number, elo: number) => sum + elo, 0) /
            stats.elos.length;
          const averageEloGoodOnly =
            stats.goodElos.length > 0
              ? stats.goodElos.reduce(
                  (sum: number, elo: number) => sum + elo,
                  0
                ) / stats.goodElos.length
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
            minSampleSize: Math.min(stats.total, 10),
          });

          // For correlation calculation (if numeric parameter)
          if (typeof value === "number") {
            stats.elos.forEach((elo: number) => {
              correlationData.paramValues.push(value);
              correlationData.elos.push(elo);
            });
          }
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
        significance = correlationData.paramValues.length;
      }

      // Sort values by ELO (Good Only) (best performing first), then by good rate as tiebreaker
      values.sort((a, b) => {
        // Primary sort: Average ELO (Good Only) (descending)
        if (b.averageEloGoodOnly !== a.averageEloGoodOnly) {
          return b.averageEloGoodOnly - a.averageEloGoodOnly;
        }
        // Secondary sort: Good rate (descending) as tiebreaker
        return b.goodRate - a.goodRate;
      });

      return {
        paramName,
        values,
        correlation,
        significance,
      };
    };

    // Process all parameters with their predefined values if applicable
    for (const [paramName, valueMap] of paramMap.entries()) {
      if (paramName === "sampler") {
        parameterAnalysis.push(
          createParameterAnalysis(paramName, valueMap, PREDEFINED_SAMPLERS)
        );
      } else if (paramName === "scheduler") {
        parameterAnalysis.push(
          createParameterAnalysis(paramName, valueMap, PREDEFINED_SCHEDULERS)
        );
      } else {
        parameterAnalysis.push(createParameterAnalysis(paramName, valueMap));
      }
    }

    // Ensure sampler parameter is always included in analytics, even if no media has sampler data
    if (!paramMap.has("sampler")) {
      const samplerValues = PREDEFINED_SAMPLERS.map((sampler) => ({
        value: sampler,
        totalCount: 0,
        goodCount: 0,
        badCount: 0,
        unratedCount: 0,
        goodRate: 0,
        averageElo: 1200,
        averageEloGoodOnly: 0,
        minSampleSize: 0,
      }));

      parameterAnalysis.push({
        paramName: "sampler",
        values: samplerValues,
        correlation: 0,
        significance: 0,
      });
    }

    // Ensure scheduler parameter is always included in analytics, even if no media has scheduler data
    if (!paramMap.has("scheduler")) {
      const schedulerValues = PREDEFINED_SCHEDULERS.map((scheduler) => ({
        value: scheduler,
        totalCount: 0,
        goodCount: 0,
        badCount: 0,
        unratedCount: 0,
        goodRate: 0,
        averageElo: 1200,
        averageEloGoodOnly: 0,
        minSampleSize: 0,
      }));

      parameterAnalysis.push({
        paramName: "scheduler",
        values: schedulerValues,
        correlation: 0,
        significance: 0,
      });
    }

    // Find top parameter combinations
    const combinationMap = new Map<
      string,
      {
        combination: Record<string, any>;
        total: number;
        good: number;
        bad: number;
        unrated: number;
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
            bad: 0,
            unrated: 0,
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
        } else if (item.quality === -1) {
          stats.bad++;
        } else {
          stats.unrated++;
        }
      }
    });

    // Prepare combination data
    const combinationData = Array.from(combinationMap.values())
      .filter((combo) => combo.total >= 2) // Only combinations with at least 2 samples
      .map((combo) => ({
        combination: combo.combination,
        totalCount: combo.total,
        goodCount: combo.good,
        badCount: combo.bad,
        unratedCount: combo.unrated,
        goodRate: combo.good / combo.total,
        badRate: combo.bad / combo.total,
        unratedRate: combo.unrated / combo.total,
        averageElo:
          combo.elos.reduce((sum, elo) => sum + elo, 0) / combo.elos.length,
        averageEloGoodOnly:
          combo.goodElos.length > 0
            ? combo.goodElos.reduce((sum, elo) => sum + elo, 0) /
              combo.goodElos.length
            : 0,
      }));

    // Top combinations (best performing)
    const topCombinations = [...combinationData]
      .sort((a, b) => {
        // First sort by average ELO (Good Only) (descending)
        if (b.averageEloGoodOnly !== a.averageEloGoodOnly) {
          return b.averageEloGoodOnly - a.averageEloGoodOnly;
        }
        // Then sort by good rate (descending) as tiebreaker
        return b.goodRate - a.goodRate;
      })
      .slice(0, 10); // Top 10 combinations

    // Worst combinations (most bad images)
    const worstCombinations = [...combinationData]
      .filter((combo) => combo.badCount > 0) // Only combinations with bad images
      .sort((a, b) => {
        // First sort by bad rate (descending)
        if (b.badRate !== a.badRate) {
          return b.badRate - a.badRate;
        }
        // Then sort by total bad count (descending) as tiebreaker
        return b.badCount - a.badCount;
      })
      .slice(0, 10); // Top 10 worst combinations

    // Most unrated combinations (need more evaluation)
    const unratedCombinations = [...combinationData]
      .filter((combo) => combo.unratedCount > 0) // Only combinations with unrated images
      .sort((a, b) => {
        // First sort by unrated count (descending)
        if (b.unratedCount !== a.unratedCount) {
          return b.unratedCount - a.unratedCount;
        }
        // Then sort by total count (descending) as tiebreaker
        return b.totalCount - a.totalCount;
      })
      .slice(0, 10); // Top 10 unrated combinations

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
      worstCombinations,
      unratedCombinations,
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
