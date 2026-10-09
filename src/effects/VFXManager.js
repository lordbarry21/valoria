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
            if (p.vRot) p.rot = (p.rot || 0) + p.vRot * dt;
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

        // Render particles with dark fantasy styling (directional blood streaks, elongated sparks, rock debris)
        for (const p of this.particles) {
            ctx.save();
            const alpha = Math.min(1, p.life / 0.18);
            ctx.globalAlpha = alpha;

            if (p.type === 'blood') {
                const speed = Math.hypot(p.vx, p.vy);
                if (speed > 55) {
                    const dirX = p.vx / speed;
                    const dirY = p.vy / speed;
                    const len = Math.min(15, speed * 0.04) * (p.life / p.maxLife);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(1.8, p.size * 0.85 * (p.life / p.maxLife));
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - dirX * len, p.y - dirY * len);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (p.type === 'spark') {
                const speed = Math.hypot(p.vx, p.vy);
                if (speed > 70) {
                    const dirX = p.vx / speed;
                    const dirY = p.vy / speed;
                    const len = Math.min(12, speed * 0.03) * (p.life / p.maxLife);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(1.2, p.size * 0.6);
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - dirX * len, p.y - dirY * len);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (p.type === 'rock') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot || 0);
                ctx.fillStyle = p.color;
                const s = p.size * (p.life / p.maxLife);
                ctx.fillRect(-s / 2, -s / 2, s, s);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
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
            case 'knightSlash':
                this.renderKnightSlash(ctx, effect, progress);
                break;
            case 'knightHeavyCleave':
                this.renderKnightHeavyCleave(ctx, effect, progress);
                break;
            case 'visceralSlashMark':
                this.renderVisceralSlashMark(ctx, effect, progress);
                break;
            case 'seismicShockwave':
                this.renderSeismicShockwave(ctx, effect, progress);
                break;
            case 'rageFlameWave':
                this.renderRageFlameWave(ctx, effect, progress);
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

    renderKnightSlash(ctx, effect, progress) {
        const { x, y, facing, comboCount = 1, isAir = false, isRaging = false } = effect;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        if (isAir || comboCount === 2) {
            // ====================================================
            // COMBO 2 & AIR: VERTICAL HELM-SPLITTER DOWNWARD CLEAVE
            // ====================================================
            const centerY = -30;
            const radius = 78;
            const startAngle = -Math.PI * 0.85;
            const endAngle = startAngle + Math.min(1.0, progress * 1.5) * Math.PI * 1.05;

            // 1. Outer volcanic crimson haze
            ctx.strokeStyle = isRaging ? `rgba(255, 30, 0, ${alpha * 0.85})` : `rgba(255, 75, 10, ${alpha * 0.7})`;
            ctx.lineWidth = (1 - progress) * 20;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, centerY, radius, startAngle, endAngle);
            ctx.stroke();

            // 2. Heavy steel glowing core
            ctx.strokeStyle = isRaging ? `rgba(255, 180, 50, ${alpha * 0.95})` : `rgba(255, 230, 140, ${alpha * 0.95})`;
            ctx.lineWidth = Math.max(2, (1 - progress) * 8);
            ctx.beginPath();
            ctx.arc(0, centerY, radius, startAngle, endAngle);
            ctx.stroke();

            // 3. Searing white-hot edge
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = Math.max(1, (1 - progress) * 3);
            ctx.beginPath();
            ctx.arc(0, centerY, radius + 2, startAngle + 0.1, endAngle);
            ctx.stroke();

            // 4. Ground spark burst at bottom of downward chop
            if (progress > 0.4 && progress < 0.9) {
                const spAlpha = (1 - progress) * 2;
                ctx.fillStyle = isRaging ? `rgba(255, 60, 0, ${spAlpha})` : `rgba(255, 220, 100, ${spAlpha})`;
                ctx.beginPath();
                ctx.arc(radius * 0.9, centerY + radius * 0.4, 8 * (1 - progress), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (comboCount >= 3) {
            // ====================================================
            // COMBO 3: SAVAGE DOUBLE-CLEAVE FINISHER
            // ====================================================
            const centerY = -36;
            const r1 = 76;
            const r2 = 88;

            // Primary slash: horizontal sweeping decapitation arc
            const s1 = -Math.PI * 0.65;
            const e1 = s1 + Math.min(1.0, progress * 1.3) * Math.PI * 1.0;

            ctx.strokeStyle = isRaging ? `rgba(255, 20, 0, ${alpha * 0.85})` : `rgba(255, 80, 0, ${alpha * 0.75})`;
            ctx.lineWidth = (1 - progress) * 18;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, centerY, r1, s1, e1);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 240, 200, ${alpha * 0.95})`;
            ctx.lineWidth = Math.max(2, (1 - progress) * 7);
            ctx.beginPath();
            ctx.arc(0, centerY, r1, s1, e1);
            ctx.stroke();

            // Secondary upward rising execution arc
            const s2 = Math.PI * 0.2;
            const e2 = s2 - Math.min(1.0, progress * 1.4) * Math.PI * 1.1;

            ctx.strokeStyle = isRaging ? `rgba(255, 120, 0, ${alpha * 0.8})` : `rgba(255, 160, 40, ${alpha * 0.7})`;
            ctx.lineWidth = (1 - progress) * 14;
            ctx.beginPath();
            ctx.arc(10, centerY - 6, r2, s2, e2, true);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = Math.max(1, (1 - progress) * 3);
            ctx.beginPath();
            ctx.arc(10, centerY - 6, r2, s2, e2, true);
            ctx.stroke();
        } else {
            // ====================================================
            // COMBO 1: WIDE FORWARD CLEAVE (THE TITAN'S BLADE)
            // ====================================================
            const centerY = -38;
            const radius = 75;
            const startAngle = -Math.PI * 0.6;
            const endAngle = startAngle + Math.min(1.0, progress * 1.4) * Math.PI * 0.95;

            // Outer fiery blade glow
            ctx.strokeStyle = isRaging ? `rgba(255, 20, 0, ${alpha * 0.85})` : `rgba(255, 100, 20, ${alpha * 0.75})`;
            ctx.lineWidth = (1 - progress) * 16;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, centerY, radius, startAngle, endAngle);
            ctx.stroke();

            // Inner hot steel core
            ctx.strokeStyle = isRaging ? `rgba(255, 200, 50, ${alpha * 0.95})` : `rgba(255, 235, 180, ${alpha * 0.95})`;
            ctx.lineWidth = Math.max(2, (1 - progress) * 6);
            ctx.beginPath();
            ctx.arc(0, centerY, radius, startAngle, endAngle);
            ctx.stroke();

            // Searing razor edge
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = Math.max(1, (1 - progress) * 2.5);
            ctx.beginPath();
            ctx.arc(0, centerY, radius + 2, startAngle, endAngle);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderKnightHeavyCleave(ctx, effect, progress) {
        const { x, y, facing, chargePercent = 1.0, isRaging = false } = effect;
        const alpha = Math.max(0, 1 - progress);
        const radius = 95 + 25 * chargePercent;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        const centerY = -30;
        const startAngle = -Math.PI * 0.85;
        const endAngle = startAngle + Math.min(1.0, progress * 1.5) * Math.PI * 1.15;

        // 1. Apocalyptic outer crimson shockwave
        ctx.strokeStyle = isRaging ? `rgba(255, 10, 0, ${alpha * 0.9})` : `rgba(255, 50, 0, ${alpha * 0.75})`;
        ctx.lineWidth = (1 - progress) * (24 + 10 * chargePercent);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, centerY, radius, startAngle, endAngle);
        ctx.stroke();

        // 2. Searing molten orange cleave
        ctx.strokeStyle = isRaging ? `rgba(255, 140, 20, ${alpha * 0.95})` : `rgba(255, 180, 50, ${alpha * 0.9})`;
        ctx.lineWidth = Math.max(3, (1 - progress) * 12);
        ctx.beginPath();
        ctx.arc(0, centerY, radius, startAngle, endAngle);
        ctx.stroke();

        // 3. Blinding white razor blade core
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.max(1.5, (1 - progress) * 5);
        ctx.beginPath();
        ctx.arc(0, centerY, radius + 2, startAngle + 0.05, endAngle);
        ctx.stroke();

        // 4. Trailing speed slice lines
        for (let i = 1; i <= 2; i++) {
            ctx.strokeStyle = `rgba(255, 120, 30, ${alpha * 0.5})`;
            ctx.lineWidth = (1 - progress) * 4;
            ctx.beginPath();
            ctx.arc(0, centerY, radius - i * 14, startAngle + 0.15 * i, endAngle - 0.1 * i);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderVisceralSlashMark(ctx, effect, progress) {
        const { x, y, angle = 0.5, length = 45, isDual = false } = effect;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Blazing crimson wound aura
        ctx.strokeStyle = `rgba(180, 0, 0, ${alpha * 0.9})`;
        ctx.lineWidth = Math.max(2, (1 - progress) * 8);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-length * 0.5, 0);
        ctx.lineTo(length * 0.5, 0);
        ctx.stroke();

        // White-hot flesh-parting core
        ctx.strokeStyle = `rgba(255, 240, 240, ${alpha})`;
        ctx.lineWidth = Math.max(1, (1 - progress) * 2.5);
        ctx.beginPath();
        ctx.moveTo(-length * 0.45, 0);
        ctx.lineTo(length * 0.45, 0);
        ctx.stroke();

        // If dual / heavy: Cross 'X' cut
        if (isDual) {
            ctx.rotate(Math.PI * 0.45);
            ctx.strokeStyle = `rgba(200, 10, 10, ${alpha * 0.85})`;
            ctx.lineWidth = Math.max(2, (1 - progress) * 7);
            ctx.beginPath();
            ctx.moveTo(-length * 0.4, 0);
            ctx.lineTo(length * 0.4, 0);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
            ctx.lineWidth = Math.max(1, (1 - progress) * 2);
            ctx.beginPath();
            ctx.moveTo(-length * 0.35, 0);
            ctx.lineTo(length * 0.35, 0);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderSeismicShockwave(ctx, effect, progress) {
        const { x, y, intensity = 2.0 } = effect;
        const maxR = 120 * intensity;

        ctx.save();
        // Expanding isometric ground shockwaves
        for (let i = 0; i < 3; i++) {
            const ringProg = Math.max(0, progress - i * 0.15);
            if (ringProg <= 0) continue;
            const rx = ringProg * maxR;
            const ry = rx * 0.35;
            const ringAlpha = (1 - ringProg) * (1 - i * 0.25);

            ctx.strokeStyle = i === 0
                ? `rgba(255, 70, 0, ${ringAlpha * 0.9})`
                : `rgba(255, 170, 40, ${ringAlpha * 0.7})`;
            ctx.lineWidth = Math.max(1.5, (1 - ringProg) * (8 - i * 2));
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderRageFlameWave(ctx, effect, progress) {
        const { x, y, facing, speed = 350 } = effect;
        const alpha = Math.max(0, 1 - progress);
        const curX = x + facing * (speed * progress);

        ctx.save();
        ctx.translate(curX, y - 28);
        ctx.scale(facing, 1);

        // Blazing forward-moving fire wave crescent
        const h = 55 * (1 - progress * 0.3);
        const grad = ctx.createLinearGradient(0, -h, 0, h);
        grad.addColorStop(0, 'rgba(255, 50, 0, 0)');
        grad.addColorStop(0.5, `rgba(255, 160, 20, ${alpha * 0.9})`);
        grad.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.quadraticCurveTo(-15, -h * 0.6, -10, -h);
        ctx.quadraticCurveTo(-4, 0, -10, h);
        ctx.quadraticCurveTo(-15, h * 0.6, 18, 0);
        ctx.closePath();
        ctx.fill();

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
        if (player.characterId === 'knight') {
            this.createKnightSwordSwing(player, attack);
            return;
        }

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

    createKnightSwordSwing(player, attack) {
        const isAir = !player.grounded;
        const combo = player.comboCount || 1;
        const isHeavy = attack.swingSound === 'sword_swing_heavy' || combo >= 2;
        const effect = {
            type: 'knightSlash',
            x: player.x,
            y: player.y,
            facing: player.facing,
            comboCount: combo,
            isAir,
            isRaging: Boolean(player.isRaging),
            attackType: isHeavy ? 'heavy' : 'light',
            life: 0.22,
            maxLife: 0.22
        };
        this.effects.push(effect);

        // Flying sparks along the cutting path
        const numSparks = player.isRaging ? 14 : (isHeavy ? 10 : 6);
        for (let i = 0; i < numSparks; i++) {
            const angle = player.facing === 1
                ? (-Math.PI * 0.45 + (Math.random() - 0.5) * 1.2)
                : (-Math.PI * 0.55 + (Math.random() - 0.5) * 1.2);
            const speed = 120 + Math.random() * 220;
            this.particles.push({
                type: 'spark',
                x: player.x + player.facing * (35 + Math.random() * 40),
                y: player.y - 35 + (Math.random() - 0.5) * 35,
                vx: Math.cos(angle) * speed * player.facing,
                vy: Math.sin(angle) * speed - 40,
                size: 2 + Math.random() * 3,
                color: player.isRaging ? '#ff3300' : (Math.random() > 0.4 ? '#ffcc33' : '#ffffff'),
                life: 0.2 + Math.random() * 0.18,
                maxLife: 0.38,
                gravity: 250
            });
        }

        // If raging: unleash an aggressive forward fire wave
        if (player.isRaging) {
            this.effects.push({
                type: 'rageFlameWave',
                x: player.x + player.facing * 30,
                y: player.y,
                facing: player.facing,
                speed: 380,
                life: 0.28,
                maxLife: 0.28
            });
        }

        // Foot dust on heavy cleave
        if (isHeavy && player.grounded) {
            this.createDust(player.x, player.y);
        }
    }

    createHeavySwing(player, attack, chargePercent = 1.0) {
        if (player.characterId === 'knight') {
            this.createKnightHeavyCleave(player, attack, chargePercent);
            return;
        }

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

    createKnightHeavyCleave(player, attack, chargePercent = 1.0) {
        const effect = {
            type: 'knightHeavyCleave',
            x: player.x,
            y: player.y,
            facing: player.facing,
            chargePercent,
            isRaging: Boolean(player.isRaging),
            life: 0.32,
            maxLife: 0.32
        };
        this.effects.push(effect);

        // Ground fracture at impact point
        const impactX = player.x + player.facing * 60;
        this.effects.push({
            type: 'fissure',
            x: impactX,
            y: player.y,
            facing: player.facing,
            length: 120 + 80 * chargePercent,
            life: 0.45,
            maxLife: 0.45
        });

        // Rock chunks blasted into the air
        const rocks = 12 + Math.floor(16 * chargePercent);
        for (let i = 0; i < rocks; i++) {
            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
            const speed = 160 + Math.random() * (220 * chargePercent + 100);
            this.particles.push({
                type: 'rock',
                x: impactX + (Math.random() - 0.5) * 30,
                y: player.y - 4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                size: 3 + Math.random() * 5,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 15,
                color: Math.random() > 0.5 ? '#3b2f28' : '#57483d',
                life: 0.45 + Math.random() * 0.3,
                maxLife: 0.75,
                gravity: 600
            });
        }

        // Fire sparks
        const sparks = 15 + Math.floor(15 * chargePercent);
        for (let i = 0; i < sparks; i++) {
            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 2;
            const speed = 180 + Math.random() * 250;
            this.particles.push({
                type: 'spark',
                x: impactX,
                y: player.y - 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.3 ? '#ffaa00' : '#ffffff',
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                gravity: 400
            });
        }

        this.createDust(impactX, player.y);
    }

    createVisceralImpact(x, y, facing, attack, isDead = false, isRaging = false, characterId = 'knight') {
        const isKnight = characterId === 'knight';
        const isHeavy = attack.id === 'slash_3' || attack.id === 'slash_4' || attack.id === 'heavy' || attack.id === 'iron_breaker';

        // 1. Visceral wound slash mark directly on the target
        this.effects.push({
            type: 'visceralSlashMark',
            x, y,
            angle: isHeavy ? (Math.random() > 0.5 ? 0.35 : -0.35) : (Math.random() > 0.5 ? 0.6 : -0.6),
            isDual: isHeavy,
            length: isHeavy ? 65 : 44,
            life: 0.28,
            maxLife: 0.28
        });

        // 2. High-velocity arterial blood spray
        const bloodCount = isDead ? (isKnight ? 38 : 26) : (isHeavy ? 20 : 12);
        for (let i = 0; i < bloodCount; i++) {
            let angle;
            if (isDead) {
                // Lethal execution: 360-degree gore burst with forward bias
                angle = Math.random() * Math.PI * 2;
            } else {
                angle = (facing === 1 ? -0.3 : Math.PI + 0.3) + (Math.random() - 0.5) * 1.3;
            }
            const speed = isDead ? (120 + Math.random() * 320) : (160 + Math.random() * 260);
            const bloodColors = ['#4a0000', '#7a0000', '#990000', '#cc0505', '#2c0000'];

            this.particles.push({
                type: 'blood',
                x: x + (Math.random() - 0.5) * 14,
                y: y + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                size: 2.2 + Math.random() * 3.2,
                color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
                life: 0.35 + Math.random() * 0.3,
                maxLife: 0.65,
                gravity: 450
            });
        }

        // 3. Dense metallic & armor sparks
        const sparkCount = isHeavy ? 20 : 12;
        for (let i = 0; i < sparkCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 140 + Math.random() * 240;
            this.particles.push({
                type: 'spark',
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 60,
                size: 1.5 + Math.random() * 2.5,
                color: Math.random() > 0.4 ? '#ffffff' : (Math.random() > 0.5 ? '#ffcc44' : '#ff6600'),
                life: 0.22 + Math.random() * 0.18,
                maxLife: 0.4,
                gravity: 350
            });
        }

        // 4. If lethal kill: extra gore chunks and dark shadow mist
        if (isDead) {
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 80 + Math.random() * 160;
                this.particles.push({
                    type: 'rock',
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 80,
                    size: 3 + Math.random() * 4,
                    rot: Math.random() * Math.PI * 2,
                    vRot: (Math.random() - 0.5) * 12,
                    color: Math.random() > 0.5 ? '#1f0303' : '#140000',
                    life: 0.5 + Math.random() * 0.3,
                    maxLife: 0.8,
                    gravity: 380
                });
            }
        }

        // 5. If raging: explosive fire detonation at impact point
        if (isRaging) {
            for (let i = 0; i < 16; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 120 + Math.random() * 200;
                this.particles.push({
                    type: 'spark',
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 70,
                    size: 3 + Math.random() * 4,
                    color: Math.random() > 0.4 ? '#ff2200' : '#ff9900',
                    life: 0.3 + Math.random() * 0.25,
                    maxLife: 0.55,
                    gravity: 200
                });
            }
        }
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
        // Sequential volcanic magma pillars bursting forward along dash
        const totalPillars = 4;
        const spacing = 45;
        for (let i = 1; i <= totalPillars; i++) {
            const px = player.x + player.facing * (i * spacing);
            this.effects.push({
                type: 'fissure',
                x: px,
                y: player.y,
                facing: player.facing,
                length: 65,
                life: 0.45 + i * 0.05,
                maxLife: 0.45 + i * 0.05
            });
        }

        // Blazing magma rush trail
        this.trails.push({
            points: [
                { x: player.x - player.facing * 100, y: player.y - 30 },
                { x: player.x - player.facing * 50, y: player.y - 32 },
                { x: player.x, y: player.y - 35 },
                { x: player.x + player.facing * 80, y: player.y - 35 }
            ],
            color: 'rgba(255, 60, 0, 0.9)',
            width: 24,
            life: 0.38,
            maxLife: 0.38
        });

        // 25+ magma embers & rock shards
        for (let i = 0; i < 26; i++) {
            const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
            const speed = 140 + Math.random() * 220;
            this.particles.push({
                type: 'spark',
                x: player.x + player.facing * (40 + Math.random() * 100),
                y: player.y - 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 70,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.4 ? '#ff3300' : (Math.random() > 0.5 ? '#ffaa00' : '#ffffff'),
                life: 0.35 + Math.random() * 0.3,
                maxLife: 0.65,
                gravity: 380
            });
        }

        this.createImpact(player.x + player.facing * 120, player.y - 35, 'sword_impact_heavy');
        this.createDust(player.x + player.facing * 100, player.y);
    }

    createIronBreaker(player) {
        // Massive seismic ground slam with radial shockwaves
        this.effects.push({
            type: 'seismicShockwave',
            x: player.x,
            y: player.y,
            intensity: 2.2,
            life: 0.55,
            maxLife: 0.55
        });

        // Ground fracture lines left and right
        this.effects.push({
            type: 'fissure',
            x: player.x,
            y: player.y,
            facing: 1,
            length: 150,
            life: 0.55,
            maxLife: 0.55
        });
        this.effects.push({
            type: 'fissure',
            x: player.x,
            y: player.y,
            facing: -1,
            length: 150,
            life: 0.55,
            maxLife: 0.55
        });

        // 40+ flying stone boulders and volcanic debris
        for (let i = 0; i < 42; i++) {
            const angle = -Math.PI + Math.random() * Math.PI;
            const speed = 160 + Math.random() * 280;
            this.particles.push({
                type: 'rock',
                x: player.x + (Math.random() - 0.5) * 60,
                y: player.y - 4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 180,
                size: 3.5 + Math.random() * 6.5,
                rot: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 16,
                color: Math.random() > 0.4 ? '#382a20' : (Math.random() > 0.5 ? '#574233' : '#ff4400'),
                life: 0.55 + Math.random() * 0.35,
                maxLife: 0.9,
                gravity: 650
            });
        }

        // Dense explosion of fiery sparks
        for (let i = 0; i < 28; i++) {
            const angle = -Math.PI + Math.random() * Math.PI;
            const speed = 180 + Math.random() * 260;
            this.particles.push({
                type: 'spark',
                x: player.x + (Math.random() - 0.5) * 30,
                y: player.y - 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                size: 2.5 + Math.random() * 3.5,
                color: Math.random() > 0.3 ? '#ffbb22' : '#ffffff',
                life: 0.35 + Math.random() * 0.25,
                maxLife: 0.6,
                gravity: 450
            });
        }

        this.flashScreen('#ff9900', 0.25, 0.4);
        this.createDust(player.x, player.y);
    }

    createRageAura(player) {
        this.rageAuraTarget = player;
        this.rageAuraTimer = 0;
        this.flashScreen('#bb0000', 0.4, 0.45);

        // Apocalyptic eruption of berserk flame pillars
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 240;
            this.particles.push({
                type: 'spark',
                x: player.x + (Math.random() - 0.5) * 30,
                y: player.y - 35,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 160,
                size: 3.5 + Math.random() * 5.5,
                color: Math.random() > 0.35 ? '#ff2200' : (Math.random() > 0.5 ? '#ff8800' : '#ffffff'),
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0,
                gravity: 120
            });
        }

        // Outward expanding ring of fire
        this.effects.push({
            type: 'aura',
            x: player.x,
            y: player.y - 20,
            color: 'rgba(255, 30, 0',
            maxRadius: 110,
            life: 0.5,
            maxLife: 0.5
        });
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
