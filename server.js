// server.js

import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Fix __dirname for ES Modules (important for path resolution)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve static assets from /public (HTML, JS, CSS, images, etc.)
app.use("/", express.static(path.join(__dirname, "public")));

// 🧱 PostgreSQL setup
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Initialize leaderboard table (run only once)
const initLeaderboardTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      domain VARCHAR(20) PRIMARY KEY,
      total_score INTEGER DEFAULT 0,
      total_beans INTEGER DEFAULT 0
    );
  `);
};
initLeaderboardTable();

// 📥 POST endpoint: Add score/beans to leaderboard
app.post("/api/update", async (req, res) => {
  const { domain, score, beans } = req.body;

  if (!domain || isNaN(score) || isNaN(beans)) {
    return res.status(400).json({ error: "Missing or invalid data." });
  }

  try {
    await pool.query(
      `
      INSERT INTO leaderboard (domain, total_score, total_beans)
      VALUES ($1, $2, $3)
      ON CONFLICT (domain)
      DO UPDATE SET
        total_score = leaderboard.total_score + EXCLUDED.total_score,
        total_beans = leaderboard.total_beans + EXCLUDED.total_beans;
    `,
      [domain, score, beans],
    );
    res.status(200).json({ message: "Updated successfully" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📤 GET endpoint: Fetch leaderboard stats
app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM leaderboard ORDER BY total_score DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Launch server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Alley Run server running on http://localhost:${PORT}`);
});
