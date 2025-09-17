import { pool } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { catchError } from "../utils/catchError.js";

const JWT_SECRET = process.env.JWT_SECRET || "g4f65g4erg!#!@#654ewfewewf";
const JWT_EXPIRES_IN = "1d"; // Example: 7 days

export async function signup(req, res) {
  try {
    const { name, email, password, role_id } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into DB
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role_id",
      [name, email, hashedPassword, role_id]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Set token in HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      serialize("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60, // 1 day
        path: "/",
      })
    );

    res.status(201).json({ success: true, user });
  } catch (err) {
    if (err.code === "23505") {
      res.status(400).json({ success: false, message: "Email already exists" });
    } else {
      console.error("Signup error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}

export async function login(req, res) {
  try {
    console.log(process.env.JWT_SECRET);
    const { email, password } = req.body;
    let user = await pool.query(
      `SELECT id, name, email, role_id, password FROM users
      WHERE email = $1
      `,
      [email]
    );
    user = user.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      catchError(res, 401, "Invalid email or password");
    }
    // Create JWT token
    const token = await jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("access_token", token);
    return res.status(200).send({
      message: "Login successful",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.log(error);
    catchError(res, 400, "Invalid username or password");
  }
}
