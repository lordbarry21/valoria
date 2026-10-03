/**
 * VALORIA - Flying Eye / Beholder Fiend
 * Aerial ranged monster with swooping bites, laser gaze, and plasma projectiles.
 */

import { Enemy } from './Enemy.js';
import { player, vfxManager, audioManager } from '../main.js';

const EYE_SHEETS = {
    flight: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Flying eye/Flight.png', frames: 8, fps: 12 },
    attack1: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Flying eye/Attack.png', frames: 8, fps: 12 },
    attack2: { file: 'Monster_Creatures_Fantasy(Version 1.2)/Monster_Creatures_Fantasy(Version 1.2)/Flying eye/Attack2.png', frames: 8, fps: 12 },
    attack3: { file: 'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)/Flying eye/Attack3.png', frames: 6, fps: 10 },
    hurt: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Flying eye/Take Hit.png', frames: 4, fps: 10 },
    death: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Flying eye/Death.png', frames: 4, fps: 6 },
    projectile: { file: 'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)/Flying eye/projectile_sprite.png', frames: 8, fps: 16 }
};

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

export class FlyingEyeEnemy extends Enemy {
    constructor() {
        super();

        this.name = 'Beholder Fiend';
        this.width = 45;
        this.height = 45;

        this.maxHealth = 42;
        this.health = 42;

        this.damage = 15;
        this.attackRange = 280;
        this.attackCooldownMax = 2.0;

        this.aggroRange = 360;
        this.moveSpeed = 110;

        this.hoverHeight = 120 + Math.random() * 50;
        this.attackVariant = 'attack1';
        this.projectiles = [];

        for (const cfg of Object.values(EYE_SHEETS)) {
            getImage(cfg.file);
        }
    }

    init() {
        super.init();
        this.y = 500 - this.hoverHeight;
        this.projectiles = [];
    }

    update(dt) {
        super.update(dt);
        this.updateProjectiles(dt);

        if (!this.isDead) {
            // Hover bob
            const targetY = 500 - this.hoverHeight + Math.sin(this.animTime * 3) * 15;
            this.y += (targetY - this.y) * 4 * dt;
        } else {
            // Falling on death
            this.vy += 600 * dt;
            this.y += this.vy * dt;
            if (this.y >= 500) this.y = 500;
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackHit = false;

        const r = Math.random();
        if (r < 0.35) {
            this.attackVariant = 'attack1';
            this.damage = 16;
            // Swoop forward
            this.vx = this.facing * 160;
        } else if (r < 0.7) {
            this.attackVariant = 'attack2';
            this.damage = 18;
        } else {
            this.attackVariant = 'attack3';
            this.damage = 20;
            // Fire plasma orb at frame 3
            setTimeout(() => {
                if (!this.isDead) this.shootProjectile();
            }, 250);
        }

        audioManager.playSFX('enemy_attack');
    }

    shootProjectile() {
        this.projectiles.push({
            x: this.x + this.facing * 25,
            y: this.y - 10,
            vx: this.facing * 280,
            vy: 0,
            life: 2.5
        });
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Collision with player
            const dist = Math.hypot(player.x - p.x, (player.y - 35) - p.y);
            if (dist < 32 && !player.isInvulnerable && !player.isDead) {
                player.takeDamage(18, (player.x > p.x ? 1 : -1) * 180, -60);
                vfxManager.createImpact(p.x, p.y, 'sword_impact_heavy');
                p.life = 0;
            }

            if (p.life <= 0) this.projectiles.splice(i, 1);
        }
    }

    render(ctx) {
        for (const p of this.projectiles) {
            this.renderProjectile(ctx, p);
        }
        super.render(ctx);
    }

    renderProjectile(ctx, p) {
        const sheet = getImage(EYE_SHEETS.projectile.file);
        if (!sheet.loaded) {
            ctx.fillStyle = '#8844ff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const cell = 48;
        const frame = Math.floor(this.animTime * 16) % 8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.drawImage(sheet.img, frame * cell, 0, cell, cell, -24, -24, 48, 48);
        ctx.restore();
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Shadow scaled by altitude
        const alt = Math.max(10, 500 - this.y);
        const shadowScale = Math.max(0.4, 1 - alt / 250);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 500 - this.y, 18 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        let animKey = 'flight';
        let frame = 0;

        if (this.isDead) {
            animKey = 'death';
            const progress = Math.min(1, this.deathTimer / 0.8);
            frame = Math.min(3, Math.floor(progress * 4));
        } else if (this.hitStunTime > 0 || this.state === 'hurt') {
            animKey = 'hurt';
            frame = Math.min(3, Math.floor(this.stateTime * 10));
        } else if (this.isAttacking || this.state === 'attack') {
            animKey = this.attackVariant;
            const cfg = EYE_SHEETS[animKey];
            frame = Math.floor(this.stateTime * cfg.fps) % cfg.frames;
        } else {
            animKey = 'flight';
            frame = Math.floor(this.animTime * 12) % 8;
        }

        const cfg = EYE_SHEETS[animKey];
        const sheet = getImage(cfg.file);

        if (!sheet.loaded) {
            ctx.fillStyle = '#9b59b6';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const cellW = 150;
        const cellH = 150;
        const scale = 1.35;
        const anchorX = 75;
        const anchorY = 75;

        ctx.drawImage(
            sheet.img,
            frame * cellW, 0, cellW, cellH,
            -anchorX * scale, -anchorY * scale, cellW * scale, cellH * scale
        );
    }
}
