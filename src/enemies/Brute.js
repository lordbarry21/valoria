/**
 * VALORIA - Brute / Dread Gargoyle Enemy
 * Heavy aerial tank using the animated Dark Fantasy Bat with VFX pack.
 */

import { Enemy } from './Enemy.js';

const BAT_SHEETS = {
    idle: { file: 'DarkFantasyEnemies_FREE/DarkFantasyEnemies_FREE/Bat/Bat with VFX/Bat-IdleFly.png', frames: 9, fps: 10 },
    run: { file: 'DarkFantasyEnemies_FREE/DarkFantasyEnemies_FREE/Bat/Bat with VFX/Bat-Run.png', frames: 8, fps: 12 },
    attack: { file: 'DarkFantasyEnemies_FREE/DarkFantasyEnemies_FREE/Bat/Bat with VFX/Bat-Attack1.png', frames: 8, fps: 10 },
    attack2: { file: 'DarkFantasyEnemies_FREE/DarkFantasyEnemies_FREE/Bat/Bat with VFX/Bat-Attack2.png', frames: 11, fps: 12 },
    hurt: { file: 'DarkFantasyEnemies_FREE/DarkFantasyEnemies_FREE/Bat/Bat with VFX/Bat-Hurt.png', frames: 5, fps: 10 },
    death: { file: 'DarkFantasyEnemies_FREE/DarkFantasyEnemies_FREE/Bat/Bat with VFX/Bat-Die.png', frames: 12, fps: 10 },
};

const batImageCache = {};
let batPreloadStarted = false;

function preloadBatSprites() {
    if (batPreloadStarted) return;
    batPreloadStarted = true;
    for (const [k, v] of Object.entries(BAT_SHEETS)) {
        const img = new Image();
        img.src = v.file;
        batImageCache[k] = { image: img, loaded: false, frames: v.frames, fps: v.fps };
        img.onload = () => { batImageCache[k].loaded = true; };
    }
}

export class Brute extends Enemy {
    constructor() {
        super();

        this.name = 'Dread Gargoyle';
        this.width = 60;
        this.height = 85;

        // Health - much higher
        this.maxHealth = 120;
        this.health = 120;

        // Combat - slower but harder hits
        this.damage = 25;
        this.attackRange = 70;
        this.attackCooldownMax = 2.0;

        // AI - slower
        this.aggroRange = 220;
        this.moveSpeed = 75;

        // Resistance
        this.damageTakenMultiplier = 0.7;
        this.knockbackResistance = 0.3;
        this.hitStunMultiplier = 0.5;

        preloadBatSprites();
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        const t = this.animTime;
        // Floating hover motion
        const hoverY = this.isDead ? 0 : Math.sin(t * 3.5) * 6 - 8;

        // Dark ground shadow that scales with hover
        const shadowScale = this.isDead ? 0.5 : 1 + Math.sin(t * 3.5) * 0.1;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 28 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        let animName = 'idle';
        let frame = 0;

        if (this.isDead) {
            animName = 'death';
            const progress = Math.min(1, this.deathTimer / 1.1);
            frame = Math.min(11, Math.floor(progress * 12));
        } else if (this.hitStunTime > 0 || this.state === 'hurt') {
            animName = 'hurt';
            frame = Math.min(4, Math.floor(this.stateTime * 10));
        } else if (this.isAttacking || this.state === 'attack') {
            animName = 'attack';
            frame = Math.floor(this.stateTime * 10) % 8;
        } else if (this.state === 'chase' || Math.abs(this.vx) > 10) {
            animName = 'run';
            frame = Math.floor(this.animTime * 12) % 8;
        } else {
            animName = 'idle';
            frame = Math.floor(this.animTime * 10) % 9;
        }

        const sheet = batImageCache[animName];
        if (!sheet || !sheet.loaded) {
            ctx.fillStyle = '#3a2030';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const cellW = 64;
        const cellH = 64;
        const scale = 2.2;
        const anchorX = 32;
        const anchorY = 46;

        const sx = frame * cellW;
        const sy = 0;
        const dx = -anchorX * scale;
        const dy = (-anchorY * scale) + hoverY;
        const dw = cellW * scale;
        const dh = cellH * scale;

        ctx.drawImage(sheet.image, sx, sy, cellW, cellH, dx, dy, dw, dh);
    }
}
