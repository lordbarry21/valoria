/**
 * VALORIA - Skeleton Warrior
 * Armed undead swordsman with shield block and 3 attack variations across all asset versions.
 */

import { Enemy } from './Enemy.js';
import { player, vfxManager, audioManager } from '../main.js';

const SKELETON_SHEETS = {
    idle: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Skeleton/Idle.png', frames: 4, fps: 6 },
    run: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Skeleton/Walk.png', frames: 4, fps: 8 },
    attack1: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Skeleton/Attack.png', frames: 8, fps: 12 },
    attack2: { file: 'Monster_Creatures_Fantasy(Version 1.2)/Monster_Creatures_Fantasy(Version 1.2)/Skeleton/Attack2.png', frames: 8, fps: 12 },
    attack3: { file: 'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)/Skeleton/Attack3.png', frames: 6, fps: 10 },
    shield: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Skeleton/Shield.png', frames: 4, fps: 8 },
    hurt: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Skeleton/Take Hit.png', frames: 4, fps: 10 },
    death: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Skeleton/Death.png', frames: 4, fps: 6 },
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

export class SkeletonEnemy extends Enemy {
    constructor() {
        super();

        this.name = 'Skeleton Warrior';
        this.width = 44;
        this.height = 68;

        this.maxHealth = 65;
        this.health = 65;

        this.damage = 16;
        this.attackRange = 55;
        this.attackCooldownMax = 1.4;

        this.aggroRange = 280;
        this.moveSpeed = 100;

        this.attackVariant = 'attack1';
        this.isBlocking = false;

        // Preload
        for (const cfg of Object.values(SKELETON_SHEETS)) {
            getImage(cfg.file);
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackHit = false;

        // Randomly choose attack variation from version 1.0, 1.2, or 1.3
        const r = Math.random();
        if (r < 0.4) {
            this.attackVariant = 'attack1';
            this.damage = 15;
        } else if (r < 0.75) {
            this.attackVariant = 'attack2';
            this.damage = 19;
        } else {
            this.attackVariant = 'attack3';
            this.damage = 25;
            // Leap forward on heavy execute attack
            this.vx = this.facing * 180;
        }

        audioManager.playSFX('enemy_attack');
    }

    takeDamage(amount, knockbackForce, hitStun, direction) {
        // Chance to block with bone shield
        if (!this.isDead && Math.random() < 0.25 && !this.isAttacking) {
            this.isBlocking = true;
            this.setState('idle');
            amount *= 0.3; // 70% damage reduction
            audioManager.playSFX('sword_impact_metal');
            vfxManager.createImpact(this.x, this.y - 35, 'sword_impact_metal');
            setTimeout(() => { this.isBlocking = false; }, 400);
        }

        super.takeDamage(amount, knockbackForce, hitStun, direction);
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        let animKey = 'idle';
        let frame = 0;

        if (this.isDead) {
            animKey = 'death';
            const progress = Math.min(1, this.deathTimer / 0.8);
            frame = Math.min(3, Math.floor(progress * 4));
        } else if (this.isBlocking) {
            animKey = 'shield';
            frame = Math.min(3, Math.floor(this.stateTime * 8));
        } else if (this.hitStunTime > 0 || this.state === 'hurt') {
            animKey = 'hurt';
            frame = Math.min(3, Math.floor(this.stateTime * 10));
        } else if (this.isAttacking || this.state === 'attack') {
            animKey = this.attackVariant;
            const cfg = SKELETON_SHEETS[animKey];
            frame = Math.floor(this.stateTime * cfg.fps) % cfg.frames;

            // Attack VFX
            if (frame === 4 && this.attackVariant === 'attack3') {
                vfxManager.createDust(this.x + this.facing * 30, this.y);
            }
        } else if (this.state === 'chase' || Math.abs(this.vx) > 10) {
            animKey = 'run';
            frame = Math.floor(this.animTime * 8) % 4;
        } else {
            animKey = 'idle';
            frame = Math.floor(this.animTime * 6) % 4;
        }

        const cfg = SKELETON_SHEETS[animKey];
        const sheet = getImage(cfg.file);

        if (!sheet.loaded) {
            ctx.fillStyle = '#b0a89a';
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
