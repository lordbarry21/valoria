/**
 * VALORIA - Enemy Manager
 * Handles multi-stage enemy spawning, wave progression, updates, and rendering
 */

import { player, gameWorld, victoryAchieved, audioManager, vfxManager, camera, GAME_CONFIG } from '../main.js';
import { Enemy } from './Enemy.js';
import { WraithSoldier } from './WraithSoldier.js';
import { SkeletonEnemy } from './SkeletonEnemy.js';
import { GoblinEnemy } from './GoblinEnemy.js';
import { FlyingEyeEnemy } from './FlyingEyeEnemy.js';
import { MushroomEnemy } from './MushroomEnemy.js';
import { Brute } from './Brute.js';
import { ShadowCaster } from './ShadowCaster.js';
import { BossKnight } from './BossKnight.js';
import { PlagueRat } from './PlagueRat.js';

const TOTAL_WAVES = 6;
const WAVE_INTERMISSION = 2.0;
const WAVE_BANNER_DURATION = 3.2;
const MIN_SPAWN_DISTANCE_FROM_PLAYER = 320;
const SPAWN_XS = [180, 520, 950, 1420, 1850, 2250, 2450];

const ENEMY_FACTORIES = {
    rat: () => new PlagueRat(),
    wraith: () => new WraithSoldier(),
    skeleton: () => new SkeletonEnemy(),
    goblin: () => new GoblinEnemy(),
    eye: () => new FlyingEyeEnemy(),
    mushroom: () => new MushroomEnemy(),
    brute: () => new Brute(),
    caster: () => new ShadowCaster(),
    boss: () => new BossKnight(),
};

export class EnemyManager {
    constructor() {
        this.enemies = [];
        this.waveNumber = 0;
        this.totalWaves = TOTAL_WAVES;
        this.intermissionTimer = 0;
        this.bannerTimer = 0;
        this.bannerDuration = WAVE_BANNER_DURATION;
        this.bannerText = '';
        this.stage = 1;
        this.portalActive = false;
        this.portal = null;
    }

    init() {
        this.enemies = [];
        this.waveNumber = 0;
        this.intermissionTimer = 0;
        this.bannerTimer = 0;
        this.bannerDuration = WAVE_BANNER_DURATION;
        this.bannerText = '';
        this.stage = 1;
        this.portalActive = false;
        this.portal = null;
        if (gameWorld?.bgImage) {
            gameWorld.bgImage.src = 'Assets/Assets/PNG/Castle-Background.png';
        }
    }

    spawnWave() {
        this.waveNumber++;

        let roster = [];
        let banner = `Stage 1 - Wave ${this.waveNumber}`;

        if (this.waveNumber === 1) {
            banner = 'Stage 1: Castle Ramparts - Infestation';
            roster = ['rat', 'rat', 'rat', 'skeleton', 'skeleton'];
        } else if (this.waveNumber === 2) {
            banner = 'Wave 2: Goblin Ambush & Flying Fiends';
            roster = ['goblin', 'goblin', 'rat', 'rat', 'eye', 'eye', 'skeleton'];
        } else if (this.waveNumber === 3) {
            banner = 'MINI-BOSS: Fungal Abomination & Plague Swarm';
            roster = ['mushroom', 'brute', 'rat', 'rat', 'skeleton', 'skeleton'];
        } else if (this.waveNumber === 4) {
            this.stage = 2;
            audioManager.playMusic('stage2');
            banner = 'Stage 2: Frozen Citadel - Aerial Dread';
            if (gameWorld?.bgImage) {
                gameWorld.bgImage.src = 'Assets/Assets/PNG/Ice-Background.png';
            }
            roster = ['brute', 'brute', 'goblin', 'goblin', 'eye', 'eye', 'rat', 'rat'];
        } else if (this.waveNumber === 5) {
            banner = 'BOSS: The Dark Necromancer & The Undead Horde';
            roster = ['caster', 'skeleton', 'skeleton', 'wraith', 'wraith', 'brute'];
        } else if (this.waveNumber === 6) {
            banner = 'FINAL CLIMAX: Malakar, The Fallen Knight';
            roster = ['boss', 'brute', 'skeleton'];
        }

        const spawnXs = this.getSpawnPositions();
        roster.forEach((type, index) => this.spawnEnemy(type, spawnXs[index % spawnXs.length]));

        this.showBanner(banner);
    }

    // Prefer spawn points away from the player so nobody gets hit the instant a wave starts.
    getSpawnPositions() {
        const farPoints = SPAWN_XS.filter(x => Math.abs(x - player.x) >= MIN_SPAWN_DISTANCE_FROM_PLAYER);
        return farPoints.length > 0 ? farPoints : SPAWN_XS;
    }

    spawnEnemy(type, spawnX) {
        const enemy = ENEMY_FACTORIES[type]?.() ?? new Enemy();
        enemy.x = gameWorld.clampX(spawnX + (Math.random() - 0.5) * 60, enemy.width / 2);
        enemy.y = gameWorld.floorY;
        enemy.facing = player.x > enemy.x ? 1 : -1;
        enemy.init();
        this.enemies.push(enemy);
    }

    showBanner(text, duration = WAVE_BANNER_DURATION) {
        this.bannerText = text;
        this.bannerDuration = duration;
        this.bannerTimer = duration;
    }

    spawnPortal() {
        this.portalActive = true;
        this.portal = {
            x: 2360,
            y: gameWorld?.floorY || 500,
            radius: 48,
            animTime: 0
        };
        this.showBanner('FROST PORTAL OPENED! FOLLOW THE ARROW', 3.6);
        audioManager.playSFX('skill_ready');
    }

    enterPortal() {
        this.portalActive = false;
        this.portal = null;
        this.stage = 2;
        audioManager.playMusic('stage2');

        if (gameWorld?.bgImage) {
            gameWorld.bgImage.src = 'Assets/Assets/PNG/Ice-Background.png';
        }

        audioManager.playSFX('sword_swing_heavy');
        vfxManager.createImpact(player.x, player.y - 40, 'sword_impact_heavy');
        camera.shakeHeavy();

        player.x = 240;
        player.y = gameWorld?.floorY || 500;
        player.vx = 0;
        player.vy = 0;
        camera.follow(player, 0);
        camera.snapToTarget();

        this.intermissionTimer = 1.0;
        this.spawnWave();
    }

    update(dt) {
        if (this.bannerTimer > 0) this.bannerTimer -= dt;

        if (this.portalActive && this.portal) {
            this.portal.animTime += dt;
            const dist = Math.hypot(player.x - this.portal.x, player.y - this.portal.y);
            if (dist < 60) {
                this.enterPortal();
                return;
            }
        }

        for (const enemy of this.enemies) {
            enemy.update(dt);
        }

        this.separateEnemies();
        this.enemies = this.enemies.filter(e => !e.shouldRemove);

        if (player.isDead || this.enemies.length > 0) return;
        this.advanceWave(dt);
    }

    advanceWave(dt) {
        if (this.waveNumber >= TOTAL_WAVES) {
            victoryAchieved();
            return;
        }

        // When Stage 1 (Wave 3) is cleared, spawn the Frost Portal to Ice Map!
        if (this.waveNumber === 3 && this.stage === 1) {
            if (!this.portalActive) {
                this.spawnPortal();
            }
            return;
        }

        if (this.portalActive) return;

        if (this.intermissionTimer <= 0) {
            this.intermissionTimer = WAVE_INTERMISSION;
            this.showBanner('Wave Cleared');
            return;
        }

        this.intermissionTimer -= dt;
        if (this.intermissionTimer <= 0) this.spawnWave();
    }

    // Push overlapping living enemies apart so a group doesn't collapse into one sprite.
    separateEnemies() {
        const living = this.enemies.filter(e => !e.isDead);

        for (let i = 0; i < living.length; i++) {
            for (let j = i + 1; j < living.length; j++) {
                const a = living[i];
                const b = living[j];
                const minGap = (a.width + b.width) * 0.4;
                const dx = b.x - a.x;
                const overlap = minGap - Math.abs(dx);
                if (overlap <= 0) continue;

                const push = (overlap / 2) * (dx >= 0 ? 1 : -1);
                a.x = gameWorld.clampX(a.x - push, a.width / 2);
                b.x = gameWorld.clampX(b.x + push, b.width / 2);
            }
        }
    }

    render(ctx) {
        if (this.portalActive && this.portal) {
            this.renderPortal(ctx);
        }

        const sortedByDepth = [...this.enemies].sort((a, b) => a.y - b.y);
        for (const enemy of sortedByDepth) {
            enemy.render(ctx);
        }

        if (this.portalActive && this.portal) {
            this.renderPortalIndicator(ctx);
        }
    }

    renderPortal(ctx) {
        const p = this.portal;
        const t = p.animTime;
        const centerX = p.x;
        const floorY = p.y;
        const centerY = floorY - 72;
        const radiusX = 36;
        const radiusY = 70;

        ctx.save();

        // 1. Ascending Volumetric Frost God-Ray / Light Column
        const beamPulse = 0.85 + Math.sin(t * 2) * 0.15;
        const beamWidth = (72 + Math.sin(t * 1.6) * 10) * beamPulse;
        const beamHeight = 420;
        const beamGrad = ctx.createLinearGradient(centerX, floorY, centerX, floorY - beamHeight);
        beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
        beamGrad.addColorStop(0.2, 'rgba(2, 132, 199, 0.15)');
        beamGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.05)');
        beamGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(centerX - beamWidth / 2, floorY - beamHeight, beamWidth, beamHeight);

        // 2. Ground Frost Crater & Radiating Ice Fractures
        const groundGrad = ctx.createRadialGradient(centerX, floorY, 10, centerX, floorY, 110);
        groundGrad.addColorStop(0, 'rgba(125, 211, 252, 0.55)');
        groundGrad.addColorStop(0.35, 'rgba(14, 165, 233, 0.25)');
        groundGrad.addColorStop(0.7, 'rgba(3, 105, 161, 0.1)');
        groundGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, floorY + 2, 100, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const crackAngles = [0, 0.45, 0.9, 1.35, 1.8, 2.25, 2.7, 3.14, 3.6, 4.1, 4.6, 5.2, 5.8];
        for (let i = 0; i < crackAngles.length; i++) {
            const angle = crackAngles[i];
            const length = 55 + ((i * 19) % 35);
            const ex = centerX + Math.cos(angle) * length;
            const ey = floorY + Math.sin(angle) * (length * 0.26);
            ctx.moveTo(centerX, floorY);
            const mx = centerX + Math.cos(angle) * (length * 0.5) + ((i % 2 === 0 ? 1 : -1) * 4);
            const my = floorY + Math.sin(angle) * (length * 0.13);
            ctx.lineTo(mx, my);
            ctx.lineTo(ex, ey);
        }
        ctx.stroke();

        // 3. Periodic Dimensional Shockwave Pulses
        const wavePeriod = 1.8;
        const waveProgress = (t % wavePeriod) / wavePeriod;
        const waveScale = 0.6 + waveProgress * 1.5;
        const waveAlpha = (1 - waveProgress) * 0.6;
        ctx.save();
        ctx.strokeStyle = `rgba(125, 211, 252, ${waveAlpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX * waveScale, radiusY * waveScale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 4. Vertical Arcane Rift (Organic Spacetime Tear)
        ctx.save();
        ctx.beginPath();
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const wobble = Math.sin(angle * 5 + t * 4) * 2.5 + Math.cos(angle * 3 - t * 3) * 1.8;
            const rx = radiusX + wobble;
            const ry = radiusY + wobble * 1.3;
            const px = centerX + Math.cos(angle) * rx;
            const py = centerY + Math.sin(angle) * ry;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const riftGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, radiusY);
        riftGrad.addColorStop(0, '#ffffff');
        riftGrad.addColorStop(0.2, '#bae6fd');
        riftGrad.addColorStop(0.45, '#38bdf8');
        riftGrad.addColorStop(0.75, '#0284c7');
        riftGrad.addColorStop(0.92, '#0c4a6e');
        riftGrad.addColorStop(1, '#020617');
        ctx.fillStyle = riftGrad;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();

        // 5. Swirling Gravitational Accretion Spiral Arms
        ctx.save();
        for (let a = 0; a < 4; a++) {
            const baseAngle = a * (Math.PI / 2) + t * 2.8;
            ctx.beginPath();
            const armSteps = 14;
            for (let step = 0; step <= armSteps; step++) {
                const fraction = step / armSteps;
                const curRx = radiusX * (1 - fraction * 0.88);
                const curRy = radiusY * (1 - fraction * 0.88);
                const theta = baseAngle + fraction * Math.PI * 1.5;
                const sx = centerX + Math.cos(theta) * curRx;
                const sy = centerY + Math.sin(theta) * curRy;
                if (step === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.strokeStyle = a % 2 === 0 ? 'rgba(255, 255, 255, 0.75)' : 'rgba(125, 211, 252, 0.85)';
            ctx.lineWidth = 2.2;
            ctx.stroke();
        }
        ctx.restore();

        // 6. Dual 3D-Isometric Runic Rings
        // Outer Ring (perspective-tilted, clockwise rotation)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(0.35);
        ctx.scale(1.28, 1.0);
        ctx.rotate(t * 1.3);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.4;
        ctx.setLineDash([14, 8, 4, 8]);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, radiusX * 1.32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#e0f2fe';
        for (let r = 0; r < 8; r++) {
            const rAngle = (r / 8) * Math.PI * 2;
            const rx1 = Math.cos(rAngle) * (radiusX * 1.25);
            const ry1 = Math.sin(rAngle) * (radiusX * 1.25);
            const rx2 = Math.cos(rAngle) * (radiusX * 1.39);
            const ry2 = Math.sin(rAngle) * (radiusX * 1.39);
            ctx.beginPath();
            ctx.moveTo(rx1, ry1);
            ctx.lineTo(rx2, ry2);
            ctx.stroke();
        }
        ctx.restore();

        // Inner Counter-Rotating Ring
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-0.3);
        ctx.scale(1.15, 0.95);
        ctx.rotate(-t * 1.7);
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, radiusX * 0.95, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#7dd3fc';
        ctx.shadowBlur = 6;
        for (let n = 0; n < 4; n++) {
            const nAngle = (n / 4) * Math.PI * 2;
            const nx = Math.cos(nAngle) * (radiusX * 0.95);
            const ny = Math.sin(nAngle) * (radiusX * 0.95);
            ctx.beginPath();
            ctx.moveTo(nx, ny - 3.5);
            ctx.lineTo(nx + 3.5, ny);
            ctx.lineTo(nx, ny + 3.5);
            ctx.lineTo(nx - 3.5, ny);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // 7. Crackling Arcane Lightning Arcs
        const boltSeed = Math.floor(t * 10);
        if (boltSeed % 2 === 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.shadowColor = '#7dd3fc';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 1.8;
            for (let b = 0; b < 2; b++) {
                const angle = ((boltSeed * 2.3 + b * 2.8) % (Math.PI * 2));
                const startX = centerX + Math.cos(angle) * (radiusX * 1.25);
                const startY = centerY + Math.sin(angle) * (radiusY * 1.05);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                const midX = centerX + (startX - centerX) * 0.5 + (Math.sin(boltSeed * 7 + b) * 8);
                const midY = centerY + (startY - centerY) * 0.5 + (Math.cos(boltSeed * 5 + b) * 8);
                ctx.lineTo(midX, midY);
                ctx.lineTo(centerX, centerY);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 8. Deterministic Vortex Particles
        // Inward Suction Wisps
        for (let i = 0; i < 16; i++) {
            const seed = i * 1.37;
            const particleLife = ((t * 1.4 + seed) % 1);
            const distRatio = 1 - particleLife;
            const pAngle = t * 3 + i * (Math.PI / 8) + (1 - distRatio) * 3;
            const px = centerX + Math.cos(pAngle) * (radiusX * 1.35 * distRatio);
            const py = centerY + Math.sin(pAngle) * (radiusY * 1.25 * distRatio);
            const pAlpha = Math.sin(particleLife * Math.PI) * 0.85;
            const pRadius = 1.2 + (1 - distRatio) * 2.0;

            ctx.fillStyle = i % 2 === 0 ? `rgba(255, 255, 255, ${pAlpha})` : `rgba(56, 189, 248, ${pAlpha})`;
            ctx.beginPath();
            ctx.arc(px, py, pRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rising Frost Glints
        for (let j = 0; j < 12; j++) {
            const seed = j * 2.11;
            const shardLife = ((t * 0.8 + seed) % 1);
            const sx = centerX + Math.sin(t * 1.5 + seed * 3) * (radiusX * 0.8);
            const sy = floorY - shardLife * (radiusY * 2.2);
            const sAlpha = Math.sin(shardLife * Math.PI) * 0.9;
            const sSize = 1.8 + Math.sin(t * 6 + j) * 0.8;

            ctx.fillStyle = `rgba(224, 242, 254, ${sAlpha})`;
            ctx.beginPath();
            ctx.moveTo(sx, sy - sSize);
            ctx.lineTo(sx + sSize, sy);
            ctx.lineTo(sx, sy + sSize);
            ctx.lineTo(sx - sSize, sy);
            ctx.closePath();
            ctx.fill();
        }

        // 9. Central Singularity Flash
        const singularityPulse = 6 + Math.sin(t * 8) * 2;
        const singGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, singularityPulse * 2.5);
        singGrad.addColorStop(0, '#ffffff');
        singGrad.addColorStop(0.4, 'rgba(186, 230, 253, 0.8)');
        singGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = singGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, singularityPulse * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 10. In-World Floating Beacon Prompt
        const playerDist = Math.hypot(player.x - centerX, player.y - floorY);
        const isNear = playerDist < 90;
        const promptY = centerY - radiusY - 26 + Math.sin(t * 3) * 4;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const promptW = 164;
        const promptH = 34;
        const promptX = centerX - promptW / 2;

        ctx.fillStyle = 'rgba(8, 14, 26, 0.88)';
        ctx.beginPath();
        ctx.roundRect(promptX, promptY - promptH / 2, promptW, promptH, 5);
        ctx.fill();

        ctx.strokeStyle = isNear ? '#fef08a' : 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = isNear ? '#facc15' : '#0284c7';
        ctx.shadowBlur = isNear ? 8 : 4;
        ctx.stroke();

        ctx.font = '700 9px Cinzel, serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('✦ FROST CITADEL RIFT ✦', centerX, promptY - 7);

        ctx.font = '700 11px Cinzel, serif';
        ctx.fillStyle = isNear ? '#fef08a' : '#ffffff';
        ctx.fillText(isNear ? '[ ENTERING GATEWAY... ]' : '[ STEP INSIDE TO TRAVEL ]', centerX, promptY + 7);

        ctx.fillStyle = isNear ? '#fef08a' : 'rgba(56, 189, 248, 0.8)';
        ctx.beginPath();
        ctx.moveTo(centerX - 5, promptY + promptH / 2);
        ctx.lineTo(centerX + 5, promptY + promptH / 2);
        ctx.lineTo(centerX, promptY + promptH / 2 + 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }

    renderPortalIndicator(ctx) {
        if (!this.portal || !player) return;

        const halfWidth = GAME_CONFIG.CANVAS_WIDTH / 2;
        const screenX = this.portal.x - camera.x + halfWidth;

        // Hide edge beacon when the portal itself is already visible on screen
        if (screenX >= 90 && screenX <= GAME_CONFIG.CANVAS_WIDTH - 90) return;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const isRight = screenX > GAME_CONFIG.CANVAS_WIDTH - 90;
        const dockX = isRight ? GAME_CONFIG.CANVAS_WIDTH - 24 : 24;
        const dockY = 220 + Math.sin(this.portal.animTime * 2.8) * 4;
        const distMeters = Math.max(0, Math.round(Math.abs(this.portal.x - player.x)));
        const t = this.portal.animTime;

        const badgeW = 148;
        const badgeH = 36;
        const noseW = 14;

        ctx.translate(dockX, dockY);

        // 1. Sculpted Chevron Badge Path
        ctx.beginPath();
        if (isRight) {
            ctx.moveTo(-badgeW, -badgeH / 2);
            ctx.lineTo(-noseW, -badgeH / 2);
            ctx.lineTo(0, 0);
            ctx.lineTo(-noseW, badgeH / 2);
            ctx.lineTo(-badgeW, badgeH / 2);
        } else {
            ctx.moveTo(badgeW, -badgeH / 2);
            ctx.lineTo(noseW, -badgeH / 2);
            ctx.lineTo(0, 0);
            ctx.lineTo(noseW, badgeH / 2);
            ctx.lineTo(badgeW, badgeH / 2);
        }
        ctx.closePath();

        const bgGrad = ctx.createLinearGradient(isRight ? -badgeW : badgeW, 0, 0, 0);
        bgGrad.addColorStop(0, 'rgba(8, 14, 26, 0.95)');
        bgGrad.addColorStop(0.7, 'rgba(12, 24, 44, 0.92)');
        bgGrad.addColorStop(1, 'rgba(18, 38, 68, 0.95)');
        ctx.fillStyle = bgGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Embedded Faceted Frost Crystal Gem
        const gemX = isRight ? -badgeW + 20 : badgeW - 20;
        const gemY = 0;
        ctx.save();
        ctx.fillStyle = '#e0f2fe';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(gemX, gemY - 8);
        ctx.lineTo(gemX + 7, gemY);
        ctx.lineTo(gemX, gemY + 8);
        ctx.lineTo(gemX - 7, gemY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(2, 132, 199, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gemX - 7, gemY);
        ctx.lineTo(gemX + 7, gemY);
        ctx.moveTo(gemX, gemY - 8);
        ctx.lineTo(gemX, gemY + 8);
        ctx.stroke();
        ctx.restore();

        // 3. Two-Tier Typography
        const textX = isRight ? -badgeW / 2 - 4 : badgeW / 2 + 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '700 9px Cinzel, serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('FROST RIFT', textX, -6);

        ctx.font = '700 12px Cinzel, serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${distMeters}m`, textX, 7);
        ctx.shadowBlur = 0;

        // 4. Hand-Crafted Animated Directional Chevron Needle
        const needleX = isRight ? -noseW - 3 + Math.sin(t * 6) * 2.5 : noseW + 3 - Math.sin(t * 6) * 2.5;
        const dir = isRight ? 1 : -1;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(needleX - dir * 6, -6);
        ctx.lineTo(needleX + dir * 2, 0);
        ctx.lineTo(needleX - dir * 6, 6);
        ctx.lineTo(needleX - dir * 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 5. Sequential Energy Guidance Dots
        for (let p = 0; p < 3; p++) {
            const pipX = needleX - dir * (9 + p * 6);
            const pipPhase = ((t * 4 + p * 0.8) % 3);
            const pipAlpha = 0.3 + (1 - pipPhase / 3) * 0.7;
            ctx.fillStyle = `rgba(125, 211, 252, ${pipAlpha})`;
            ctx.beginPath();
            ctx.arc(pipX, 0, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getEnemyCount() {
        return this.enemies.filter(e => !e.isDead).length;
    }
}
