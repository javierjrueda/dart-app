import { Request, Response } from "express";
import { ProjectUseCases } from "@/application/use-cases/project.use-cases";

export class ProjectController {
  constructor(private projectUseCases: ProjectUseCases) {}

  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!name) {
        res.status(400).json({ error: "Project name is required" });
        return;
      }

      const project = await this.projectUseCases.createProject({
        name,
        userId,
      });

      res.status(201).json(project.toJSON());
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const projects = await this.projectUseCases.getAllProjects();

      // Sort by updatedAt descending (most recent first)
      const sortedProjects = projects.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProjects = sortedProjects.slice(startIndex, endIndex);

      res.json({
        projects: paginatedProjects.map((project) => project.toJSON()),
        total: projects.length,
        page,
        limit,
        totalPages: Math.ceil(projects.length / limit),
      });
    } catch (error) {
      console.error("Error getting all projects:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getProjectsByUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const projects = await this.projectUseCases.getProjectsByUserId(userId);

      // Sort by updatedAt descending (most recent first)
      const sortedProjects = projects.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProjects = sortedProjects.slice(startIndex, endIndex);

      res.json({
        projects: paginatedProjects.map((project) => project.toJSON()),
        total: projects.length,
        page,
        limit,
        totalPages: Math.ceil(projects.length / limit),
      });
    } catch (error) {
      console.error("Error getting projects:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const project = await this.projectUseCases.getProjectById(id);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // Allow any authenticated user to view any project (for collaboration)
      res.json(project.toJSON());
    } catch (error) {
      console.error("Error getting project:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Check if user owns the project (only project owners can modify)
      const existingProject = await this.projectUseCases.getProjectById(id);
      if (!existingProject) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      if (existingProject.userId !== userId) {
        res
          .status(403)
          .json({ error: "Access denied - only project owner can modify" });
        return;
      }

      const updatedProject = await this.projectUseCases.updateProject(id, {
        name,
      });

      if (!updatedProject) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      res.json(updatedProject.toJSON());
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
