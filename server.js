import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create PostgreSQL client
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
app.get('/init', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Create the domain_stats table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS domain_stats (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(20) UNIQUE NOT NULL,
        high_score INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        total_beans INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default domains if they don't exist
    const domains = ['lightning', 'fire', 'water', 'earth'];
    for (const domain of domains) {
      await client.query(`
        INSERT INTO domain_stats (domain) 
        VALUES ($1) 
        ON CONFLICT (domain) DO NOTHING
      `, [domain]);
    }
    
    client.release();
    res.send('Leaderboard initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).send('Error initializing database');
  }
});

// Get all domain stats
app.get('/leaderboard', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM domain_stats ORDER BY high_score DESC');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// Update domain stats
app.post('/update', async (req, res) => {
  const { domain, score, beans } = req.body;
  
  if (!domain || typeof score !== 'number' || typeof beans !== 'number') {
    return res.status(400).json({ error: 'Invalid input data' });
  }
  
  try {
    const client = await pool.connect();
    
    // Update the stats for the specified domain
    await client.query(`
      UPDATE domain_stats 
      SET 
        high_score = GREATEST(high_score, $1),
        total_score = total_score + $1,
        total_beans = total_beans + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE domain = $3
    `, [score, beans, domain]);
    
    client.release();
    res.json({ success: true, message: 'Stats updated successfully' });
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ error: 'Failed to update stats' });
  }
});

// Serve static files from the public directory
app.use(express.static('.'));

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});