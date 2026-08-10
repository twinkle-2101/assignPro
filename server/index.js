import mongoose from "mongoose"
import express from "express"
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import Signuproutes from "./routes/signup.routes.js";
import adminRoutes from "./routes/admin.routes.js"
import classroomRoutes from "./routes/classroom.routes.js"
import assignmentRoutes from "./routes/assignment.routes.js";
import jwt from "jsonwebtoken"
import studentRoutes from "./routes/student.routes.js"
import facultyRoutes from "./routes/faculty.routes.js"
import path from "path";
import uploadRoutes from "./routes/upload.routes.js"
import errorHandler from "./middleware/error.middleware.js";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();

const allowedOrigins = ["http://localhost:5173" ] //Client url to be added after deployment 

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use( "/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", Signuproutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/api/auth/status", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.json({ isAuthenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      isAuthenticated: true,
      userRole: decoded.role,
      userName: decoded.name,
    });
  } catch (error) {
    res.json({ isAuthenticated: false });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../server/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../server/build", "index.html"));
  });
}

// Error handling middleware (should be last)
app.use(errorHandler);


const port = process.env.PORT || 8080;

app.get("/" , (req,res) =>{
    res.send("Hello, World!");  
})

app.listen(port , () => {
  console.log(`Server is running on port ${port}`);
  connectDB();
})