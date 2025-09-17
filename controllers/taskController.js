import { pool } from "../db.js";
import { catchError } from "../utils/catchError.js";

export async function createTask(req, res) {
  const {
    name,
    priority,
    start_date,
    end_date,
    comments,
    assignee_id,
    assigner_id,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tasks 
       (name, priority, start_date, end_date, comments, assignee_id, assigner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, priority, start_date, end_date, comments, assignee_id, assigner_id, created_at, updated_at`,
      [name, priority, start_date, end_date, comments, assignee_id, assigner_id]
    );

    res.status(201).json({ success: true, task: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getUserTasksByProject(req, res) {
  try {
    const { id } = req.user;
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT id, name, priority, start_date, end_date, comments, project_id, status
       FROM tasks
       WHERE assignee_id = $1 AND project_id = $2`,
      [id, projectId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.log(error);
    catchError(res, 500);
  }
}
