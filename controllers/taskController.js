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
    const { id, role_id } = req.user;
    const { asignee, priority, status } = req.query;
    console.log(role_id);
    const { projectId } = req.params;
    if (role_id == 0 || role_id == 1) {
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
            WHERE $1 = ANY(t.assignee_id)
            GROUP BY 
        t.id, t.name, t.priority, t.start_date, 
        t.end_date, t.comments, t.project_id, t.status, t.assignee_id, t.created_at,
        t.updated_at;
        `,
        [projectId]
      );

      res.status(200).json({ success: true, data: result.rows });
    } else {
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
    WHERE $1 = ANY(t.assignee_id) 
    AND t.project_id = $2
    GROUP BY 
    t.id, t.name, t.priority, t.start_date, 
    t.end_date, t.comments, t.project_id, t.status, t.assignee_id,t.created_at,
    t.updated_at;
       `,
        [id, projectId]
      );

      res.status(200).json({ success: true, data: result.rows });
    }
  } catch (error) {
    console.log(error);
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
