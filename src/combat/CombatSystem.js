/**
 * VALORIA - Combat System
 * Centralized damage, hitbox/hurtbox, and hit reaction handling
 */

import { player, enemyManager, vfxManager, camera, audioManager } from '../main.js';

export class CombatSystem {
    constructor() {
        // Active hitboxes
        this.activeHitboxes = [];

        // Damage types
        this.damageTypes = {
            PHYSICAL: 'physical',
            HEAVY: 'heavy',
            ABILITY: 'ability'
        };
    }

    init() {
        this.activeHitboxes = [];
    }

    update(dt) {
        if (player.isDead) return;
        this.checkPlayerAttacks();
        this.checkEnemyAttacks();
    }

    getPlayerHitbox() {
        const attack = player.currentAttack;
        if (!attack) return null;

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
        enemy.takeDamage(attack.damage * mult, attack.knockback, attack.hitStun, player.facing);
    }

    applyDamageToPlayer(enemy) {
        const knockback = 200;
        player.takeDamage(enemy.damage, enemy.facing * knockback, -100);
    }

    triggerHitFeedback(attack, enemy) {
        const isKnight = player.characterId === 'knight';
        const isHeavyOrFinisher = attack.id === 'slash_3' || attack.id === 'slash_4' || attack.id === 'heavy' || attack.id === 'iron_breaker';

        // Hit-stop tuning for meaty dark fantasy crunch
        let hitStopMs = attack.hitStop;
        if (isKnight) {
            hitStopMs = isHeavyOrFinisher ? Math.max(70, attack.hitStop * 1.35) : Math.max(35, attack.hitStop * 1.2);
            if (enemy.isDead) hitStopMs += 35; // Lethal execution crunch pause
        }

        player.hitStopTime = hitStopMs / 1000;
        enemy.hitStopTime = hitStopMs / 1000;

        // Screen shake
        if (attack.screenShake === 'light') {
            if (isKnight) camera.shake(5, 0.12);
            else camera.shakeLight();
        } else if (attack.screenShake === 'medium') {
            if (isKnight) camera.shake(10, 0.18);
            else camera.shakeMedium();
        } else if (attack.screenShake === 'heavy') {
            if (isKnight) camera.shake(16, 0.25);
            else camera.shakeHeavy();
        }

        if (isKnight && isHeavyOrFinisher) {
            camera.impactZoom(0.12, 0.2);
        }

        // Visceral impact effects (directional arterial blood spray, sharp slash wound gouge, friction sparks, lethal gore burst)
        const impactX = enemy.x;
        const impactY = enemy.y - enemy.height / 2;
        vfxManager.createVisceralImpact(impactX, impactY, player.facing, attack, enemy.isDead, player.isRaging, player.characterId);

        // Sound
        audioManager.playSFX(attack.impactSound);
        if (isKnight && isHeavyOrFinisher) {
            audioManager.playSFX('sword_impact_metal');
        }
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
