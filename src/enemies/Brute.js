/**
 * VALORIA - Brute Enemy
 * Slow but powerful tank with imposing visuals
 */

import { Enemy } from './Enemy.js';

export class Brute extends Enemy {
    constructor() {
        super();

        this.name = 'Brute';
        this.width = 60;
        this.height = 90;

        // Health - much higher
        this.maxHealth = 120;
        this.health = 120;

        // Combat - slower but harder hits
        this.damage = 25;
        this.attackRange = 70;
        this.attackCooldownMax = 2.0;

        // AI - slower
        this.aggroRange = 200;
        this.moveSpeed = 60;

        // Resistance
        this.damageTakenMultiplier = 0.7;
        this.knockbackResistance = 0.3;
        this.hitStunMultiplier = 0.5;
    }

    drawBody(ctx) {
        const t = this.animTime;
        const aggro = this.isAggro;
        const hurtFlash = this.hitStunTime > 0.1;

        // Heavy shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Leg armor
        ctx.fillStyle = hurtFlash ? '#4a4040' : '#252020';
        ctx.fillRect(-22, -28, 16, 28);
        ctx.fillRect(6, -28, 16, 28);

        // Boots
        ctx.fillStyle = hurtFlash ? '#3a3030' : '#1a1515';
        ctx.fillRect(-24, -5, 20, 8);
        ctx.fillRect(4, -5, 20, 8);

        // Armored body
        const bodyGradient = ctx.createLinearGradient(-28, -80, 28, -80);
        bodyGradient.addColorStop(0, hurtFlash ? '#3a3030' : '#2a2525');
        bodyGradient.addColorStop(0.3, hurtFlash ? '#4a4040' : '#353030');
        bodyGradient.addColorStop(0.7, hurtFlash ? '#4a4040' : '#353030');
        bodyGradient.addColorStop(1, hurtFlash ? '#3a3030' : '#2a2525');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-28, -82, 56, 60);

        // Armor plates
        ctx.fillStyle = hurtFlash ? '#5a5050' : '#454045';
        ctx.fillRect(-26, -78, 52, 14);
        ctx.fillRect(-24, -58, 48, 12);

        // Chest emblem
        ctx.fillStyle = aggro ? '#8b2020' : '#4a2020';
        ctx.fillRect(-8, -72, 16, 20);
        ctx.fillStyle = hurtFlash ? '#6a3030' : '#3a1515';
        ctx.fillRect(-6, -70, 12, 16);

        // Shoulder guards - massive
        ctx.fillStyle = hurtFlash ? '#4a4040' : '#353030';
        ctx.fillRect(-38, -82, 16, 22);
        ctx.fillRect(22, -82, 16, 22);

        // Shoulder spikes
        ctx.fillStyle = hurtFlash ? '#5a5050' : '#454045';
        ctx.beginPath();
        ctx.moveTo(-38, -82);
        ctx.lineTo(-42, -92);
        ctx.lineTo(-32, -82);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(38, -82);
        ctx.lineTo(42, -92);
        ctx.lineTo(32, -82);
        ctx.closePath();
        ctx.fill();

        // Head with helmet
        ctx.fillStyle = hurtFlash ? '#4a4040' : '#2a2525';
        ctx.beginPath();
        ctx.arc(0, -95, 18, 0, Math.PI * 2);
        ctx.fill();

        // Helmet top ridge
        ctx.fillStyle = hurtFlash ? '#5a5050' : '#3a3535';
        ctx.beginPath();
        ctx.arc(0, -98, 14, Math.PI, 0);
        ctx.fill();

        // Visor slit
        ctx.fillStyle = '#0a0808';
        ctx.fillRect(-14, -98, 28, 8);

        // Glowing eyes through visor
        const eyeColor = aggro ? '#ff6600' : '#663300';
        const eyeGlow = aggro ? 10 : 0;

        if (eyeGlow > 0) {
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = eyeGlow;
        }

        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(-5, -94, 3, 0, Math.PI * 2);
        ctx.arc(5, -94, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Weapon (massive axe)
        ctx.fillStyle = hurtFlash ? '#4a4040' : '#353035';
        ctx.save();
        ctx.translate(32, -58);
        ctx.rotate(0.2 + Math.sin(t * 1.5) * 0.05 + this.getWeaponSwing());

        // Handle
        ctx.fillRect(-4, 0, 8, 55);

        // Axe head
        ctx.fillStyle = hurtFlash ? '#5a5050' : '#454050';
        ctx.beginPath();
        ctx.moveTo(-4, 5);
        ctx.lineTo(-28, 18);
        ctx.lineTo(-28, 42);
        ctx.lineTo(-4, 35);
        ctx.closePath();
        ctx.fill();

        // Axe blade edge
        ctx.fillStyle = aggro ? '#6a6070' : '#5a5560';
        ctx.beginPath();
        ctx.moveTo(-28, 18);
        ctx.lineTo(-32, 30);
        ctx.lineTo(-28, 42);
        ctx.stroke();
        ctx.fill();

        // Metal bindings
        ctx.fillStyle = '#3a3540';
        ctx.fillRect(-4, 4, 8, 6);
        ctx.fillRect(-4, 48, 8, 6);

        ctx.restore();

        // Heavy footstep dust when moving
        if (this.state === 'chase') {
            ctx.fillStyle = 'rgba(40, 35, 30, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
