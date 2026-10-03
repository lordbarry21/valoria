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

        this.climbSpeed = 95;
        this.currentLadder = null;
        this.canClimbLadders = true;

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
        this.currentLadder = null;
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

    findTargetLadder() {
        if (!this.canClimbLadders || !gameWorld?.ladders || gameWorld.ladders.length === 0 || !player) return null;

        const playerY = player.y;
        const enemyY = this.y;
        const verticalDiff = playerY - enemyY;

        // If on roughly the same level (within 35px), no ladder needed
        if (Math.abs(verticalDiff) <= 35) return null;

        if (verticalDiff < 0) {
            // Player is HIGHER up than enemy
            // Check if player is on an elevated platform
            const targetPlatform = gameWorld.platforms?.find(p =>
                p.y < (gameWorld.floorY || 500) &&
                player.x >= p.x - 30 &&
                player.x <= p.x + p.width + 30 &&
                Math.abs(player.y - p.y) < 30
            );

            if (targetPlatform) {
                const ladder = gameWorld.ladders.find(l =>
                    Math.abs(l.topY - targetPlatform.y) < 15 &&
                    l.x >= targetPlatform.x - 10 &&
                    l.x <= targetPlatform.x + targetPlatform.width + 10
                );
                if (ladder) return ladder;
            }

            // Find closest ladder to player's X
            let closest = gameWorld.ladders[0];
            let minDist = Math.abs(closest.x - player.x);
            for (let i = 1; i < gameWorld.ladders.length; i++) {
                const dist = Math.abs(gameWorld.ladders[i].x - player.x);
                if (dist < minDist) {
                    minDist = dist;
                    closest = gameWorld.ladders[i];
                }
            }
            return closest;
        } else {
            // Player is LOWER down than enemy (enemy on platform)
            const ladder = gameWorld.ladders.find(l =>
                Math.abs(l.topY - enemyY) < 20 &&
                Math.abs(l.x - this.x) < 250
            );
            return ladder || gameWorld.ladders[0];
        }
    }

    updateAI(dt) {
        if (!player || player.isDead) {
            this.vx = 0;
            this.setState('idle');
            return;
        }

        const distToPlayer = Math.abs(this.x - player.x);
        const verticalDist = Math.abs(this.y - player.y);
        const dirToPlayer = player.x > this.x ? 1 : -1;

        if (this.state !== 'attack' && this.state !== 'climb') {
            this.facing = dirToPlayer;
        }
        this.isAggro = this.aggroRange >= 9999 || distToPlayer < this.aggroRange;

        // Climbing state handling
        if (this.state === 'climb') {
            const ladder = this.currentLadder || this.findTargetLadder();
            if (!ladder) {
                this.setState('chase');
                return;
            }
            this.x = ladder.x;
            this.vx = 0;

            const targetY = player.y;
            if (targetY < this.y - 10) {
                this.y -= this.climbSpeed * dt;
                if (this.y <= ladder.topY) {
                    this.y = ladder.topY;
                    this.currentLadder = null;
                    this.setState('chase');
                }
            } else if (targetY > this.y + 10) {
                this.y += this.climbSpeed * dt;
                if (this.y >= ladder.bottomY) {
                    this.y = gameWorld.floorY || 500;
                    this.currentLadder = null;
                    this.setState('chase');
                }
            } else {
                this.currentLadder = null;
                this.setState('chase');
            }
            return;
        }

        const neededLadder = this.isAggro ? this.findTargetLadder() : null;

        switch (this.state) {
            case 'idle':
                if (this.isAggro) this.setState('chase');
                break;

            case 'chase':
                if (!this.isAggro) {
                    this.vx = 0;
                    this.setState('idle');
                } else if (neededLadder) {
                    const distToLadder = Math.abs(this.x - neededLadder.x);
                    const dirToLadder = neededLadder.x > this.x ? 1 : -1;
                    if (distToLadder > 12) {
                        this.vx = dirToLadder * this.moveSpeed;
                        this.facing = dirToLadder;
                        this.x += this.vx * dt;
                    } else {
                        this.x = neededLadder.x;
                        this.vx = 0;
                        this.currentLadder = neededLadder;
                        this.setState('climb');
                    }
                } else if (distToPlayer > this.attackRange || verticalDist > 35) {
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

        // Maintain platform Y level or floor Y level when not climbing
        if (this.state !== 'climb') {
            let groundY = gameWorld?.floorY || 500;
            if (gameWorld?.platforms) {
                for (const plat of gameWorld.platforms) {
                    if (plat.y < groundY && this.x >= plat.x - 10 && this.x <= plat.x + plat.width + 10 && Math.abs(this.y - plat.y) < 25) {
                        groundY = plat.y;
                        break;
                    }
                }
            }
            this.y = groundY;
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
