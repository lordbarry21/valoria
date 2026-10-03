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
const WAVE_BANNER_DURATION = 2.5;
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

    showBanner(text) {
        this.bannerText = text;
        this.bannerTimer = WAVE_BANNER_DURATION;
    }

    spawnPortal() {
        this.portalActive = true;
        this.portal = {
            x: 2360,
            y: gameWorld?.floorY || 500,
            radius: 48,
            animTime: 0
        };
        this.showBanner('FROST PORTAL OPENED! FOLLOW THE ARROW');
        audioManager.playSFX('skill_ready');
    }

    enterPortal() {
        this.portalActive = false;
        this.portal = null;
        this.stage = 2;

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
        const centerY = p.y - 48;

        ctx.save();

        // Ground frost aura
        const groundGrad = ctx.createRadialGradient(centerX, p.y, 0, centerX, p.y, 90);
        groundGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        groundGrad.addColorStop(0.6, 'rgba(2, 132, 199, 0.15)');
        groundGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.ellipse(centerX, p.y, 75, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer rotating runic ring
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(t * 1.2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8, 4, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 44 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Inner counter-rotating ring
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-t * 1.8);
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Swirling portal vortex fill
        const vortexGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 42);
        vortexGrad.addColorStop(0, '#ffffff');
        vortexGrad.addColorStop(0.3, '#7dd3fc');
        vortexGrad.addColorStop(0.7, '#0284c7');
        vortexGrad.addColorStop(1, 'rgba(3, 105, 161, 0.2)');
        ctx.fillStyle = vortexGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
        ctx.fill();

        // Floating frost crystals / motes
        for (let i = 0; i < 8; i++) {
            const angle = t * 2 + (i * Math.PI / 4);
            const r = 24 + Math.sin(t * 3 + i) * 14;
            const px = centerX + Math.cos(angle) * r;
            const py = centerY + Math.sin(angle) * (r * 0.8) - 10;
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Floating pointer arrow right above portal
        const arrowY = centerY - 65 + Math.sin(t * 5) * 8;
        ctx.font = 'bold 13px "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffdd44';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.fillText('▼ ENTER PORTAL ▼', centerX, arrowY);
        ctx.font = '10px "Cinzel", serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText('FROZEN CITADEL', centerX, arrowY - 14);

        ctx.restore();
    }

    renderPortalIndicator(ctx) {
        if (!this.portal || !player) return;

        // Calculate screen-space X of portal
        const halfWidth = GAME_CONFIG.CANVAS_WIDTH / 2;
        const screenX = this.portal.x - camera.x + halfWidth;

        // If portal is currently on-screen, no need for edge indicator
        if (screenX >= 80 && screenX <= GAME_CONFIG.CANVAS_WIDTH - 80) return;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to screen coordinates

        const isRight = screenX > GAME_CONFIG.CANVAS_WIDTH - 80;
        const edgeX = isRight ? GAME_CONFIG.CANVAS_WIDTH - 30 : 30;
        const edgeY = 220;
        const distMeters = Math.max(0, Math.round(Math.abs(this.portal.x - player.x)));

        const pulse = 1 + Math.sin(this.portal.animTime * 6) * 0.08;

        ctx.translate(edgeX, edgeY);
        ctx.scale(pulse, pulse);

        // Indicator badge
        ctx.fillStyle = 'rgba(10, 20, 30, 0.9)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;

        const boxW = 145;
        const boxH = 34;
        const boxX = isRight ? -boxW : 0;
        const boxY = -boxH / 2;

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.font = 'bold 11px "Cinzel", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const arrowSymbol = isRight ? '➔' : '⬅';
        ctx.fillText(`${arrowSymbol} ICE PORTAL (${distMeters}m)`, boxX + boxW / 2, 0);

        ctx.restore();
    }

    getEnemyCount() {
        return this.enemies.filter(e => !e.isDead).length;
    }
}
