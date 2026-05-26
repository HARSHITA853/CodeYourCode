import React from "react";
import ReactDOM from "react-dom/client";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";
import "./index.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "https://code-yourcode.onrender.com"
).replace(/\/$/, "");
const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL || API_URL
).replace(/\/$/, "");

const starterCode = {
  javascript: `function hello() {
  console.log("Hello from JavaScript");
}

hello();`,
  python: `def hello():
    print("Hello from Python")

hello()`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++" << endl;
    return 0;
}`
};

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54
};

function getCodeStorageKey(roomId) {
  return `code-room-${roomId}`;
}

function getFilesStorageKey(roomId) {
  return `files-room-${roomId}`;
}

function getActiveFileStorageKey(roomId) {
  return `active-file-room-${roomId}`;
}

function getLanguageStorageKey(roomId) {
  return `language-room-${roomId}`;
}

function getDefaultFileName(language = "javascript") {
  if (language === "python") {
    return "main.py";
  }

  if (language === "cpp") {
    return "main.cpp";
  }

  return "main.js";
}

function getLanguageFromFileName(fileName) {
  if (fileName.endsWith(".py")) {
    return "python";
  }

  if (
    fileName.endsWith(".cpp") ||
    fileName.endsWith(".cc") ||
    fileName.endsWith(".cxx") ||
    fileName.endsWith(".c")
  ) {
    return "cpp";
  }

  return "javascript";
}

function Button({ children, className = "", variant = "primary", ...props }) {
  const styles = {
    primary:
      "bg-[#6366f1] text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-500",
    secondary:
      "border border-slate-700 bg-slate-900 text-[#e5e7eb] hover:border-[#6366f1] hover:text-white",
    success:
      "bg-emerald-600 text-white shadow-lg shadow-emerald-950/30 hover:bg-emerald-500"
  };

  return (
    <button
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:hover:translate-y-0 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ label, className = "", ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-[#e5e7eb] outline-none transition duration-200 placeholder:text-slate-500 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/30 ${className}`}
        {...props}
      />
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`smooth-panel animate-fade-in-up rounded-xl border border-slate-800 bg-[#111827] p-6 shadow-2xl shadow-slate-950/30 ${className}`}
    >
      {children}
    </div>
  );
}

function AuthInput({ icon, label, className = "", ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="group relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-[#6366f1]">
          {icon}
        </span>
        <input
          className={`w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-[#e5e7eb] outline-none transition duration-200 placeholder:text-slate-500 focus:border-[#6366f1] focus:bg-slate-950 focus:ring-2 focus:ring-[#6366f1]/30 ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#111827]/90 shadow-xl shadow-slate-950/20 backdrop-blur transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold text-[#e5e7eb]">
          Code Your Code
        </Link>

        <div className="hidden gap-6 text-sm font-medium md:flex">
          <a href="#features" className="text-slate-300 transition hover:text-[#6366f1]">
            Features
          </a>
          <a href="#about" className="text-slate-300 transition hover:text-[#6366f1]">
            About
          </a>
        </div>

        <div className="flex items-center gap-3 text-sm font-medium">
          <Link to="/login" className="text-slate-300 transition hover:text-[#6366f1]">
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-[#6366f1] px-4 py-2 text-white shadow-lg shadow-indigo-950/30 transition hover:-translate-y-0.5 hover:bg-indigo-500"
          >
            Signup
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Home() {
  const features = [
    {
      icon: "<>",
      title: "Real-time collaboration",
      description: "Code with teammates in the same room and see updates instantly."
    },
    {
      icon: "{}",
      title: "Multi-language support",
      description: "Switch between JavaScript, Python, and C++ in the editor."
    },
    {
      icon: ">_",
      title: "Run code instantly",
      description: "Execute JavaScript directly and view output in a built-in console."
    },
    {
      icon: "AI",
      title: "AI assistant",
      description: "Ask for explanations, debugging help, and coding guidance."
    }
  ];

  const steps = [
    "Create or join a room",
    "Collaborate in real-time",
    "Run and debug code"
  ];

  return (
    <main className="animate-fade-in-up bg-[radial-gradient(circle_at_top,#312e81_0,#0f172a_38%,#020617_100%)] text-[#e5e7eb]">
      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1fr_0.95fr]">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-indigo-300">
            Collaborative coding platform
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight text-white md:text-6xl">
            Code Together. Build Faster.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Real-time collaborative coding with built-in AI assistance
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="rounded-xl bg-[#6366f1] px-6 py-3 text-center font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:-translate-y-1 hover:bg-indigo-500"
            >
              Start Coding
            </Link>
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-700 bg-[#111827] px-6 py-3 text-center font-semibold text-slate-100 transition hover:-translate-y-1 hover:border-[#6366f1]"
            >
              Join Room
            </Link>
          </div>
        </div>

        <div className="smooth-panel rounded-xl border border-slate-800 bg-[#111827] p-4 shadow-2xl shadow-slate-950/40">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-4 text-xs text-slate-500">room/main.js</span>
          </div>
          <pre className="overflow-hidden rounded-xl bg-[#020617] p-5 font-mono text-sm leading-7 text-slate-300">
            <code>{`const room = "code-your-code";

socket.on("collaborate", () => {
  runCode();
  askAI("Review this function");
});

console.log("Build faster together");`}</code>
          </pre>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6366f1]">
            Features
          </p>
          <h2 className="text-3xl font-bold text-white">Everything your coding room needs</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="p-5 hover:border-[#6366f1]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366f1]/20 font-mono text-sm font-bold text-indigo-300">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-6 text-slate-400">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6366f1]">
              How it works
            </p>
            <h2 className="text-3xl font-bold text-white">From idea to shared editor in seconds</h2>
          </div>

          <div className="grid gap-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="smooth-panel flex items-center gap-4 rounded-xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-slate-950/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366f1] font-bold text-white">
                  {index + 1}
                </div>
                <p className="font-semibold text-slate-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-[#111827] to-indigo-950/50 p-8 text-center shadow-2xl shadow-slate-950/30">
          <h2 className="text-3xl font-bold text-white">Start your coding journey now</h2>
          <p className="mt-3 text-slate-300">
            Create a room, invite your team, and ship ideas faster.
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-block rounded-xl bg-[#6366f1] px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:-translate-y-1 hover:bg-indigo-500"
          >
            Get Started
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>Code Your Code</p>
          <p>Copyright 2026 Code Your Code. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#features" className="transition hover:text-[#6366f1]">Features</a>
            <a href="#about" className="transition hover:text-[#6366f1]">About</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (error) {
      console.error("Login request failed:", error);
      setMessage("Could not connect to server");
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-[radial-gradient(circle_at_top,#312e81_0,#0f172a_42%,#020617_100%)] px-4 py-12">
      <Card className="w-full max-w-md border-slate-700/70 bg-[#111827]/95 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6366f1]">
            Welcome back
          </p>
          <h1 className="text-3xl font-bold text-[#e5e7eb]">Login to your account</h1>
          <p className="mt-3 text-sm text-slate-400">
            Continue building with your collaborative editor.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin}>
          <AuthInput
            icon="@"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <AuthInput
            icon="*"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
          />

          {message && (
            <p className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full py-3">
            Login
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{" "}
          <Link className="font-semibold text-[#6366f1] hover:text-indigo-300" to="/signup">
            Create an account
          </Link>
        </p>
      </Card>
    </main>
  );
}

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function handleSignup(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Signup failed");
        return;
      }

      setMessage("Signup successful. Please login.");

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (error) {
      console.error("Signup request failed:", error);
      setMessage("Could not connect to server");
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-[radial-gradient(circle_at_top,#312e81_0,#0f172a_42%,#020617_100%)] px-4 py-12">
      <Card className="w-full max-w-md border-slate-700/70 bg-[#111827]/95 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#6366f1]">
            Start collaborating
          </p>
          <h1 className="text-3xl font-bold text-[#e5e7eb]">Create your account</h1>
          <p className="mt-3 text-sm text-slate-400">
            Sign up and create coding rooms in seconds.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSignup}>
          <AuthInput
            icon="#"
            label="Name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
          />

          <AuthInput
            icon="@"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          <AuthInput
            icon="*"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
          />

          {message && (
            <p className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full py-3">
            Signup
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="font-semibold text-[#6366f1] hover:text-indigo-300" to="/login">
            Login
          </Link>
        </p>
      </Card>
    </main>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const displayName = savedUser.name || "Developer";
  const recentRooms = ["team-sync", "debug-lab", "frontend-ui"];

  function createRoom() {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    navigate(`/editor/${newRoomId}`);
  }

  function joinRoom(event) {
    event.preventDefault();

    if (!roomId.trim()) {
      setMessage("Please enter a room ID");
      return;
    }

    navigate(`/editor/${roomId.trim()}`);
  }

  return (
    <main className="animate-fade-in-up mx-auto max-w-6xl px-4 py-10">
      <section className="smooth-panel mb-8 rounded-xl border border-slate-800 bg-gradient-to-r from-[#111827] to-slate-950 p-6 shadow-2xl shadow-slate-950/30">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6366f1]">
          Dashboard
        </p>
        <h1 className="text-3xl font-bold text-[#e5e7eb]">
          Welcome back, {displayName}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Start a new collaborative coding session or jump into an existing room.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="transition hover:-translate-y-1 hover:border-[#6366f1] hover:shadow-indigo-950/30">
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366f1]/20 text-xl text-indigo-300">
              +
            </div>
            <h2 className="text-2xl font-bold text-[#e5e7eb]">Create Room</h2>
            <p className="mt-2 text-slate-400">
              Generate a fresh room ID and open the collaborative editor.
            </p>
          </div>

          <Button type="button" onClick={createRoom} className="w-full py-4 text-base">
            Create New Room
          </Button>
        </Card>

        <Card className="transition hover:-translate-y-1 hover:border-[#6366f1] hover:shadow-indigo-950/30">
          <div className="mb-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366f1]/20 text-xl text-indigo-300">
              #
            </div>
            <h2 className="text-2xl font-bold text-[#e5e7eb]">Join Room</h2>
            <p className="mt-2 text-slate-400">
              Enter a room ID shared by your teammate.
            </p>
          </div>

          <form className="space-y-4" onSubmit={joinRoom}>
            <Input
              label="Room ID"
              type="text"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              placeholder="Enter room ID"
            />

            <Button type="submit" variant="secondary" className="w-full py-4 text-base">
              Join Room
            </Button>

            {message && (
              <p className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
                {message}
              </p>
            )}
          </form>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#e5e7eb]">Recent Rooms</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {recentRooms.map((recentRoom) => (
            <button
              key={recentRoom}
              type="button"
              onClick={() => navigate(`/editor/${recentRoom}`)}
              className="smooth-panel rounded-xl border border-slate-800 bg-[#111827] p-4 text-left shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-[#6366f1]"
            >
              <p className="font-semibold text-[#e5e7eb]">{recentRoom}</p>
              <p className="mt-1 text-sm text-slate-400">Open room</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function CodeEditor() {
  const { roomId } = useParams();
  const [language, setLanguage] = React.useState("javascript");
  const [files, setFiles] = React.useState({
    "main.js": starterCode.javascript
  });
  const [activeFile, setActiveFile] = React.useState("main.js");
  const [stdin, setStdin] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [errorOutput, setErrorOutput] = React.useState("");
  const [isRunning, setIsRunning] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [users, setUsers] = React.useState([]);
  const [typingUser, setTypingUser] = React.useState("");
  const [chatTypingUser, setChatTypingUser] = React.useState("");
  const [activeRightPanelTab, setActiveRightPanelTab] = React.useState("chat");
  const [messages, setMessages] = React.useState([]);
  const [chatMessage, setChatMessage] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState([
    {
      role: "assistant",
      content: "Hi! Ask me for help with your code."
    }
  ]);
  const [chatInput, setChatInput] = React.useState("");
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const socketRef = React.useRef(null);
  const usernameRef = React.useRef("");
  const typingTimeoutRef = React.useRef(null);
  const chatTypingTimeoutRef = React.useRef(null);
  const chatTypingDebounceRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);
  const aiMessagesEndRef = React.useRef(null);
  const activeCode = files[activeFile] || "";

  React.useEffect(() => {
    const savedLanguage = localStorage.getItem(getLanguageStorageKey(roomId)) || "javascript";
    const savedFiles = localStorage.getItem(getFilesStorageKey(roomId));
    const legacyCode = localStorage.getItem(getCodeStorageKey(roomId));
    const defaultFileName = getDefaultFileName(savedLanguage);

    let nextFiles = {
      [defaultFileName]: legacyCode || starterCode[savedLanguage]
    };

    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);

        if (parsedFiles && typeof parsedFiles === "object" && !Array.isArray(parsedFiles)) {
          nextFiles = Object.keys(parsedFiles).length > 0 ? parsedFiles : nextFiles;
        }
      } catch (error) {
        console.log("Files storage parse error:", error.message);
      }
    }

    const savedActiveFile = localStorage.getItem(getActiveFileStorageKey(roomId));
    const availableFiles = Object.keys(nextFiles);
    const nextActiveFile =
      savedActiveFile && nextFiles[savedActiveFile] !== undefined
        ? savedActiveFile
        : availableFiles[0];

    setFiles(nextFiles);
    setActiveFile(nextActiveFile);
    setLanguage(getLanguageFromFileName(nextActiveFile));
  }, [roomId]);

  React.useEffect(() => {
    localStorage.setItem(getFilesStorageKey(roomId), JSON.stringify(files));
  }, [files, roomId]);

  React.useEffect(() => {
    localStorage.setItem(getActiveFileStorageKey(roomId), activeFile);
    localStorage.setItem(getCodeStorageKey(roomId), activeCode);
  }, [activeCode, activeFile, roomId]);

  React.useEffect(() => {
    const enteredName = window.prompt("Enter your username")?.trim() || "Guest";
    setUsername(enteredName);
    usernameRef.current = enteredName;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      socket.emit("join-room", {
        roomId,
        username: enteredName
      });
    });

    socket.on("connect_error", (error) => {
      console.log("Socket connection error:", error.message);
    });

    socket.on("users", (roomUsers) => {
      console.log("Users in room:", roomUsers);
      setUsers(roomUsers);
    });

    socket.on("user-typing", (name) => {
      setTypingUser(name);
      setChatTypingUser(name);

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser("");
      }, 1200);

      clearTimeout(chatTypingTimeoutRef.current);
      chatTypingTimeoutRef.current = setTimeout(() => {
        setChatTypingUser("");
      }, 2000);
    });

    socket.on("code-change", ({ fileName, code }) => {
      setFiles((currentFiles) => ({
        ...currentFiles,
        [fileName]: code
      }));
    });

    socket.on("new-file", (fileName) => {
      setFiles((currentFiles) => {
        if (currentFiles[fileName] !== undefined) {
          return currentFiles;
        }

        return {
          ...currentFiles,
          [fileName]: ""
        };
      });
    });

    socket.on("receive-message", (data) => {
      setMessages((currentMessages) => [...currentMessages, data]);
    });

    return () => {
      clearTimeout(typingTimeoutRef.current);
      clearTimeout(chatTypingTimeoutRef.current);
      clearTimeout(chatTypingDebounceRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  function handleLanguageChange(event) {
    const selectedLanguage = event.target.value;

    setLanguage(selectedLanguage);
    localStorage.setItem(getLanguageStorageKey(roomId), selectedLanguage);
  }

  function handleCodeChange(value) {
    const newCode = value || "";
    setFiles((currentFiles) => ({
      ...currentFiles,
      [activeFile]: newCode
    }));

    console.log("Sending code change");
    socketRef.current?.emit("code-change", {
      roomId,
      fileName: activeFile,
      code: newCode
    });

    socketRef.current?.emit("typing", {
      roomId,
      username: usernameRef.current
    });
  }

  function handleFileSwitch(fileName) {
    setActiveFile(fileName);
    setLanguage(getLanguageFromFileName(fileName));
  }

  function createNewFile() {
    const fileName = window.prompt("Enter new file name")?.trim();

    if (!fileName) {
      return;
    }

    setFiles((currentFiles) => {
      if (currentFiles[fileName] !== undefined) {
        return currentFiles;
      }

      return {
        ...currentFiles,
        [fileName]: ""
      };
    });

    setActiveFile(fileName);
    setLanguage(getLanguageFromFileName(fileName));

    socketRef.current?.emit("new-file", {
      roomId,
      fileName
    });
  }

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  React.useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function runCode() {
    try {
      setIsRunning(true);
      setOutput("");
      setErrorOutput("");

      const response = await fetch(`${API_URL}/run-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source_code: activeCode,
          language_id: LANGUAGE_IDS[language],
          stdin
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Code execution failed");
      }

      if (data.compile_output) {
        setErrorOutput(`Compilation Error\n${data.compile_output}`);
        return;
      }

      if (data.stderr) {
        setErrorOutput(`Runtime Error\n${data.stderr}`);
        return;
      }

      if (data.stdout) {
        setOutput(data.stdout);
        return;
      }

      setOutput(data.status?.description || "Code ran successfully with no output.");
    } catch (error) {
      setErrorOutput(error.message || "Could not run code");
    } finally {
      setIsRunning(false);
    }
  }

  async function sendChatMessage(event) {
    event.preventDefault();

    const message = chatInput.trim();

    if (!message || isChatLoading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: message
    };

    setChatMessages((currentMessages) => [...currentMessages, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "AI request failed");
      }

      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: data.reply
        }
      ]);
    } catch (error) {
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: error.message
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      setOutput(`Copied room ID: ${roomId}`);
      setErrorOutput("");
    } catch (error) {
      setErrorOutput("Could not copy room ID");
    }
  }

  function sendRoomMessage(event) {
    event.preventDefault();

    const message = chatMessage.trim();

    if (!message) {
      return;
    }

    socketRef.current?.emit("send-message", {
      roomId,
      message,
      username: usernameRef.current || username || "Guest"
    });

    setChatMessage("");
    setChatTypingUser("");
  }

  return (
    <main className="min-h-screen bg-[#0f172a] p-4 text-[#e5e7eb]">
      <div className="animate-fade-in-up grid h-[calc(100vh-105px)] min-h-[720px] overflow-hidden rounded-xl border border-slate-800 bg-[#111827] shadow-2xl shadow-slate-950/50 lg:grid-cols-[240px_1fr_320px]">
        <aside className="flex flex-col border-b border-slate-800 bg-[#0b1220] lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Explorer
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-200">Workspace</h2>
          </div>

          <div className="border-b border-slate-800 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Files
              </h3>
              <button
                type="button"
                onClick={createNewFile}
                className="rounded-lg border border-slate-700 bg-[#111827] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-[#6366f1] hover:text-white"
              >
                New File
              </button>
            </div>
            <div className="space-y-1 text-sm">
              {Object.keys(files).map((fileName) => (
                <button
                  key={fileName}
                  type="button"
                  onClick={() => handleFileSwitch(fileName)}
                  className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                    activeFile === fileName
                      ? "bg-[#111827] text-slate-200 ring-1 ring-[#6366f1]/60"
                      : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
                  }`}
                >
                  {fileName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Users
            </h3>
            <ul className="space-y-2">
              {users.map((user) => (
                <li
                  key={user.socketId}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-sm text-slate-200 transition hover:border-[#6366f1]"
                >
                  <span className="animate-soft-pulse h-2 w-2 rounded-full bg-emerald-400" />
                  {user.username}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className="flex flex-col gap-3 border-b border-slate-800 bg-[#0b1220] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-slate-100">Collaborative Editor</h1>
              <p className="truncate text-xs text-slate-400">
                Room ID: <span className="font-mono text-indigo-300">{roomId}</span>
                <span className="mx-2 text-slate-600">|</span>
                Active File: <span className="font-mono text-indigo-300">{activeFile}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copyRoomId}
                className="rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-sm text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-[#6366f1] hover:text-white"
              >
                Copy
              </button>

              <select
                value={language}
                onChange={handleLanguageChange}
                className="rounded-lg border border-slate-700 bg-[#111827] px-3 py-2 text-sm text-[#e5e7eb] outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/30"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
              </select>

              <Button type="button" onClick={runCode} variant="success" disabled={isRunning}>
                {isRunning ? "Running..." : "Run Code"}
              </Button>
            </div>
          </div>

          <div className="border-b border-slate-800 bg-[#111827] px-4 py-2 text-xs text-slate-400">
            You are <span className="text-slate-200">{username}</span>
            {typingUser && (
              <span className="animate-soft-pulse ml-4 text-indigo-300">{typingUser} is typing...</span>
            )}
          </div>

          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              language={getLanguageFromFileName(activeFile)}
              theme="vs-dark"
              value={activeCode}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                wordWrap: "on"
              }}
            />
          </div>

          <div className="border-t border-slate-800 bg-[#020617]">
            <div className="grid gap-0 md:grid-cols-3">
              <div className="border-b border-slate-800 md:border-b-0 md:border-r">
                <div className="border-b border-slate-800 px-4 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Input
                  </h2>
                </div>
                <textarea
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  className="h-32 w-full resize-none bg-[#020617] p-4 font-mono text-sm text-slate-200 outline-none"
                  placeholder="Optional stdin"
                />
              </div>

              <div className="border-b border-slate-800 md:border-b-0 md:border-r">
                <div className="border-b border-slate-800 px-4 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Output
                  </h2>
                </div>
                <pre className="h-32 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm text-emerald-300">
                  {isRunning ? "Running..." : output || "Run code to see stdout here."}
                </pre>
              </div>

              <div>
                <div className="border-b border-slate-800 px-4 py-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Errors
                  </h2>
                </div>
                <pre className="h-32 overflow-auto whitespace-pre-wrap p-4 font-mono text-sm text-rose-300">
                  {errorOutput || "Compiler and runtime errors will appear here."}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-t border-slate-800 bg-[#0b1220] lg:border-l lg:border-t-0">
          <div className="border-b border-slate-800 bg-[#0f172a] p-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveRightPanelTab("chat")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeRightPanelTab === "chat"
                    ? "bg-[#6366f1] text-white shadow-lg shadow-indigo-950/30"
                    : "border border-slate-700 bg-[#111827] text-slate-300 hover:border-[#6366f1] hover:text-white"
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveRightPanelTab("ai")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeRightPanelTab === "ai"
                    ? "bg-[#6366f1] text-white shadow-lg shadow-indigo-950/30"
                    : "border border-slate-700 bg-[#111827] text-slate-300 hover:border-[#6366f1] hover:text-white"
                }`}
              >
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => setActiveRightPanelTab("room-info")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeRightPanelTab === "room-info"
                    ? "bg-[#6366f1] text-white shadow-lg shadow-indigo-950/30"
                    : "border border-slate-700 bg-[#111827] text-slate-300 hover:border-[#6366f1] hover:text-white"
                }`}
              >
                Room Info
              </button>
            </div>
          </div>

          {activeRightPanelTab === "chat" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-slate-100">Room Chat</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Send messages to everyone connected to this room.
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#0b1220] p-4">
                {messages.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-[#111827] px-3 py-3 text-sm text-slate-400">
                    No messages yet. Start the conversation.
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage =
                      (message.username || "Guest") === (usernameRef.current || username || "Guest");

                    return (
                      <div
                        key={`${message.username}-${message.time}-${index}`}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                            isOwnMessage
                              ? "bg-[#6366f1] text-white shadow-indigo-950/20"
                              : "border border-slate-800 bg-[#111827] text-[#e5e7eb] shadow-slate-950/20"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span
                              className={`font-semibold ${
                                isOwnMessage ? "text-indigo-100" : "text-indigo-300"
                              }`}
                            >
                              {message.username}
                            </span>
                            <span
                              className={`text-xs ${
                                isOwnMessage ? "text-indigo-200/80" : "text-slate-500"
                              }`}
                            >
                              {new Date(message.time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{message.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="border-t border-slate-800 bg-[#0f172a] p-4" onSubmit={sendRoomMessage}>
                <textarea
                  value={chatMessage}
                  onChange={(event) => {
                    const nextMessage = event.target.value;
                    setChatMessage(nextMessage);

                    if (!nextMessage.trim()) {
                      return;
                    }

                    clearTimeout(chatTypingDebounceRef.current);
                    chatTypingDebounceRef.current = setTimeout(() => {
                      socketRef.current?.emit("typing", {
                        roomId,
                        username: usernameRef.current || username || "Guest"
                      });
                    }, 300);
                  }}
                  className="mb-3 h-24 w-full resize-none rounded-xl border border-slate-700 bg-[#020617] p-3 text-sm text-[#e5e7eb] outline-none transition placeholder:text-slate-500 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/30"
                  placeholder="Type a message..."
                />
                {chatTypingUser && chatTypingUser !== (usernameRef.current || username || "Guest") ? (
                  <p className="mb-3 text-xs text-slate-400">{chatTypingUser} is typing...</p>
                ) : null}
                <Button type="submit" className="w-full">
                  Send
                </Button>
              </form>
            </div>
          ) : activeRightPanelTab === "ai" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-slate-800 p-4">
                <h2 className="text-sm font-semibold text-slate-100">AI Assistant</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Ask for help, explanations, or debugging ideas.
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#0b1220] p-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-lg ${
                        message.role === "user"
                          ? "bg-[#6366f1] text-white shadow-indigo-950/20"
                          : "border border-slate-800 bg-[#111827] text-[#e5e7eb] shadow-slate-950/20"
                      }`}
                    >
                      <div
                        className={`mb-1 text-xs font-semibold uppercase tracking-wide ${
                          message.role === "user" ? "text-indigo-100" : "text-slate-400"
                        }`}
                      >
                        {message.role === "user" ? "You" : "AI Assistant"}
                      </div>
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="animate-soft-pulse max-w-[88%] rounded-2xl border border-slate-800 bg-[#111827] px-4 py-3 text-sm text-slate-300 shadow-lg shadow-slate-950/20">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        AI Assistant
                      </div>
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={aiMessagesEndRef} />
              </div>

              <form className="border-t border-slate-800 bg-[#0f172a] p-4" onSubmit={sendChatMessage}>
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  className="mb-3 h-24 w-full resize-none rounded-xl border border-slate-700 bg-[#020617] p-3 text-sm text-[#e5e7eb] outline-none transition placeholder:text-slate-500 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/30"
                  placeholder="Ask the AI assistant..."
                />
                <Button type="submit" disabled={isChatLoading} className="w-full">
                  Send
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col bg-[#0b1220] p-4">
              <div className="mb-4 rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-lg shadow-slate-950/20">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current Room
                    </p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-100">Room Details</h2>
                  </div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    {users.length} Online
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Room ID
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-indigo-300">{roomId}</p>
                </div>

                <div className="mt-3 grid gap-3">
                  <Button type="button" onClick={copyRoomId} className="w-full">
                    Copy Room ID
                  </Button>
                  <div className="rounded-xl border border-slate-800 bg-[#0b1220] p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Invite Link
                    </p>
                    <p className="mt-2 break-all text-sm text-slate-300">
                      {`${window.location.origin}/editor/${roomId}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 rounded-2xl border border-slate-800 bg-[#111827] shadow-lg shadow-slate-950/20">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Members
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-100">Users in Room</h3>
                  </div>
                  <span className="text-sm font-medium text-slate-400">{users.length} total</span>
                </div>

                <div className="max-h-full space-y-3 overflow-y-auto p-4">
                  {users.map((user) => {
                    const isCurrentUser =
                      user.username === (usernameRef.current || username || "Guest");

                    return (
                      <div
                        key={user.socketId}
                        className={`flex items-center justify-between rounded-xl border px-3 py-3 transition ${
                          isCurrentUser
                            ? "border-indigo-500/40 bg-indigo-500/10"
                            : "border-slate-800 bg-[#0b1220]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.45)]" />
                          <div>
                            <p className="text-sm font-semibold text-slate-100">
                              {user.username}
                              {isCurrentUser ? (
                                <span className="ml-2 text-xs font-medium text-indigo-300">(You)</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-slate-500">Connected now</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-emerald-300">Online</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor/:roomId" element={<CodeEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
