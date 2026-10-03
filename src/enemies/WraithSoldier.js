/**
 * VALORIA - Wraith Soldier Enemy
 * Basic melee combatant with ethereal dark appearance
 */

import { Enemy } from './Enemy.js';

export class WraithSoldier extends Enemy {
    constructor() {
        super();

        this.name = 'Wraith Soldier';
        this.width = 36;
        this.height = 65;

        // Health
        this.maxHealth = 40;
        this.health = 40;

        // Combat
        this.damage = 12;
        this.attackRange = 50;
        this.attackCooldownMax = 1.2;

        // AI
        this.aggroRange = 250;
        this.moveSpeed = 120;
    }

    drawBody(ctx) {
        const t = this.animTime;
        const aggro = this.isAggro;

        // Shadow - more ethereal
        ctx.fillStyle = 'rgba(20, 10, 30, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ethereal robe body
        const robeColor = aggro ? '#2a1535' : '#1a0a25';
        ctx.fillStyle = robeColor;

        // Main robe shape
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.quadraticCurveTo(-16, -30, -12, -45);
        ctx.lineTo(0, -55);
        ctx.lineTo(12, -45);
        ctx.quadraticCurveTo(16, -30, 18, 0);
        ctx.closePath();
        ctx.fill();

        // Tattered bottom edges
        ctx.fillStyle = '#0a0510';
        for (let i = 0; i < 6; i++) {
            const x = -16 + i * 6;
            const tatterLength = 6 + Math.sin(t * 2.5 + i) * 3;
            ctx.fillRect(x, -2 + Math.sin(t * 3 + i * 0.5) * 2, 4, tatterLength);
        }

        // Robe inner shadow
        ctx.fillStyle = '#150820';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-8, -25, -6, -40);
        ctx.lineTo(6, -40);
        ctx.quadraticCurveTo(8, -25, 10, 0);
        ctx.closePath();
        ctx.fill();

        // Hood
        ctx.fillStyle = robeColor;
        ctx.beginPath();
        ctx.arc(0, -62, 14, 0, Math.PI * 2);
        ctx.fill();

        // Hood shadow inside
        ctx.fillStyle = '#0a0510';
        ctx.beginPath();
        ctx.ellipse(0, -60, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing eyes
        const eyeColor = aggro ? '#ff4444' : '#663333';
        const eyeGlow = aggro ? 12 : 4;

        if (aggro) {
            ctx.shadowColor = '#ff3333';
            ctx.shadowBlur = eyeGlow;
        }

        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(-4, -63, 3, 0, Math.PI * 2);
        ctx.arc(4, -63, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Ethereal glow when aggro
        if (aggro) {
            ctx.fillStyle = `rgba(100, 50, 120, ${0.1 + Math.sin(t * 4) * 0.05})`;
            ctx.beginPath();
            ctx.ellipse(0, -30, 22 + Math.sin(t * 3) * 2, 30, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ghostly weapon
        ctx.fillStyle = aggro ? '#4a4060' : '#3a3050';
        ctx.save();
        ctx.translate(20, -42);
        ctx.rotate(0.3 + Math.sin(t * 2) * 0.12 + this.getWeaponSwing());

        // Blade
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(2, 0);
        ctx.lineTo(1, 35);
        ctx.lineTo(0, 38);
        ctx.lineTo(-1, 35);
        ctx.closePath();
        ctx.fill();

        // Blade edge glow when aggro
        if (aggro) {
            ctx.strokeStyle = 'rgba(150, 100, 180, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Handle
        ctx.fillStyle = '#2a1a30';
        ctx.fillRect(-3, -6, 6, 8);

        ctx.restore();

        // Wispy movement particles when chasing
        if (aggro && this.state === 'chase') {
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 3; i++) {
                const px = -10 + Math.sin(t * 5 + i * 2) * 15;
                const py = -20 + Math.cos(t * 4 + i * 1.5) * 20 - i * 10;
                const psize = 8 - i * 2;

                ctx.fillStyle = '#2a1540';
                ctx.beginPath();
                ctx.ellipse(px, py, psize, psize * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
}
