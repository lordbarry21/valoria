/**
 * VALORIA - Player attack definitions
 * Timings are in seconds, hitStop in milliseconds, hitbox offsets relative to the player's feet.
 */

const RAGE_DAMAGE_MULTIPLIER = 1.3;

const COMBO_ATTACKS = [
    { id: 'slash_1', damage: 15, startup: 0.1, active: 0.15, recovery: 0.2, hitbox: { x: 30, y: -40, width: 60, height: 40 }, knockback: 150, hitStun: 0.3, hitStop: 25, moveForce: 80, swingSound: 'sword_swing_light', impactSound: 'sword_impact_light', screenShake: 'light', rageGain: 12 },
    { id: 'slash_2', damage: 18, startup: 0.12, active: 0.18, recovery: 0.22, hitbox: { x: 35, y: -35, width: 70, height: 45 }, knockback: 180, hitStun: 0.35, hitStop: 30, moveForce: 100, swingSound: 'sword_swing_light', impactSound: 'sword_impact_light', screenShake: 'light', rageGain: 14 },
    { id: 'slash_3', damage: 25, startup: 0.18, active: 0.2, recovery: 0.3, hitbox: { x: 40, y: -40, width: 80, height: 50 }, knockback: 250, hitStun: 0.45, hitStop: 45, moveForce: 120, swingSound: 'sword_swing_heavy', impactSound: 'sword_impact_heavy', screenShake: 'medium', rageGain: 20 },
    { id: 'slash_4', damage: 40, startup: 0.25, active: 0.25, recovery: 0.4, hitbox: { x: 50, y: -50, width: 100, height: 60 }, knockback: 350, hitStun: 0.6, hitStop: 70, moveForce: 150, swingSound: 'sword_swing_heavy', impactSound: 'sword_impact_metal', screenShake: 'heavy', rageGain: 30 },
];

export const VALOR_STRIKE = { id: 'valor_strike', damage: 35, startup: 0.1, active: 0.3, recovery: 0.2, hitbox: { x: 80, y: -40, width: 120, height: 50 }, knockback: 400, hitStun: 0.5, hitStop: 50, moveForce: 400, swingSound: 'valor_strike', impactSound: 'sword_impact_heavy', screenShake: 'heavy', rageGain: 15 };

export const IRON_BREAKER = { id: 'iron_breaker', damage: 60, startup: 0.4, active: 0.3, recovery: 0.4, hitbox: { x: 0, y: -30, width: 150, height: 80 }, knockback: 500, hitStun: 0.7, hitStop: 80, moveForce: 0, swingSound: 'iron_breaker', impactSound: 'sword_impact_heavy', screenShake: 'heavy', rageGain: 20 };

export function getComboAttacks(isRaging) {
    const multiplier = isRaging ? RAGE_DAMAGE_MULTIPLIER : 1;
    return COMBO_ATTACKS.map(attack => ({ ...attack, damage: attack.damage * multiplier }));
}

export function createHeavyAttack(chargePercent, isRaging) {
    const multiplier = isRaging ? RAGE_DAMAGE_MULTIPLIER : 1;
    return {
        id: 'heavy',
        damage: (30 + 30 * chargePercent) * multiplier,
        startup: 0.05,
        active: 0.3,
        recovery: 0.45,
        hitbox: { x: 50, y: -50, width: 100 + 40 * chargePercent, height: 70 },
        knockback: 300 + 200 * chargePercent,
        hitStun: 0.5 + 0.3 * chargePercent,
        hitStop: 60 + 30 * chargePercent,
        moveForce: 200 + 100 * chargePercent,
        swingSound: 'sword_swing_heavy',
        impactSound: 'sword_impact_heavy',
        screenShake: chargePercent > 0.5 ? 'heavy' : 'medium',
        rageGain: 10 + 10 * chargePercent,
    };
}
