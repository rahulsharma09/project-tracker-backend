import express from "express";
import { userAuth } from "../middleware/auth.js";
import { createTask, getUserTasksByProject } from "../controllers/taskController.js";

const router = express.Router();

router.post("/create", userAuth, createTask);
router.get("/:projectId", userAuth, getUserTasksByProject);

export default router;
