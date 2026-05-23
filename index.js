require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const supabase = require("./supabase");

const app = express();


// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());


// SERVE STATIC FILES
app.use(express.static(path.join(__dirname)));


// FRONTEND ROUTES

// LANDING PAGE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "landingpage.html"));
});

// DASHBOARD PAGE
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// TASK MANAGER PAGE
app.get("/tasks", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


// ================= API ROUTES =================


// GET ALL TASKS
app.get("/api/tasks", async (req, res) => {

  const { data, error } =
    await supabase
      .from("tasks")
      .select("*");

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});


// GET SINGLE TASK
app.get("/api/tasks/:id", async (req, res) => {

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  res.json(data);
});


// CREATE TASK
app.post("/api/tasks", async (req, res) => {

  const {
    title,
    category,
    assignedTo,
    deadline,
    remarks
  } = req.body;

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        title,
        category,
        assignedTo: assignedTo || "Unassigned",
        deadline: deadline || null,
        status: "Pending",
        remarks: remarks || "",
        subtasks: [],
        created_at: new Date()
      }
    ])
    .select();

  if (error) {
    return res.status(500).json(error);
  }

  res.json({
    message: "Task created successfully",
    task: data[0]
  });
});


// UPDATE TASK
app.put("/api/tasks/:id", async (req, res) => {

  const {
    title,
    category,
    assignedTo,
    deadline,
    status,
    remarks
  } = req.body;

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title,
      category,
      assignedTo,
      deadline,
      status,
      remarks
    })
    .eq("id", req.params.id)
    .select();

  if (error) {
    return res.status(500).json(error);
  }

  res.json({
    message: "Task updated successfully",
    task: data[0]
  });
});


// DELETE TASK
app.delete("/api/tasks/:id", async (req, res) => {

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return res.status(500).json(error);
  }

  res.json({
    message: "Task deleted successfully"
  });
});


// ADD SUBTASK
app.post("/api/tasks/:id/subtasks", async (req, res) => {

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  const subtasks = data.subtasks || [];

  const newSubtask = {
    id: Date.now().toString(),
    title: req.body.title,
    assignedTo: req.body.assignedTo || "Unassigned",
    deadline: req.body.deadline || null,
    status: "Pending",
    remarks: req.body.remarks || "",
    created_at: new Date()
  };

  subtasks.push(newSubtask);

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ subtasks })
    .eq("id", req.params.id);

  if (updateError) {
    return res.status(500).json(updateError);
  }

  res.json({
    message: "Subtask added successfully",
    subtask: newSubtask
  });
});


// UPDATE SUBTASK
app.put("/api/tasks/:taskId/subtasks/:subId", async (req, res) => {

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", req.params.taskId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  const subtasks = data.subtasks || [];

  const subtask = subtasks.find(
    s => s.id === req.params.subId
  );

  if (!subtask) {
    return res.status(404).json({
      message: "Subtask not found"
    });
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

  if (updateError) {
    return res.status(500).json(updateError);
  }

  res.json({
    message: "Subtask updated successfully",
    subtask
  });
});


// DELETE SUBTASK
app.delete("/api/tasks/:taskId/subtasks/:subId", async (req, res) => {

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", req.params.taskId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  const subtasks = data.subtasks || [];

  const updatedSubtasks = subtasks.filter(
    s => s.id !== req.params.subId
  );

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      subtasks: updatedSubtasks
    })
    .eq("id", req.params.taskId);

  if (updateError) {
    return res.status(500).json(updateError);
  }

  res.json({
    message: "Subtask deleted successfully"
  });
});


// UPDATE TASK STATUS ONLY
app.patch("/api/tasks/:id/status", async (req, res) => {

  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: req.body.status
    })
    .eq("id", req.params.id)
    .select();

  if (error) {
    return res.status(500).json(error);
  }

  res.json({
    message: "Status updated successfully",
    task: data[0]
  });
});


// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});