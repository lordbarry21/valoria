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

        if (this.screenFlash) {
            this.screenFlash.life -= dt;
            if (this.screenFlash.life <= 0) this.screenFlash = null;
        }

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

        // Screen flash
        if (this.screenFlash) {
            ctx.save();
            ctx.fillStyle = this.screenFlash.color;
            ctx.globalAlpha = (this.screenFlash.life / this.screenFlash.maxLife) * this.screenFlash.alpha;
            ctx.fillRect(-1000, -1000, 4000, 3000);
            ctx.restore();
        }
    }

    renderFissure(ctx, effect, progress) {
        const { x, y, facing, length } = effect;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        const currentLen = length * Math.min(1, progress * 2.5);
        const alpha = Math.max(0, 1 - progress);

        // Glowing magma line on the ground
        ctx.strokeStyle = `rgba(255, 60, 0, ${alpha * 0.9})`;
        ctx.lineWidth = Math.max(2, (1 - progress) * 8);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(currentLen * 0.4, -4);
        ctx.lineTo(currentLen * 0.7, 3);
        ctx.lineTo(currentLen, 0);
        ctx.stroke();

        // Inner bright core
        ctx.strokeStyle = `rgba(255, 220, 100, ${alpha})`;
        ctx.lineWidth = Math.max(1, (1 - progress) * 3);
        ctx.stroke();

        // Rising flame spikes
        const spikes = 6;
        for (let i = 1; i <= spikes; i++) {
            const sx = (i / spikes) * currentLen;
            const spikeH = (Math.sin(i * 1.5 + progress * 5) * 15 + 25) * (1 - progress);
            const spikeGrad = ctx.createLinearGradient(sx, 0, sx, -spikeH);
            spikeGrad.addColorStop(0, `rgba(255, 120, 0, ${alpha * 0.8})`);
            spikeGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');
            ctx.fillStyle = spikeGrad;
            ctx.beginPath();
            ctx.moveTo(sx - 8, 0);
            ctx.lineTo(sx, -spikeH);
            ctx.lineTo(sx + 8, 0);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    renderSolarBeam(ctx, effect, progress) {
        const { x, y, facing, length, width } = effect;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        const alpha = Math.max(0, 1 - progress);
        const beamW = width * (1 - progress * 0.3);

        // Outer holy golden aura
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.35})`;
        ctx.fillRect(0, -beamW / 2, length, beamW);

        // Core blinding light laser
        const coreGrad = ctx.createLinearGradient(0, -beamW * 0.25, 0, beamW * 0.25);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        coreGrad.addColorStop(0.5, `rgba(255, 255, 230, ${alpha * 0.95})`);
        coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, -beamW * 0.25, length, beamW * 0.5);

        // Piercing arrow tip
        ctx.fillStyle = `rgba(255, 240, 160, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(length, 0);
        ctx.lineTo(length - 30, -beamW * 0.6);
        ctx.lineTo(length - 20, 0);
        ctx.lineTo(length - 30, beamW * 0.6);
        ctx.closePath();
        ctx.fill();

        // Origin starburst
        ctx.strokeStyle = `rgba(255, 230, 100, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18 * (1 - progress), 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    renderRadiantTempest(ctx, effect, progress) {
        const { x, y } = effect;
        ctx.save();
        ctx.translate(x, y - 36);

        const alpha = Math.max(0, 1 - progress);
        const rot = progress * Math.PI * 8;

        // Revolving golden light rings
        for (let r = 0; r < 2; r++) {
            ctx.save();
            ctx.rotate(rot * (r === 0 ? 1 : -1));
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.7})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 48 + r * 14, 0, Math.PI * 1.5);
            ctx.stroke();

            // Orbiting blades
            for (let b = 0; b < 4; b++) {
                const angle = (b / 4) * Math.PI * 2;
                const bx = Math.cos(angle) * (50 + r * 14);
                const by = Math.sin(angle) * (50 + r * 14);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(bx, by, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Central radiance
        ctx.fillStyle = `rgba(255, 235, 120, ${alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderHolySwords(ctx, effect, progress) {
        const { x, y } = effect;
        ctx.save();

        const alpha = Math.max(0, 1 - progress);
        const swords = effect.swords || [];

        for (let i = 0; i < swords.length; i++) {
            const s = swords[i];
            const swordProg = Math.max(0, Math.min(1, (progress - s.delay) / 0.35));
            if (swordProg <= 0) continue;

            const targetY = y;
            const currentY = (targetY - 450) + swordProg * 450;
            const sx = x + s.offsetX;

            if (swordProg < 1) {
                // Falling sword beam
                ctx.save();
                ctx.translate(sx, currentY);
                ctx.strokeStyle = `rgba(255, 240, 150, ${alpha})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(0, -60);
                ctx.lineTo(0, 30);
                ctx.stroke();

                // Crossguard
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-16, -40);
                ctx.lineTo(16, -40);
                ctx.stroke();
                ctx.restore();
            } else {
                // Ground impact pillar
                const impactAge = progress - (s.delay + 0.35);
                const pillarAlpha = Math.max(0, 1 - impactAge * 2.5);

                const pillarGrad = ctx.createLinearGradient(sx, targetY, sx, targetY - 350);
                pillarGrad.addColorStop(0, `rgba(255, 230, 100, ${pillarAlpha * 0.8})`);
                pillarGrad.addColorStop(0.7, `rgba(255, 215, 0, ${pillarAlpha * 0.4})`);
                pillarGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = pillarGrad;
                ctx.fillRect(sx - 20, targetY - 350, 40, 350);

                // Ground shock ring
                ctx.strokeStyle = `rgba(255, 240, 160, ${pillarAlpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(sx, targetY, 35 * (1 - pillarAlpha * 0.5), 10, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    renderShadowBlink(ctx, effect, progress) {
        const { startX, startY, endX, endY } = effect;
        ctx.save();

        const alpha = Math.max(0, 1 - progress);

        // Supersonic violet slash line
        ctx.strokeStyle = `rgba(180, 80, 255, ${alpha * 0.9})`;
        ctx.lineWidth = Math.max(1, (1 - progress) * 8);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY - 35);
        ctx.lineTo(endX, endY - 35);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.max(1, (1 - progress) * 2);
        ctx.stroke();

        // Shadow decoy fade at start
        ctx.fillStyle = `rgba(50, 20, 80, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(startX, startY - 35, 18 * (1 - progress * 0.5), 35 * (1 - progress * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderCyclone(ctx, effect, progress) {
        const { x, y, facing } = effect;
        ctx.save();
        ctx.translate(x + facing * progress * 140, y - 35);

        const alpha = Math.max(0, 1 - progress);
        const rot = progress * Math.PI * 10;

        // Spiraling wind blades
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate(rot + (i / 3) * Math.PI * 2);
            ctx.strokeStyle = `rgba(120, 240, 200, ${alpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 30 + i * 8, 0, Math.PI * 0.8);
            ctx.stroke();
            ctx.restore();
        }

        // Core wind vortex
        ctx.fillStyle = `rgba(160, 255, 220, ${alpha * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderEclipse(ctx, effect, progress) {
        const { x, y } = effect;
        ctx.save();
        ctx.translate(x, y - 40);

        const alpha = Math.max(0, 1 - progress);

        // 4 phantom cross slashes cutting through target
        const angles = [-Math.PI * 0.25, Math.PI * 0.25, -Math.PI * 0.75, Math.PI * 0.75];
        for (let i = 0; i < angles.length; i++) {
            const delay = i * 0.08;
            const cutProg = Math.max(0, Math.min(1, (progress - delay) / 0.25));
            if (cutProg <= 0) continue;

            const a = angles[i];
            const cutLen = 120 * cutProg;
            const cutAlpha = (1 - cutProg) * alpha;

            ctx.save();
            ctx.rotate(a);
            ctx.strokeStyle = `rgba(230, 20, 60, ${cutAlpha * 0.95})`;
            ctx.lineWidth = Math.max(2, (1 - cutProg) * 10);
            ctx.beginPath();
            ctx.moveTo(-cutLen / 2, 0);
            ctx.lineTo(cutLen / 2, 0);
            ctx.stroke();

            // White edge
            ctx.strokeStyle = `rgba(255, 255, 255, ${cutAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Central dark void expansion
        ctx.fillStyle = `rgba(20, 5, 30, ${alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(0, 0, 70 * Math.sin(progress * Math.PI), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
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
            case 'fissure':
                this.renderFissure(ctx, effect, progress);
                break;
            case 'solarBeam':
                this.renderSolarBeam(ctx, effect, progress);
                break;
            case 'radiantVortex':
                this.renderRadiantVortex(ctx, effect, progress);
                break;
            case 'holySwords':
                this.renderHolySwords(ctx, effect, progress);
                break;
            case 'shadowBlink':
                this.renderShadowBlink(ctx, effect, progress);
                break;
            case 'cyclone':
                this.renderCyclone(ctx, effect, progress);
                break;
            case 'eclipse':
                this.renderEclipse(ctx, effect, progress);
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

    flashScreen(color, duration = 0.3, alpha = 0.5) {
        this.screenFlash = { color, life: duration, maxLife: duration, alpha };
    }

    createValorStrike(player) {
        // Blazing fissure on the ground
        this.effects.push({
            type: 'fissure',
            x: player.x,
            y: player.y,
            facing: player.facing,
            length: 160,
            life: 0.45,
            maxLife: 0.45
        });

        // Fire speed trail
        const trail = {
            points: [
                { x: player.x - player.facing * 80, y: player.y - 35 },
                { x: player.x - player.facing * 40, y: player.y - 35 },
                { x: player.x, y: player.y - 35 },
                { x: player.x + player.facing * 60, y: player.y - 35 }
            ],
            color: 'rgba(255, 90, 20, 0.85)',
            width: 16,
            life: 0.35,
            maxLife: 0.35
        };
        this.trails.push(trail);

        // Magma sparks
        for (let i = 0; i < 16; i++) {
            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.5;
            const speed = 120 + Math.random() * 160;
            this.particles.push({
                x: player.x + player.facing * 50,
                y: player.y - 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.4 ? '#ff5500' : '#ffcc00',
                life: 0.35 + Math.random() * 0.25,
                maxLife: 0.6,
                gravity: 350
            });
        }

        this.createImpact(player.x + player.facing * 80, player.y - 35, 'sword_impact_heavy');
        this.createDust(player.x + player.facing * 80, player.y);
    }

    createIronBreaker(player) {
        // Massive seismic ground slam
        this.createImpact(player.x, player.y - 10, 'sword_impact_heavy');

        // Circular seismic shockwaves
        for (let r = 1; r <= 3; r++) {
            this.effects.push({
                type: 'impact',
                x: player.x,
                y: player.y,
                intensity: 1.8 + r * 0.4,
                life: 0.35 + r * 0.08,
                maxLife: 0.35 + r * 0.08
            });
        }

        // Flying stone chunks
        for (let i = 0; i < 30; i++) {
            const angle = -Math.PI + Math.random() * Math.PI;
            const speed = 140 + Math.random() * 220;
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 40,
                y: player.y - 5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 160,
                size: 3 + Math.random() * 6,
                color: Math.random() > 0.5 ? '#4a3d34' : '#2b231d',
                life: 0.45 + Math.random() * 0.3,
                maxLife: 0.75,
                gravity: 500
            });
        }

        // Golden impact flash
        this.flashScreen('#ffd700', 0.15, 0.25);
    }

    createRageAura(player) {
        this.rageAuraTarget = player;
        this.rageAuraTimer = 0;
        this.flashScreen('#ff2200', 0.35, 0.4);

        // Burst of flame pillars on activation
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 180;
            this.particles.push({
                x: player.x,
                y: player.y - 35,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 120,
                size: 4 + Math.random() * 6,
                color: Math.random() > 0.4 ? '#ff3300' : '#ffaa00',
                life: 0.5 + Math.random() * 0.35,
                maxLife: 0.85,
                gravity: 100
            });
        }
    }

    removeRageAura() {
        this.rageAuraTarget = null;
    }

    // --- BLONDE WARRIOR SKILLS ---
    createSolarPiercer(player) {
        this.effects.push({
            type: 'solarBeam',
            x: player.x,
            y: player.y - 35,
            facing: player.facing,
            length: 320,
            width: 38,
            life: 0.32,
            maxLife: 0.32
        });

        // Golden particle sparkles
        for (let i = 0; i < 20; i++) {
            const spread = Math.random() * 300;
            this.particles.push({
                x: player.x + player.facing * spread,
                y: player.y - 35 + (Math.random() - 0.5) * 30,
                vx: player.facing * (100 + Math.random() * 200),
                vy: (Math.random() - 0.5) * 80,
                size: 2 + Math.random() * 3,
                color: '#fff3a8',
                life: 0.25 + Math.random() * 0.2,
                maxLife: 0.45,
                gravity: 0
            });
        }
    }

    createRadiantTempest(player) {
        this.effects.push({
            type: 'radiantVortex',
            x: player.x,
            y: player.y,
            life: 0.65,
            maxLife: 0.65
        });

        // Orbiting sparks
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const speed = 120;
            this.particles.push({
                x: player.x,
                y: player.y - 35,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: '#ffd700',
                life: 0.4 + Math.random() * 0.25,
                maxLife: 0.65,
                gravity: 0
            });
        }
    }

    createDawnOfJudgment(player) {
        this.flashScreen('#fff8cc', 0.5, 0.4);

        const swords = [
            { offsetX: player.facing * 40, delay: 0.0 },
            { offsetX: player.facing * 120, delay: 0.1 },
            { offsetX: player.facing * 200, delay: 0.2 },
            { offsetX: player.facing * 280, delay: 0.3 },
            { offsetX: player.facing * -50, delay: 0.15 }
        ];

        this.effects.push({
            type: 'holySwords',
            x: player.x,
            y: player.y,
            swords,
            life: 1.1,
            maxLife: 1.1
        });
    }

    // --- BROWN HAIR WARRIOR SKILLS ---
    createPhantomBlink(player, startX, startY, endX, endY) {
        this.effects.push({
            type: 'shadowBlink',
            startX,
            startY,
            endX,
            endY,
            life: 0.35,
            maxLife: 0.35
        });

        // Violet smoke burst
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 90;
            this.particles.push({
                x: startX,
                y: startY - 35,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                color: '#7e22ce',
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                gravity: -40
            });
        }
    }

    createCycloneBlade(player) {
        this.effects.push({
            type: 'cyclone',
            x: player.x,
            y: player.y,
            facing: player.facing,
            life: 0.5,
            maxLife: 0.5
        });

        // Green-teal wind slices
        for (let i = 0; i < 15; i++) {
            const angle = -Math.PI * 0.3 + (Math.random() - 0.5) * 0.8;
            const speed = 200 + Math.random() * 150;
            this.particles.push({
                x: player.x + player.facing * 20,
                y: player.y - 35,
                vx: player.facing * Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: '#2dd4bf',
                life: 0.35 + Math.random() * 0.2,
                maxLife: 0.55,
                gravity: 0
            });
        }
    }

    createEclipseExecution(player, targetX, targetY) {
        this.flashScreen('#180828', 0.65, 0.7);

        this.effects.push({
            type: 'eclipse',
            x: targetX,
            y: targetY,
            life: 0.85,
            maxLife: 0.85
        });

        // Blood explosion
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 120 + Math.random() * 220;
            this.particles.push({
                x: targetX,
                y: targetY - 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                size: 3 + Math.random() * 5,
                color: Math.random() > 0.3 ? '#dc2626' : '#991b1b',
                life: 0.45 + Math.random() * 0.3,
                maxLife: 0.75,
                gravity: 400
            });
        }
    }
}
