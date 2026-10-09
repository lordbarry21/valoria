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

    renderRadiantVortex(ctx, effect, progress) {
        this.renderRadiantTempest(ctx, effect, progress);
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
        const { x, y, facing = 1 } = effect;
        const alpha = Math.max(0, 1 - progress);
        const swords = effect.swords || [];

        ctx.save();

        // 1. Radiant Valkyrie Wings & Halo around Lady Sylvia during initial ascent
        if (progress < 0.65) {
            const wingAlpha = Math.sin((progress / 0.65) * Math.PI);
            ctx.save();
            ctx.translate(x, y - 55);

            // Radiant Halo
            ctx.strokeStyle = `rgba(255, 235, 120, ${wingAlpha * 0.9})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, -28, 22, 7, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Halo star rays
            for (let r = 0; r < 8; r++) {
                const ang = (r * Math.PI) / 4 + progress * 2.5;
                ctx.strokeStyle = `rgba(255, 255, 200, ${wingAlpha * 0.75})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * 22, -28 + Math.sin(ang) * 7);
                ctx.lineTo(Math.cos(ang) * 32, -28 + Math.sin(ang) * 11);
                ctx.stroke();
            }

            // Blazing Angelic Wings
            const wingSpan = 75 * wingAlpha;
            const wingColor = `rgba(255, 225, 100, ${wingAlpha * 0.85})`;
            const wingCore = `rgba(255, 255, 255, ${wingAlpha * 0.95})`;

            [-1, 1].forEach(side => {
                ctx.save();
                ctx.scale(side, 1);

                // Outer holy wing arc
                ctx.fillStyle = wingColor;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(wingSpan * 0.5, -45, wingSpan, -35);
                ctx.quadraticCurveTo(wingSpan * 0.7, -10, wingSpan * 0.85, 15);
                ctx.quadraticCurveTo(wingSpan * 0.4, 0, 0, 0);
                ctx.fill();

                // Inner wing feathers
                ctx.fillStyle = wingCore;
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.quadraticCurveTo(wingSpan * 0.4, -35, wingSpan * 0.75, -28);
                ctx.quadraticCurveTo(wingSpan * 0.5, -5, 0, -5);
                ctx.fill();

                ctx.restore();
            });

            ctx.restore();
        }

        // 2. Grand Sacred Magic Circle on Ground
        const circleCenterX = x + facing * 200;
        const circleRadius = 240;
        const circleAlpha = Math.sin(progress * Math.PI) * 0.85;

        if (circleAlpha > 0) {
            ctx.save();
            ctx.translate(circleCenterX, y);

            // Ground holy glow
            const groundGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, circleRadius);
            groundGlow.addColorStop(0, `rgba(255, 235, 130, ${circleAlpha * 0.45})`);
            groundGlow.addColorStop(0.5, `rgba(245, 158, 11, ${circleAlpha * 0.2})`);
            groundGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = groundGlow;
            ctx.beginPath();
            ctx.ellipse(0, 0, circleRadius, 55, 0, 0, Math.PI * 2);
            ctx.fill();

            // Outer runic circle
            ctx.save();
            ctx.rotate(progress * 2.2);
            ctx.strokeStyle = `rgba(255, 215, 0, ${circleAlpha * 0.8})`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([14, 8, 4, 8]);
            ctx.beginPath();
            ctx.ellipse(0, 0, circleRadius * 0.9, 45, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Inner counter-rotating ring with 8-pointed solar star
            ctx.save();
            ctx.rotate(-progress * 2.8);
            ctx.strokeStyle = `rgba(255, 245, 180, ${circleAlpha * 0.9})`;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.ellipse(0, 0, circleRadius * 0.6, 30, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Solar star rays
            for (let k = 0; k < 8; k++) {
                const ang = (k * Math.PI) / 4;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * (circleRadius * 0.25), Math.sin(ang) * 12);
                ctx.lineTo(Math.cos(ang) * (circleRadius * 0.85), Math.sin(ang) * 42);
                ctx.stroke();
            }
            ctx.restore();

            ctx.restore();
        }

        // 3. Celestial Swords Bombardment & Impact Pillars
        for (let i = 0; i < swords.length; i++) {
            const s = swords[i];
            const swordProg = Math.max(0, Math.min(1, (progress - s.delay) / 0.32));
            if (swordProg <= 0) continue;

            const targetY = y;
            const sx = x + s.offsetX;
            const scale = s.size || 1.2;

            if (swordProg < 1) {
                // Falling blade: from (targetY - 520) down to targetY
                const currentY = (targetY - 520) + swordProg * 520;

                ctx.save();
                ctx.translate(sx, currentY);

                // Streaking light trail above the blade
                const trailGrad = ctx.createLinearGradient(0, -90 * scale, 0, 20 * scale);
                trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                trailGrad.addColorStop(0.6, `rgba(254, 240, 138, ${alpha * 0.6})`);
                trailGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.95})`);
                ctx.fillStyle = trailGrad;
                ctx.fillRect(-6 * scale, -90 * scale, 12 * scale, 110 * scale);

                // Blazing Sword Blade
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 15;

                // Outer golden edge
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.moveTo(0, 42 * scale);
                ctx.lineTo(-8 * scale, -45 * scale);
                ctx.lineTo(8 * scale, -45 * scale);
                ctx.closePath();
                ctx.fill();

                // Core brilliant white blade
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(0, 40 * scale);
                ctx.lineTo(-4 * scale, -43 * scale);
                ctx.lineTo(4 * scale, -43 * scale);
                ctx.closePath();
                ctx.fill();

                // Angelic Winged Crossguard
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.moveTo(-22 * scale, -40 * scale);
                ctx.quadraticCurveTo(-10 * scale, -48 * scale, 0, -44 * scale);
                ctx.quadraticCurveTo(10 * scale, -48 * scale, 22 * scale, -40 * scale);
                ctx.lineTo(16 * scale, -37 * scale);
                ctx.lineTo(-16 * scale, -37 * scale);
                ctx.closePath();
                ctx.fill();

                // Quillon wings tip highlight
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(-20 * scale, -41 * scale, 2.5 * scale, 0, Math.PI * 2);
                ctx.arc(20 * scale, -41 * scale, 2.5 * scale, 0, Math.PI * 2);
                ctx.fill();

                // Hilt & Pommel
                ctx.strokeStyle = '#c9a227';
                ctx.lineWidth = 3 * scale;
                ctx.beginPath();
                ctx.moveTo(0, -45 * scale);
                ctx.lineTo(0, -62 * scale);
                ctx.stroke();

                // Radiant Star Pommel
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, -64 * scale, 4 * scale, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            } else {
                // Sword impaled in ground: Cataclysmic Light Column & Shockwave
                const impactAge = progress - (s.delay + 0.32);
                const pillarAlpha = Math.max(0, 1 - impactAge * 2.2);

                if (pillarAlpha > 0) {
                    ctx.save();

                    // Massive Vertical Holy Beam
                    const beamWidth = 44 * scale;
                    const beamHeight = 440;

                    // Outer golden beam halo
                    const outerBeam = ctx.createLinearGradient(sx - beamWidth, 0, sx + beamWidth, 0);
                    outerBeam.addColorStop(0, 'rgba(245, 158, 11, 0)');
                    outerBeam.addColorStop(0.3, `rgba(253, 224, 71, ${pillarAlpha * 0.55})`);
                    outerBeam.addColorStop(0.7, `rgba(253, 224, 71, ${pillarAlpha * 0.55})`);
                    outerBeam.addColorStop(1, 'rgba(245, 158, 11, 0)');
                    ctx.fillStyle = outerBeam;
                    ctx.fillRect(sx - beamWidth * 1.5, targetY - beamHeight, beamWidth * 3, beamHeight);

                    // Inner brilliant core pillar
                    const coreBeam = ctx.createLinearGradient(sx, targetY, sx, targetY - beamHeight);
                    coreBeam.addColorStop(0, `rgba(255, 255, 255, ${pillarAlpha * 0.95})`);
                    coreBeam.addColorStop(0.6, `rgba(255, 240, 150, ${pillarAlpha * 0.7})`);
                    coreBeam.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = coreBeam;
                    ctx.fillRect(sx - beamWidth * 0.5, targetY - beamHeight, beamWidth, beamHeight);

                    // Expanding Concentric Shockwaves on Ground
                    const shockRadius = (1 - pillarAlpha) * (85 * scale);
                    ctx.strokeStyle = `rgba(255, 235, 140, ${pillarAlpha * 0.9})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.ellipse(sx, targetY, shockRadius, shockRadius * 0.3, 0, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.strokeStyle = `rgba(245, 158, 11, ${pillarAlpha * 0.6})`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(sx, targetY, shockRadius * 1.35, shockRadius * 0.4, 0, 0, Math.PI * 2);
                    ctx.stroke();

                    // Holy Ground Fissures
                    ctx.strokeStyle = `rgba(255, 245, 180, ${pillarAlpha * 0.8})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(sx - 25 * scale, targetY + 2);
                    ctx.lineTo(sx - 8 * scale, targetY - 1);
                    ctx.lineTo(sx + 10 * scale, targetY + 3);
                    ctx.lineTo(sx + 28 * scale, targetY);
                    ctx.stroke();

                    // Impaled Sword Hilt embedded in ground
                    ctx.fillStyle = `rgba(255, 215, 0, ${pillarAlpha})`;
                    ctx.fillRect(sx - 3 * scale, targetY - 45 * scale, 6 * scale, 45 * scale);

                    ctx.restore();
                }
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
            case 'radiantTempest':
                this.renderRadiantTempest(ctx, effect, progress);
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
            case 'rageBlast':
                this.renderRageBlast(ctx, effect, progress);
                break;
            case 'flameSlash':
                this.renderFlameSlash(ctx, effect, progress);
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

    renderRageBlast(ctx, effect, progress) {
        const { x, y } = effect;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(x, y);

        // 1. Expanding Hellfire Ring / Crater Shockwave along the ground
        const maxBlastRadius = 240;
        const ringRadius = progress * maxBlastRadius;
        const ringAlpha = alpha * 0.9;

        // Ground fracture glow
        ctx.fillStyle = `rgba(255, 60, 0, ${ringAlpha * 0.35})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius, ringRadius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shockwave rings
        ctx.lineWidth = Math.max(2, (1 - progress) * 8);
        ctx.strokeStyle = `rgba(255, 200, 50, ${ringAlpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius, ringRadius * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = Math.max(1, (1 - progress) * 14);
        ctx.strokeStyle = `rgba(255, 40, 0, ${ringAlpha * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius * 0.85, ringRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Colossal Erupting Fire Pillar (Volcanic Geyser)
        const pillarHeight = 280 * Math.sin(progress * Math.PI);
        const pillarWidth = 140 * (1 - progress * 0.4);

        if (pillarHeight > 0) {
            const grad = ctx.createLinearGradient(0, 0, 0, -pillarHeight);
            grad.addColorStop(0, `rgba(255, 255, 220, ${alpha})`);
            grad.addColorStop(0.25, `rgba(255, 200, 30, ${alpha * 0.9})`);
            grad.addColorStop(0.65, `rgba(255, 50, 0, ${alpha * 0.75})`);
            grad.addColorStop(1, `rgba(180, 0, 0, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-pillarWidth * 0.5, 0);
            ctx.quadraticCurveTo(-pillarWidth * 0.7, -pillarHeight * 0.5, -pillarWidth * 0.2, -pillarHeight);
            ctx.lineTo(pillarWidth * 0.2, -pillarHeight);
            ctx.quadraticCurveTo(pillarWidth * 0.7, -pillarHeight * 0.5, pillarWidth * 0.5, 0);
            ctx.closePath();
            ctx.fill();

            // Inner core blast
            const coreGrad = ctx.createLinearGradient(0, 0, 0, -pillarHeight * 0.7);
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            coreGrad.addColorStop(0.4, `rgba(255, 240, 120, ${alpha * 0.95})`);
            coreGrad.addColorStop(1, `rgba(255, 100, 0, 0)`);

            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.moveTo(-pillarWidth * 0.2, 0);
            ctx.lineTo(-pillarWidth * 0.08, -pillarHeight * 0.7);
            ctx.lineTo(pillarWidth * 0.08, -pillarHeight * 0.7);
            ctx.lineTo(pillarWidth * 0.2, 0);
            ctx.closePath();
            ctx.fill();
        }

        // 3. Fissure Lava Cracks branching left and right
        const crackAlpha = alpha * 0.85;
        ctx.strokeStyle = `rgba(255, 120, 20, ${crackAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Left crack
        ctx.moveTo(0, 0);
        ctx.lineTo(-60 * progress, 3);
        ctx.lineTo(-130 * progress, -2);
        ctx.lineTo(-210 * progress, 4);
        // Right crack
        ctx.moveTo(0, 0);
        ctx.lineTo(60 * progress, 2);
        ctx.lineTo(130 * progress, -3);
        ctx.lineTo(210 * progress, 3);
        ctx.stroke();

        ctx.restore();
    }

    renderFlameSlash(ctx, effect, progress) {
        const { x, y, facing, size = 125 } = effect;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        // Fiery cleave wave physically surges forward
        ctx.translate(x + facing * (progress * 85), y);
        ctx.scale(facing, 1);

        // Blazing forward-reaching curved arc
        for (let i = 0; i < 4; i++) {
            const arcRadius = size + i * 20;
            const startAngle = -Math.PI * 0.72;
            const endAngle = startAngle + (0.55 + progress * 0.75) * Math.PI;

            ctx.beginPath();
            ctx.arc(35, -35, arcRadius, startAngle, endAngle);
            ctx.lineWidth = (1 - progress) * (18 - i * 3.5);
            ctx.strokeStyle = i === 0
                ? `rgba(255, 255, 220, ${alpha})`
                : (i === 1 ? `rgba(255, 180, 40, ${alpha * 0.9})` : (i === 2 ? `rgba(255, 60, 0, ${alpha * 0.75})` : `rgba(180, 0, 0, ${alpha * 0.4})`));
            ctx.stroke();
        }

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

    createValoriaRageBlast(player) {
        this.rageAuraTarget = player;
        this.rageAuraTimer = 0;
        this.flashScreen('#ff2200', 0.45, 0.4);

        // Main blast effect
        this.effects.push({
            type: 'rageBlast',
            x: player.x,
            y: player.y,
            life: 0.65,
            maxLife: 0.65
        });

        // Massive eruption particles
        for (let i = 0; i < 60; i++) {
            const angle = -Math.PI + Math.random() * Math.PI; // All upward directions
            const speed = 160 + Math.random() * 320;
            const colorRoll = Math.random();
            const color = colorRoll > 0.6 ? '#ff2a00' : (colorRoll > 0.25 ? '#ff9900' : '#ffee66');

            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 80,
                y: player.y - 15,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 160,
                size: 4 + Math.random() * 7,
                color,
                life: 0.45 + Math.random() * 0.4,
                maxLife: 0.85,
                gravity: 350
            });
        }

        // Heavy impact dust & stone chunks
        this.createImpact(player.x, player.y - 30, 'sword_impact_heavy');
        this.createDust(player.x - 60, player.y);
        this.createDust(player.x + 60, player.y);
    }

    createFlameSlash(player, attack) {
        this.effects.push({
            type: 'flameSlash',
            x: player.x,
            y: player.y,
            facing: player.facing,
            size: 130,
            life: 0.25,
            maxLife: 0.25
        });

        // Flame sparks trailing forward into the slash arc
        for (let i = 0; i < 20; i++) {
            const angle = -0.3 + (Math.random() - 0.5) * 0.9;
            const speed = 220 + Math.random() * 260;
            this.particles.push({
                x: player.x + player.facing * 50,
                y: player.y - 35 + (Math.random() - 0.5) * 40,
                vx: player.facing * Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                size: 3 + Math.random() * 5,
                color: Math.random() > 0.4 ? '#ff3a00' : (Math.random() > 0.5 ? '#ffaa00' : '#ffe066'),
                life: 0.28 + Math.random() * 0.2,
                maxLife: 0.48,
                gravity: 100
            });
        }
    }

    createBurnParticle(x, y, width, height) {
        const px = x + (Math.random() - 0.5) * (width || 30);
        const py = y - Math.random() * (height || 50);
        this.particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 35,
            vy: -40 - Math.random() * 50,
            size: 2.5 + Math.random() * 3.5,
            color: Math.random() > 0.4 ? '#ff3300' : (Math.random() > 0.5 ? '#ff8800' : '#ffee33'),
            life: 0.35 + Math.random() * 0.25,
            maxLife: 0.6,
            gravity: -15
        });
    }

    createBurnIgnite(x, y) {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 70 + Math.random() * 120;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.5 ? '#ff3300' : '#ffaa00',
                life: 0.3 + Math.random() * 0.25,
                maxLife: 0.55,
                gravity: 80
            });
        }
    }

    createHealGlow(player) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 45,
                y: player.y - Math.random() * (player.height || 60),
                vx: (Math.random() - 0.5) * 25,
                vy: -55 - Math.random() * 45,
                size: 2.5 + Math.random() * 3.5,
                color: Math.random() > 0.4 ? '#34d399' : '#a7f3d0',
                life: 0.45 + Math.random() * 0.3,
                maxLife: 0.75,
                gravity: -10
            });
        }
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
        // Celestial screen flash
        this.flashScreen('#fffbeb', 0.45, 0.55);

        // 7 staggered heavenly broadswords raining down across the forward arena
        const swords = [
            { offsetX: player.facing * -60, delay: 0.00, size: 1.1, impacted: false },
            { offsetX: player.facing * 40,  delay: 0.07, size: 1.25, impacted: false },
            { offsetX: player.facing * 130, delay: 0.14, size: 1.35, impacted: false },
            { offsetX: player.facing * 220, delay: 0.21, size: 1.5,  impacted: false },
            { offsetX: player.facing * 310, delay: 0.28, size: 1.4,  impacted: false },
            { offsetX: player.facing * 400, delay: 0.35, size: 1.25, impacted: false },
            { offsetX: player.facing * 490, delay: 0.42, size: 1.1,  impacted: false }
        ];

        this.effects.push({
            type: 'holySwords',
            x: player.x,
            y: player.y,
            facing: player.facing,
            swords,
            life: 1.5,
            maxLife: 1.5
        });

        // Erupting holy sparks and radiant feathers at cast position
        for (let i = 0; i < 28; i++) {
            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
            const speed = 70 + Math.random() * 160;
            this.particles.push({
                x: player.x + (Math.random() - 0.5) * 40,
                y: player.y - 45,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                color: Math.random() < 0.6 ? '#fde047' : '#ffffff',
                life: 0.5 + Math.random() * 0.4,
                maxLife: 0.9,
                gravity: -30
            });
        }
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
