import { pool } from "../db.js";
import { catchError } from "../utils/catchError.js";

export async function createProject(req, res) {
  try {
    const { role_id } = req.user;
    const { project_name, description, tasks } = req.body;
    if (role_id == 1 || role_id == 2) {
      const result = await pool.query(
        `INSERT INTO projects (project_name, description, tasks)
       VALUES ($1, $2, $3)
       RETURNING id, project_name, description, created_at, tasks`,
        [project_name, description, tasks]
      );

      res.status(201).json({ success: true, project: result.rows[0] });
    }
    res
      .status(400)
      .json({ message: "User not authorized to create a project" });
  } catch (error) {
    catchError(res, 500);
  }
}

export async function addProjectUser(req, res) {
  try {
    const { userId } = req.params;
    const { projectId, role_id } = req.body;
    const result = await pool.query(
      `INSERT INTO project_users (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) 
       DO UPDATE SET role = EXCLUDED.role
       RETURNING project_id, user_id, role`,
      [projectId, userId, role_id]
    );

    res.status(201).json({ success: true, projectUser: result.rows[0] });
  } catch (error) {
    catchError(res, 500);
  }
}

export async function getProjects(req, res) {
  try {
    const { id, role_id } = req.user;
    let result;

    // Step 2: Fetch projects based on role
    if (role_id === 0 || role_id === 1) {
      result = await pool.query(
        `SELECT id, project_name, description, created_at
         FROM projects
         ORDER BY created_at DESC`
      );
    } else {
      result = await pool.query(
        `SELECT p.id, p.project_name, p.description, p.created_at
         FROM projects p
         JOIN project_users pu ON pu.project_id = p.id
         WHERE pu.user_id = $1
         ORDER BY p.created_at DESC`,
        [id]
      );
    }
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.log(error);
    catchError(res, 500);
  }
}
