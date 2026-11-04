# NEON VIPER — Cyber Arcade 2.0

A browser-based Snake arcade game with a neon cyberpunk interface, multiple game modes, selectable difficulty levels, power-ups, sound effects, and persistent player statistics.

## Features

- **Classic Snake gameplay** with keyboard, touch-swipe, and on-screen mobile controls.
- **Four game modes:**
  - **Classic** — standard snake gameplay.
  - **Warp Portals** — teleport between paired portals.
  - **Cyber Hazards** — avoid obstacles placed around the arena.
  - **Speed Frenzy** — gameplay speed increases rapidly.
- **Four difficulty levels:** Easy, Normal, Hard, and Insane.
- **Power-ups and special items**, including shield, freeze, magnet, and ghost effects.
- **Combo scoring** for collecting items within a time window.
- **Customizable snake skins** and visual themes.
- **Audio controls** for sound effects and procedural synthwave background music.
- **Pause, resume, and quick restart** controls.
- **High scores, run statistics, and achievements** saved in browser storage.
- Animated visual effects, particles, and responsive game UI.

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- HTML Canvas API for game rendering
- Web Audio API for generated sound and music
- Browser `localStorage` for saved preferences and statistics
- Node.js built-in `http` module for the optional local server

## Project Structure

```text
SnakeGame-main/
├── index.html          # Game page and interface
├── style.css           # Layout, themes, animations, and responsive styles
├── server.js           # Optional Node.js static file server
├── codes.py            # Empty placeholder file
└── js/
    ├── game.js         # Core game logic, movement, collisions, and rendering
    ├── ui.js           # UI controls, overlays, settings, and statistics
    ├── audio.js        # Sound effects and procedural background music
    └── particles.js    # Particle and visual effects
```

## Getting Started

### Option 1: Run directly in a browser

1. Download or extract the project.
2. Open `index.html` in a modern web browser.
3. Start the game using the **Start Game** button.

Some browser features, particularly audio, may require a user interaction before they become active.

### Option 2: Run with Node.js

The project includes a small static file server that uses Node.js built-in modules. No npm packages are required.

1. Install [Node.js](https://nodejs.org/) if it is not already installed.
2. Open a terminal in the project folder (the folder containing `server.js`).
3. Run:

   ```bash
   node server.js
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

Stop the server with `Ctrl + C`.

## How to Play

1. Choose a game mode and difficulty.
2. Press **Start Game** or use the keyboard start key.
3. Guide the snake toward the food and special items.
4. Avoid colliding with the snake itself and, where applicable, obstacles.
5. Collect items to increase your score and build combos.
6. Try to beat your high score and unlock achievements.

## Controls

| Action | Control |
|---|---|
| Move up | `↑` or `W` |
| Move down | `↓` or `S` |
| Move left | `←` or `A` |
| Move right | `→` or `D` |
| Start game | `Enter` |
| Pause / resume | `Space` |
| Quick restart | `R` |
| Turbo / boost | Hold `Shift` |
| Mobile movement | Swipe on the game area or use the on-screen D-pad |
| Mobile pause / boost | Use the on-screen buttons |

The game also provides interface buttons for starting, pausing, resuming, restarting, changing themes, and toggling sound and music.

## Saved Data

The game uses the browser's `localStorage` to retain data such as:

- High score
- Player statistics and unlocked achievements
- Selected snake skin
- Sound and music preferences

This information is stored locally in the browser. Clearing the browser's site data may erase it.

## Browser Compatibility

Use a recent version of Chrome, Firefox, Edge, or Safari with JavaScript and Canvas enabled. Audio playback uses the Web Audio API and may be subject to browser autoplay restrictions.

## Troubleshooting

- **The page does not load when using the server:** Make sure the terminal is in the project directory and that Node.js is installed.
- **Port 3000 is already in use:** Stop the other process using that port before starting this server.
- **No sound is playing:** Click or tap the page first, check the sound/music controls, and verify your device volume.
- **Saved scores are missing:** Check that browser storage is enabled and that you are using the same browser and site origin.

## Future Improvements

Possible extensions include online leaderboards, multiplayer support, additional arenas and power-ups, and more accessibility settings.

## Author

**DHULI TILAK**
