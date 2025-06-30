import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";
import { ProjectUseCases } from "@/application/use-cases/project.use-cases";
import { MongoDBProjectRepository } from "@/infrastructure/repositories/mongodb-project.repository";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();

// Initialize repository, use cases, and controller
const projectRepository = new MongoDBProjectRepository();
const projectUseCases = new ProjectUseCases(projectRepository);
const projectController = new ProjectController(projectUseCases);

// Apply auth middleware to all routes
router.use(requireAuth);

// POST /api/projects - Create a new project
router.post("/", (req, res) => projectController.createProject(req, res));

// GET /api/projects/all - Get all projects (globally accessible for collaboration)
router.get("/all", (req, res) => projectController.getAllProjects(req, res));

// GET /api/projects/my - Get projects for the authenticated user only
router.get("/my", (req, res) => projectController.getProjectsByUser(req, res));

// GET /api/projects - Get all projects (default behavior for collaboration)
router.get("/", (req, res) => projectController.getAllProjects(req, res));

// GET /api/projects/:id - Get a specific project by ID
router.get("/:id", (req, res) => projectController.getProjectById(req, res));

// PUT /api/projects/:id - Update a project
router.put("/:id", (req, res) => projectController.updateProject(req, res));

export default router;
