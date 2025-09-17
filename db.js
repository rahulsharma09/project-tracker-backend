import dotenv from "dotenv";
dotenv.config();
import { Pool } from "pg";
export const pool = new Pool({
  connectionString: process.env.CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false, // required for Neon SSL connection
  },
});
