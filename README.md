
# Alley Run 🏃‍♂️

A fast-paced endless runner game where players collect beans and dodge obstacles while representing different elemental domains.

## Features 🌟

- Four playable domains: Fire, Earth, Water, and Lightning
- Collect red beans to increase score
- Green beans restore health
- Progressive difficulty with speed increases
- Persistent leaderboard tracking domain performance
- Responsive design for both desktop and mobile play
- Original soundtrack and sound effects

## How to Play 🎮

1. Click "Run" to start the server
2. Choose your domain (Fire, Earth, Water, or Lightning)
3. Use spacebar, up arrow, or click/tap to jump
4. Collect beans and avoid obstacles
5. Compete for high scores with other domains

## Technical Stack 💻

- Frontend: HTML5, CSS3, JavaScript (Canvas API)
- Backend: Node.js, Express
- Database: PostgreSQL
- Assets: Custom pixel art and animations

## Game Controls 🕹️

- Jump: Spacebar / Up Arrow / Click / Tap
- Sound Toggle: Top-right corner icon

## Scoring System 📊

- Red Beans: +10 points
- Green Beans: Restore 1 health point
- Continuous Running: Score increases over time
- Speed increases every 100 points

## Development Setup 🛠️

1. Click "Run" to start the development server
2. The game will be available at the provided URL
3. Server runs on port 3000
4. Database connection uses environment variables

## Credits 🎨

- Game Music and Sound Effects
- Custom Character Sprites and Animations
- Background Art and Domain Themes

## Leaderboard API 📡

- GET `/api/leaderboard`: Fetch domain statistics
- POST `/api/update`: Update domain scores and beans

