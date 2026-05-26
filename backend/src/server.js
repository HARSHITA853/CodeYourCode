import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import OpenAI from "openai";
import { Server } from "socket.io";
import User from "./models/User.js";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;
const JUDGE0_API_URL =
  process.env.JUDGE0_API_URL || "https://ce.judge0.com/submissions?wait=true";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/simple-mern-auth";

const JWT_SECRET = process.env.JWT_SECRET || "simple_jwt_secret";

function normalizeOrigin(origin) {
  return origin?.trim().replace(/\/$/, "");
}

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000"
].map(normalizeOrigin);

const envAllowedOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL),
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
].filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return (
    process.env.ALLOW_VERCEL_PREVIEWS === "true" &&
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(normalizedOrigin)
  );
}

function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked origin: ${origin}`));
}

const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};


// Keep HTTP and Socket.IO CORS aligned for local and deployed frontends.
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());


const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

const rooms = {};


// ✅ DB CONNECTION
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));


// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.post("/run-code", async (req, res) => {
  try {
    const { source_code, language_id, stdin } = req.body;

    if (!source_code || typeof source_code !== "string") {
      return res.status(400).json({ message: "source_code is required" });
    }

    if (!language_id || typeof language_id !== "number") {
      return res.status(400).json({ message: "language_id must be a number" });
    }

    const headers = {
      "Content-Type": "application/json"
    };

    if (JUDGE0_API_KEY) {
      headers["X-Auth-Token"] = JUDGE0_API_KEY;
    }

    const judgeResponse = await fetch(JUDGE0_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_code,
        language_id,
        stdin: typeof stdin === "string" ? stdin : ""
      })
    });

    const result = await judgeResponse.json();

    if (!judgeResponse.ok) {
      return res.status(judgeResponse.status).json({
        message: result.error || result.message || "Code execution failed",
        details: result
      });
    }

    return res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      compile_output: result.compile_output,
      status: result.status
    });
  } catch (error) {
    console.log("Run code error:", error.message);
    return res.status(500).json({
      message: "Could not execute code"
    });
  }
});


// ================= AUTH =================

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Fill all fields" });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ message: "Email exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed
    });

    res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.log("Signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});


// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1d"
    });

    res.json({
      message: "Login successful",
      token,
      user
    });

  } catch (err) {
    console.log("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});


// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username || "Guest";

    if (!rooms[roomId]) rooms[roomId] = {};

    rooms[roomId][socket.id] = {
      socketId: socket.id,
      username: socket.username
    };

    io.to(roomId).emit("users", Object.values(rooms[roomId]));
  });

  socket.on("code-change", ({ roomId, fileName, code }) => {
    socket.to(roomId).emit("code-change", { fileName, code });
  });

  socket.on("new-file", ({ roomId, fileName }) => {
    socket.to(roomId).emit("new-file", fileName);
  });

  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", username);
  });

  socket.on("send-message", ({ roomId, message, username }) => {
    io.to(roomId).emit("receive-message", {
      message,
      username,
      time: new Date()
    });
  });

  socket.on("disconnect", () => {
    const { roomId } = socket;

    if (roomId && rooms[roomId]) {
      delete rooms[roomId][socket.id];
      io.to(roomId).emit("users", Object.values(rooms[roomId]));
    }

    console.log("Disconnected:", socket.id);
  });
});


// ================= START SERVER =================
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
