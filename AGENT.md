# Valoria - Agent Documentation & Combat System

## Sir Roland (The Knight) - Ultimate & Combat Mechanics

### 1. Ultimate: Valoria Rage ("Hellfire Eruption")
- **Activation (`R` Key)**:
  - Requires **50+ Rage** (Initial battle starts with **100 Rage** so it is immediately accessible).
  - Casts **Hellfire Eruption**: An active earth-shattering burst attack dealing **160 base AoE damage** (208 with hero multiplier).
  - Spawns a massive erupting volcanic fire pillar (280px tall) and expanding ground fissure cracks in a **440px radial blast** with 650 knockback force and heavy screen shake.
  - **Hellfire Surge Healing**: Instantly heals Sir Roland for **+35 HP** on cast to turn the tide in critical encounters.

### 2. Berserk Mode (8s Duration)
- **Massive Cleave Range Extension**:
  - Basic attack hitboxes during Ultimate are expanded to **2.2x width + 80px** (from 60–80px up to **210–260px wide**) with 110px vertical clearance and forward projection.
  - Slashes emit high-speed **Flame Slash** wave arcs that physically surge forward with volcanic spark trails.
- **Fire Aspect (Burn DoT Status)**:
  - Any enemy struck by Sir Roland's Hellfire Eruption or flaming slashes that survives receives the **Fire Aspect (Burn)** status effect.
  - **Duration**: 3.5 seconds.
  - **Damage over Time**: Deals continuous tick damage (**4 HP per 0.35s tick**, totaling ~40 burn damage).
  - **Visuals**: Rising fire embers emanate from the victim's body with an active flickering flame glow and floating orange damage indicators (`-4`).
- **Lifesteal & Super Armor**:
  - **Lifesteal on Hit**: Roland siphons **+4 HP** on every enemy struck while in Rage mode.
  - **Super Armor**: Roland gains 30% flat damage reduction and cannot be staggered or knocked back by enemy hits.
  - **Movement Boost**: +35% movement speed bonus during rage.

### 3. General Healing & Sustain Mechanics
- **Soul Siphon (Passive)**: Defeating any monster instantly restores **+12 HP** to Sir Roland.
- **Vitality Health Orbs**: Defeated enemies drop glowing crimson Vitality Orbs (45% chance on standard mobs, 100% guaranteed on elites/bosses).
  - Orbs bounce and magnetically pull toward the player when within 170px.
  - Restores **+25 HP** (standard) or **+50 HP** (large/boss) with shimmering green healing numbers (`+HP`).
