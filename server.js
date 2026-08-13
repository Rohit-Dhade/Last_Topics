import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import userModel from "./models/user.model.js";

// --------------
// MongoDB Connection
// --------------

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

connectToMongoDB();

// --------------
// Redis Connection
// --------------

const redis = new Redis(process.env.REDIS_URL);

redis.once("ready", () => {
  console.log("Connected to Redis");
});

const app = express();
app.use(morgan("dev"));
app.use(express.json());

// ----- ejs template engine setup -----

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));

// --------------
// Rate Limiting
// --------------

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests, please try again later.",
  },
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

app.get("/user/:id", async (req, res) => {
  try {
    const userFromCache = await redis.get(`user:${req.params.id}`);
    if (userFromCache) {
      return res.status(200).json({
        message: "User found in cache",
        data: JSON.parse(userFromCache),
      });
    }

    const user = await userModel.findById(req.params.id);

    await redis.set(
      `user:${req.params.id}`,
      JSON.stringify(user),
      "EX",
      60 * 3,
    ); // Cache for 1 hour

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      message: "User found",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/user", async (req, res) => {
  try {
    const newUser = new userModel(req.body);
    await newUser.save();
    res.status(201).json({
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/test", async (req, res) => {
  res.render("index" ,{
    username: "John Doe",
    bio: "A passionate developer and tech enthusiast.",
    profilePicture: "https://imgs.search.brave.com/ACedRZHztn-OEwyhM1B15tdkWFNDmr_vu6lbM9Pyr10/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9jZG4t/ZnJvbnQuZnJlZXBp/ay5jb20vaG9tZS9h/bm9uLXJ2bXAvY3Jl/YXRpdmUtc3VpdGUv/cGhvdG9ncmFwaHkv/cmVpbWFnaW5lLndl/YnA",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
