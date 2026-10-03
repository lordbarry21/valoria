/**
 * VALORIA - Shadow Caster / Necromancer Enemy
 * Ranged attacker using the animated CreativeKind Necromancer boss sprite sheet.
 */

import { Enemy } from './Enemy.js';
import { player, audioManager, vfxManager, camera } from '../main.js';

let necroImg = null;
let necroLoaded = false;

function preloadNecromancer() {
    if (necroImg) return;
    necroImg = new Image();
    necroImg.src = 'Necromancer_creativekind-Sheet.png';
    necroImg.onload = () => { necroLoaded = true; };
}

export class ShadowCaster extends Enemy {
    constructor() {
        super();

        this.name = 'Necromancer';
        this.width = 46;
        this.height = 82;

        // Health
        this.maxHealth = 60;
        this.health = 60;

        // Combat
        this.damage = 18;
        this.attackRange = 400;
        this.attackCooldownMax = 2.4;

        // AI
        this.aggroRange = 380;
        this.moveSpeed = 85;
        this.preferDistance = 260;

        // Projectile
        this.projectiles = [];
        this.projectileSpeed = 320;

        preloadNecromancer();
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
                if (this.stateTime > 0.85) {
                    this.setState('cooldown');
                    this.attackCooldown = this.attackCooldownMax;
                    this.isAttacking = false;
                }
                break;

            case 'cooldown':
                // Retreat while cooling down
                if (distToPlayer < 180) {
                    this.vx = -dirToPlayer * this.moveSpeed * 0.6;
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
            x: this.x + this.facing * 25,
            y: this.y - 45,
            vx: this.facing * this.projectileSpeed,
            vy: 0,
            damage: this.damage,
            hit: false,
            life: 3.5
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
        // Outer dark purple glow
        ctx.fillStyle = 'rgba(136, 68, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Middle aura
        ctx.fillStyle = 'rgba(170, 100, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.fill();

        // Bright skull-like core
        ctx.fillStyle = '#eeddff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Trail
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 4; i++) {
            const tx = p.x - p.vx * 0.02 * (i + 1);
            const ty = p.y;
            ctx.fillStyle = `rgba(140, 70, 255, ${0.5 - i * 0.12})`;
            ctx.beginPath();
            ctx.arc(tx, ty, 5 - i, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        let row = 0;
        let frame = 0;

        if (this.isDead) {
            row = 6; // Death (10 frames)
            const progress = Math.min(1, this.deathTimer / 1.1);
            frame = Math.min(9, Math.floor(progress * 10));
        } else if (this.hitStunTime > 0 || this.state === 'hurt') {
            row = 5; // Hurt (5 frames)
            frame = Math.min(4, Math.floor(this.stateTime * 10));
        } else if (this.state === 'attack' || this.isAttacking) {
            row = 2; // Attack1 / Cast (13 frames)
            frame = Math.min(12, Math.floor((this.stateTime / 0.85) * 13));
        } else if (this.state === 'approach' || this.state === 'cooldown' || Math.abs(this.vx) > 10) {
            row = 1; // Move (8 frames)
            frame = Math.floor(this.animTime * 9) % 8;
        } else {
            row = 0; // Idle (8 frames)
            frame = Math.floor(this.animTime * 7) % 8;
        }

        if (!necroLoaded || !necroImg) {
            ctx.fillStyle = '#2a1535';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const cellW = 160;
        const cellH = 128;
        const scale = 1.7;
        const anchorX = 83;
        const anchorY = 115;

        const sx = frame * cellW;
        const sy = row * cellH;
        const dx = -anchorX * scale;
        const dy = -anchorY * scale;
        const dw = cellW * scale;
        const dh = cellH * scale;

        ctx.drawImage(necroImg, sx, sy, cellW, cellH, dx, dy, dw, dh);
    }
}
