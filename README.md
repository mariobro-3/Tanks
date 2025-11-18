# Tanks — Modern HTML5

A modern HTML5 remake of the classic artillery tank battle game, featuring physics-based projectile mechanics, terrain deformation, and AI opponents. Built with TypeScript, HTML5 Canvas, and packaged as a desktop application using Electron.

THIS GAME HAS BUGS, ITS NOT PERFECT, PLAY AND DEVELOP AT YOUR OWN RISK.
I had fun making it and thats all that matters to me. Enjoy.
-mariobro-3

![Tanks Modern](https://img.shields.io/badge/version-0.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Electron](https://img.shields.io/badge/Electron-38.1-blue)

## 🎮 Features

### Gameplay

- **4-Player Support**: Play solo against AI or with friends (human vs AI)
- **Multiple Landscapes**: Battle across three distinct environments:
  - 🌍 **Earth Hills**: Rolling terrain with moderate gravity
  - 🌙 **Moon South Pole Crater**: Large crater formations with low gravity
  - 🔴 **Mars Deep Trench**: Stepped terrain features resembling Martian geography
- **Dynamic Weather**: Wind system that affects projectile trajectory
- **Terrain Deformation**: Explosions permanently alter the landscape

### Weapons Arsenal

Unlock powerful weapons as you earn points:

- **Shell** (Default): Standard projectile
- **Missile** (200 pts): Homing capability with larger blast radius
- **Scatter** (400 pts): Bursts into multiple projectiles mid-flight
- **Laser** (500 pts): High-speed precision weapon
- **Nuke** (800 pts): Massive explosion with devastating area damage

### Game Mechanics

- **Health System**: Take damage from enemy hits
- **Fuel Management**: Limited fuel for movement and shooting, regenerates slowly
- **Progression System**: Earn score bonuses that carry over to new rounds
- **AI Opponents**: Three difficulty levels (Easy, Medium, Hard)
- **Physics Simulation**: Realistic ballistic trajectories with gravity and wind

## 🎯 Controls

### Keyboard

- **Move**: `←` `→` Arrow Keys
- **Aim**: `↑` `↓` Arrow Keys
- **Adjust Power**: `Q` (decrease) / `E` (increase)
- **Fire**: `Space`
- **Pause**: `P`
- **Mute/Unmute**: `M`

### Mouse

- Use sliders and dropdowns in the HUD to adjust angle, power, and game settings

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/mariobro-3/Tanks.git
   cd Tanks
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```

### Development

Run the game in development mode with hot reload:

```bash
npm run dev
```

Then open your browser to `http://localhost:3000`

### Running as Electron App

To run the desktop version during development:

```bash
npm run electron-dev
```

## 📦 Building

### Web Build

Build the web version for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Desktop Package (Windows)

Build and package as a Windows executable:

```bash
npm run package-win
```

The packaged application will be in `dist-packager/Tanks Modern-win32-x64/` with the executable `TanksModern.exe`.

## 🎨 Game Modes

### Player Types

Each of the 4 players can be configured as:

- **Human**: Manual control via keyboard/mouse
- **Easy AI**: Basic targeting with moderate accuracy
- **Medium AI**: Improved trajectory calculation
- **Hard AI**: Advanced AI with weapon selection and precise aim

### Scoring

- **Hit**: 100 points (Shell)
- **Hit**: 220 points (Missile)
- **Hit**: 300 points (Laser)
- **Hit**: 500 points (Nuke)
- Earn bonuses to health and fuel capacity at 1000+ point milestones

## 🛠️ Technology Stack

- **TypeScript**: Type-safe game logic
- **HTML5 Canvas**: 2D rendering
- **Web Audio API**: Procedural sound effects
- **Vite**: Fast development server and build tool
- **Electron**: Cross-platform desktop application
- **LocalStorage**: Progress persistence

## 📁 Project Structure

```
tanks-modern/
├── src/
│   ├── main.ts           # Main game logic and engine
│   ├── style.css         # Game styling
│   └── vite-env.d.ts     # TypeScript declarations
├── public/
│   └── vite.svg          # Assets
├── dist/                 # Production build output
├── dist-packager/        # Electron packaged apps
├── electron.js           # Electron main process
├── index.html            # Game HTML structure
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

## 🎯 Game Strategy Tips

1. **Wind Awareness**: Check the wind indicator before firing
2. **Fuel Conservation**: Movement and shooting cost fuel - plan carefully
3. **High Ground Advantage**: Position yourself on elevated terrain
4. **Weapon Selection**: Save powerful weapons for critical moments
5. **Damage Management**: Low health reduces maximum firing power
6. **Progressive Bonuses**: Accumulate points for increased health/fuel capacity

## 🐛 Known Issues & Limitations

- Progress is saved locally (per browser/device)
- Single human player mode only (local multiplayer not implemented)
- Desktop build currently Windows-only (Mac/Linux support can be added)

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

Inspired by classic artillery games like:

- Scorched Earth
- Worms series
- Pocket Tanks

---

**Author**: [mariobro-3](https://github.com/mariobro-3)

**Repository**: [https://github.com/mariobro-3/Tanks](https://github.com/mariobro-3/Tanks)

Enjoy the game! 🎮💥
