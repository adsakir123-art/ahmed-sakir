import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "wealthwise_secret_key_123";

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
} else {
  console.warn("MONGODB_URI not found in environment variables. Database features will not work.");
}

// User Schema & Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});

const User = mongoose.model("User", userSchema);

// Transaction Schema & Model
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  category: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

// In-memory fallback storage
let memoryUsers: any[] = [];
let memoryTransactions: any[] = [];

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = async (req: any, res: any, next: any) => {
  try {
    let user: any;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId);
    } else {
      user = memoryUsers.find(u => u.id === req.userId || u._id === req.userId);
    }

    if (user && user.role === "admin") {
      next();
    } else {
      res.status(403).json({ error: "Forbidden: Admin access required" });
    }
  } catch (error) {
    res.status(500).json({ error: "Admin check failed" });
  }
};

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ error: "User already exists" });

      const role = email === "adsakir123@gmail.com" ? "admin" : "user";
      const user = new User({ name, email, password: hashedPassword, role });
      await user.save();
      const token = jwt.sign({ userId: user._id }, JWT_SECRET);
      return res.status(201).json({ token, user: { name, email, id: user._id, role } });
    }

    // Fallback
    if (memoryUsers.find(u => u.email === email)) return res.status(400).json({ error: "User already exists" });
    const role = email === "adsakir123@gmail.com" ? "admin" : "user";
    const newUser = { id: Math.random().toString(36).substr(2, 9), name, email, password: hashedPassword, role };
    memoryUsers.push(newUser);
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET);
    res.status(201).json({ token, user: { name, email, id: newUser.id, role } });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user: any;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email });
    } else {
      user = memoryUsers.find(u => u.email === email);
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id || user.id }, JWT_SECRET);
    res.json({ token, user: { name: user.name, email: user.email, id: user._id || user.id, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authenticate, async (req: any, res) => {
  try {
    let user: any;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.userId).select("-password");
    } else {
      user = memoryUsers.find(u => u.id === req.userId);
    }

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ name: user.name, email: user.email, id: user._id || user.id, role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Transaction Routes
app.get("/api/transactions", authenticate, async (req: any, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const transactions = await Transaction.find({ userId: req.userId }).sort({ date: -1 });
      return res.json(transactions);
    }
    // Fallback
    const userTransactions = memoryTransactions.filter(t => t.userId === req.userId);
    res.json([...userTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.post("/api/transactions", authenticate, async (req: any, res) => {
  try {
    const { description, amount, type, category, date } = req.body;
    const transactionData = {
      userId: req.userId,
      description,
      amount,
      type,
      category,
      date: date || new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      const newTransaction = new Transaction(transactionData);
      await newTransaction.save();
      return res.status(201).json(newTransaction);
    }

    // Fallback
    const newTransaction = { ...transactionData, _id: Math.random().toString(36).substr(2, 9) };
    memoryTransactions.push(newTransaction);
    res.status(201).json(newTransaction);
  } catch (error) {
    res.status(400).json({ error: "Failed to create transaction" });
  }
});

app.delete("/api/transactions/:id", authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      const transaction = await Transaction.findOne({ _id: id, userId: req.userId });
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });
      await Transaction.findByIdAndDelete(id);
      return res.status(204).send();
    }

    // Fallback
    const transaction = memoryTransactions.find(t => t._id === id && t.userId === req.userId);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });
    memoryTransactions = memoryTransactions.filter(t => t._id !== id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

app.get("/api/db-status", (req, res) => {
  res.json({ 
    connected: mongoose.connection.readyState === 1,
    mode: mongoose.connection.readyState === 1 ? "mongodb" : "in-memory"
  });
});

// Admin Routes
app.get("/api/admin/stats", authenticate, isAdmin, async (req, res) => {
  try {
    let stats = {
      totalUsers: 0,
      totalTransactions: 0,
      totalVolume: 0,
      incomeVolume: 0,
      expenseVolume: 0
    };

    if (mongoose.connection.readyState === 1) {
      stats.totalUsers = await User.countDocuments();
      stats.totalTransactions = await Transaction.countDocuments();
      
      const transactions = await Transaction.find();
      stats.incomeVolume = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      stats.expenseVolume = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      stats.totalVolume = stats.incomeVolume + stats.expenseVolume;
    } else {
      stats.totalUsers = memoryUsers.length;
      stats.totalTransactions = memoryTransactions.length;
      stats.incomeVolume = memoryTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      stats.expenseVolume = memoryTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      stats.totalVolume = stats.incomeVolume + stats.expenseVolume;
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

app.get("/api/admin/users", authenticate, isAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find().select("-password");
      return res.json(users);
    }
    res.json(memoryUsers.map(({ password, ...u }) => u));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/admin/transactions", authenticate, isAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const transactions = await Transaction.find().populate("userId", "name email").sort({ date: -1 });
      return res.json(transactions);
    }
    const transactions = memoryTransactions.map(t => {
      const user = memoryUsers.find(u => u.id === t.userId);
      return { ...t, userId: user ? { name: user.name, email: user.email } : t.userId };
    });
    res.json(transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch all transactions" });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
