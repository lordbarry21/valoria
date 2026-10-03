/**
 * VALORIA - Shadow Caster Enemy
 * Ranged attacker with mystical dark magic appearance
 */

import { Enemy } from './Enemy.js';
import { player, audioManager, vfxManager, camera } from '../main.js';

export class ShadowCaster extends Enemy {
    constructor() {
        super();

        this.name = 'Shadow Caster';
        this.width = 35;
        this.height = 70;

        // Health - lower
        this.maxHealth = 30;
        this.health = 30;

        // Combat
        this.damage = 15;
        this.attackRange = 400;
        this.attackCooldownMax = 2.5;

        // AI
        this.aggroRange = 350;
        this.moveSpeed = 80;
        this.preferDistance = 250;

        // Projectile
        this.projectiles = [];
        this.projectileSpeed = 300;
    }

    init() {
        super.init();
        this.projectiles = [];
    }

    // Projectiles keep flying while the caster is stunned, hit-stopped or dying.
    update(dt) {
        super.update(dt);
        this.updateProjectiles(dt);
    }

    updateAI(dt) {
        const distToPlayer = Math.abs(this.x - player.x);
        const dirToPlayer = player.x > this.x ? 1 : -1;
        this.facing = dirToPlayer;
        this.isAggro = !player.isDead && distToPlayer < this.aggroRange;

        switch (this.state) {
            case 'idle':
                if (this.isAggro) this.setState('approach');
                break;

            case 'approach':
                if (!this.isAggro) {
                    this.setState('idle');
                } else if (distToPlayer > this.preferDistance) {
                    this.vx = dirToPlayer * this.moveSpeed;
                    this.x += this.vx * dt;
                } else {
                    this.setState('attack');
                    this.startAttack();
                }
                break;

            case 'attack':
                this.vx = 0;
                if (this.stateTime > 0.8) {
                    this.setState('cooldown');
                    this.attackCooldown = this.attackCooldownMax;
                    this.isAttacking = false;
                }
                break;

            case 'cooldown':
                // Retreat while cooling down
                if (distToPlayer < 150) {
                    this.vx = -dirToPlayer * this.moveSpeed * 0.5;
                    this.x += this.vx * dt;
                } else {
                    this.vx = 0;
                }
                if (this.attackCooldown <= 0) this.setState('approach');
                break;
        }
    }

    // Ranged only: damage comes from projectiles, never the inherited melee box.
    getAttackHitbox() {
        return null;
    }

    startAttack() {
        this.isAttacking = true;
        this.castProjectile();
        audioManager.playSFX('enemy_attack');
    }

    castProjectile() {
        this.projectiles.push({
            x: this.x,
            y: this.y - 40,
            vx: this.facing * this.projectileSpeed,
            vy: 0,
            damage: this.damage,
            hit: false,
            life: 3
        });
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (!p.hit && !player.isInvulnerable && !player.isDead) {
                const playerBox = {
                    x: player.x - player.width / 2,
                    y: player.y - player.height,
                    width: player.width,
                    height: player.height
                };

                if (p.x > playerBox.x && p.x < playerBox.x + playerBox.width &&
                    p.y > playerBox.y && p.y < playerBox.y + playerBox.height) {
                    p.hit = true;
                    player.takeDamage(p.damage, p.vx > 0 ? 150 : -150, -50);
                    vfxManager.createProjectileImpact(p.x, p.y);
                    camera.shakeLight();
                }
            }

            if (p.life <= 0 || p.hit) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        // Render projectiles
        for (const p of this.projectiles) {
            this.renderProjectile(ctx, p);
        }

        super.render(ctx);
    }

    renderProjectile(ctx, p) {
        const t = this.animTime;

        // Outer glow
        ctx.fillStyle = 'rgba(136, 68, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fill();

        // Middle glow
        ctx.fillStyle = 'rgba(136, 68, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#aa66ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = '#ddbbff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Trailing particles
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            const trailX = p.x - p.vx * 0.02 * (i + 1);
            const trailY = p.y - p.vy * 0.02 * (i + 1);
            const trailSize = 4 - i;

            ctx.fillStyle = `rgba(136, 68, 255, ${0.5 - i * 0.15})`;
            ctx.beginPath();
            ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawBody(ctx) {
        const t = this.animTime;
        const aggro = this.isAggro;
        const hurtFlash = this.hitStunTime > 0.1;

        // Shadow
        ctx.fillStyle = 'rgba(15, 5, 25, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Floating robe
        const robeColor = hurtFlash ? '#2a1540' : (aggro ? '#1a0a30' : '#120818');
        ctx.fillStyle = robeColor;

        // Main robe shape (floating)
        const floatOffset = Math.sin(t * 2) * 3;

        ctx.beginPath();
        ctx.moveTo(-15, floatOffset);
        ctx.quadraticCurveTo(-13, -25, -10, -42);
        ctx.lineTo(0, -52);
        ctx.lineTo(10, -42);
        ctx.quadraticCurveTo(13, -25, 15, floatOffset);
        ctx.closePath();
        ctx.fill();

        // Robe inner darkness
        ctx.fillStyle = '#080410';
        ctx.beginPath();
        ctx.moveTo(-8, floatOffset + 2);
        ctx.quadraticCurveTo(-6, -20, -4, -38);
        ctx.lineTo(4, -38);
        ctx.quadraticCurveTo(6, -20, 8, floatOffset + 2);
        ctx.closePath();
        ctx.fill();

        // Hooded head
        ctx.fillStyle = robeColor;
        ctx.beginPath();
        ctx.arc(0, -58 + floatOffset, 13, 0, Math.PI * 2);
        ctx.fill();

        // Hood shadow
        ctx.fillStyle = '#050308';
        ctx.beginPath();
        ctx.ellipse(0, -56 + floatOffset, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing eyes
        const eyeColor = aggro ? '#cc66ff' : '#663399';
        const eyeGlow = aggro ? 10 : 4;

        if (eyeGlow > 4) {
            ctx.shadowColor = '#aa44ff';
            ctx.shadowBlur = eyeGlow;
        }

        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(-4, -58 + floatOffset, 3, 0, Math.PI * 2);
        ctx.arc(4, -58 + floatOffset, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Staff
        ctx.fillStyle = '#2a2030';
        ctx.save();
        ctx.translate(18, -45 + floatOffset);
        ctx.rotate(0.1 + Math.sin(t * 1.5) * 0.05);

        // Staff pole
        ctx.fillRect(-2, -25, 4, 55);

        // Crystal holder
        ctx.fillStyle = '#1a1525';
        ctx.fillRect(-4, -30, 8, 8);

        // Crystal
        const crystalColor = aggro ? '#aa66ff' : '#8844cc';
        ctx.fillStyle = crystalColor;
        ctx.beginPath();
        ctx.arc(0, -38, 8, 0, Math.PI * 2);
        ctx.fill();

        // Crystal glow
        if (aggro) {
            ctx.shadowColor = '#aa66ff';
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = aggro ? '#cc88ff' : '#aa66ee';
        ctx.beginPath();
        ctx.arc(0, -38, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.restore();

        // Floating magical particles
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 5; i++) {
            const px = Math.sin(t * 1.8 + i * 1.2) * 14;
            const py = -25 + Math.cos(t * 2.2 + i) * 12 - i * 6 + floatOffset;
            const particleColor = aggro ? 'rgba(170, 100, 255,' : 'rgba(136, 68, 204,';

            ctx.fillStyle = particleColor + '0.5)';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Casting effect when attacking
        if (this.isAttacking && this.stateTime < 0.4) {
            const castAlpha = (1 - this.stateTime / 0.4) * 0.3;
            ctx.fillStyle = `rgba(136, 68, 255, ${castAlpha})`;
            ctx.beginPath();
            ctx.arc(0, -38, 30 + this.stateTime * 50, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
