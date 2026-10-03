/**
 * VALORIA - Flying Eye / Beholder Fiend
 * Aerial monster that commands vertical airspace:
 * - When at long range: hovers high up in the sky and fires aimed plasma energy orbs.
 * - When closing in: swoops down towards the player's body height and executes vicious biting lunges.
 */

import { Enemy } from './Enemy.js';
import { player, vfxManager, audioManager, gameWorld, camera } from '../main.js';

const EYE_SHEETS = {
    flight: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Flying eye/Flight.png', frames: 8, fps: 12 },
    attack1: { file: 'Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/Flying eye/Attack.png', frames: 8, fps: 14 },
    attack2: { file: 'Monster_Creatures_Fantasy(Version 1.2)/Monster_Creatures_Fantasy(Version 1.2)/Flying eye/Attack2.png', frames: 8, fps: 14 },
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
        this.width = 48;
        this.height = 48;

        this.maxHealth = 44;
        this.health = 44;

        this.damage = 16;
        this.attackRange = 65;
        this.attackCooldownMax = 1.3;

        this.aggroRange = 99999;
        this.moveSpeed = 125;

        this.attackVariant = 'attack1';
        this.projectiles = [];

        this.rangedCooldown = 0.5;
        this.meleeCooldown = 0;
        this.flyMode = 'high_ranged'; // 'high_ranged' | 'swoop_melee'

        for (const cfg of Object.values(EYE_SHEETS)) {
            getImage(cfg.file);
        }
    }

    init() {
        super.init();
        this.y = 220; // Spawn airborne
        this.projectiles = [];
        this.rangedCooldown = 0.8;
        this.meleeCooldown = 0;
        this.flyMode = 'high_ranged';
    }

    getHurtbox() {
        return {
            x: this.x - 24,
            y: this.y - 24,
            width: 48,
            height: 48
        };
    }

    getAttackHitbox() {
        if (!this.isAttacking) return null;
        if (this.attackVariant === 'attack3') return null; // Projectile handles its own collision
        // Active bite window during attack1 & attack2 animations
        if (this.stateTime < 0.12 || this.stateTime > 0.38) return null;

        const reach = 55;
        return {
            x: this.facing > 0 ? this.x - 5 : this.x - reach + 5,
            y: this.y - 24,
            width: reach,
            height: 48
        };
    }

    updateAI(dt) {
        if (!player || player.isDead) {
            this.vx = 0;
            this.vy = 0;
            return;
        }

        const dx = player.x - this.x;
        const playerChestY = player.y - player.height * 0.55;
        const dy = playerChestY - this.y;
        const horizontalDist = Math.abs(dx);
        const dirX = dx >= 0 ? 1 : -1;

        if (this.state !== 'attack') {
            this.facing = dirX;
        }

        if (this.rangedCooldown > 0) this.rangedCooldown -= dt;
        if (this.meleeCooldown > 0) this.meleeCooldown -= dt;

        switch (this.state) {
            case 'idle':
            case 'chase': {
                // If far (> 180px) and ranged attack is ready: fly up into the air and shoot plasma ball
                if (horizontalDist > 180 && this.rangedCooldown <= 0) {
                    this.flyMode = 'high_ranged';
                } else if (this.flyMode === 'high_ranged' && this.rangedCooldown <= 0) {
                    if (horizontalDist > 140) {
                        this.startRangedAttack();
                        return;
                    }
                } else {
                    // Otherwise actively swoop down to chase and bite player!
                    this.flyMode = 'swoop_melee';
                }

                if (this.flyMode === 'high_ranged') {
                    // Ascend to high altitude above player (140-160px above player feet)
                    const targetY = Math.max(90, player.y - 150 + Math.sin(this.animTime * 3) * 15);
                    this.y += (targetY - this.y) * 3.5 * dt;

                    // Hover at medium-long range
                    const optimalDist = 240;
                    if (horizontalDist > optimalDist + 30) {
                        this.x += dirX * this.moveSpeed * dt;
                    } else if (horizontalDist < optimalDist - 30) {
                        this.x -= dirX * (this.moveSpeed * 0.7) * dt;
                    }

                    // Fire if ready
                    if (this.rangedCooldown <= 0 && horizontalDist > 140) {
                        this.startRangedAttack();
                    }
                } else {
                    // Swoops down towards player chest/head level
                    const targetY = playerChestY + Math.sin(this.animTime * 4) * 8;
                    this.y += (targetY - this.y) * 4.8 * dt;

                    // Chases horizontally towards player with fast flight speed
                    if (horizontalDist > 50) {
                        this.x += dirX * (this.moveSpeed * 1.4) * dt;
                    }

                    // Once close enough in both axes, bite!
                    if (horizontalDist <= 65 && Math.abs(this.y - playerChestY) <= 45 && this.meleeCooldown <= 0) {
                        this.startMeleeBite();
                    }
                }
                break;
            }

            case 'attack': {
                if (this.attackVariant === 'attack3') {
                    // Ranged eye blast: hover high while charging
                    if (this.stateTime >= 0.22 && !this.attackHit) {
                        this.attackHit = true;
                        this.shootProjectile();
                    }
                    if (this.stateTime >= 0.55) {
                        this.endAttack();
                        // After firing ball, immediately swoop down to chase and bite player!
                        this.flyMode = 'swoop_melee';
                        this.rangedCooldown = 3.0 + Math.random() * 0.8;
                    }
                } else {
                    // Melee Bite (attack1 or attack2):
                    // Lunge forward with jaw snapping
                    if (this.stateTime >= 0.12 && this.stateTime <= 0.35) {
                        this.x += this.facing * 180 * dt;
                    }
                    // Recoil slightly upward & back after bite
                    if (this.stateTime > 0.35 && this.stateTime < 0.5) {
                        this.y -= 50 * dt;
                        this.x -= this.facing * 60 * dt;
                    }
                    if (this.stateTime >= 0.5) {
                        this.endAttack();
                        this.meleeCooldown = 1.3 + Math.random() * 0.5;
                        // 60% chance to retreat back up into the sky to shoot next ball
                        if (Math.random() < 0.6) {
                            this.flyMode = 'high_ranged';
                        }
                    }
                }
                break;
            }

            case 'cooldown': {
                // Hover slightly up to reset
                const targetY = player.y - 120 + Math.sin(this.animTime * 3) * 15;
                this.y += (targetY - this.y) * 3 * dt;
                if (horizontalDist < 100) {
                    this.x -= dirX * 70 * dt;
                }
                if (this.meleeCooldown <= 0 && this.rangedCooldown <= 0) {
                    this.setState('chase');
                }
                break;
            }
        }
    }

    startMeleeBite() {
        this.isAttacking = true;
        this.attackHit = false;
        this.setState('attack');
        this.attackVariant = Math.random() < 0.5 ? 'attack1' : 'attack2';
        this.damage = this.attackVariant === 'attack1' ? 14 : 18;
        audioManager.playSFX('enemy_attack');
    }

    startRangedAttack() {
        this.isAttacking = true;
        this.attackHit = false;
        this.setState('attack');
        this.attackVariant = 'attack3';
        this.damage = 16;
        audioManager.playSFX('enemy_attack');
    }

    endAttack() {
        this.isAttacking = false;
        this.attackHit = false;
        this.setState('idle');
    }

    shootProjectile() {
        if (this.isDead || !player) return;

        const targetX = player.x;
        const targetY = player.y - player.height * 0.55;
        const spawnX = this.x + this.facing * 24;
        const spawnY = this.y - 4;

        const angle = Math.atan2(targetY - spawnY, targetX - spawnX);
        const speed = 290;

        this.projectiles.push({
            x: spawnX,
            y: spawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 3.0
        });

        audioManager.playSFX('enemy_attack');
        vfxManager.createImpact(spawnX, spawnY, 'sword_impact_light');
    }

    update(dt) {
        super.update(dt);
        this.updateProjectiles(dt);

        if (this.isDead) {
            // Drop down to nearest ground/platform on death
            this.vy += 650 * dt;
            this.y += this.vy * dt;
            let groundY = gameWorld?.floorY || 500;
            if (gameWorld?.platforms) {
                for (const plat of gameWorld.platforms) {
                    if (this.x >= plat.x && this.x <= plat.x + plat.width && plat.y >= this.y && plat.y < groundY) {
                        groundY = plat.y;
                    }
                }
            }
            if (this.y >= groundY - 10) {
                this.y = groundY - 10;
                this.vy = 0;
            }
        }
    }

    takeDamage(amount, knockbackForce, hitStun, direction) {
        if (this.isDead) return;
        super.takeDamage(amount, knockbackForce, hitStun, direction);
        // Flinch slightly upward when struck in air
        this.y -= 12;
    }

    updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Ground / arena collision
            const groundY = gameWorld?.floorY || 500;
            if (p.y >= groundY || p.x < 0 || p.x > (gameWorld?.arenaWidth || 2600)) {
                vfxManager.createImpact(p.x, Math.min(p.y, groundY), 'sword_impact_light');
                this.projectiles.splice(i, 1);
                continue;
            }

            // Player hit check
            const playerHurtbox = {
                x: player.x - player.width / 2,
                y: player.y - player.height,
                width: player.width,
                height: player.height
            };
            const projBox = {
                x: p.x - 14,
                y: p.y - 14,
                width: 28,
                height: 28
            };

            const hitsPlayer = (
                projBox.x < playerHurtbox.x + playerHurtbox.width &&
                projBox.x + projBox.width > playerHurtbox.x &&
                projBox.y < playerHurtbox.y + playerHurtbox.height &&
                projBox.y + projBox.height > playerHurtbox.y
            );

            if (hitsPlayer && !player.isInvulnerable && !player.isDead) {
                player.takeDamage(16, Math.sign(p.vx) * 160, -70);
                vfxManager.createImpact(p.x, p.y, 'sword_impact_heavy');
                audioManager.playSFX('sword_impact_heavy');
                camera.shakeLight();
                this.projectiles.splice(i, 1);
                continue;
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
        ctx.save();
        ctx.translate(p.x, p.y);

        // Radiant purple plasma glow
        const glowGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
        glowGradient.addColorStop(0, 'rgba(192, 132, 252, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.4)');
        glowGradient.addColorStop(1, 'rgba(147, 51, 234, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        if (sheet.loaded) {
            const cell = 48;
            const frame = Math.floor(this.animTime * 16) % 8;
            ctx.drawImage(sheet.img, frame * cell, 0, cell, cell, -24, -24, 48, 48);
        } else {
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawBody(ctx) {
        ctx.imageSmoothingEnabled = false;

        // Shadow positioned on closest ground / platform beneath eye
        let groundY = gameWorld?.floorY || 500;
        if (gameWorld?.platforms) {
            for (const plat of gameWorld.platforms) {
                if (this.x >= plat.x && this.x <= plat.x + plat.width && plat.y >= this.y && plat.y < groundY) {
                    groundY = plat.y;
                }
            }
        }
        const alt = Math.max(8, groundY - this.y);
        const shadowScale = Math.max(0.25, 1 - alt / 280);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, groundY - this.y, 22 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
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
            animKey = this.attackVariant || 'attack1';
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
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
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
