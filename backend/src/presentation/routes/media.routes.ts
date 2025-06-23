import express from "express";
import { MediaController } from "@/presentation/controllers/media.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = express.Router();
const mediaController = new MediaController();

// All media routes require authentication
router.use(requireAuth);

// Routes for project media
router.get(
  "/projects/:projectId/media",
  mediaController.getProjectMedia.bind(mediaController)
);

router.post(
  "/projects/:projectId/media/upload",
  mediaController.uploadMiddleware,
  mediaController.uploadMedia.bind(mediaController)
);

router.post(
  "/projects/:projectId/media/presigned-url",
  mediaController.getPresignedUrl.bind(mediaController)
);

// Routes for individual media items
router.get("/media/:id", mediaController.getMedia.bind(mediaController));

router.delete("/media/:id", mediaController.deleteMedia.bind(mediaController));

router.patch("/media/:id/elo", mediaController.updateElo.bind(mediaController));

// Admin route for all media
router.get("/media", mediaController.getAllMedia.bind(mediaController));

export { router as mediaRoutes };
