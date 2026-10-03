/**
 * VALORIA - Malakar, The Fallen Knight (Final Boss)
 * Climax boss with heavy armor, parry shield, fast 3-hit sword combos, and dark shockwaves.
 */

import { Enemy } from './Enemy.js';
import { player, vfxManager, audioManager, camera } from '../main.js';

const BOSS_SHEETS = {
    idle: { file: 'Knight-villain-boss/noBKG_KnightIdle_strip.png', cellW: 64, cellH: 64, frames: 15, fps: 12, anchorX: 35, anchorY: 44 },
    run: { file: 'Knight-villain-boss/noBKG_KnightRun_strip.png', cellW: 64, cellH: 64, frames: 12, fps: 14, anchorX: 35, anchorY: 44 },
    attack: { file: 'Knight-villain-boss/noBKG_KnightAttack_strip.png', cellW: 144, cellH: 64, frames: 22, fps: 15, anchorX: 60, anchorY: 44 },
    shield: { file: 'Knight-villain-boss/noBKG_KnightShield_strip.png', cellW: 96, cellH: 64, frames: 7, fps: 10, anchorX: 45, anchorY: 44 },
    death: { file: 'Knight-villain-boss/noBKG_KnightDeath_strip.png', cellW: 72, cellH: 64, frames: 20, fps: 8, anchorX: 36, anchorY: 44 }
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

export class BossKnight extends Enemy {
    constructor() {
        super();

        this.name = 'Malakar, The Fallen Knight';
        this.isBoss = true;
        this.width = 54;
        this.height = 80;

        this.maxHealth = 350;
        this.health = 350;

        this.damage = 28;
        this.attackRange = 75;
        this.attackCooldownMax = 1.6;

        this.aggroRange = 400;
        this.moveSpeed = 120;

        this.damageTakenMultiplier = 0.6;
        this.knockbackResistance = 0.2;
        this.hitStunMultiplier = 0.3;

        this.isBlocking = false;
        this.comboStep = 1;

        for (const cfg of Object.values(BOSS_SHEETS)) {
            getImage(cfg.file);
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackHit = false;

        // Lunge forward during attack
        this.vx = this.facing * 140;
        audioManager.playSFX('sword_swing_heavy');

        // Dark shockwave at climax of combo
        setTimeout(() => {
            if (!this.isDead) {
                vfxManager.createImpact(this.x + this.facing * 50, this.y - 30, 'sword_impact_heavy');
                camera.shakeMedium();
            }
        }, 500);
    }

    takeDamage(amount, knockbackForce, hitStun, direction) {
        // Boss parry chance
        if (!this.isDead && Math.random() < 0.22 && !this.isAttacking) {
            this.isBlocking = true;
            this.setState('idle');
            amount *= 0.2; // 80% damage reduction
            audioManager.playSFX('sword_impact_metal');
            vfxManager.createImpact(this.x + this.facing * 20, this.y - 40, 'sword_impact_metal');
            camera.shakeLight();
            setTimeout(() => { this.isBlocking = false; }, 500);
        }

        super.takeDamage(amount, knockbackForce, hitStun, direction);
    }

    render(ctx) {
        super.render(ctx);
        this.renderBossHealthBar(ctx);
    }

    renderBossHealthBar(ctx) {
        if (this.isDead) return;

        // Render epic grand boss health bar in screen space
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform to screen coordinates

        const cWidth = ctx.canvas.width;
        const barW = Math.min(500, cWidth * 0.7);
        const barH = 16;
        const bx = (cWidth - barW) / 2;
        const by = 48;

        // Boss Name Header
        ctx.font = 'bold 15px "Cinzel", serif';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.fillText('MALAKAR, THE FALLEN KNIGHT', cWidth / 2, by - 8);

        // Bar frame
        ctx.fillStyle = '#0a0808';
        ctx.fillRect(bx - 3, by - 3, barW + 6, barH + 6);

        // Bar fill
        const healthPct = Math.max(0, this.health / this.maxHealth);
        const grad = ctx.createLinearGradient(bx, by, bx, by + barH);
        grad.addColorStop(0, '#e11d48');
        grad.addColorStop(0.5, '#be123c');
        grad.addColorStop(1, '#881337');
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, barW * healthPct, barH);

        // Metallic border
        ctx.strokeStyle = '#c9a227';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 2, by - 2, barW + 4, barH + 4);

        ctx.restore();
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 2, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        let animKey = 'idle';
        let frame = 0;

        if (this.isDead) {
            animKey = 'death';
            const progress = Math.min(1, this.deathTimer / 1.4);
            frame = Math.min(19, Math.floor(progress * 20));
        } else if (this.isBlocking) {
            animKey = 'shield';
            frame = Math.min(6, Math.floor(this.stateTime * 10));
        } else if (this.isAttacking || this.state === 'attack') {
            animKey = 'attack';
            frame = Math.min(21, Math.floor(this.stateTime * 15));
        } else if (this.state === 'chase' || Math.abs(this.vx) > 10) {
            animKey = 'run';
            frame = Math.floor(this.animTime * 14) % 12;
        } else {
            animKey = 'idle';
            frame = Math.floor(this.animTime * 12) % 15;
        }

        const cfg = BOSS_SHEETS[animKey];
        const sheet = getImage(cfg.file);

        if (!sheet.loaded) {
            ctx.fillStyle = '#2a1a20';
            ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);
            return;
        }

        const scale = 2.2;
        const cellW = cfg.cellW;
        const cellH = cfg.cellH;
        const anchorX = cfg.anchorX;
        const anchorY = cfg.anchorY;

        ctx.drawImage(
            sheet.img,
            frame * cellW, 0, cellW, cellH,
            -anchorX * scale, -anchorY * scale, cellW * scale, cellH * scale
        );
    }
}
