/**
 * VALORIA - Combat System
 * Centralized damage, hitbox/hurtbox, and hit reaction handling
 */

import { player, enemyManager, vfxManager, camera, audioManager } from '../main.js';

export class CombatSystem {
    constructor() {
        // Active hitboxes
        this.activeHitboxes = [];
        this.healthOrbs = [];

        // Damage types
        this.damageTypes = {
            PHYSICAL: 'physical',
            HEAVY: 'heavy',
            ABILITY: 'ability'
        };
    }

    init() {
        this.activeHitboxes = [];
        this.healthOrbs = [];
    }

    update(dt) {
        if (player.isDead) return;
        this.checkPlayerAttacks();
        this.checkEnemyAttacks();
        this.updateHealthOrbs(dt);
    }

    spawnHealthOrb(x, y, healAmount = 25) {
        this.healthOrbs.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 80,
            vy: -180 - Math.random() * 80,
            healAmount,
            life: 14.0,
            maxLife: 14.0,
            pulseTimer: 0
        });
    }

    updateHealthOrbs(dt) {
        if (!this.healthOrbs || this.healthOrbs.length === 0) return;

        const floorY = 500;

        for (let i = this.healthOrbs.length - 1; i >= 0; i--) {
            const orb = this.healthOrbs[i];
            orb.life -= dt;
            orb.pulseTimer = (orb.pulseTimer || 0) + dt;

            if (orb.life <= 0) {
                this.healthOrbs.splice(i, 1);
                continue;
            }

            // Physics
            orb.vy += 650 * dt;
            orb.x += orb.vx * dt;
            orb.y += orb.vy * dt;

            // Bounce on ground
            if (orb.y >= floorY - 8) {
                orb.y = floorY - 8;
                orb.vy = -orb.vy * 0.45;
                orb.vx *= 0.85;
                if (Math.abs(orb.vy) < 25) orb.vy = 0;
            }

            // Player magnet pull
            if (player && !player.isDead) {
                const dx = player.x - orb.x;
                const dy = (player.y - player.height * 0.5) - orb.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 170) {
                    const speed = 420 + (170 - dist) * 3;
                    orb.vx += (dx / dist) * speed * dt;
                    orb.vy += (dy / dist) * speed * dt;
                }

                // Collect
                if (dist < 38) {
                    player.heal(orb.healAmount);
                    audioManager?.playSFX?.('ui_click');
                    vfxManager?.createHealGlow?.(player);
                    this.healthOrbs.splice(i, 1);
                }
            }
        }
    }

    render(ctx) {
        if (!this.healthOrbs || this.healthOrbs.length === 0) return;

        ctx.save();
        for (const orb of this.healthOrbs) {
            const alpha = Math.min(1, orb.life / 0.5);
            const pulse = 1 + Math.sin(orb.pulseTimer * 8) * 0.15;
            const radius = (orb.healAmount >= 50 ? 9 : 7) * pulse;

            // Outer glow
            ctx.shadowColor = '#ff2244';
            ctx.shadowBlur = 14;

            // Glowing orb body
            const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius);
            grad.addColorStop(0, `rgba(255, 230, 240, ${alpha})`);
            grad.addColorStop(0.4, `rgba(255, 40, 80, ${alpha * 0.95})`);
            grad.addColorStop(1, `rgba(160, 0, 40, ${alpha * 0.4})`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner sparkle
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(orb.x - radius * 0.25, orb.y - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    getPlayerHitbox() {
        const attack = player.currentAttack;
        if (!attack) return null;

        const isKnightRaging = player.isRaging && player.characterId === 'knight' && attack.id !== 'valoria_rage_blast';
        if (isKnightRaging) {
            // Massive extended flame cleave range during Ultimate
            const extendedWidth = attack.hitbox.width * 2.2 + 80;
            const extendedHeight = Math.max(attack.hitbox.height * 1.8, 110);
            const reachForward = attack.hitbox.x + 60;
            return {
                x: player.x + player.facing * reachForward - extendedWidth / 2,
                y: player.y + attack.hitbox.y - 25,
                width: extendedWidth,
                height: extendedHeight
            };
        }

        return {
            x: player.x + player.facing * attack.hitbox.x - attack.hitbox.width / 2,
            y: player.y + attack.hitbox.y,
            width: attack.hitbox.width,
            height: attack.hitbox.height
        };
    }

    checkPlayerAttacks() {
        if (player.stateMachine.attackPhase !== 'active') return;

        const hitboxWorld = this.getPlayerHitbox();
        if (!hitboxWorld) return;

        const attack = player.currentAttack;

        for (const enemy of enemyManager.enemies) {
            if (enemy.isDead) continue;
            if (player.attackHitEnemies.has(enemy)) continue;
            if (!this.boxCollision(hitboxWorld, enemy.getHurtbox())) continue;

            player.attackHitEnemies.add(enemy);
            this.applyDamageToEnemy(enemy, attack);
            this.triggerHitFeedback(attack, enemy);
            player.gainRage(attack.rageGain || 12);

            if (enemy.isDead) {
                player.gainRage(15);
                // Sir Roland passive: Soul Siphon on kill (+12 HP)
                if (player.characterId === 'knight') {
                    player.heal(12);
                }
                // Health Orb drop chance (45% normal, 100% elite/boss)
                const isElite = enemy.maxHealth >= 120;
                if (Math.random() < (isElite ? 1.0 : 0.45)) {
                    this.spawnHealthOrb(enemy.x, enemy.y - 20, isElite ? 50 : 25);
                }
            }

            // Sir Roland Ultimate: Fire Aspect (Burn) & Lifesteal
            if (player.characterId === 'knight' && (player.isRaging || attack.id === 'valoria_rage_blast')) {
                // Lifesteal on hit (+4 HP)
                player.heal(4);

                // Apply Fire Aspect (Burn) to surviving enemies
                if (!enemy.isDead && typeof enemy.applyBurn === 'function') {
                    enemy.applyBurn(3.5, 4);
                }
            }

            // Blonde hero passive: Solar blessing heals on hit
            if (player.characterId === 'blonde') {
                player.heal(2);
            }
        }
    }

    checkEnemyAttacks() {
        for (const enemy of enemyManager.enemies) {
            if (enemy.isDead || !enemy.isAttacking || enemy.attackHit) continue;
            if (player.isInvulnerable) return;

            const attackBox = enemy.getAttackHitbox();
            if (!attackBox) continue;

            const playerHurtbox = {
                x: player.x - player.width / 2,
                y: player.y - player.height,
                width: player.width,
                height: player.height
            };

            if (this.boxCollision(attackBox, playerHurtbox)) {
                enemy.attackHit = true;
                this.applyDamageToPlayer(enemy);
            }
        }
    }

    applyDamageToEnemy(enemy, attack) {
        const mult = player.character?.stats?.damageMultiplier || 1;
        const dir = (attack.id === 'valoria_rage_blast') ? (enemy.x >= player.x ? 1 : -1) : player.facing;
        enemy.takeDamage(attack.damage * mult, attack.knockback, attack.hitStun, dir);
    }

    applyDamageToPlayer(enemy) {
        const knockback = 200;
        player.takeDamage(enemy.damage, enemy.facing * knockback, -100);
    }

    triggerHitFeedback(attack, enemy) {
        // Hit-stop
        player.hitStopTime = attack.hitStop / 1000;
        enemy.hitStopTime = attack.hitStop / 1000;

        // Screen shake
        if (attack.screenShake === 'light') camera.shakeLight();
        else if (attack.screenShake === 'medium') camera.shakeMedium();
        else if (attack.screenShake === 'heavy') camera.shakeHeavy();

        // Impact effects
        const impactX = enemy.x;
        const impactY = enemy.y - enemy.height / 2;
        vfxManager.createImpact(impactX, impactY, attack.impactSound);

        // Sound
        audioManager.playSFX(attack.impactSound);
    }

    boxCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    /**
     * Create a hit event for processing
     */
    createHit(attacker, defender, attackData) {
        return {
            attacker: attacker,
            defender: defender,
            damage: attackData.damage,
            knockback: attackData.knockback,
            hitStun: attackData.hitStun,
            type: attackData.type || this.damageTypes.PHYSICAL,
            attackId: attackData.id
        };
    }
}
