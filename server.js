const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// Initialize database tables
async function initializeTables() {
  try {
    // Insert default domains if they don't exist
    const domains = ['lightning', 'fire', 'water', 'earth'];
    for (const domain of domains) {
      // Check if domain exists in domains table
      const domainExists = await pool.query(
        'SELECT id FROM domains WHERE domain_name = $1',
        [domain]
      );
      
      if (domainExists.rows.length === 0) {
        // Insert domain
        await pool.query(
          'INSERT INTO domains (domain_name) VALUES ($1)',
          [domain]
        );
      }
      
      // Check if domain stats exist
      const statsExist = await pool.query(
        'SELECT id FROM domain_stats WHERE domain = $1',
        [domain]
      );
      
      if (statsExist.rows.length === 0) {
        // Insert domain stats
        await pool.query(
          'INSERT INTO domain_stats (domain, high_score, total_score, total_beans) VALUES ($1, 0, 0, 0)',
          [domain]
        );
      }
    }
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

// Initialize database on startup
initializeTables();

// API Routes

// Get leaderboard data
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT domain, high_score, total_score, total_beans
      FROM domain_stats
      ORDER BY high_score DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// Update domain stats
app.post('/api/stats/update', async (req, res) => {
  const { domain, score, beans } = req.body;
  
  if (!domain || typeof score !== 'number' || typeof beans !== 'number') {
    return res.status(400).json({ error: 'Invalid request data' });
  }
  
  try {
    // Update domain stats
    const updateResult = await pool.query(`
      UPDATE domain_stats
      SET high_score = GREATEST(high_score, $1),
          total_score = total_score + $1,
          total_beans = total_beans + $2
      WHERE domain = $3
      RETURNING high_score, total_score, total_beans
    `, [score, beans, domain]);
    
    if (updateResult.rows.length === 0) {
      // If domain doesn't exist yet, create it
      const insertResult = await pool.query(`
        INSERT INTO domain_stats (domain, high_score, total_score, total_beans)
        VALUES ($1, $2, $2, $3)
        RETURNING high_score, total_score, total_beans
      `, [domain, score, beans]);
      
      res.json({
        domain,
        ...insertResult.rows[0]
      });
    } else {
      res.json({
        domain,
        ...updateResult.rows[0]
      });
    }
  } catch (error) {
    console.error('Error updating domain stats:', error);
    res.status(500).json({ error: 'Failed to update domain stats' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});