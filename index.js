const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

// ROOT ROUTE
app.get("/", (req, res) => {
  res.send("WELCOME TO TASK MANAGEMENT API");
});

// DATABASE
let tasks = [];
let taskCounter = 1;

// FIND TASK HELPER
const findTask = (id) => tasks.find(t => t.id == Number(id));

// CREATE TASK
app.post("/api/tasks", (req, res) => {
  const { title, category, assignedTo, deadline, remarks } = req.body;

  const newTask = {
    id: taskCounter++,
    title,
    category,
    assignedTo: assignedTo || "Unassigned",
    deadline: deadline || null,
    status: "Pending",
    remarks: remarks || "",
    subtasks: [],
    createdAt: new Date()
  };

  tasks.push(newTask);

  res.json({
    message: "Task created successfully",
    task: newTask
  });
});

// GET ALL TASKS
app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

// GET SINGLE TASK
app.get("/api/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.json(task);
});

// UPDATE TASK
app.put("/api/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const {
    title,
    category,
    assignedTo,
    deadline,
    status,
    remarks
  } = req.body;

  task.title = title ?? task.title;
  task.category = category ?? task.category;
  task.assignedTo = assignedTo ?? task.assignedTo;
  task.deadline = deadline ?? task.deadline;
  task.status = status ?? task.status;
  task.remarks = remarks ?? task.remarks;

  res.json({
    message: "Task updated successfully",
    task
  });
});

// DELETE TASK
app.delete("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);

  const exists = tasks.some(t => t.id === id);

  if (!exists) {
    return res.status(404).json({ message: "Task not found" });
  }

  tasks = tasks.filter(t => t.id !== id);

  res.json({ message: "Task deleted successfully" });
});

// ADD SUBTASK
app.post("/api/tasks/:id/subtasks", (req, res) => {
  const task = findTask(req.params.id);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const subtask = {
    id: Date.now().toString(),
    title: req.body.title,
    assignedTo: req.body.assignedTo || "Unassigned",
    deadline: req.body.deadline || null,
    status: "Pending",
    remarks: req.body.remarks || "",
    createdAt: new Date()
  };

  task.subtasks.push(subtask);

  res.json({
    message: "Subtask added successfully",
    subtask
  });
});

// UPDATE SUBTASK
app.put("/api/tasks/:taskId/subtasks/:subId", (req, res) => {
  const task = findTask(req.params.taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const subtask = task.subtasks.find(
    s => s.id === req.params.subId
  );

  if (!subtask) {
    return res.status(404).json({ message: "Subtask not found" });
  }

  const {
    title,
    assignedTo,
    deadline,
    status,
    remarks
  } = req.body;

  subtask.title = title ?? subtask.title;
  subtask.assignedTo = assignedTo ?? subtask.assignedTo;
  subtask.deadline = deadline ?? subtask.deadline;
  subtask.status = status ?? subtask.status;
  subtask.remarks = remarks ?? subtask.remarks;

  res.json({
    message: "Subtask updated successfully",
    subtask
  });
});

// DELETE SUBTASK
app.delete("/api/tasks/:taskId/subtasks/:subId", (req, res) => {
  const task = findTask(req.params.taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const before = task.subtasks.length;

  task.subtasks = task.subtasks.filter(
    s => s.id !== req.params.subId
  );

  if (task.subtasks.length === before) {
    return res.status(404).json({ message: "Subtask not found" });
  }

  res.json({ message: "Subtask deleted successfully" });
});

// UPDATE TASK STATUS ONLY
app.patch("/api/tasks/:id/status", (req, res) => {
  const task = findTask(req.params.id);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  task.status = req.body.status;

  res.json({
    message: "Status updated successfully",
    task
  });
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});