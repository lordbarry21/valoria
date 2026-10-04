/**
 * VALORIA - Multi-Hero Player System
 * Supports 3 playable archetypes:
 * 1. Sir Roland (The Knight / FreeKnight) - Heavy Tank, Rage, cannot climb ladders
 * 2. Lady Sylvia (The Blonde Warrior) - Holy Magic, Swift Duelist, climbs ladders, heals on hit
 * 3. Kaelen (The Brown Hair Warrior) - Phantom Assassin, Wind Magic, climbs ladders, double jump
 */

import { inputManager, audioManager, camera, vfxManager, gameWorld, playerDied, enemyManager } from '../main.js';
import { PlayerStateMachine } from './PlayerStateMachine.js';
import { CHARACTERS } from './CharacterData.js';
import { getComboAttacks, createHeavyAttack } from './playerAttacks.js';

const STEERABLE_STATES = new Set(['Idle', 'Walk', 'Run', 'Jump', 'Fall']);
const SKILL_FRICTION = 600;
const DEATH_SCREEN_DELAY = 1.5;

// FreeKnight animations configuration
const KNIGHT_ANIMATIONS = {
    idle: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Idle.png', frames: 10, fps: 10, loop: true },
    run: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Run.png', frames: 10, fps: 14, loop: true },
    jump: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Jump.png', frames: 3, fps: 6, loop: false },
    fall: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Fall.png', frames: 3, fps: 6, loop: false },
    attack1: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Attack.png', frames: 4, fps: 10, loop: false },
    attack2: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Attack2.png', frames: 6, fps: 12, loop: false },
    attack3: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_AttackCombo2hit.png', frames: 10, fps: 14, loop: false },
    crouch_attack: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_CrouchAttack.png', frames: 4, fps: 10, loop: false },
    dash: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Dash.png', frames: 2, fps: 10, loop: false },
    roll: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Roll.png', frames: 12, fps: 20, loop: false },
    hit: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Hit.png', frames: 1, fps: 1, loop: false },
    death: { file: 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Death.png', frames: 10, fps: 8, loop: false },
};

// Global image cache
const imageCache = {};
function getImage(src) {
    if (!imageCache[src]) {
        const img = new Image();
        img.src = src;
        imageCache[src] = { img, loaded: false };
        img.onload = () => { imageCache[src].loaded = true; };
    }
    return imageCache[src];
}

export class Player {
    constructor() {
        this.x = 400;
        this.y = 500;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;

        this.stateMachine = new PlayerStateMachine(this);

        // Active character
        this.characterId = 'knight';
        this.character = CHARACTERS.knight;

        // Attributes
        this.maxHealth = 150;
        this.health = 150;
        this.maxStamina = 100;
        this.stamina = 100;
        this.maxRage = 100;
        this.rage = 0;

        this.staminaRegenRate = 25;
        this.staminaRegenDelay = 0.6;
        this.staminaRegenTimer = 0;

        this.moveSpeed = 275;
        this.acceleration = 2000;
        this.airControl = 0.6;
        this.deceleration = 1500;
        this.jumpForce = 550;
        this.gravity = 1800;

        this.grounded = true;
        this.groundY = 500;
        this.currentPlatform = null;

        // Double jump for agile hero
        this.canDoubleJump = false;

        // Ladder climbing
        this.currentLadder = null;
        this.climbSpeed = 180;
        this.climbAnimProgress = 0;

        // Combat
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboWindow = 0.35;
        this.attackBufferTimer = 0;
        this.currentAttack = null;
        this.attackHitEnemies = new Set();

        this.dodgeSpeed = 600;
        this.dodgeDuration = 0.22;
        this.dodgeTimer = 0;
        this.dodgeCooldown = 0;
        this.dodgeCooldownMax = 0.6;
        this.dodgeDirection = 1;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0.22;

        this.heavyChargeTime = 0;
        this.heavyChargeMax = 1.0;
        this.isChargingHeavy = false;

        // Skills
        this.skills = {
            skill1: { cooldown: 0, maxCooldown: 4.0 },
            skill2: { cooldown: 0, maxCooldown: 7.0 },
            skill3: { cooldown: 0, maxCooldown: 15.0 }
        };

        // Ult / Rage mode
        this.isRaging = false;
        this.rageDuration = 0;
        this.rageMaxDuration = 6.0;

        this.hurtTimer = 0;
        this.hurtDuration = 0.3;

        this.animTime = 0;
        this.hitStopTime = 0;

        this.isDead = false;
        this.deathTimer = 0;
        this.deathReported = false;

        // Floating notifications
        this.floatingTexts = [];

        // Preload assets for all heroes
        this.preloadAllAssets();
        this.applyCharacter(this.characterId);
    }

    preloadAllAssets() {
        // Knight
        for (const cfg of Object.values(KNIGHT_ANIMATIONS)) {
            getImage(cfg.file);
        }
        // Blonde
        getImage('girl warior.png');
        // Brown
        getImage('Girl Warior brown hair/Warrior/SpriteSheet/Warrior_Sheet-Effect.png');
        for (let i = 1; i <= 8; i++) {
            getImage(`Girl Warior brown hair/Warrior/Individual Sprite/Ladder-Grab/Warrior-Ladder-Grab_${i}.png`);
        }
    }

    setCharacter(characterId) {
        if (!CHARACTERS[characterId]) return;
        this.characterId = characterId;
        this.character = CHARACTERS[characterId];
        this.applyCharacter(characterId);
    }

    applyCharacter(characterId) {
        const c = CHARACTERS[characterId] || CHARACTERS.knight;
        this.character = c;
        this.characterId = c.id;

        this.width = c.width;
        this.height = c.height;

        this.maxHealth = c.stats.hp;
        this.health = this.maxHealth;
        this.moveSpeed = c.stats.speed;

        this.skills = {
            skill1: { cooldown: 0, maxCooldown: c.skills.skill1.cooldown },
            skill2: { cooldown: 0, maxCooldown: c.skills.skill2.cooldown },
            skill3: { cooldown: 0, maxCooldown: c.skills.skill3.cooldown }
        };

        this.isRaging = false;
        this.rage = 0;
    }

    init() {
        this.groundY = gameWorld ? gameWorld.floorY : 500;
        this.x = 400;
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;
        this.grounded = true;
        this.currentPlatform = null;
        this.currentLadder = null;
        this.canDoubleJump = false;

        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.staminaRegenTimer = 0;
        this.rage = 0;

        this.comboCount = 0;
        this.comboTimer = 0;
        this.attackBufferTimer = 0;
        this.currentAttack = null;
        this.attackHitEnemies.clear();

        this.dodgeTimer = 0;
        this.dodgeCooldown = 0;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;

        this.heavyChargeTime = 0;
        this.isChargingHeavy = false;

        for (const skill of Object.values(this.skills)) skill.cooldown = 0;

        this.isRaging = false;
        this.rageDuration = 0;

        this.hurtTimer = 0;
        this.hitStopTime = 0;
        this.animTime = 0;
        this.floatingTexts = [];

        this.isDead = false;
        this.deathTimer = 0;
        this.deathReported = false;

        this.stateMachine.reset();
    }

    notify(text, color = '#ffd700') {
        this.floatingTexts.push({
            text,
            color,
            x: this.x,
            y: this.y - this.height - 15,
            life: 1.2,
            maxLife: 1.2
        });
    }

    update(dt) {
        if (this.isDead) {
            this.updateDeath(dt);
            return;
        }

        if (this.hitStopTime > 0) {
            this.hitStopTime -= dt;
            return;
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.y -= 25 * dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        this.updateTimers(dt);
        this.handleInput(dt);
        this.stateMachine.update(dt);
        this.applyPhysics(dt);
        this.updateResources(dt);

        this.animTime += dt;
    }

    updateDeath(dt) {
        this.deathTimer += dt;
        this.applyPhysics(dt);
        if (!this.deathReported && this.deathTimer >= DEATH_SCREEN_DELAY) {
            this.deathReported = true;
            playerDied();
        }
    }

    updateTimers(dt) {
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
        if (this.dodgeTimer > 0) this.dodgeTimer -= dt;
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= dt;
            this.isInvulnerable = this.invulnerabilityTimer > 0;
        }
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        if (this.staminaRegenTimer > 0) this.staminaRegenTimer -= dt;

        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.comboCount = 0;
        }

        if (this.attackBufferTimer > 0) {
            this.attackBufferTimer -= dt;
        }

        for (const skill of Object.values(this.skills)) {
            if (skill.cooldown > 0) skill.cooldown = Math.max(0, skill.cooldown - dt);
        }

        if (this.isRaging) {
            this.rageDuration -= dt;
            if (this.rageDuration <= 0) this.endRage();
        }
    }

    updateResources(dt) {
        const state = this.stateMachine.currentState;
        const canRegen = this.staminaRegenTimer <= 0 && state !== 'Dodge' && state !== 'Climb' && !this.isChargingHeavy;
        if (canRegen && this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * dt);
        }

        if (!this.isRaging && this.rage > 0) {
            // Very slow decay so player keeps built rage between skirmishes
            this.rage = Math.max(0, this.rage - 0.75 * dt);
        }
    }

    spendStamina(amount) {
        this.stamina -= amount;
        this.staminaRegenTimer = this.staminaRegenDelay;
    }

    handleInput(dt) {
        if (this.stateMachine.currentState === 'Climb') {
            this.handleClimbing(dt);
            return;
        }

        if (this.isChargingHeavy) {
            this.updateHeavyCharge(dt);
            return;
        }

        if (inputManager.isAttackPressed()) {
            this.attackBufferTimer = 0.25;
        }

        if (this.stateMachine.isLocked()) return;

        // Check for ladder interaction
        if (this.checkLadderTrigger()) return;

        if (STEERABLE_STATES.has(this.stateMachine.currentState)) {
            this.handleMovement(dt);
        }

        if (this.attackBufferTimer > 0 && this.canAttack()) {
            this.attackBufferTimer = 0;
            this.attack();
        }
        if (inputManager.isHeavyAttackPressed()) this.startHeavyAttack();
        if (inputManager.isDodgePressed()) this.dodge();

        if (inputManager.isSkill1Pressed()) this.useSkill('skill1');
        if (inputManager.isSkill2Pressed()) this.useSkill('skill2');
        if (inputManager.isSkill3Pressed()) this.useSkill('skill3');
    }

    checkLadderTrigger() {
        if (!gameWorld?.ladders) return false;

        const vInput = inputManager.getVerticalInput();
        if (vInput === 0) return false;

        const ladder = gameWorld.ladders.find(l =>
            Math.abs(this.x - l.x) < 18 &&
            this.y >= l.topY - 6 &&
            this.y <= l.bottomY + 6
        );

        if (!ladder) return false;

        // Only the two girl warriors can climb ladders!
        if (!this.character.canClimb) {
            if (inputManager.isUpPressed()) {
                this.notify('Armor too heavy to climb!', '#ffaa44');
                audioManager.playSFX('sword_impact_heavy');
            }
            return false;
        }

        // Agile hero begins climbing
        this.currentLadder = ladder;
        this.x = ladder.x;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.currentPlatform = null;
        this.stateMachine.setState('Climb');
        return true;
    }

    handleClimbing(dt) {
        const ladder = this.currentLadder;
        if (!ladder) {
            this.stateMachine.setState('Fall');
            return;
        }

        const vInput = inputManager.getVerticalInput();
        const hInput = inputManager.getHorizontalInput();

        // Horizontal movement immediately steps off the ladder
        if (hInput !== 0) {
            this.currentLadder = null;
            this.vx = hInput * this.moveSpeed * 0.6;
            this.stateMachine.setState('Fall');
            return;
        }

        this.vx = 0;
        this.vy = 0;

        if (vInput !== 0) {
            this.y += vInput * this.climbSpeed * dt;
            this.climbAnimProgress += dt * 7;
        }

        // Jump off ladder
        if (inputManager.isJumpJustPressed()) {
            this.currentLadder = null;
            this.vy = -this.jumpForce * 0.85;
            this.vx = this.facing * this.moveSpeed * 0.6;
            this.stateMachine.setState('Jump');
            audioManager.playSFX('player_jump');
            return;
        }

        // Reached top platform
        if (this.y <= ladder.topY) {
            this.y = ladder.topY;
            this.vy = 0;
            this.grounded = true;
            this.currentLadder = null;
            this.currentPlatform = gameWorld?.platforms?.find(p => Math.abs(p.y - ladder.topY) < 5) || null;
            this.stateMachine.setState('Idle');
            audioManager.playSFX('player_land');
            return;
        }

        // Reached ground floor
        if (this.y >= ladder.bottomY) {
            this.y = gameWorld.floorY;
            this.vy = 0;
            this.grounded = true;
            this.currentLadder = null;
            this.currentPlatform = null;
            this.stateMachine.setState('Idle');
            audioManager.playSFX('player_land');
            return;
        }
    }

    handleMovement(dt) {
        const moveDir = inputManager.getHorizontalInput();
        const accel = this.acceleration * (this.grounded ? 1 : this.airControl);

        if (moveDir !== 0) {
            this.facing = moveDir;
            const turningAround = this.vx * moveDir < 0;
            this.vx += moveDir * accel * (turningAround ? 1.5 : 1) * dt;

            const maxSpeed = this.moveSpeed * (this.isRaging ? 1.25 : 1);
            this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

            if (this.grounded && this.stateMachine.currentState === 'Idle') {
                this.stateMachine.setState('Walk');
            }
        } else if (this.grounded) {
            this.applyFriction(this.deceleration, dt);
            if (this.vx === 0 && this.stateMachine.currentState === 'Walk') {
                this.stateMachine.setState('Idle');
            }
        }

        // Platform drop-through: Down + Jump drops below elevated platform
        if (inputManager.isDownPressed() && inputManager.isJumpJustPressed() && this.currentPlatform) {
            this.y += 10;
            this.grounded = false;
            this.currentPlatform = null;
            this.groundY = gameWorld.floorY;
            this.stateMachine.setState('Fall');
            return;
        }

        if (inputManager.isJumpJustPressed()) {
            this.jump();
        }
    }

    applyFriction(amount, dt) {
        const decel = amount * dt;
        this.vx = Math.abs(this.vx) <= decel ? 0 : this.vx - Math.sign(this.vx) * decel;
    }

    jump() {
        if (this.grounded) {
            if (this.stamina < 10) return;
            if (!this.stateMachine.canTransition('Jump')) return;

            this.grounded = false;
            this.vy = -this.jumpForce;
            this.spendStamina(10);
            this.canDoubleJump = (this.characterId === 'brown');
            this.stateMachine.setState('Jump');
            audioManager.playSFX('player_jump');
            vfxManager.createJumpDust(this.x, this.y);
        } else if (this.canDoubleJump) {
            // Brown hair ninja double jump!
            this.canDoubleJump = false;
            this.vy = -this.jumpForce * 0.9;
            this.spendStamina(10);
            this.stateMachine.setState('Jump');
            audioManager.playSFX('player_jump');
            vfxManager.createJumpDust(this.x, this.y);
            this.notify('Double Jump!', '#c084fc');
        }
    }

    onLanded() {
        vfxManager.createLandingDust(this.x, this.y);
        audioManager.playSFX('player_land');
        if (this.characterId === 'brown') this.canDoubleJump = true;
    }

    canAttack() {
        const sm = this.stateMachine;
        if (sm.currentState === 'Climb' || sm.currentState === 'Death' || sm.currentState === 'Hurt' || sm.currentState === 'Dodge') return false;
        if (this.isChargingHeavy) return false;
        if (sm.currentState === 'Attack') {
            return sm.attackPhase === 'recovery';
        }
        return sm.canTransition('Attack');
    }

    attack() {
        if (!this.canAttack() && this.stateMachine.currentState !== 'Attack') return;

        // All heroes have a full, satisfying 3-hit combo chain
        const isAir = !this.grounded;
        const maxCombo = 3;
        const continuingCombo = this.comboTimer > 0 && this.comboCount > 0;
        this.comboCount = continuingCombo ? (this.comboCount % maxCombo) + 1 : 1;
        this.executeAttack(isAir);
    }

    executeAttack(isAir = false) {
        const attacks = getComboAttacks(this.isRaging);
        const baseAttack = attacks[Math.min(this.comboCount - 1, attacks.length - 1)];

        if (isAir) {
            // Aerial attack: extended upward and forward reach to slice bats and flying eyes in the air!
            this.currentAttack = {
                ...baseAttack,
                damage: baseAttack.damage * 1.2,
                hitbox: { x: 55, y: -75, width: 145, height: 100 },
                moveForce: 60
            };
            // Mild air glide / hang so aerial hits feel fluid and easy to land
            this.vy = Math.min(this.vy, 40);
            this.vx = this.facing * 140;
        } else {
            this.currentAttack = baseAttack;
            this.vx = this.facing * this.currentAttack.moveForce * 0.8;
        }

        const { startup, active, recovery } = this.currentAttack;

        this.stateMachine.setState('Attack', true);
        this.stateMachine.setAttackTiming(startup, active, recovery);
        this.attackHitEnemies.clear();

        this.comboTimer = startup + active + recovery + this.comboWindow;

        audioManager.playSFX(this.currentAttack.swingSound);
        vfxManager.createSwordSwing(this, this.currentAttack);
    }

    startHeavyAttack() {
        if (!this.grounded || !this.stateMachine.canTransition('HeavyAttack')) return;
        const state = this.stateMachine.currentState;
        if (state !== 'Idle' && state !== 'Walk') return;

        this.isChargingHeavy = true;
        this.heavyChargeTime = 0;
        this.vx = 0;
        this.stateMachine.setState('HeavyAttack');
    }

    updateHeavyCharge(dt) {
        this.heavyChargeTime = Math.min(this.heavyChargeMax, this.heavyChargeTime + dt);
        this.applyFriction(this.deceleration, dt);

        const released = !inputManager.isHeavyAttackHeld();
        if (released || this.heavyChargeTime >= this.heavyChargeMax) {
            this.releaseHeavyAttack();
        }
    }

    releaseHeavyAttack() {
        if (!this.isChargingHeavy) return;
        this.isChargingHeavy = false;

        const chargePercent = this.heavyChargeTime / this.heavyChargeMax;
        this.currentAttack = createHeavyAttack(chargePercent, this.isRaging);
        this.attackHitEnemies.clear();

        this.stateMachine.setState('Attack');
        this.stateMachine.setAttackTiming(this.currentAttack.startup, this.currentAttack.active, this.currentAttack.recovery);
        this.vx = this.facing * this.currentAttack.moveForce;

        audioManager.playSFX('sword_swing_heavy');
        vfxManager.createHeavySwing(this, this.currentAttack);
        camera.shakeHeavy();
    }

    dodge() {
        if (this.dodgeCooldown > 0 || this.stamina < 25) return;
        if (!this.stateMachine.canTransition('Dodge')) return;

        const moveDir = inputManager.getHorizontalInput();
        this.dodgeDirection = moveDir !== 0 ? moveDir : this.facing;
        this.dodgeTimer = this.dodgeDuration;
        this.dodgeCooldown = this.dodgeCooldownMax;
        this.spendStamina(25);
        this.isInvulnerable = true;
        this.invulnerabilityTimer = this.dodgeDuration;
        this.currentAttack = null;

        this.stateMachine.setState('Dodge');
        this.vx = this.dodgeDirection * this.dodgeSpeed;
        audioManager.playSFX('player_dodge');
        vfxManager.createDodgeTrail(this);

        // Brown hair hero leaves phantom decoy on dodge
        if (this.characterId === 'brown') {
            vfxManager.createPhantomBlink(this, this.x, this.y, this.x, this.y);
        }
    }

    onDodgeEnd() {
        this.vx = this.dodgeDirection * this.moveSpeed * 0.4;
    }

    // ========================================================================
    // HERO SKILLS DISPATCHER
    // ========================================================================
    useSkill(slotKey) {
        const skill = this.skills[slotKey];
        if (!skill || skill.cooldown > 0) return;
        if (!this.stateMachine.canTransition('SkillCast')) return;

        if (slotKey === 'skill3') {
            // Require 50+ rage to unleash ultimate, or allow cast if raging
            if (this.rage < 50 && !this.isRaging) {
                this.notify('Need 50+ Rage for Ultimate!', '#ff5533');
                audioManager.playSFX('sword_impact_heavy');
                return;
            }
        }

        skill.cooldown = skill.maxCooldown;

        if (this.characterId === 'knight') {
            if (slotKey === 'skill1') this.useValorStrike();
            else if (slotKey === 'skill2') this.useIronBreaker();
            else if (slotKey === 'skill3') this.useValoriaRage();
        } else if (this.characterId === 'blonde') {
            if (slotKey === 'skill1') this.useSolarPiercer();
            else if (slotKey === 'skill2') this.useRadiantTempest();
            else if (slotKey === 'skill3') this.useDawnOfJudgment();
        } else if (this.characterId === 'brown') {
            if (slotKey === 'skill1') this.usePhantomBlink();
            else if (slotKey === 'skill2') this.useCycloneBlade();
            else if (slotKey === 'skill3') this.useEclipseExecution();
        }
    }

    beginSkill(attack) {
        this.currentAttack = attack;
        this.attackHitEnemies.clear();
        this.stateMachine.setState('SkillCast');
        if (attack) {
            this.stateMachine.setAttackTiming(attack.startup, attack.active, attack.recovery);
        } else {
            this.stateMachine.setAttackTiming(0, 0, 0.45);
        }
    }

    // --- Knight Skills ---
    useValorStrike() {
        this.beginSkill({
            id: 'valor_strike',
            damage: 40 * this.character.stats.damageMultiplier,
            startup: 0.1, active: 0.25, recovery: 0.2,
            hitbox: { x: 75, y: -35, width: 140, height: 50 },
            knockback: 420, hitStun: 0.5, hitStop: 50, moveForce: 380,
            swingSound: 'valor_strike', impactSound: 'sword_impact_heavy', screenShake: 'heavy', rageGain: 15
        });
        this.vx = this.facing * 420;
        audioManager.playSFX('valor_strike');
        vfxManager.createValorStrike(this);
        camera.shakeMedium();
    }

    useIronBreaker() {
        this.beginSkill({
            id: 'iron_breaker',
            damage: 65 * this.character.stats.damageMultiplier,
            startup: 0.35, active: 0.3, recovery: 0.4,
            hitbox: { x: 30, y: -25, width: 180, height: 75 },
            knockback: 550, hitStun: 0.8, hitStop: 80, moveForce: 0,
            swingSound: 'iron_breaker', impactSound: 'sword_impact_heavy', screenShake: 'heavy', rageGain: 20
        });
        this.vx = 0;
        audioManager.playSFX('iron_breaker');
        vfxManager.createIronBreaker(this);
        camera.impactZoom(0.2, 0.35);
    }

    useValoriaRage() {
        this.rage = 0;
        this.isRaging = true;
        this.rageDuration = this.rageMaxDuration;
        this.beginSkill(null);
        audioManager.playSFX('valoria_rage_start');
        vfxManager.createRageAura(this);
        camera.shakeHeavy();
        this.notify('VALORIA RAGE!', '#ff4400');
    }

    endRage() {
        this.isRaging = false;
        audioManager.playSFX('valoria_rage_end');
        vfxManager.removeRageAura();
    }

    // --- Blonde Warrior Skills ---
    useSolarPiercer() {
        this.beginSkill({
            id: 'solar_piercer',
            damage: 48 * this.character.stats.damageMultiplier,
            startup: 0.08, active: 0.22, recovery: 0.2,
            hitbox: { x: 120, y: -35, width: 260, height: 45 },
            knockback: 350, hitStun: 0.45, hitStop: 40, moveForce: 450,
            swingSound: 'sword_swing_heavy', impactSound: 'sword_impact_metal', screenShake: 'medium', rageGain: 15
        });
        this.vx = this.facing * 480;
        audioManager.playSFX('sword_swing_heavy');
        vfxManager.createSolarPiercer(this);
        camera.shakeLight();
        this.heal(8);
        this.notify('+8 HP (Solar Blessing)', '#ffd700');
    }

    useRadiantTempest() {
        this.beginSkill({
            id: 'radiant_tempest',
            damage: 60 * this.character.stats.damageMultiplier,
            startup: 0.15, active: 0.45, recovery: 0.3,
            hitbox: { x: 0, y: -35, width: 220, height: 90 },
            knockback: 400, hitStun: 0.6, hitStop: 50, moveForce: 60,
            swingSound: 'sword_swing_heavy', impactSound: 'sword_impact_heavy', screenShake: 'medium', rageGain: 20
        });
        audioManager.playSFX('sword_swing_heavy');
        vfxManager.createRadiantTempest(this);
        camera.impactZoom(0.12, 0.25);
    }

    useDawnOfJudgment() {
        this.rage = 0;
        this.beginSkill({
            id: 'dawn_judgment',
            damage: 130 * this.character.stats.damageMultiplier,
            startup: 0.2, active: 0.9, recovery: 0.35,
            hitbox: { x: 80, y: -50, width: 520, height: 140 },
            knockback: 650, hitStun: 1.0, hitStop: 100, moveForce: 0,
            swingSound: 'sword_swing_heavy', impactSound: 'sword_impact_heavy', screenShake: 'heavy', rageGain: 0
        });
        this.vy = -280; // Ascends gracefully into the heavens
        audioManager.playSFX('holy_judgment');
        vfxManager.createDawnOfJudgment(this);
        camera.shakeHeavy();
        camera.impactZoom(0.16, 0.4);
        this.heal(30);
        this.notify('DAWN OF JUDGMENT!', '#ffe066');
    }

    // --- Brown Hair Warrior Skills ---
    usePhantomBlink() {
        const startX = this.x;
        const startY = this.y;

        // Teleport behind nearest enemy or forward 220px
        let targetX = this.x + this.facing * 220;
        const targetEnemy = enemyManager?.enemies?.find(e => !e.isDead && Math.abs(e.x - this.x) < 260);
        if (targetEnemy) {
            targetX = targetEnemy.x + this.facing * 45;
        }

        targetX = gameWorld.clampX(targetX, this.width / 2);
        this.x = targetX;

        this.beginSkill({
            id: 'phantom_blink',
            damage: 55 * this.character.stats.damageMultiplier,
            startup: 0.05, active: 0.2, recovery: 0.15,
            hitbox: { x: 0, y: -35, width: 140, height: 60 },
            knockback: 300, hitStun: 0.5, hitStop: 45, moveForce: 0,
            swingSound: 'player_dodge', impactSound: 'sword_impact_heavy', screenShake: 'medium', rageGain: 15
        });

        audioManager.playSFX('player_dodge');
        vfxManager.createPhantomBlink(this, startX, startY, this.x, this.y);
        camera.shakeLight();
        this.notify('Shadow Strike!', '#c084fc');
    }

    useCycloneBlade() {
        this.beginSkill({
            id: 'cyclone_blade',
            damage: 65 * this.character.stats.damageMultiplier,
            startup: 0.12, active: 0.35, recovery: 0.25,
            hitbox: { x: 60, y: -35, width: 180, height: 80 },
            knockback: 480, hitStun: 0.65, hitStop: 60, moveForce: 240,
            swingSound: 'sword_swing_heavy', impactSound: 'sword_impact_heavy', screenShake: 'medium', rageGain: 20
        });
        this.vy = -280; // Aerial spinning rise
        this.vx = this.facing * 260;
        audioManager.playSFX('sword_swing_heavy');
        vfxManager.createCycloneBlade(this);
    }

    useEclipseExecution() {
        this.rage = 0;
        let targetX = this.x + this.facing * 70;
        const targetEnemy = enemyManager?.enemies?.find(e => !e.isDead && Math.abs(e.x - this.x) < 220);
        if (targetEnemy) targetX = targetEnemy.x;

        this.beginSkill({
            id: 'eclipse_execution',
            damage: 130 * this.character.stats.damageMultiplier,
            startup: 0.15, active: 0.6, recovery: 0.3,
            hitbox: { x: 0, y: -35, width: 250, height: 100 },
            knockback: 700, hitStun: 1.0, hitStop: 100, moveForce: 0,
            swingSound: 'sword_swing_heavy', impactSound: 'sword_impact_heavy', screenShake: 'heavy', rageGain: 0
        });

        audioManager.playSFX('sword_impact_heavy');
        vfxManager.createEclipseExecution(this, targetX, this.y);
        camera.shakeHeavy();
        this.notify('ECLIPSE EXECUTION!', '#9333ea');
    }

    takeDamage(amount, knockbackX = 0, knockbackY = 0) {
        if (this.isInvulnerable || this.isDead) return;

        this.health = Math.max(0, this.health - amount);
        this.hurtTimer = this.hurtDuration;
        this.invulnerabilityTimer = 0.4;
        this.isInvulnerable = true;
        this.isChargingHeavy = false;
        this.currentAttack = null;
        this.vx = knockbackX;
        this.vy = Math.min(this.vy, knockbackY);

        this.stateMachine.setState('Hurt');
        vfxManager.createPlayerHurt(this);
        camera.shakeMedium();
        audioManager.playSFX('player_hurt');

        if (this.health <= 0) this.die();
    }

    die() {
        this.isDead = true;
        this.health = 0;
        this.deathTimer = 0;
        this.currentAttack = null;
        if (this.isRaging) this.endRage();
        this.stateMachine.setState('Death');
        audioManager.playSFX('player_death');
        vfxManager.createPlayerDeath(this);
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    gainRage(amount) {
        if (!this.isRaging) {
            this.rage = Math.min(this.maxRage, this.rage + amount);
        }
    }

    applyPhysics(dt) {
        const state = this.stateMachine.currentState;

        if (state === 'Climb') {
            // Climbing completely overrides standard platform gravity
            return;
        }

        if (this.grounded && !STEERABLE_STATES.has(state) && state !== 'Dodge') {
            this.applyFriction(state === 'SkillCast' ? SKILL_FRICTION : this.deceleration, dt);
        }

        if (!this.grounded) {
            this.vy += this.gravity * dt;
        }

        const prevY = this.y;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Platform detection (landing on elevated ramparts)
        let onPlatform = false;
        if (gameWorld?.platforms) {
            for (const p of gameWorld.platforms) {
                if (p.y >= gameWorld.floorY) continue; // ground handled separately
                const withinX = (this.x >= p.x - 6 && this.x <= p.x + p.width + 6);
                const landing = prevY <= p.y + 6 && this.y >= p.y && this.vy >= 0;
                const staying = this.currentPlatform === p && Math.abs(this.y - p.y) < 6;

                if (withinX && (landing || staying)) {
                    this.y = p.y;
                    this.vy = 0;
                    this.grounded = true;
                    this.currentPlatform = p;
                    onPlatform = true;
                    break;
                }
            }
        }

        if (!onPlatform) {
            this.currentPlatform = null;
            if (this.y >= gameWorld.floorY) {
                this.y = gameWorld.floorY;
                this.vy = 0;
                this.grounded = true;
            } else {
                this.grounded = false;
            }
        }

        const clampedX = gameWorld.clampX(this.x, this.width / 2);
        if (clampedX !== this.x) {
            this.x = clampedX;
            this.vx = 0;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);

        ctx.imageSmoothingEnabled = false;

        if (this.hurtTimer > 0 && Math.floor(this.hurtTimer * 20) % 2 === 0) {
            ctx.globalAlpha = 0.55;
        }

        if (this.stateMachine.currentState === 'Dodge') {
            ctx.globalAlpha = 0.75;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Render Hero Sprite
        if (this.character.spriteType === 'freeknight') {
            this.renderKnight(ctx);
        } else if (this.character.spriteType === 'sheet_blonde') {
            this.renderBlonde(ctx);
        } else if (this.character.spriteType === 'sheet_brown') {
            this.renderBrown(ctx);
        }

        if (this.isRaging) {
            this.drawRageAura(ctx);
        }

        ctx.restore();

        // Render floating notifications (in world coordinates, not scaled by facing)
        this.renderFloatingTexts(ctx);
    }

    renderFloatingTexts(ctx) {
        if (!this.floatingTexts.length) return;
        ctx.save();
        for (const ft of this.floatingTexts) {
            const alpha = Math.min(1, ft.life / 0.3);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 13px "Cinzel", serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.restore();
    }

    // ========================================================================
    // HERO SPRITE RENDERERS
    // ========================================================================

    renderKnight(ctx) {
        const anim = this.getKnightAnimation();
        const sheet = getImage(anim.cfg.file);

        if (!sheet.loaded) {
            ctx.fillStyle = '#4a4035';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const frameW = 120;
        const frameH = 80;
        const scale = this.character.scale;
        const anchorX = this.character.anchorX;
        const anchorY = this.character.anchorY;

        ctx.drawImage(
            sheet.img,
            anim.frame * frameW, 0, frameW, frameH,
            -anchorX * scale, -anchorY * scale, frameW * scale, frameH * scale
        );
    }

    getKnightAnimation() {
        const sm = this.stateMachine;
        const state = sm.currentState;

        if (this.isDead || state === 'Death') {
            const p = Math.min(1, this.deathTimer / 1.0);
            return { cfg: KNIGHT_ANIMATIONS.death, frame: Math.min(9, Math.floor(p * 10)) };
        }
        if (state === 'Hurt' || this.hurtTimer > 0) {
            return { cfg: KNIGHT_ANIMATIONS.hit, frame: 0 };
        }
        if (state === 'Dodge') {
            const p = 1 - Math.max(0, this.dodgeTimer / this.dodgeDuration);
            return { cfg: KNIGHT_ANIMATIONS.roll, frame: Math.min(11, Math.floor(p * 12)) };
        }
        if (state === 'Attack') {
            const total = this.currentAttack ? (this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery) : 0.4;
            const p = Math.min(0.999, Math.max(0, sm.attackProgress / total));
            if (!this.grounded) {
                // Aerial downward cleave in mid-air
                return { cfg: KNIGHT_ANIMATIONS.attack2, frame: Math.min(5, Math.floor(p * 6)) };
            }
            if (this.comboCount === 1) return { cfg: KNIGHT_ANIMATIONS.attack1, frame: Math.floor(p * 4) };
            if (this.comboCount === 2) return { cfg: KNIGHT_ANIMATIONS.attack2, frame: Math.floor(p * 6) };
            return { cfg: KNIGHT_ANIMATIONS.attack3, frame: Math.floor(p * 10) };
        }
        if (state === 'HeavyAttack') {
            if (this.isChargingHeavy) {
                const charge = this.heavyChargeTime / this.heavyChargeMax;
                return { cfg: KNIGHT_ANIMATIONS.crouch_attack, frame: Math.min(1, Math.floor(charge * 2)) };
            }
            const total = this.currentAttack ? (this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery) : 0.5;
            const p = Math.min(0.999, Math.max(0, sm.attackProgress / total));
            return { cfg: KNIGHT_ANIMATIONS.crouch_attack, frame: Math.min(3, 2 + Math.floor(p * 2)) };
        }
        if (state === 'SkillCast') {
            if (this.currentAttack?.id === 'valor_strike') {
                const total = this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery;
                const p = Math.min(0.999, Math.max(0, sm.attackProgress / total));
                return { cfg: KNIGHT_ANIMATIONS.dash, frame: Math.min(1, Math.floor(p * 2)) };
            }
            if (this.currentAttack?.id === 'iron_breaker') {
                const total = this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery;
                const p = Math.min(0.999, Math.max(0, sm.attackProgress / total));
                return { cfg: KNIGHT_ANIMATIONS.crouch_attack, frame: Math.min(3, Math.floor(p * 4)) };
            }
            return { cfg: KNIGHT_ANIMATIONS.attack2, frame: Math.floor((this.animTime * 10) % 6) };
        }
        if (state === 'Jump') {
            const frame = this.vy < -250 ? 0 : (this.vy < 0 ? 1 : 2);
            return { cfg: KNIGHT_ANIMATIONS.jump, frame };
        }
        if (state === 'Fall') {
            return { cfg: KNIGHT_ANIMATIONS.fall, frame: Math.min(2, Math.floor(sm.stateTime * 6)) };
        }
        if (state === 'Walk' || state === 'Run') {
            return { cfg: KNIGHT_ANIMATIONS.run, frame: Math.floor(this.animTime * 14) % 10 };
        }
        return { cfg: KNIGHT_ANIMATIONS.idle, frame: Math.floor(this.animTime * 10) % 10 };
    }

    renderBlonde(ctx) {
        const sheet = getImage('girl warior.png');
        if (!sheet.loaded) {
            ctx.fillStyle = '#c9a227';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const anim = this.getWarriorGridFrame();
        const cellW = 69;
        const cellH = 44;
        const scale = this.character.scale;
        const anchorX = this.character.anchorX;
        const anchorY = this.character.anchorY;

        ctx.drawImage(
            sheet.img,
            anim.col * cellW, anim.row * cellH, cellW, cellH,
            -anchorX * scale, -anchorY * scale, cellW * scale, cellH * scale
        );
    }

    renderBrown(ctx) {
        const state = this.stateMachine.currentState;

        // Ladder climb uses individual PNG frames
        if (state === 'Climb') {
            const climbIndex = (Math.floor(this.climbAnimProgress) % 8) + 1;
            const climbSheet = getImage(`Girl Warior brown hair/Warrior/Individual Sprite/Ladder-Grab/Warrior-Ladder-Grab_${climbIndex}.png`);
            if (climbSheet.loaded) {
                const cellW = 69;
                const cellH = 44;
                const scale = this.character.scale;
                const anchorX = this.character.anchorX;
                const anchorY = this.character.anchorY;
                ctx.drawImage(
                    climbSheet.img,
                    0, 0, cellW, cellH,
                    -anchorX * scale, -anchorY * scale, cellW * scale, cellH * scale
                );
                return;
            }
        }

        const sheet = getImage('Girl Warior brown hair/Warrior/SpriteSheet/Warrior_Sheet-Effect.png');
        if (!sheet.loaded) {
            ctx.fillStyle = '#7a3320';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const anim = this.getWarriorGridFrame();
        const cellW = 69;
        const cellH = 44;
        const scale = this.character.scale;
        const anchorX = this.character.anchorX;
        const anchorY = this.character.anchorY;

        ctx.drawImage(
            sheet.img,
            anim.col * cellW, anim.row * cellH, cellW, cellH,
            -anchorX * scale, -anchorY * scale, cellW * scale, cellH * scale
        );
    }

    getWarriorGridFrame() {
        const sm = this.stateMachine;
        const state = sm.currentState;

        if (this.isDead || state === 'Death') {
            const p = Math.min(1, this.deathTimer / 1.0);
            const idx = Math.min(10, Math.floor(p * 11));
            return { row: 5 + Math.floor(idx / 6), col: idx % 6 };
        }
        if (state === 'Hurt' || this.hurtTimer > 0) {
            return { row: 14, col: Math.floor(sm.stateTime * 8) % 2 };
        }
        if (state === 'Climb') {
            const ladderFrames = [
                { row: 15, col: 1 },
                { row: 15, col: 2 },
                { row: 15, col: 3 },
                { row: 15, col: 4 },
                { row: 15, col: 5 },
                { row: 16, col: 0 },
                { row: 16, col: 1 },
                { row: 16, col: 2 }
            ];
            const f = Math.floor(this.climbAnimProgress) % ladderFrames.length;
            return ladderFrames[f];
        }
        if (state === 'Dodge') {
            const p = 1 - Math.max(0, this.dodgeTimer / this.dodgeDuration);
            return { row: 14, col: 1 + Math.min(4, Math.floor(p * 5)) };
        }
        if (state === 'Attack') {
            const total = this.currentAttack ? (this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery) : 0.35;
            const p = Math.min(0.999, Math.max(0, sm.attackProgress / total));
            const frameIdx = Math.floor(p * 4);

            if (!this.grounded) {
                // Mid-air spin slash (Row 3 cols 4..5, Row 4 cols 0..1)
                const airSpin = [
                    { row: 3, col: 4 },
                    { row: 3, col: 5 },
                    { row: 4, col: 0 },
                    { row: 4, col: 1 }
                ];
                return airSpin[Math.min(3, frameIdx)];
            }

            if (this.comboCount === 1) {
                // Combo 1: Attack 1 (Row 2, cols 2, 3, 4, 5)
                const c1 = [2, 3, 4, 5];
                return { row: 2, col: c1[Math.min(3, frameIdx)] };
            } else if (this.comboCount === 2) {
                // Combo 2: Attack 2 (Row 3, cols 0, 1, 2, 3)
                const c2 = [0, 1, 2, 3];
                return { row: 3, col: c2[Math.min(3, frameIdx)] };
            } else {
                // Combo 3 Finisher: Whirlwind slash (Row 3 cols 4..5, Row 4 cols 0..1)
                const c3 = [
                    { row: 3, col: 4 },
                    { row: 3, col: 5 },
                    { row: 4, col: 0 },
                    { row: 4, col: 1 }
                ];
                return c3[Math.min(3, frameIdx)];
            }
        }
        if (state === 'HeavyAttack') {
            // Heavy Attack uses Dash Attack sequence (Row 12 col 5, Row 13 cols 0..5, Row 14 cols 0..1)
            const daFrames = [
                { row: 12, col: 5 },
                { row: 13, col: 0 },
                { row: 13, col: 1 },
                { row: 13, col: 2 },
                { row: 13, col: 3 },
                { row: 13, col: 4 },
                { row: 13, col: 5 },
                { row: 14, col: 0 },
                { row: 14, col: 1 }
            ];
            const total = 0.55;
            const p = Math.min(0.999, Math.max(0, sm.attackProgress / total));
            const idx = Math.min(daFrames.length - 1, Math.floor(p * daFrames.length));
            return daFrames[idx];
        }
        if (state === 'SkillCast') {
            if (this.currentAttack?.id === 'solar_piercer' || this.currentAttack?.id === 'phantom_blink') {
                // Dash lunge (Row 11 cols 3..5, Row 12 cols 0..1)
                const dashCols = [3, 4, 5, 4, 3];
                return { row: 11, col: dashCols[Math.floor((this.animTime * 14) % dashCols.length)] };
            }
            if (this.currentAttack?.id === 'radiant_tempest' || this.currentAttack?.id === 'cyclone_blade') {
                // Whirlwind spin attack (Row 3 cols 4..5, Row 4 cols 0..1)
                const spinFrames = [
                    { row: 3, col: 4 },
                    { row: 3, col: 5 },
                    { row: 4, col: 0 },
                    { row: 4, col: 1 }
                ];
                const idx = Math.floor((this.animTime * 14) % spinFrames.length);
                return spinFrames[idx];
            }
            return { row: 3, col: Math.floor((this.animTime * 12) % 4) };
        }
        if (state === 'Jump') {
            const f = this.vy < -200 ? 0 : 1;
            return { row: 6, col: 5 };
        }
        if (state === 'Fall') {
            return { row: 7, col: 3 };
        }
        if (state === 'Walk' || state === 'Run') {
            return { row: 1, col: Math.floor(this.animTime * 12) % 6 };
        }
        // Idle (slowed by 10% for graceful breathing motion)
        return { row: 0, col: Math.floor(this.animTime * 7.2) % 6 };
    }

    drawRageAura(ctx) {
        const t = this.animTime;
        ctx.save();
        ctx.globalAlpha = 0.4;

        const auraY = -this.height / 2;
        ctx.strokeStyle = this.character.themeColor || '#ff4400';
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(0, auraY, 44 + Math.sin(t * 5) * 4, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + t * 2.5;
            const dist = 32 + Math.sin(t * 4 + i) * 8;
            const px = Math.cos(angle) * dist;
            const py = auraY + Math.sin(angle) * dist * 0.7;

            ctx.fillStyle = this.character.themeColor || '#ffaa00';
            ctx.beginPath();
            ctx.arc(px, py, 3 + Math.sin(t * 8 + i) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
