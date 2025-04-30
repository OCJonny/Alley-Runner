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

// Admin authentication endpoint
app.post("/api/admin/auth", (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// Reset all stats endpoint
app.post("/api/reset", async (req, res) => {
  try {
    await pool.query(`
      UPDATE domain_stats 
      SET high_score = 0, 
          total_score = 0, 
          total_beans = 0,
          updated_at = CURRENT_TIMESTAMP
    `);
    res.json({ message: "All stats have been reset successfully" });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ error: "Failed to reset stats" });
  }
});

// Export stats as CSV endpoint
app.get("/api/export-csv", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT domain, high_score, total_score, total_beans, updated_at FROM domain_stats ORDER BY domain"
    );
    
    // Create CSV content
    const csvHeader = "Domain,High Score,Total Score,Total Beans,Last Updated\n";
    const csvRows = result.rows.map(row => 
      `${row.domain},${row.high_score},${row.total_score},${row.total_beans},${row.updated_at}`
    ).join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=alleyrun_stats.csv");
    res.send(csvHeader + csvRows);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export stats" });
  }
});

// ✅ Launch server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Alley Run server running on port ${PORT}`);
});