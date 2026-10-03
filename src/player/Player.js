/**
 * VALORIA - Player Character (The Knight)
 * Animated pixel-art knight using the FreeKnight sprite pack.
 */

import { inputManager, audioManager, camera, vfxManager, gameWorld, playerDied } from '../main.js';
import { PlayerStateMachine } from './PlayerStateMachine.js';
import { getComboAttacks, createHeavyAttack, VALOR_STRIKE, IRON_BREAKER } from './playerAttacks.js';

const STEERABLE_STATES = new Set(['Idle', 'Walk', 'Run', 'Jump', 'Fall']);
const SKILL_FRICTION = 600;
const DEATH_SCREEN_DELAY = 1.5;

// FreeKnight sprite definitions (all frames are 120x80, centered around anchorX=55, anchorY=80)
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

export class Player {
    constructor() {
        this.x = 400;
        this.y = 500;
        // Hitbox dimensions that match the 2x scaled knight sprite
        this.width = 44;
        this.height = 76;

        this.vx = 0;
        this.vy = 0;

        // 1 = right, -1 = left
        this.facing = 1;

        this.stateMachine = new PlayerStateMachine(this);

        this.maxHealth = 100;
        this.health = 100;
        this.maxStamina = 100;
        this.stamina = 100;
        this.maxRage = 100;
        this.rage = 0;

        this.staminaRegenRate = 25;
        this.staminaRegenDelay = 0.6;
        this.staminaRegenTimer = 0;

        this.moveSpeed = 280;
        this.acceleration = 2000;
        this.airControl = 0.6;
        this.deceleration = 1500;
        this.jumpForce = 550;
        this.gravity = 1800;

        this.grounded = true;
        this.groundY = 500;

        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboWindow = 0.35;
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

        this.skills = {
            valorStrike: { cooldown: 0, maxCooldown: 4.0, cost: 0 },
            ironBreaker: { cooldown: 0, maxCooldown: 8.0, cost: 0 },
            valoriaRage: { cooldown: 0, maxCooldown: 15.0, cost: 0 }
        };

        this.isRaging = false;
        this.rageDuration = 0;
        this.rageMaxDuration = 6.0;

        this.hurtTimer = 0;
        this.hurtDuration = 0.3;
        this.invulnerabilityTimer = 0;

        this.animTime = 0;
        this.hitStopTime = 0;

        this.isDead = false;
        this.deathTimer = 0;
        this.deathReported = false;

        // Preload FreeKnight sprite sheets
        this.sprites = {};
        this.preloadSprites();
    }

    preloadSprites() {
        for (const [key, cfg] of Object.entries(KNIGHT_ANIMATIONS)) {
            const img = new Image();
            img.src = cfg.file;
            this.sprites[key] = {
                image: img,
                frames: cfg.frames,
                fps: cfg.fps,
                loop: cfg.loop,
                loaded: false
            };
            img.onload = () => {
                this.sprites[key].loaded = true;
            };
            img.onerror = () => {
                console.warn('Failed to load knight sprite:', cfg.file);
            };
        }
    }

    init() {
        this.groundY = gameWorld.floorY;
        this.x = 400;
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;
        this.grounded = true;

        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.staminaRegenTimer = 0;
        this.rage = 0;

        this.comboCount = 0;
        this.comboTimer = 0;
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

        this.isDead = false;
        this.deathTimer = 0;
        this.deathReported = false;

        this.stateMachine.reset();
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
        const canRegen = this.staminaRegenTimer <= 0 && state !== 'Dodge' && !this.isChargingHeavy;
        if (canRegen && this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * dt);
        }

        if (!this.isRaging && this.rage > 0) {
            this.rage = Math.max(0, this.rage - 2 * dt);
        }
    }

    spendStamina(amount) {
        this.stamina -= amount;
        this.staminaRegenTimer = this.staminaRegenDelay;
    }

    handleInput(dt) {
        if (this.isChargingHeavy) {
            this.updateHeavyCharge(dt);
            return;
        }

        if (this.stateMachine.isLocked()) return;

        if (STEERABLE_STATES.has(this.stateMachine.currentState)) {
            this.handleMovement(dt);
        }

        if (inputManager.isAttackPressed()) this.attack();
        if (inputManager.isHeavyAttackPressed()) this.startHeavyAttack();
        if (inputManager.isDodgePressed()) this.dodge();
        if (inputManager.isSkill1Pressed()) this.useSkill('valorStrike');
        if (inputManager.isSkill2Pressed()) this.useSkill('ironBreaker');
        if (inputManager.isSkill3Pressed()) this.useSkill('valoriaRage');
    }

    handleMovement(dt) {
        const moveDir = inputManager.getHorizontalInput();
        const accel = this.acceleration * (this.grounded ? 1 : this.airControl);

        if (moveDir !== 0) {
            this.facing = moveDir;
            const turningAround = this.vx * moveDir < 0;
            this.vx += moveDir * accel * (turningAround ? 1.5 : 1) * dt;

            const maxSpeed = this.moveSpeed * (this.isRaging ? 1.2 : 1);
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

        if (inputManager.isJumpJustPressed()) this.jump();
    }

    applyFriction(amount, dt) {
        const decel = amount * dt;
        this.vx = Math.abs(this.vx) <= decel ? 0 : this.vx - Math.sign(this.vx) * decel;
    }

    jump() {
        if (!this.grounded || this.stamina < 10) return;
        if (!this.stateMachine.canTransition('Jump')) return;

        this.grounded = false;
        this.vy = -this.jumpForce;
        this.spendStamina(10);
        this.stateMachine.setState('Jump');
        audioManager.playSFX('player_jump');
        vfxManager.createJumpDust(this.x, this.y);
    }

    onLanded() {
        vfxManager.createLandingDust(this.x, this.y);
        audioManager.playSFX('player_land');
    }

    attack() {
        const sm = this.stateMachine;
        if (!this.grounded) return;
        if (sm.currentState !== 'Attack' && !sm.canTransition('Attack')) return;

        const continuingCombo = this.comboTimer > 0 && this.comboCount > 0;
        this.comboCount = continuingCombo ? (this.comboCount % 4) + 1 : 1;
        this.executeAttack();
    }

    executeAttack() {
        const attacks = getComboAttacks(this.isRaging);
        this.currentAttack = attacks[Math.min(this.comboCount - 1, attacks.length - 1)];
        const { startup, active, recovery } = this.currentAttack;

        this.stateMachine.setState('Attack');
        this.stateMachine.setAttackTiming(startup, active, recovery);
        this.attackHitEnemies.clear();
        this.vx = this.facing * this.currentAttack.moveForce;

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
        this.invulnerabilityTimer = this.invulnerabilityDuration;
        this.currentAttack = null;

        this.stateMachine.setState('Dodge');
        this.vx = this.dodgeDirection * this.dodgeSpeed;
        audioManager.playSFX('player_dodge');
        vfxManager.createDodgeTrail(this);
    }

    onDodgeEnd() {
        this.vx = this.dodgeDirection * this.moveSpeed * 0.4;
    }

    useSkill(skillName) {
        const skill = this.skills[skillName];
        if (skill.cooldown > 0) return;
        if (!this.grounded || !this.stateMachine.canTransition('SkillCast')) return;
        if (skillName === 'valoriaRage' && (this.rage < this.maxRage || this.isRaging)) return;

        skill.cooldown = skill.maxCooldown;

        if (skillName === 'valorStrike') this.useValorStrike();
        else if (skillName === 'ironBreaker') this.useIronBreaker();
        else if (skillName === 'valoriaRage') this.useValoriaRage();
    }

    beginSkill(attack) {
        this.currentAttack = attack;
        this.attackHitEnemies.clear();
        this.stateMachine.setState('SkillCast');
        if (attack) {
            this.stateMachine.setAttackTiming(attack.startup, attack.active, attack.recovery);
        } else {
            this.stateMachine.setAttackTiming(0, 0, 0.35);
        }
    }

    useValorStrike() {
        this.beginSkill({ ...VALOR_STRIKE });
        this.vx = this.facing * 500;
        audioManager.playSFX('valor_strike');
        vfxManager.createValorStrike(this);
    }

    useIronBreaker() {
        this.beginSkill({ ...IRON_BREAKER });
        this.vx = 0;
        audioManager.playSFX('iron_breaker');
        vfxManager.createIronBreaker(this);
        camera.impactZoom(0.15, 0.3);
    }

    useValoriaRage() {
        this.rage = 0;
        this.isRaging = true;
        this.rageDuration = this.rageMaxDuration;
        this.beginSkill(null);
        audioManager.playSFX('valoria_rage_start');
        vfxManager.createRageAura(this);
        camera.shakeMedium();
    }

    endRage() {
        this.isRaging = false;
        audioManager.playSFX('valoria_rage_end');
        vfxManager.removeRageAura(this);
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

    heal(amount) { this.health = Math.min(this.maxHealth, this.health + amount); }
    gainRage(amount) { if (!this.isRaging) this.rage = Math.min(this.maxRage, this.rage + amount); }

    applyPhysics(dt) {
        const state = this.stateMachine.currentState;
        if (this.grounded && !STEERABLE_STATES.has(state) && state !== 'Dodge') {
            this.applyFriction(state === 'SkillCast' ? SKILL_FRICTION : this.deceleration, dt);
        }

        if (!this.grounded) this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.vy = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        const clampedX = gameWorld.clampX(this.x, this.width / 2);
        if (clampedX !== this.x) {
            this.x = clampedX;
            this.vx = 0;
        }
    }

    // Resolves current animation sheet and frame based on player state
    getAnimation() {
        const sm = this.stateMachine;
        const state = sm.currentState;

        if (this.isDead || state === 'Death') {
            const progress = Math.min(1, this.deathTimer / 1.0);
            return { name: 'death', frame: Math.min(9, Math.floor(progress * 10)) };
        }

        if (state === 'Hurt' || this.hurtTimer > 0) {
            return { name: 'hit', frame: 0 };
        }

        if (state === 'Dodge') {
            const progress = 1 - Math.max(0, this.dodgeTimer / this.dodgeDuration);
            return { name: 'roll', frame: Math.min(11, Math.floor(progress * 12)) };
        }

        if (state === 'Attack') {
            const total = this.currentAttack
                ? (this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery)
                : 0.4;
            const progress = Math.min(0.999, Math.max(0, sm.attackProgress / total));
            if (this.comboCount === 1) {
                return { name: 'attack1', frame: Math.floor(progress * 4) };
            } else if (this.comboCount === 2) {
                return { name: 'attack2', frame: Math.floor(progress * 6) };
            } else {
                return { name: 'attack3', frame: Math.floor(progress * 10) };
            }
        }

        if (state === 'HeavyAttack') {
            if (this.isChargingHeavy) {
                const charge = this.heavyChargeTime / this.heavyChargeMax;
                return { name: 'crouch_attack', frame: Math.min(1, Math.floor(charge * 2)) };
            } else {
                const total = this.currentAttack
                    ? (this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery)
                    : 0.5;
                const progress = Math.min(0.999, Math.max(0, sm.attackProgress / total));
                return { name: 'crouch_attack', frame: Math.min(3, 2 + Math.floor(progress * 2)) };
            }
        }

        if (state === 'SkillCast') {
            if (this.currentAttack?.id === 'valor_strike') {
                const total = this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery;
                const progress = Math.min(0.999, Math.max(0, sm.attackProgress / total));
                return { name: 'dash', frame: Math.min(1, Math.floor(progress * 2)) };
            }
            if (this.currentAttack?.id === 'iron_breaker') {
                const total = this.currentAttack.startup + this.currentAttack.active + this.currentAttack.recovery;
                const progress = Math.min(0.999, Math.max(0, sm.attackProgress / total));
                return { name: 'crouch_attack', frame: Math.min(3, Math.floor(progress * 4)) };
            }
            return { name: 'attack2', frame: Math.floor((this.animTime * 10) % 6) };
        }

        if (state === 'Jump') {
            const frame = this.vy < -250 ? 0 : (this.vy < 0 ? 1 : 2);
            return { name: 'jump', frame };
        }

        if (state === 'Fall') {
            const frame = Math.min(2, Math.floor(sm.stateTime * 6));
            return { name: 'fall', frame };
        }

        if (state === 'Walk' || state === 'Run') {
            return { name: 'run', frame: Math.floor(this.animTime * 13) % 10 };
        }

        // Default: Idle
        return { name: 'idle', frame: Math.floor(this.animTime * 10) % 10 };
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);

        // Pixel-art crisp rendering
        ctx.imageSmoothingEnabled = false;

        if (this.hurtTimer > 0 && Math.floor(this.hurtTimer * 20) % 2 === 0) {
            ctx.globalAlpha = 0.55;
        }

        if (this.stateMachine.currentState === 'Dodge') {
            ctx.globalAlpha = 0.75;
        }

        this.drawSprite(ctx);

        if (this.isRaging) {
            this.drawRageAura(ctx);
        }

        ctx.restore();
    }

    drawSprite(ctx) {
        const anim = this.getAnimation();
        const sheet = this.sprites[anim.name];

        // Soft grounded shadow beneath feet
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (!sheet || !sheet.loaded) {
            // Crisp fallback while sprite is loading
            ctx.fillStyle = '#4a4035';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const frameW = 120;
        const frameH = 80;
        const scale = 2.0;
        const anchorX = 55;
        const anchorY = 80;

        const sx = anim.frame * frameW;
        const sy = 0;
        const dx = -anchorX * scale;
        const dy = -anchorY * scale;
        const dw = frameW * scale;
        const dh = frameH * scale;

        ctx.drawImage(sheet.image, sx, sy, frameW, frameH, dx, dy, dw, dh);
    }

    drawRageAura(ctx) {
        const t = this.animTime;
        ctx.save();
        ctx.globalAlpha = 0.4;

        // Glowing red/orange aura circle
        const auraY = -this.height / 2;
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, auraY, 44 + Math.sin(t * 5) * 4, 0, Math.PI * 2);
        ctx.stroke();

        // Rising embers
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + t * 2.5;
            const dist = 30 + Math.sin(t * 4 + i) * 8;
            const px = Math.cos(angle) * dist;
            const py = auraY + Math.sin(angle) * dist * 0.7;

            ctx.fillStyle = `rgba(255, ${80 + i * 25}, 20, 0.8)`;
            ctx.beginPath();
            ctx.arc(px, py, 3 + Math.sin(t * 8 + i) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
