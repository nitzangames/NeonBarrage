# Neon Barrage — Phase 3 Design Spec

Phase 3 adds procedural audio (all sound effects and music generated at runtime via Web Audio API) and haptics. No audio files needed.

## Sound Effects (11 total)

All generated using Web Audio API (OscillatorNode, GainNode, BiquadFilterNode).

| Sound | Description | Duration |
|-------|-------------|----------|
| Ball Hit Block | High sine blip, 800→600Hz | 0.06s |
| Block Destroyed | Noise burst + low thud + pop | 0.15s |
| Wall Bounce | Soft low thud, 200Hz sine | 0.05s |
| Pickup Collected | Ascending ding, 600→1400Hz | 0.2s |
| Ball Launch | Rising whoosh | 0.15s |
| Turn Complete | Two-note chime (C5 + E5) | 0.3s |
| Game Over | Descending tone, 300→100Hz | 0.8s |
| Level Complete | Three-note fanfare (C5→E5→G5→C6) | 0.6s |
| Powerup Activated | Electronic zap, 200→1700Hz | 0.25s |
| Chest Open | Sparkle shimmer, multi-frequency | 0.5s |
| Button Tap | Short click, 1000Hz + noise | 0.04s |

### Sound System Design

- Single `js/audio.js` file with an `Audio` object
- Lazy-init AudioContext on first user interaction (browser requirement)
- Each sound is a function that creates oscillators/gains on the fly
- Master volume control, mutable via `saveData.settings.sound`
- Sounds should not play if `saveData.settings.sound` is false

## Music

- Procedurally generated 40-second ambient loop
- Chord progression: Cmaj7 → Am7 → Fmaj7 → G7 → Em7 → Am7 → Dm7 → G7
- 5 layered synth tracks: warm pad, round bass, gentle arpeggio, soft pentatonic melody, vinyl noise
- Smooth chord crossfades. Loop crossfade: 3 seconds
- Volume: 0.25
- Mutable via `saveData.settings.music`
- Plays during gameplay states (AIMING through TURN_END), stops on menus

## Haptics

- Uses `navigator.vibrate()` where available (Android Chrome), silently skips elsewhere
- Controlled by `saveData.settings.haptics`
- Light (10ms): ball hits, UI taps
- Medium (25ms): block destruction, pickup collection, powerup activation
- Heavy (50ms): chest opening
- Pattern [50, 30, 50]: level complete
- Pattern [100, 50, 100]: game over

## Integration Points

Sounds are triggered from:
- `physics.js`: ball hit block, block destroyed, wall bounce, pickup collected
- `game.js`: ball launch, turn complete, game over, level complete, powerup activated, chest open, button tap
- All menu button taps get the button tap sound

## File Changes

| File | Changes |
|------|---------|
| `js/audio.js` (new) | All procedural audio generation, music system |
| `index.html` | Add `<script src="js/audio.js">` before game.js |
| `js/physics.js` | Add sound triggers on hit/destroy/bounce/pickup |
| `js/game.js` | Add sound triggers on launch/turn/gameover/complete/powerup/chest/buttons; start/stop music |
