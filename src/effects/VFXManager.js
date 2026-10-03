/**
 * VALORIA - VFX Manager
 * Handles all visual effects with dark fantasy aesthetic
 */

const RAGE_AURA_INTERVAL = 0.1;
const DODGE_TRAIL_SAMPLE_INTERVAL = 0.025;
const DODGE_TRAIL_SAMPLES = 6;

export class VFXManager {
    constructor() {
        this.init();
    }

    init() {
        this.effects = [];
        this.trails = [];
        this.particles = [];
        this.screenFlash = null;
        this.rageAuraTarget = null;
        this.rageAuraTimer = 0;
    }

    update(dt) {
        this.updateRageAura(dt);

        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life -= dt;
            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // Update trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const trail = this.trails[i];
            this.sampleTrail(trail, dt);
            trail.life -= dt;
            if (trail.life <= 0) {
                this.trails.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    sampleTrail(trail, dt) {
        if (!trail.follow || trail.samplesLeft <= 0) return;

        trail.sampleTimer -= dt;
        if (trail.sampleTimer > 0) return;

        trail.sampleTimer = DODGE_TRAIL_SAMPLE_INTERVAL;
        trail.samplesLeft--;
        trail.points.push({ x: trail.follow.x, y: trail.follow.y - 40 });
    }

    updateRageAura(dt) {
        const target = this.rageAuraTarget;
        if (!target) return;
        if (!target.isRaging) {
            this.rageAuraTarget = null;
            return;
        }

        this.rageAuraTimer -= dt;
        if (this.rageAuraTimer > 0) return;
        this.rageAuraTimer = RAGE_AURA_INTERVAL;

        this.effects.push({
            type: 'aura',
            x: target.x,
            y: target.y,
            color: 'rgba(255, 68, 0',
            maxRadius: 65,
            life: 0.4,
            maxLife: 0.4
        });

        // Rising embers
        for (let i = 0; i < 4; i++) {
            this.particles.push({
                x: target.x + (Math.random() - 0.5) * 50,
                y: target.y - 20,
                vx: (Math.random() - 0.5) * 25,
                vy: -60 - Math.random() * 40,
                size: 3 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#ff4400' : '#ff6622',
                life: 0.4 + Math.random() * 0.25,
                maxLife: 0.65,
                gravity: -30
            });
        }
    }

    render(ctx) {
        // Render trails
        for (const trail of this.trails) {
            this.renderTrail(ctx, trail);
        }

        // Render particles
        for (const p of this.particles) {
            ctx.globalAlpha = Math.min(1, p.life / 0.2);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Render effects
        for (const effect of this.effects) {
            this.renderEffect(ctx, effect);
        }
    }

    renderTrail(ctx, trail) {
        if (trail.points.length < 2) return;

        ctx.save();
        ctx.globalAlpha = Math.min(1, trail.life / trail.maxLife);
        ctx.strokeStyle = trail.color;
        ctx.lineWidth = trail.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw with gradient along path
        ctx.beginPath();
        for (let i = 0; i < trail.points.length; i++) {
            const p = trail.points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();
    }

    renderEffect(ctx, effect) {
        const progress = 1 - effect.life / effect.maxLife;

        switch (effect.type) {
            case 'slash':
                this.renderSlash(ctx, effect, progress);
                break;
            case 'impact':
                this.renderImpact(ctx, effect, progress);
                break;
            case 'dust':
                this.renderDust(ctx, effect, progress);
                break;
            case 'aura':
                this.renderAura(ctx, effect, progress);
                break;
            case 'heavySlash':
                this.renderHeavySlash(ctx, effect, progress);
                break;
        }
    }

    renderSlash(ctx, effect, progress) {
        const { x, y, facing, attackType } = effect;
        const size = attackType === 'heavy' ? 70 : 55;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        // Slash arc
        const alpha = 1 - progress;

        if (attackType === 'heavy') {
            // Heavy attack - more dramatic, warmer colors
            ctx.strokeStyle = `rgba(255, 200, 150, ${alpha * 0.8})`;
            ctx.lineWidth = (1 - progress) * 10;
        } else {
            // Light attack - cooler, sharper
            ctx.strokeStyle = `rgba(255, 255, 240, ${alpha * 0.9})`;
            ctx.lineWidth = (1 - progress) * 6;
        }

        ctx.lineCap = 'round';
        ctx.beginPath();
        const startAngle = -Math.PI * 0.6;
        const endAngle = startAngle + progress * Math.PI * 1.1;
        ctx.arc(0, -40, size, startAngle, endAngle);
        ctx.stroke();

        // Secondary arc (offset)
        if (attackType === 'heavy') {
            ctx.strokeStyle = `rgba(255, 180, 100, ${alpha * 0.4})`;
            ctx.lineWidth = (1 - progress) * 15;
            ctx.beginPath();
            ctx.arc(0, -40, size + 5, startAngle + 0.1, endAngle - 0.1);
            ctx.stroke();
        }

        // Impact spark at end
        if (progress > 0.6 && progress < 0.95) {
            const sparkAlpha = (1 - progress) * 2.5;
            const sparkX = Math.cos(endAngle) * size;
            const sparkY = -40 + Math.sin(endAngle) * size;

            ctx.fillStyle = `rgba(255, 220, 180, ${sparkAlpha})`;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    renderHeavySlash(ctx, effect, progress) {
        const { x, y, facing } = effect;
        const size = 80;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        // Multiple arcs for heavy attack
        for (let i = 0; i < 3; i++) {
            const delay = i * 0.05;
            const adjustedProgress = Math.max(0, (progress - delay) / (1 - delay));
            const alpha = (1 - adjustedProgress) * (1 - i * 0.2);

            ctx.strokeStyle = `rgba(255, 200, 150, ${alpha * 0.7})`;
            ctx.lineWidth = (1 - adjustedProgress) * (12 - i * 3);
            ctx.beginPath();
            const startAngle = -Math.PI * 0.7 + i * 0.15;
            const endAngle = startAngle + adjustedProgress * Math.PI * 1.2;
            ctx.arc(0, -40, size + i * 10, startAngle, endAngle);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderImpact(ctx, effect, progress) {
        const { x, y, intensity } = effect;
        const baseRadius = 40 * intensity;

        ctx.save();
        ctx.translate(x, y);

        // Impact rings
        for (let i = 0; i < 3; i++) {
            const ringProgress = Math.max(0, progress - i * 0.12);
            const radius = ringProgress * baseRadius;
            const alpha = (1 - progress) * (1 - i * 0.3);

            // Warm spark color
            ctx.strokeStyle = i === 0
                ? `rgba(255, 200, 100, ${alpha})`
                : `rgba(255, 255, 200, ${alpha * 0.7})`;
            ctx.lineWidth = Math.max(1, (1 - progress) * 4);
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Sparks
        const numSparks = 8;
        for (let i = 0; i < numSparks; i++) {
            const angle = (i / numSparks) * Math.PI * 2;
            const sparkDist = progress * 50;
            const sx = Math.cos(angle) * sparkDist;
            const sy = Math.sin(angle) * sparkDist;
            const sparkAlpha = 1 - progress;

            ctx.fillStyle = `rgba(255, ${200 - progress * 100}, 50, ${sparkAlpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 3 * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }

        // Central flash
        if (progress < 0.2) {
            const flashAlpha = (1 - progress / 0.2) * 0.6;
            ctx.fillStyle = `rgba(255, 240, 200, ${flashAlpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, 15 * (1 - progress * 2), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    renderDust(ctx, effect, progress) {
        const { x, y } = effect;

        ctx.save();
        ctx.translate(x, y);

        // Dust cloud
        const alpha = (1 - progress) * 0.4;

        for (let i = 0; i < 8; i++) {
            const dx = effect.spread[i] * 35 * progress;
            const dy = -progress * 25 - i * 2;
            const size = 6 * (1 - progress);
            const dustAlpha = alpha * (1 - i * 0.1);

            ctx.fillStyle = `rgba(80, 65, 50, ${dustAlpha})`;
            ctx.beginPath();
            ctx.arc(dx, dy, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    renderAura(ctx, effect, progress) {
        const { x, y, color, maxRadius } = effect;

        ctx.save();
        ctx.translate(x, y);

        const pulseRadius = maxRadius * (0.85 + Math.sin(progress * 12) * 0.15);

        // Outer glow
        const gradient = ctx.createRadialGradient(0, -40, 0, 0, -40, pulseRadius);
        gradient.addColorStop(0, `${color}, ${0.4 * (1 - progress)})`);
        gradient.addColorStop(0.5, `${color}, ${0.2 * (1 - progress)})`);
        gradient.addColorStop(1, `${color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, -40, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ============================================================================
    // EFFECT CREATION METHODS
    // ============================================================================

    createSwordSwing(player, attack) {
        const effect = {
            type: 'slash',
            x: player.x,
            y: player.y,
            facing: player.facing,
            attackType: attack.swingSound === 'sword_swing_heavy' ? 'heavy' : 'light',
            life: 0.18,
            maxLife: 0.18
        };
        this.effects.push(effect);
    }

    createHeavySwing(player, attack) {
        const effect = {
            type: 'heavySlash',
            x: player.x,
            y: player.y,
            facing: player.facing,
            life: 0.25,
            maxLife: 0.25
        };
        this.effects.push(effect);

        // Dust at feet
        this.createDust(player.x, player.y);
    }

    createImpact(x, y, soundType) {
        const effect = {
            type: 'impact',
            x, y,
            intensity: soundType === 'sword_impact_heavy' ? 1.5 : 1,
            life: 0.25,
            maxLife: 0.25
        };
        this.effects.push(effect);

        // Sparks
        const numSparks = soundType === 'sword_impact_heavy' ? 16 : 10;
        for (let i = 0; i < numSparks; i++) {
            const angle = (i / numSparks) * Math.PI * 2 + Math.random() * 0.3;
            const speed = 150 + Math.random() * 200;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.3 ? '#ffcc44' : '#ffffff',
                life: 0.25 + Math.random() * 0.2,
                maxLife: 0.45,
                gravity: 300
            });
        }
    }

    createDust(x, y) {
        const effect = {
            type: 'dust',
            x, y,
            spread: Array.from({ length: 8 }, () => Math.random() - 0.5),
            life: 0.35,
            maxLife: 0.35
        };
        this.effects.push(effect);
    }

    createLandingDust(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.9;
            const speed = 60 + Math.random() * 100;

            this.particles.push({
                x: x + (Math.random() - 0.5) * 25,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                size: 3 + Math.random() * 4,
                color: '#5a4a3a',
                life: 0.35 + Math.random() * 0.15,
                maxLife: 0.5,
                gravity: 350
            });
        }
    }

    createJumpDust(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: (Math.random() - 0.5) * 40,
                vy: -20 - Math.random() * 30,
                size: 2 + Math.random() * 2,
                color: '#4a3a2a',
                life: 0.25,
                maxLife: 0.25,
                gravity: 100
            });
        }
    }

    createDodgeTrail(player) {
        this.trails.push({
            points: [{ x: player.x, y: player.y - 40 }],
            color: 'rgba(180, 180, 200, 0.5)',
            width: 5,
            life: 0.18,
            maxLife: 0.18,
            follow: player,
            samplesLeft: DODGE_TRAIL_SAMPLES,
            sampleTimer: DODGE_TRAIL_SAMPLE_INTERVAL
        });
    }

    createPlayerHurt(player) {
        this.createDust(player.x, player.y - player.height / 2);

        // Blood particles
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 60;

            this.particles.push({
                x: player.x,
                y: player.y - player.height * 0.6,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                size: 2 + Math.random() * 2,
                color: '#8b2020',
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                gravity: 200
            });
        }
    }

    createPlayerDeath(player) {
        // Dramatic death particles
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 150;

            this.particles.push({
                x: player.x,
                y: player.y - player.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 120,
                size: 3 + Math.random() * 5,
                color: Math.random() > 0.4 ? '#4a4540' : '#8b2020',
                life: 0.7 + Math.random() * 0.4,
                maxLife: 1.1,
                gravity: 180
            });
        }
    }

    createEnemyHurt(enemy) {
        this.createDust(enemy.x, enemy.y - enemy.height / 2);
    }

    createEnemyDeath(enemy) {
        // Shadow burst
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 90 + Math.random() * 130;

            this.particles.push({
                x: enemy.x,
                y: enemy.y - enemy.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                size: 4 + Math.random() * 6,
                color: Math.random() > 0.5 ? '#2a1a3a' : '#1a1020',
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                gravity: 120
            });
        }
    }

    createProjectileImpact(x, y) {
        // Shadow magic impact
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 100;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: '#8844ff',
                life: 0.25 + Math.random() * 0.15,
                maxLife: 0.4,
                gravity: 50
            });
        }
    }

    createValorStrike(player) {
        // Speed trail
        const trail = {
            points: [
                { x: player.x - player.facing * 60, y: player.y - 40 },
                { x: player.x - player.facing * 30, y: player.y - 40 },
                { x: player.x, y: player.y - 40 },
                { x: player.x + player.facing * 30, y: player.y - 40 }
            ],
            color: 'rgba(255, 150, 50, 0.7)',
            width: 12,
            life: 0.25,
            maxLife: 0.25
        };
        this.trails.push(trail);

        // Impact
        this.createImpact(player.x + player.facing * 70, player.y - 40, 'sword_impact_heavy');

        // Ground dust
        this.createDust(player.x + player.facing * 70, player.y);
    }

    createIronBreaker(player) {
        // Big impact effect
        this.createImpact(player.x, player.y, 'sword_impact_heavy');

        // Ground debris
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 160;

            this.particles.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 120,
                size: 3 + Math.random() * 5,
                color: '#3a3025',
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.7,
                gravity: 450
            });
        }

        // Sparks
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 160 + Math.random() * 200;

            this.particles.push({
                x: player.x,
                y: player.y - 30,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 160,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#ffcc44' : '#ffaa22',
                life: 0.25 + Math.random() * 0.2,
                maxLife: 0.45,
                gravity: 280
            });
        }
    }

    createRageAura(player) {
        this.rageAuraTarget = player;
        this.rageAuraTimer = 0;
    }

    removeRageAura() {
        this.rageAuraTarget = null;
    }
}
