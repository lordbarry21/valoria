/**
 * VALORIA - Wraith Soldier / Dire Rat Enemy
 * Fast agile ground melee enemy using the animated Rat sprite pack.
 */

import { Enemy } from './Enemy.js';

const RAT_SHEETS = {
    idle: { file: 'Rat/OutlinedRat/rat-idle-outline.png', frames: 6, fps: 8 },
    run: { file: 'Rat/OutlinedRat/rat-run-outline.png', frames: 6, fps: 12 },
    attack: { file: 'Rat/OutlinedRat/rat-attack-outline.png', frames: 6, fps: 12 },
    hurt: { file: 'Rat/OutlinedRat/rat-hurt-outline.png', frames: 1, fps: 1 },
    death: { file: 'Rat/OutlinedRat/rat-death-outline.png', frames: 6, fps: 8 },
};

// Static cache so we don't recreate images per instance
const ratImageCache = {};
let ratPreloadStarted = false;

function preloadRatSprites() {
    if (ratPreloadStarted) return;
    ratPreloadStarted = true;
    for (const [k, v] of Object.entries(RAT_SHEETS)) {
        const img = new Image();
        img.src = v.file;
        ratImageCache[k] = { image: img, loaded: false, frames: v.frames, fps: v.fps };
        img.onload = () => { ratImageCache[k].loaded = true; };
    }
}

export class WraithSoldier extends Enemy {
    constructor() {
        super();

        this.name = 'Plague Hound';
        this.width = 44;
        this.height = 30;

        // Health
        this.maxHealth = 40;
        this.health = 40;

        // Combat
        this.damage = 12;
        this.attackRange = 45;
        this.attackCooldownMax = 1.2;

        // AI
        this.aggroRange = 280;
        this.moveSpeed = 130;

        preloadRatSprites();
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        let animName = 'idle';
        let frame = 0;

        if (this.isDead) {
            animName = 'death';
            const progress = Math.min(1, this.deathTimer / 0.8);
            frame = Math.min(5, Math.floor(progress * 6));
        } else if (this.hitStunTime > 0 || this.state === 'hurt') {
            animName = 'hurt';
            frame = 0;
        } else if (this.isAttacking || this.state === 'attack') {
            animName = 'attack';
            frame = Math.floor(this.stateTime * 12) % 6;
        } else if (this.state === 'chase' || Math.abs(this.vx) > 10) {
            animName = 'run';
            frame = Math.floor(this.animTime * 12) % 6;
        } else {
            animName = 'idle';
            frame = Math.floor(this.animTime * 8) % 6;
        }

        const sheet = ratImageCache[animName];
        if (!sheet || !sheet.loaded) {
            // Crisp placeholder while loading
            ctx.fillStyle = this.isAggro ? '#5a1010' : '#302020';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const cellW = 32;
        const cellH = 32;
        const scale = 2.0;
        const anchorX = 16;
        const anchorY = 32;

        const sx = frame * cellW;
        const sy = 0;
        const dx = -anchorX * scale;
        const dy = -anchorY * scale;
        const dw = cellW * scale;
        const dh = cellH * scale;

        ctx.drawImage(sheet.image, sx, sy, cellW, cellH, dx, dy, dw, dh);
    }
}
