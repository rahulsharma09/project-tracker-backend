import { pool } from "../db.js";
import { catchError } from "../utils/catchError.js";

export async function createTask(req, res) {
  const { id } = req.user;
  let {
    name,
    priority,
    start_date,
    end_date,
    comments,
    assignee_id,
    project_id,
  } = req.body;
  if (typeof start_date == "string" && start_date.length == 0) {
    start_date = null;
  }
  if (typeof end_date == "string" && end_date.length == 0) {
    end_date = null;
  }
  try {
    const result = await pool.query(
      `INSERT INTO tasks 
       (name, priority, start_date, end_date, comments, assignee_id, assigner_id,project_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, priority, start_date, end_date, comments, assignee_id, assigner_id,project_id, status, created_at, updated_at`,
      [
        name,
        priority,
        start_date,
        end_date,
        comments,
        assignee_id,
        id,
        project_id,
        0,
      ]
    );

    res.status(201).json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getUserTasksByProject(req, res) {
  try {
    const { id, role_id } = req.user; // logged-in user info
    const { projectId } = req.params;
    const { assignee_id, priority, status, start_date, end_date } = req.query;

    // --- Step 1: Prepare dynamic filters array ---
    const filters = [];
    const values = [];

    // Always include project_id (for both admin and non-admins)
    values.push(projectId);
    filters.push(`t.project_id = $${values.length}`);

    // If user is not admin/manager, restrict to their assigned tasks
    if (!(role_id == 0 || role_id == 1)) {
      values.push(id);
      filters.push(`$${values.length} = ANY(t.assignee_id)`);
    }

    // --- Step 2: Add optional filters ---
    // Apply only if provided in query
    if (assignee_id) {
      values.push(assignee_id);
      filters.push(`$${values.length} = ANY(t.assignee_id)`);
    }

    if (priority) {
      values.push(priority);
      filters.push(`t.priority = $${values.length}`);
    }

    if (status) {
      values.push(status);
      filters.push(`t.status = $${values.length}`);
    }

    if (start_date && end_date) {
      // Filter tasks with overlapping date range
      values.push(start_date, end_date);
      filters.push(
        `t.start_date >= $${values.length - 1} AND t.end_date <= $${
          values.length
        }`
      );
    }

    // --- Step 3: Build dynamic WHERE clause ---
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // --- Step 4: Write the final query ---
    const query = `
      SELECT 
        t.id,
        t.name,
        t.priority,
        t.start_date,
        t.end_date,
        t.comments,
        t.project_id,
        t.status,
        t.assignee_id,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS assignees
      FROM tasks t
      LEFT JOIN users u ON u.id = ANY(t.assignee_id)
      ${whereClause}
      GROUP BY 
        t.id, t.name, t.priority, t.start_date, 
        t.end_date, t.comments, t.project_id, 
        t.status, t.assignee_id, t.created_at, t.updated_at
      ORDER BY t.created_at DESC;
    `;

    // --- Step 5: Execute query ---
    const result = await pool.query(query, values);
    console.log("result - ", result.rows);
    // --- Step 6: Send response ---
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    catchError(res, 500);
  }
}

export async function getTaskById(req, res) {
  try {
    console.log("triggered");
    const { taskId } = req.params;
    console.log("task id - ", taskId);
    const result = await pool.query(
      `
      SELECT 
      t.id,
      t.name,
      t.priority,
      t.start_date,
      t.end_date,
      t.comments,
      t.project_id,
      t.status,
      t.assignee_id,
      t.created_at,
      t.updated_at,
      t.assigner_id,
      json_build_object(
          'id', assigner.id,
          'name', assigner.name,
          'email', assigner.email
      ) AS assigner,
      COALESCE(
          json_agg(
              json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email
              )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
      ) AS assignees
  FROM tasks t
  LEFT JOIN users u ON u.id = ANY(t.assignee_id)
  LEFT JOIN users assigner ON assigner.id = t.assigner_id
  WHERE t.id = $1
  GROUP BY 
      t.id, t.name, t.priority, t.start_date, t.end_date, t.comments, 
      t.project_id, t.status, t.assignee_id, t.created_at, t.updated_at,
      t.assigner_id, assigner.id, assigner.name, assigner.email;
      `,
      [taskId]
    );
    return res.status(200).json({ message: "success", data: result.rows[0] });
  } catch (error) {
    console.log(error);
    catchError(res, 500);
  }
}

export async function updateTask(req, res) {
  try {
    const taskId = parseInt(req.params.taskId, 10);

    // Check if task exists
    const task = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [
      taskId,
    ]);
    if (task.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const { assignee_id, status, priority, start_date, end_date } = req.body;
    console.log("BODY - ", req.body);
    const fields = [];
    const values = [];
    let index = 1;

    if (assignee_id !== undefined) {
      fields.push(`assignee_id = $${index++}`);
      values.push(assignee_id);
    }
    if (status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      fields.push(`priority = $${index++}`);
      values.push(priority);
    }
    if (start_date !== undefined) {
      fields.push(`start_date = $${index++}`);
      values.push(start_date);
    }
    if (end_date !== undefined) {
      fields.push(`end_date = $${index++}`);
      values.push(end_date);
    }

    console.log(fields, fields.length);

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    // Add task id for WHERE clause
    values.push(taskId);

    const query = {
      text: `
        UPDATE tasks
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE id = $${index}
        RETURNING *;
      `,
      values,
    };

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    return res.status(200).json({ success: true, task: result.rows[0] });
  } catch (error) {
    console.log(error);
    catchError(res, 500, error);
  }
}
