import { Project } from "@/domain/entities/project.entity";
import { ProjectRepository } from "@/domain/repositories/project.repository";

export class ProjectUseCases {
  constructor(private projectRepository: ProjectRepository) {}

  async getAllProjects(): Promise<Project[]> {
    return await this.projectRepository.findAll();
  }

  async getProjectById(id: string): Promise<Project | null> {
    if (!id) {
      throw new Error("Project ID is required");
    }
    return await this.projectRepository.findById(id);
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    return await this.projectRepository.findByUserId(userId);
  }

  async createProject(data: {
    name: string;
    userId: string;
  }): Promise<Project> {
    // Validation
    if (!data.name || !data.userId) {
      throw new Error("Name and user ID are required");
    }

    if (data.name.trim().length === 0) {
      throw new Error("Project name cannot be empty");
    }

    const project = Project.create({
      name: data.name.trim(),
      userId: data.userId,
    });

    return await this.projectRepository.create(project);
  }

  async updateProject(
    id: string,
    updateData: { name?: string }
  ): Promise<Project | null> {
    if (!id) {
      throw new Error("Project ID is required");
    }

    const existingProject = await this.projectRepository.findById(id);
    if (!existingProject) {
      throw new Error("Project not found");
    }

    if (updateData.name !== undefined) {
      if (updateData.name.trim().length === 0) {
        throw new Error("Project name cannot be empty");
      }
      updateData.name = updateData.name.trim();
    }

    return await this.projectRepository.update(id, updateData);
  }

  async deleteProject(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Project ID is required");
    }

    const existingProject = await this.projectRepository.findById(id);
    if (!existingProject) {
      throw new Error("Project not found");
    }

    return await this.projectRepository.delete(id);
  }
}
