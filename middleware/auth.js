import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export async function userAuth(req, res, next) {
  try {
    let access_token = req.headers["authorization"];
    access_token = access_token.split("Bearer")[1].trim();
    if (!access_token) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }
    const decodedToken = await jwt.verify(access_token, process.env.JWT_SECRET);
    if (!decodedToken) {
      return res.status(401).send("Unauthorized");
    }
    const userId = decodedToken.id;

    // Fetch user details from DB
    const user = await pool.query(
      `SELECT id, name, email, role_id FROM users WHERE id = $1`,
      [userId]
    );

    if (user.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    req.user = user.rows[0];
    next();
  } catch (error) {
    res.status(401).send(error.message);
  }
}
