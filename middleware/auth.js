import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { clog } from "cliplog";

export async function userAuth(req, res, next) {
  try {
    console.log("started")
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    let token
    token = authHeader.split(" ")[1];

    // const {access_token} = req.cookies;
    // token = access_token;


    console.log("cookies - ", token);
    if (!token) {
      throw Error("Invalid token");
    }
    const decodedToken = await jwt.verify(token, "g4f65g4erg!#!@#654ewfewewf");
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
