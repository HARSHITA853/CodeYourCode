import React from "react";
import ReactDOM from "react-dom/client";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import {
  BrowserRouter,
  Route,
  Routes,
  useParams,
  useNavigate
} from "react-router-dom";
import "./index.css";

// ✅ FINAL API CONFIG
const API_URL = "https://codeyourcode.onrender.com";
const SOCKET_URL = API_URL;


// ================= LOGIN =================
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("Connecting to server...");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login successful ✅");

      setTimeout(() => navigate("/dashboard"), 500);

    } catch (err) {
      console.error("Login request failed:", err);
      setMessage("Server may be starting on Render. Please wait 10 seconds and try again.");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        /><br /><br />

        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br /><br />

        <button>Login</button>
      </form>

      <p>{message}</p>
    </div>
  );
}


// ================= SIGNUP =================
function Signup() {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setMessage("Connecting...");

    try {
      const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Signup failed");
        return;
      }

      setMessage("Signup successful ✅");

      setTimeout(() => navigate("/"), 800);

    } catch (err) {
      console.error("Signup request failed:", err);
      setMessage("Server may be starting on Render. Please wait 10 seconds and try again.");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Signup</h2>

      <form onSubmit={handleSignup}>
        <input
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        /><br /><br />

        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        /><br /><br />

        <input
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br /><br />

        <button>Signup</button>
      </form>

      <p>{message}</p>
    </div>
  );
}


// ================= DASHBOARD =================
function Dashboard() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = React.useState("");

  function createRoom() {
    const id = Math.random().toString(36).substring(2, 8);
    navigate(`/editor/${id}`);
  }

  function joinRoom(e) {
    e.preventDefault();
    if (!roomId) return;
    navigate(`/editor/${roomId}`);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard</h2>

      <button onClick={createRoom}>Create Room</button>

      <form onSubmit={joinRoom}>
        <input
          placeholder="room id"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button>Join</button>
      </form>
    </div>
  );
}


// ================= EDITOR =================
function EditorPage() {
  const { roomId } = useParams();
  const [code, setCode] = React.useState("// start coding");
  const socketRef = React.useRef(null);

  React.useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.emit("join-room", { roomId });

    socket.on("code-change", (data) => {
      setCode(data);
    });

    return () => socket.disconnect();
  }, [roomId]);

  function handleChange(value) {
    setCode(value);

    socketRef.current.emit("code-change", {
      roomId,
      code: value
    });
  }

  return (
    <div>
      <h3>Room: {roomId}</h3>

      <Editor
        height="90vh"
        defaultLanguage="javascript"
        value={code}
        onChange={handleChange}
      />
    </div>
  );
}


// ================= APP =================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
