import express from "express";
import { getUserProfile, getUsers } from "../controllers/userController.js";
import { userAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/profile", userAuth, getUserProfile);
router.get("/", userAuth, getUsers)
export default router;
