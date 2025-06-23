import { Request, Response } from "express";
import { DreamshotUseCases } from "@/application/use-cases/dreamshot.use-cases";
import { MongoDBDreamshotRepository } from "@/infrastructure/repositories/mongodb-dreamshot.repository";

export class DreamshotController {
  private dreamshotUseCases: DreamshotUseCases;

  constructor() {
    const dreamshotRepository = new MongoDBDreamshotRepository();
    this.dreamshotUseCases = new DreamshotUseCases(dreamshotRepository);
  }

  async getAllDreamshots(req: Request, res: Response): Promise<void> {
    try {
      const dreamshots = await this.dreamshotUseCases.getAllDreamshots();
      res.status(200).json({
        success: true,
        data: dreamshots,
        count: dreamshots.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch dreamshots",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getDreamshotById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dreamshot = await this.dreamshotUseCases.getDreamshotById(id);

      if (!dreamshot) {
        res.status(404).json({
          success: false,
          error: "Dreamshot not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: dreamshot,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch dreamshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async createDreamshot(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, imageUrl, author, tags, isPublic } = req.body;

      const dreamshot = await this.dreamshotUseCases.createDreamshot({
        title,
        description,
        imageUrl,
        author,
        tags,
        isPublic,
      });

      res.status(201).json({
        success: true,
        data: dreamshot,
        message: "Dreamshot created successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Failed to create dreamshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateDreamshot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const dreamshot = await this.dreamshotUseCases.updateDreamshot(
        id,
        updateData
      );

      if (!dreamshot) {
        res.status(404).json({
          success: false,
          error: "Dreamshot not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: dreamshot,
        message: "Dreamshot updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Failed to update dreamshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async deleteDreamshot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.dreamshotUseCases.deleteDreamshot(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "Dreamshot not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Dreamshot deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Failed to delete dreamshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async addAnnotation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { text, author, coordinates } = req.body;

      const dreamshot = await this.dreamshotUseCases.addAnnotation(id, {
        text,
        author,
        coordinates,
      });

      if (!dreamshot) {
        res.status(404).json({
          success: false,
          error: "Dreamshot not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: dreamshot,
        message: "Annotation added successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Failed to add annotation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateRanking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating } = req.body;

      const dreamshot = await this.dreamshotUseCases.updateRanking(id, rating);

      if (!dreamshot) {
        res.status(404).json({
          success: false,
          error: "Dreamshot not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: dreamshot,
        message: "Ranking updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Failed to update ranking",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
