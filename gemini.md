# VALORIA - Dark Fantasy 2D Action RPG

A dark-fantasy 2D action RPG focused on highly responsive melee combat. Built with HTML5 Canvas and vanilla JavaScript.

## Quick Start

1. Open a terminal in this directory
2. Run a local server:
   ```bash
   python3 -m http.server 8080
   # or
   npx serve
   # or
   node -e "require('http').createServer((req,res)=>{res.writeHead(200);res.end(require('fs').readFileSync('index.html'));}).listen(8080)"
   ```
3. Open `http://localhost:8080` in your browser

## Controls

| Action | Key |
|--------|-----|
| Move Left/Right | A/D or Arrow Keys |
| Jump | Space or W |
| Light Attack | Left Mouse Button |
| Heavy Attack (Hold) | Right Mouse Button |
| Dodge | Shift |
| Skill 1 - Valor Strike | Q |
| Skill 2 - Iron Breaker | E |
| Skill 3 - Valoria Rage | R (requires full rage) |
| Pause | Escape |
| Debug Mode | F1 |

## Features

### Player Combat
- **4-Hit Combo System** - Chain attacks with timing
- **Heavy Attack** - Hold RMB to charge for more damage
- **Dodge** - Invulnerable dash with cooldown
- **3 Abilities**:
  - Valor Strike - Gap-closing dash attack
  - Iron Breaker - Devastating overhead strike
  - Valoria Rage - Buff mode with enhanced damage

### Enemies
- **Wraith Soldier** - Basic melee combatant
- **Brute** - Heavy tank with high HP and damage resistance
- **Shadow Caster** - Ranged attacker with projectiles

### Presentation
- Dark medieval fantasy atmosphere
- Procedural sword swing VFX and impacts
- Synthesized combat audio
- Camera shake and hit-stop feedback
- Particle effects for dust, sparks, and death bursts

## Project Structure

```
valoria/
├── index.html          # Main HTML with all UI elements
├── styles/
│   └── main.css        # Dark fantasy UI styling
└── src/
    ├── main.js         # Game entry, loop, state management
    ├── core/
    │   ├── InputManager.js    # Keyboard/mouse input
    │   ├── AudioManager.js     # Web Audio API sound synthesis
    │   └── Camera.js          # Smooth follow, shake, zoom
    ├── player/
    │   └── Player.js          # Warrior with state machine
    ├── combat/
    │   └── CombatSystem.js    # Hitbox/hurtbox, damage pipeline
    ├── enemies/
    │   ├── Enemy.js           # Base enemy class
    │   ├── EnemyManager.js    # Spawning and updates
    │   ├── WraithSoldier.js   # Basic melee enemy
    │   ├── Brute.js           # Heavy tank enemy
    │   └── ShadowCaster.js    # Ranged enemy
    ├── effects/
    │   └── VFXManager.js      # Sword trails, particles, impacts
    ├── ui/
    │   └── UIManager.js       # HUD updates
    └── world/
        └── GameWorld.js       # Arena environment rendering
```

## Architecture

The game follows a modular architecture:

- **State Machine** - Explicit player states (Idle, Walk, Attack, Dodge, etc.)
- **Data-Driven Combat** - Attack definitions with damage, timing, knockback
- **Separation of Concerns** - Core systems are independent modules
- **Event-Driven Input** - Actions mapped to callbacks for key rebinding

## Debug Mode (F1)

Shows:
- Current player state
- FPS counter
- Enemy count
- Hitbox visualization

## TODO

- [ ] Add health bars above enemies
- [ ] Implement enemy death animations
- [ ] Add combo counter UI
- [ ] Screen-specific art assets (placeholder primitives for now)
- [ ] Save/load settings
- [ ] Multiple arena levels
- [ ] More enemy types
- [ ] Additional weapons
- [ ] Parry/counter system

## License

MIT - Built for demonstration purposes.
