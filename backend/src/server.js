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

dotenv.config({ quiet: true });

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/simple-mern-auth";
const JWT_SECRET = process.env.JWT_SECRET || "simple_jwt_secret";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});
const rooms = {};

app.use(
  cors({
    origin: "https://your-app.netlify.app",
    credentials: true
  })
);
app.use(express.json());

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error.message);
  });

app.get("/", (req, res) => {
  res.send("MERN backend is running");
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend" });
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "your_openai_api_key_here"
    ) {
      return res.status(500).json({ message: "OpenAI API key is missing" });
    }

    // Send the user's message to OpenAI and ask for a helpful coding answer.
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful coding assistant inside a collaborative code editor. Keep answers clear and beginner friendly."
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
  } catch (error) {
    console.log("AI chat error:", error.message);
    res.status(500).json({ message: "AI chat failed. Please try again." });
  }
});

app.post("/rooms", (req, res) => {
  const roomId = Math.random().toString(36).substring(2, 8);

  res.status(201).json({
    message: "Room created",
    roomId
  });
});

app.get("/rooms/:roomId", (req, res) => {
  res.json({
    message: "Room route is working",
    roomId: req.params.roomId
  });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId) {
      console.log("Join failed: missing roomId");
      return;
    }

    const safeUsername = username || "Guest";

    // A room lets only users with the same roomId receive each other's code.
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = safeUsername;

    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }

    rooms[roomId][socket.id] = {
      socketId: socket.id,
      username: safeUsername
    };

    const users = Object.values(rooms[roomId]);
    io.to(roomId).emit("users", users);

    console.log(`${safeUsername} joined room ${roomId}`);
    console.log("Users in room:", users);
  });

  socket.on("code-change", ({ roomId, code }) => {
    // Send the changed code to everyone else in the same room.
    console.log(`Code changed in room ${roomId} by ${socket.username}`);
    socket.to(roomId).emit("code-change", code);
  });

  socket.on("typing", ({ roomId, username }) => {
    // Tell everyone else in the room who is currently typing.
    console.log(`${username} is typing in room ${roomId}`);
    socket.to(roomId).emit("user-typing", username);
  });

  socket.on("disconnect", () => {
    const { roomId } = socket;

    if (roomId && rooms[roomId]) {
      delete rooms[roomId][socket.id];
      const users = Object.values(rooms[roomId]);
      io.to(roomId).emit("users", users);

      console.log(`${socket.username} left room ${roomId}`);
      console.log("Users in room:", users);

      if (Object.keys(rooms[roomId]).length === 0) {
        delete rooms[roomId];
      }
    }

    console.log("Socket disconnected:", socket.id);
  });
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password before saving it, so the plain password is never stored.
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the typed password with the hashed password in MongoDB.
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // JWT is a signed token the frontend can store and send with future requests.
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1d"
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
