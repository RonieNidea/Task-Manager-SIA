require("dotenv").config();

const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Explicit CORS for all origins and methods
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


// ROOT ROUTE
app.get("/", (req, res) => {
  res.json({ message: "Task Management API Running", status: "ok" });
});


// ✅ DASHBOARD — new endpoint for stats + upcoming deadlines
app.get("/api/dashboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*");

    if (error) throw error;

    const now = new Date();

    const totalTasks = data.length;
    const pending = data.filter(t => t.status === "Pending").length;
    const inProgress = data.filter(t => t.status === "In Progress").length;
    const completed = data.filter(t => t.status === "Completed").length;
    const overdue = data.filter(t =>
      t.deadline && new Date(t.deadline) < now && t.status !== "Completed"
    ).length;

    const upcomingDeadlines = data
      .filter(t => t.deadline && t.status !== "Completed")
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);

    // ✅ Count subtasks across all tasks
    const totalSubtasks = data.reduce((acc, t) =>
      acc + (Array.isArray(t.subtasks) ? t.subtasks.length : 0), 0
    );

    const completedSubtasks = data.reduce((acc, t) =>
      acc + (Array.isArray(t.subtasks)
        ? t.subtasks.filter(s => s.status === "Completed").length
        : 0), 0
    );

    res.json({
      totalTasks,
      pending,
      inProgress,
      completed,
      overdue,
      totalSubtasks,
      completedSubtasks,
      upcomingDeadlines
    });

  } catch (error) {
    console.error("Dashboard error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// ✅ ACTIVITY — recent tasks for dashboard feed
app.get("/api/activity", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) throw error;

    const activity = data.map(task => ({
      message: `"${task.title}" assigned to ${task.assignedTo || "Unassigned"}`,
      created_at: task.created_at
    }));

    res.json(activity);

  } catch (error) {
    console.error("Activity error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// GET ALL TASKS
app.get("/api/tasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // ✅ Always return subtasks as array
    const tasks = data.map(t => ({
      ...t,
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : []
    }));

    res.json(tasks);

  } catch (error) {
    console.error("Get tasks error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// GET SINGLE TASK
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({
      ...data,
      subtasks: Array.isArray(data.subtasks) ? data.subtasks : []
    });

  } catch (error) {
    console.error("Get task error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// CREATE TASK
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, category, assignedTo, deadline, remarks } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([{
        title: title.trim(),
        category: category || "General",
        assignedTo: assignedTo?.trim() || "Unassigned",
        deadline: deadline || null,
        status: "Pending",
        remarks: remarks?.trim() || "",
        subtasks: [],
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      message: "Task created successfully",
      task: data[0]
    });

  } catch (error) {
    console.error("Create task error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// UPDATE TASK
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { title, category, assignedTo, deadline, status, remarks } = req.body;

    const { data, error } = await supabase
      .from("tasks")
      .update({ title, category, assignedTo, deadline, status, remarks })
      .eq("id", req.params.id)
      .select();

    if (error) throw error;

    res.json({
      message: "Task updated successfully",
      task: data[0]
    });

  } catch (error) {
    console.error("Update task error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// DELETE TASK
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ message: "Task deleted successfully" });

  } catch (error) {
    console.error("Delete task error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// UPDATE TASK STATUS
app.patch("/api/tasks/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["Pending", "In Progress", "Completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", req.params.id)
      .select();

    if (error) throw error;

    res.json({
      message: "Status updated successfully",
      task: data[0]
    });

  } catch (error) {
    console.error("Update status error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// ADD SUBTASK
app.post("/api/tasks/:id/subtasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!req.body.title || !req.body.title.trim()) {
      return res.status(400).json({ message: "Subtask title is required" });
    }

    const subtasks = Array.isArray(data.subtasks) ? data.subtasks : [];

    const newSubtask = {
      id: Date.now().toString(), // ✅ string ID — consistent with find/filter below
      title: req.body.title.trim(),
      assignedTo: req.body.assignedTo?.trim() || "Unassigned",
      deadline: req.body.deadline || null,
      status: "Pending",
      remarks: req.body.remarks?.trim() || "",
      created_at: new Date().toISOString()
    };

    subtasks.push(newSubtask);

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ subtasks })
      .eq("id", req.params.id);

    if (updateError) throw updateError;

    res.status(201).json({
      message: "Subtask added successfully",
      subtask: newSubtask
    });

  } catch (error) {
    console.error("Add subtask error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// UPDATE SUBTASK
app.put("/api/tasks/:taskId/subtasks/:subId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.taskId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subtasks = Array.isArray(data.subtasks) ? data.subtasks : [];

    // ✅ Compare as strings — IDs are stored as strings via Date.now().toString()
    const subtask = subtasks.find(s => String(s.id) === String(req.params.subId));

    if (!subtask) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    subtask.title = req.body.title ?? subtask.title;
    subtask.assignedTo = req.body.assignedTo ?? subtask.assignedTo;
    subtask.deadline = req.body.deadline ?? subtask.deadline;
    subtask.status = req.body.status ?? subtask.status;
    subtask.remarks = req.body.remarks ?? subtask.remarks;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ subtasks })
      .eq("id", req.params.taskId);

    if (updateError) throw updateError;

    res.json({
      message: "Subtask updated successfully",
      subtask
    });

  } catch (error) {
    console.error("Update subtask error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// DELETE SUBTASK
app.delete("/api/tasks/:taskId/subtasks/:subId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", req.params.taskId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subtasks = Array.isArray(data.subtasks) ? data.subtasks : [];

    // ✅ Compare as strings
    const updatedSubtasks = subtasks.filter(
      s => String(s.id) !== String(req.params.subId)
    );

    if (updatedSubtasks.length === subtasks.length) {
      return res.status(404).json({ message: "Subtask not found" });
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ subtasks: updatedSubtasks })
      .eq("id", req.params.taskId);

    if (updateError) throw updateError;

    res.json({ message: "Subtask deleted successfully" });

  } catch (error) {
    console.error("Delete subtask error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});