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
app.use(express.static(path.join(__dirname, "public")));

// ✅ Serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🧱 PostgreSQL setup
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 📥 POST endpoint: Add score/beans to domain_stats
app.post("/api/update", async (req, res) => {
  const { domain, score, beans } = req.body;

  if (!domain || isNaN(score) || isNaN(beans)) {
    return res.status(400).json({ error: "Missing or invalid data." });
  }

  try {
    // Update the existing domain_stats table
    await pool.query(
      `
      UPDATE domain_stats
      SET 
        high_score = GREATEST(high_score, $2),
        total_score = total_score + $2,
        total_beans = total_beans + $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE domain = $1;
    `,
      [domain, score, beans],
    );
    res.status(200).json({ message: "Updated successfully" });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📤 GET endpoint: Fetch domain stats
app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM domain_stats ORDER BY total_score DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Launch server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Alley Run server running on http://localhost:${PORT}`);
});
