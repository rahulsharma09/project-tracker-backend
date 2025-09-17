import express from "express";
import { userAuth } from "../middleware/auth.js";
import {
  addProjectUser,
  createProject,
  getProjects,
} from "../controllers/projectController.js";

const router = express.Router();

router.post("/create", userAuth, createProject);
router.post("/add-user/:userId", userAuth, addProjectUser);
router.get("/", userAuth, getProjects);

export default router;
