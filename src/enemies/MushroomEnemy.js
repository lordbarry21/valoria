/**
 * VALORIA - Fungal Abomination (Mushroom)
 * Heavy tanky brute with toxic spores, club strikes, and homing spore missiles.
 */

import { Enemy } from './Enemy.js';
import { player, vfxManager, audioManager } from '../main.js';

const MUSHROOM_SHEETS = {
    idle: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Mushroom/Idle.png', frames: 4, fps: 6 },
    run: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Mushroom/Run.png', frames: 8, fps: 10 },
    attack1: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Mushroom/Attack.png', frames: 8, fps: 12 },
    attack2: { file: 'Monster_Creatures_Fantasy(Version 1.2)/Monster_Creatures_Fantasy(Version 1.2)/Mushroom/Attack2.png', frames: 8, fps: 12 },
    attack3: { file: 'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)/Mushroom/Attack3.png', frames: 11, fps: 13 },
    hurt: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Mushroom/Take Hit.png', frames: 4, fps: 10 },
    death: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Mushroom/Death.png', frames: 4, fps: 6 },
    projectile: { file: 'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)/Mushroom/Projectile_sprite.png', frames: 8, fps: 16 }
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

export class MushroomEnemy extends Enemy {
    constructor() {
        super();

        this.name = 'Fungal Abomination';
        this.width = 54;
        this.height = 70;

        this.maxHealth = 110;
        this.health = 110;

        this.damage = 22;
        this.attackRange = 60;
        this.attackCooldownMax = 1.8;

        this.aggroRange = 280;
        this.moveSpeed = 80;

        this.attackVariant = 'attack1';
        this.spores = [];

        this.knockbackResistance = 0.4;
        this.damageTakenMultiplier = 0.8;

        for (const cfg of Object.values(MUSHROOM_SHEETS)) {
            getImage(cfg.file);
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackHit = false;

        const r = Math.random();
        if (r < 0.4) {
            this.attackVariant = 'attack1';
            this.damage = 20;
        } else if (r < 0.75) {
            this.attackVariant = 'attack2';
            this.damage = 24;
        } else {
            this.attackVariant = 'attack3';
            this.damage = 28;
            setTimeout(() => {
                if (!this.isDead) this.shootSpore();
            }, 300);
        }

        audioManager.playSFX('enemy_attack');
    }

    shootSpore() {
        this.spores.push({
            x: this.x + this.facing * 25,
            y: this.y - 35,
            vx: this.facing * 240,
            vy: -40,
            life: 2.2
        });
    }

    update(dt) {
        super.update(dt);
        this.updateSpores(dt);
    }

    updateSpores(dt) {
        for (let i = this.spores.length - 1; i >= 0; i--) {
            const s = this.spores[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= dt;

            const dist = Math.hypot(player.x - s.x, (player.y - 35) - s.y);
            if (dist < 36 && !player.isInvulnerable && !player.isDead) {
                player.takeDamage(20, (player.x > s.x ? 1 : -1) * 200, -80);
                vfxManager.createImpact(s.x, s.y, 'sword_impact_heavy');
                s.life = 0;
            }

            if (s.life <= 0) this.spores.splice(i, 1);
        }
    }

    render(ctx) {
        for (const s of this.spores) {
            this.renderSpore(ctx, s);
        }
        super.render(ctx);
    }

    renderSpore(ctx, s) {
        const sheet = getImage(MUSHROOM_SHEETS.projectile.file);
        if (!sheet.loaded) {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const cell = 50;
        const frame = Math.floor(this.animTime * 16) % 8;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.drawImage(sheet.img, frame * cell, 0, cell, cell, -25, -25, 50, 50);
        ctx.restore();
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        let animKey = 'idle';
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
            const cfg = MUSHROOM_SHEETS[animKey];
            frame = Math.floor(this.stateTime * cfg.fps) % cfg.frames;
        } else if (this.state === 'chase' || Math.abs(this.vx) > 10) {
            animKey = 'run';
            frame = Math.floor(this.animTime * 10) % 8;
        } else {
            animKey = 'idle';
            frame = Math.floor(this.animTime * 6) % 4;
        }

        const cfg = MUSHROOM_SHEETS[animKey];
        const sheet = getImage(cfg.file);

        if (!sheet.loaded) {
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const cellW = 150;
        const cellH = 150;
        const scale = 1.45;
        const anchorX = 75;
        const anchorY = 101;

        ctx.drawImage(
            sheet.img,
            frame * cellW, 0, cellW, cellH,
            -anchorX * scale, -anchorY * scale, cellW * scale, cellH * scale
        );
    }
}
