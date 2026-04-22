# Simple MERN Stack Project

This project has a React frontend and an Express backend.

## Folders

- `frontend` - React app created for Vite with Tailwind CSS
- `backend` - Node.js and Express server

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend usually runs at `http://localhost:5173`.

## Run the backend

```bash
cd backend
npm install
npm run dev
```

The backend runs at `http://localhost:5000`.

Create a `.env` file in the `backend` folder. You can copy the values from
`backend/.env.example`.

```bash
MONGO_URI=mongodb://127.0.0.1:27017/simple-mern-auth
JWT_SECRET=change_this_secret_key
PORT=5000
```

MongoDB must be running locally before signup and login will work.

## Pages

- `/` - Home page
- `/login` - Login UI
- `/signup` - Signup UI

## Auth APIs

- `POST /signup` - creates a user and hashes the password
- `POST /login` - checks the password and returns a JWT token
