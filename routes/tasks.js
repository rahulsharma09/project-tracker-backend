import express from "express";
import { userAuth } from "../middleware/auth.js";
import {
  createTask,
  getTaskById,
  getUserTasksByProject,
  updateTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.post("/create", userAuth, createTask);
router.get("/:projectId", userAuth, getUserTasksByProject);
router.get("/taskDetails/:taskId", userAuth, getTaskById);
router.patch("/updateTask/:taskId", userAuth, updateTask);

export default router;
