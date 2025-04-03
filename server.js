const express = require("express");
const app = express();
const path = require("path");

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html on the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 🧱 Step 3: Create leaderboard table (run once)
const initLeaderboardTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      domain VARCHAR(20),
      total_score INTEGER DEFAULT 0,
      total_beans INTEGER DEFAULT 0
    );
  `);
};
initLeaderboardTable();

// 📥 POST new score/beans
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

// 📤 GET leaderboard
app.get("/api/leaderboard", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM leaderboard ORDER BY total_score DESC",
  );
  res.json(result.rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Leaderboard server running on port ${PORT}`);
});
