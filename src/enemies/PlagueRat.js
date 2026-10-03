/**
 * VALORIA - Plague Rat Swarm Enemy
 * Fast, low-profile scurrying pack monster using the OutlinedRat pixel-art sprite sheets.
 */

import { Enemy } from './Enemy.js';
import { player, audioManager, vfxManager } from '../main.js';

const RAT_SHEETS = {
    idle: { file: 'Rat/OutlinedRat/rat-idle-outline.png', frames: 6, fps: 8 },
    run: { file: 'Rat/OutlinedRat/rat-run-outline.png', frames: 6, fps: 14 },
    attack: { file: 'Rat/OutlinedRat/rat-attack-outline.png', frames: 6, fps: 12 },
    hurt: { file: 'Rat/OutlinedRat/rat-hurt-outline.png', frames: 1, fps: 1 },
    death: { file: 'Rat/OutlinedRat/rat-death-outline.png', frames: 6, fps: 8 },
};

const ratImageCache = {};
let ratPreloadDone = false;

function preloadRatSprites() {
    if (ratPreloadDone) return;
    ratPreloadDone = true;
    for (const [key, cfg] of Object.entries(RAT_SHEETS)) {
        const img = new Image();
        img.src = cfg.file;
        ratImageCache[key] = { img, loaded: false, frames: cfg.frames, fps: cfg.fps };
        img.onload = () => { ratImageCache[key].loaded = true; };
    }
}

export class PlagueRat extends Enemy {
    constructor() {
        super();

        this.name = 'Plague Rat';
        this.width = 36;
        this.height = 24;

        this.maxHealth = 28;
        this.health = 28;

        this.damage = 9;
        this.attackRange = 40;
        this.attackCooldownMax = 0.9;

        this.aggroRange = 360;
        this.moveSpeed = 160; // Fast scurrying swarm

        this.damageTakenMultiplier = 1.25;
        this.knockbackResistance = 0.6;
        this.hitStunMultiplier = 1.1;

        preloadRatSprites();
    }

    startAttack() {
        this.isAttacking = true;
        this.attackHit = false;
        this.setState('attack');
        audioManager.playSFX('enemy_attack');
    }

    update(dt) {
        super.update(dt);

        if (this.isDead || this.hitStunTime > 0) return;

        // Leap bite attack window
        if (this.isAttacking) {
            const attackTime = this.stateTime;
            if (attackTime >= 0.2 && attackTime <= 0.4 && !this.attackHit) {
                const dist = Math.abs(player.x - this.x);
                if (dist < 46 && Math.abs(player.y - this.y) < 30) {
                    this.attackHit = true;
                    player.takeDamage(this.damage, this.facing * 120, -50);
                    vfxManager.createImpact(player.x, player.y - 20, 'sword_impact_light');
                }
            }
            if (attackTime >= 0.5) {
                this.isAttacking = false;
                this.attackCooldown = this.attackCooldownMax;
                this.setState('idle');
            }
        }
    }

    drawBody(ctx) {
        let animKey = 'idle';
        if (this.isDead) animKey = 'death';
        else if (this.hitStunTime > 0) animKey = 'hurt';
        else if (this.isAttacking) animKey = 'attack';
        else if (Math.abs(this.vx) > 10) animKey = 'run';

        const cfg = RAT_SHEETS[animKey];
        const cache = ratImageCache[animKey];

        if (!cache || !cache.loaded) {
            ctx.fillStyle = '#4a3b32';
            ctx.fillRect(-18, -20, 36, 20);
            return;
        }

        const totalFrames = cfg.frames;
        let frame = 0;
        if (this.isDead) {
            frame = Math.min(totalFrames - 1, Math.floor(this.deathTimer * cfg.fps));
        } else if (this.hitStunTime > 0) {
            frame = 0;
        } else {
            frame = Math.floor(this.animTime * cfg.fps) % totalFrames;
        }

        const frameW = 32;
        const frameH = 32;
        const scale = 1.5;
        const dw = frameW * scale;
        const dh = frameH * scale;

        // Shadow under small rat
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            cache.img,
            frame * frameW, 0, frameW, frameH,
            -dw / 2, -dh + 4, dw, dh
        );
    }
}
