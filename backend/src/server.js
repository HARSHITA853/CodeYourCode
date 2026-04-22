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

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/simple-mern-auth";

const JWT_SECRET = process.env.JWT_SECRET || "simple_jwt_secret";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// ✅ FIXED SOCKET.IO CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};


// ✅ FIXED EXPRESS CORS
app.use(
  cors({
    origin: "*"
  })
);

app.use(express.json());


// ✅ DB CONNECTION
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));


// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is running");
});


// ================= AI ROUTE =================
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "OpenAI API key missing" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful coding assistant. Keep answers simple."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      reply: response.choices[0].message.content
    });

  } catch (err) {
    console.log("AI error:", err.message);
    res.status(500).json({ message: "AI failed" });
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

  socket.on("code-change", ({ roomId, code }) => {
    socket.to(roomId).emit("code-change", code);
  });

  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user-typing", username);
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
