/**
 * VALORIA - Goblin Raider
 * Fast chaotic skirmisher with dagger strikes and explosive bomb throwing.
 */

import { Enemy } from './Enemy.js';
import { player, vfxManager, audioManager, camera } from '../main.js';

const GOBLIN_SHEETS = {
    idle: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Goblin/Idle.png', frames: 4, fps: 7 },
    run: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Goblin/Run.png', frames: 8, fps: 12 },
    attack1: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Goblin/Attack.png', frames: 8, fps: 12 },
    attack2: { file: 'Monster_Creatures_Fantasy(Version 1.2)/Monster_Creatures_Fantasy(Version 1.2)/Goblin/Attack2.png', frames: 8, fps: 13 },
    attack3: { file: 'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Attack3.png', frames: 12, fps: 14 },
    hurt: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Goblin/Take Hit.png', frames: 4, fps: 10 },
    death: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Goblin/Death.png', frames: 4, fps: 6 },
    bomb: { file: 'Monster_Creatures_Fantasy(Version 1.3)/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Bomb_sprite.png', frames: 19, fps: 16 }
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

export class GoblinEnemy extends Enemy {
    constructor() {
        super();

        this.name = 'Goblin Raider';
        this.width = 40;
        this.height = 58;

        this.maxHealth = 48;
        this.health = 48;

        this.damage = 14;
        this.attackRange = 50;
        this.attackCooldownMax = 1.3;

        this.aggroRange = 320;
        this.moveSpeed = 135;

        this.attackVariant = 'attack1';
        this.bombs = [];

        for (const cfg of Object.values(GOBLIN_SHEETS)) {
            getImage(cfg.file);
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackHit = false;

        const r = Math.random();
        if (r < 0.4) {
            this.attackVariant = 'attack1';
            this.damage = 13;
        } else if (r < 0.75) {
            this.attackVariant = 'attack2';
            this.damage = 16;
        } else {
            this.attackVariant = 'attack3';
            this.damage = 22;
            // Throw bomb at frame 6
            setTimeout(() => {
                if (!this.isDead) this.throwBomb();
            }, 300);
        }

        audioManager.playSFX('enemy_attack');
    }

    throwBomb() {
        this.bombs.push({
            x: this.x + this.facing * 20,
            y: this.y - 30,
            vx: this.facing * 220 + (Math.random() - 0.5) * 40,
            vy: -180,
            life: 1.0,
            exploded: false
        });
    }

    update(dt) {
        super.update(dt);
        this.updateBombs(dt);
    }

    updateBombs(dt) {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const b = this.bombs[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vy += 600 * dt; // gravity

            if (b.y >= 500) {
                b.y = 500;
                b.vx *= 0.5;
                b.vy = -b.vy * 0.4;
            }

            b.life -= dt;
            if (b.life <= 0 && !b.exploded) {
                b.exploded = true;
                this.explodeBomb(b.x, b.y);
                this.bombs.splice(i, 1);
            }
        }
    }

    explodeBomb(bx, by) {
        vfxManager.createImpact(bx, by, 'sword_impact_heavy');
        vfxManager.flashScreen('#ff4400', 0.15, 0.2);
        camera.shakeLight();

        // Check damage to player
        const dist = Math.hypot(player.x - bx, (player.y - 30) - by);
        if (dist < 80 && !player.isInvulnerable && !player.isDead) {
            player.takeDamage(22, (player.x > bx ? 1 : -1) * 250, -100);
        }
    }

    render(ctx) {
        // Render bombs
        for (const b of this.bombs) {
            this.renderBomb(ctx, b);
        }
        super.render(ctx);
    }

    renderBomb(ctx, b) {
        const sheet = getImage(GOBLIN_SHEETS.bomb.file);
        if (!sheet.loaded) {
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        const cell = 100;
        const frame = Math.floor((1 - b.life) * 19) % 19;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.drawImage(sheet.img, frame * cell, 0, cell, cell, -25, -25, 50, 50);
        ctx.restore();
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 18, 5, 0, 0, Math.PI * 2);
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
            const cfg = GOBLIN_SHEETS[animKey];
            frame = Math.floor(this.stateTime * cfg.fps) % cfg.frames;
        } else if (this.state === 'chase' || Math.abs(this.vx) > 10) {
            animKey = 'run';
            frame = Math.floor(this.animTime * 12) % 8;
        } else {
            animKey = 'idle';
            frame = Math.floor(this.animTime * 7) % 4;
        }

        const cfg = GOBLIN_SHEETS[animKey];
        const sheet = getImage(cfg.file);

        if (!sheet.loaded) {
            ctx.fillStyle = '#4a7030';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const cellW = 150;
        const cellH = 150;
        const scale = 1.35;
        const anchorX = 75;
        const anchorY = 101;

        ctx.drawImage(
            sheet.img,
            frame * cellW, 0, cellW, cellH,
            -anchorX * scale, -anchorY * scale, cellW * scale, cellH * scale
        );
    }
}
