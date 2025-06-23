import { Project } from "../entities/project.entity";

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  findByUserId(userId: string): Promise<Project[]>;
  create(project: Project): Promise<Project>;
  update(id: string, project: Partial<Project>): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}
