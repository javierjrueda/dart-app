import { Router } from "express";
import { DreamshotController } from "../controllers/dreamshot.controller";

const router = Router();
const dreamshotController = new DreamshotController();

// GET /api/v1/dreamshots - Get all dreamshots
router.get("/", dreamshotController.getAllDreamshots.bind(dreamshotController));

// GET /api/v1/dreamshots/:id - Get dreamshot by ID
router.get(
  "/:id",
  dreamshotController.getDreamshotById.bind(dreamshotController)
);

// POST /api/v1/dreamshots - Create new dreamshot
router.post("/", dreamshotController.createDreamshot.bind(dreamshotController));

// PUT /api/v1/dreamshots/:id - Update dreamshot
router.put(
  "/:id",
  dreamshotController.updateDreamshot.bind(dreamshotController)
);

// DELETE /api/v1/dreamshots/:id - Delete dreamshot
router.delete(
  "/:id",
  dreamshotController.deleteDreamshot.bind(dreamshotController)
);

// POST /api/v1/dreamshots/:id/annotations - Add annotation to dreamshot
router.post(
  "/:id/annotations",
  dreamshotController.addAnnotation.bind(dreamshotController)
);

// PUT /api/v1/dreamshots/:id/ranking - Update dreamshot ranking
router.put(
  "/:id/ranking",
  dreamshotController.updateRanking.bind(dreamshotController)
);

export { router as dreamshotRoutes };
