import { pool } from "../db.js";
import { catchError } from "../utils/catchError.js";

export async function getUserProfile(req, res) {
  try {
    const user = req.user;
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getUsers(req, res) {
  try {
    const users = await pool.query(`SELECT id,name,email,role_id FROM users`);
    res.status(200).json({ success: true, data: users.rows });
  } catch (error) {
    catchError(res, 500);
  }
}
