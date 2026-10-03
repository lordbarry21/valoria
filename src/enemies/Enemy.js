/**
 * VALORIA - Base Enemy
 * Common enemy functionality with improved visuals
 */

import { player, audioManager, vfxManager, gameWorld } from '../main.js';

export const DEATH_FADE_DURATION = 1.5;

export class Enemy {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 40;
        this.height = 70;

        this.vx = 0;
        this.vy = 0;

        this.facing = -1;

        this.state = 'idle';
        this.stateTime = 0;
        this.isDead = false;
        this.shouldRemove = false;
        this.deathTimer = 0;

        this.maxHealth = 50;
        this.health = 50;

        this.damage = 10;
        this.isAttacking = false;
        this.attackHit = false;
        this.attackCooldown = 0;
        this.attackCooldownMax = 1.5;

        // Subclasses tune these instead of overriding takeDamage().
        this.damageTakenMultiplier = 1;
        this.knockbackResistance = 1;
        this.hitStunMultiplier = 1;

        this.aggroRange = 300;
        this.attackRange = 60;
        this.moveSpeed = 100;
        this.isAggro = false;

        this.hitStunTime = 0;
        this.hitStopTime = 0;
        this.knockbackVelX = 0;

        this.animTime = 0;
    }

    init() {
        this.health = this.maxHealth;
        this.isDead = false;
        this.shouldRemove = false;
        this.deathTimer = 0;
        this.state = 'idle';
        this.stateTime = 0;
        this.isAttacking = false;
        this.attackHit = false;
        this.attackCooldown = 0;
        this.hitStunTime = 0;
        this.hitStopTime = 0;
        this.knockbackVelX = 0;
        this.vx = 0;
    }

    update(dt) {
        if (this.hitStopTime > 0) {
            this.hitStopTime -= dt;
            return;
        }

        this.animTime += dt;
        this.stateTime += dt;
        this.applyKnockback(dt);

        if (this.isDead) {
            this.deathTimer += dt;
            if (this.deathTimer >= DEATH_FADE_DURATION) this.shouldRemove = true;
            return;
        }

        if (this.hitStunTime > 0) {
            this.hitStunTime -= dt;
            return;
        }

        if (this.state === 'hurt') this.setState('idle');

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        this.updateAI(dt);
        this.x = gameWorld.clampX(this.x, this.width / 2);
    }

    applyKnockback(dt) {
        if (this.knockbackVelX === 0) return;

        this.x = gameWorld.clampX(this.x + this.knockbackVelX * dt, this.width / 2);
        // Frame-rate independent version of "*= 0.9 per frame at 60fps".
        this.knockbackVelX *= Math.pow(0.9, dt * 60);
        if (Math.abs(this.knockbackVelX) < 5) this.knockbackVelX = 0;
    }

    setState(newState) {
        this.state = newState;
        this.stateTime = 0;
    }

    updateAI(dt) {
        const distToPlayer = Math.abs(this.x - player.x);
        const dirToPlayer = player.x > this.x ? 1 : -1;

        if (this.state !== 'attack') this.facing = dirToPlayer;
        this.isAggro = !player.isDead && distToPlayer < this.aggroRange;

        switch (this.state) {
            case 'idle':
                if (this.isAggro) this.setState('chase');
                break;

            case 'chase':
                if (!this.isAggro) {
                    this.vx = 0;
                    this.setState('idle');
                } else if (distToPlayer > this.attackRange) {
                    this.vx = dirToPlayer * this.moveSpeed;
                    this.x += this.vx * dt;
                } else {
                    this.setState('attack');
                    this.startAttack();
                }
                break;

            case 'attack':
                this.vx = 0;
                if (this.stateTime > 0.5) {
                    this.setState('cooldown');
                    this.attackCooldown = this.attackCooldownMax;
                    this.isAttacking = false;
                    this.attackHit = false;
                }
                break;

            case 'cooldown':
                if (this.attackCooldown <= 0) this.setState('idle');
                break;
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackHit = false;
        audioManager.playSFX('enemy_attack');
    }

    // Extra weapon rotation so the windup (0–0.2s) and strike (0.2–0.4s) read on screen.
    getWeaponSwing() {
        if (this.state !== 'attack') return 0;
        if (this.stateTime < 0.2) return -1.2 * (this.stateTime / 0.2);
        if (this.stateTime < 0.4) return -1.2 + 2.6 * ((this.stateTime - 0.2) / 0.2);
        return 1.4 * (1 - (this.stateTime - 0.4) / 0.1);
    }

    getHurtbox() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height,
            width: this.width,
            height: this.height
        };
    }

    getAttackHitbox() {
        if (!this.isAttacking) return null;
        if (this.stateTime < 0.2 || this.stateTime > 0.4) return null;

        const range = this.attackRange;
        return {
            x: this.facing > 0 ? this.x : this.x - range,
            y: this.y - this.height / 2,
            width: range,
            height: this.height / 2
        };
    }

    takeDamage(amount, knockbackForce, hitStun, direction) {
        if (this.isDead) return;

        this.health -= amount * this.damageTakenMultiplier;
        this.hitStunTime = hitStun * this.hitStunMultiplier;
        this.knockbackVelX = direction * knockbackForce * this.knockbackResistance;
        this.isAttacking = false;
        this.attackHit = false;
        this.setState('hurt');

        audioManager.playSFX('enemy_hurt');
        vfxManager.createEnemyHurt(this);

        if (this.health <= 0) this.die();
    }

    die() {
        this.isDead = true;
        this.health = 0;
        this.setState('death');
        this.vx = 0;
        this.isAttacking = false;
        audioManager.playSFX('enemy_death');
        vfxManager.createEnemyDeath(this);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);

        if (this.hitStunTime > 0.1) ctx.globalAlpha = 0.7;
        if (this.isDead) ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / DEATH_FADE_DURATION);

        this.drawBody(ctx);
        ctx.restore();
    }

    drawBody(ctx) {
        const t = this.animTime;
        const aggro = this.isAggro;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body - dark armored
        const bodyColor = aggro ? '#2a252a' : '#1a151a';
        ctx.fillStyle = bodyColor;

        // Legs
        ctx.fillRect(-12, -25, 9, 25);
        ctx.fillRect(3, -25, 9, 25);

        // Torso
        ctx.fillRect(-15, -55, 30, 35);

        // Shoulder armor
        ctx.fillStyle = aggro ? '#3a353a' : '#252030';
        ctx.fillRect(-18, -55, 8, 14);
        ctx.fillRect(10, -55, 8, 14);

        // Head
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, -65, 12, 0, Math.PI * 2);
        ctx.fill();

        // Helmet visor
        ctx.fillStyle = '#0a0808';
        ctx.fillRect(-8, -68, 16, 6);

        // Eyes (glow when aggro)
        const eyeColor = aggro ? '#ff3333' : '#662222';
        ctx.fillStyle = eyeColor;
        if (aggro) {
            // Glow effect
            ctx.shadowColor = '#ff3333';
            ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(-4, -66, 2.5, 0, Math.PI * 2);
        ctx.arc(4, -66, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Weapon
        ctx.fillStyle = '#3a3a4a';
        ctx.save();
        ctx.translate(18, -45);
        ctx.rotate(0.3 + Math.sin(t * 2) * 0.1 + this.getWeaponSwing());

        // Blade
        ctx.fillRect(-2, 0, 4, 38);
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(-1, 0, 2, 34);

        // Hilt
        ctx.fillStyle = '#2a1a10';
        ctx.fillRect(-4, 35, 8, 6);

        ctx.restore();
    }
}
