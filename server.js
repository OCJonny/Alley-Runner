require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('.'));

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err));

// Initialize database tables if they don't exist
async function initializeTables() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS domain_stats (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(20) UNIQUE NOT NULL,
        high_score INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        total_beans INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if domains already exist
    const domains = await client.query('SELECT domain FROM domain_stats');
    
    if (domains.rows.length === 0) {
      // Insert default domains
      await client.query(`
        INSERT INTO domain_stats (domain) 
        VALUES ('lightning'), ('fire'), ('water'), ('earth');
      `);
      console.log("Default domains initialized");
    }
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
}

// Initialize tables when server starts
initializeTables();

// API Routes
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM domain_stats ORDER BY high_score DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

app.post('/api/stats/update', async (req, res) => {
  const { domain, score, beans } = req.body;
  
  if (!domain || typeof score !== 'number' || typeof beans !== 'number') {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    // Get current stats for domain
    const currentStats = await client.query(
      'SELECT high_score, total_score, total_beans FROM domain_stats WHERE domain = $1',
      [domain]
    );
    
    if (currentStats.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    const { high_score, total_score, total_beans } = currentStats.rows[0];
    const newHighScore = score > high_score ? score : high_score;
    const newTotalScore = total_score + score;
    const newTotalBeans = total_beans + beans;
    
    // Update stats
    await client.query(
      `UPDATE domain_stats 
       SET high_score = $1, total_score = $2, total_beans = $3, updated_at = CURRENT_TIMESTAMP
       WHERE domain = $4`,
      [newHighScore, newTotalScore, newTotalBeans, domain]
    );
    
    res.json({ 
      domain, 
      high_score: newHighScore, 
      total_score: newTotalScore, 
      total_beans: newTotalBeans 
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});