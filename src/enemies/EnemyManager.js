/**
 * VALORIA - Enemy Manager
 * Handles multi-stage enemy spawning, wave progression, updates, and rendering
 */

import { player, gameWorld, victoryAchieved } from '../main.js';
import { Enemy } from './Enemy.js';
import { WraithSoldier } from './WraithSoldier.js';
import { SkeletonEnemy } from './SkeletonEnemy.js';
import { GoblinEnemy } from './GoblinEnemy.js';
import { FlyingEyeEnemy } from './FlyingEyeEnemy.js';
import { MushroomEnemy } from './MushroomEnemy.js';
import { Brute } from './Brute.js';
import { ShadowCaster } from './ShadowCaster.js';
import { BossKnight } from './BossKnight.js';

const TOTAL_WAVES = 6;
const WAVE_INTERMISSION = 2.0;
const WAVE_BANNER_DURATION = 2.5;
const MIN_SPAWN_DISTANCE_FROM_PLAYER = 300;
const SPAWN_XS = [1250, 150, 1100, 300, 1180, 230];

const ENEMY_FACTORIES = {
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
    }

    init() {
        this.enemies = [];
        this.waveNumber = 0;
        this.intermissionTimer = 0;
        this.bannerTimer = 0;
        this.bannerText = '';
        this.stage = 1;
        if (gameWorld?.bgImage) {
            gameWorld.bgImage.src = 'Assets/Assets/PNG/Castle-Background.png';
        }
    }

    spawnWave() {
        this.waveNumber++;

        let roster = [];
        let banner = `Stage 1 - Wave ${this.waveNumber}`;

        if (this.waveNumber === 1) {
            banner = 'Stage 1: Castle Ramparts - Wave 1';
            roster = ['wraith', 'wraith', 'skeleton', 'skeleton'];
        } else if (this.waveNumber === 2) {
            banner = 'Wave 2: Goblin Ambush';
            roster = ['goblin', 'goblin', 'eye', 'eye', 'skeleton'];
        } else if (this.waveNumber === 3) {
            banner = 'MINI-BOSS: Fungal Abomination';
            roster = ['mushroom', 'skeleton', 'skeleton'];
        } else if (this.waveNumber === 4) {
            this.stage = 2;
            banner = 'Stage 2: Frozen Citadel - Wave 4';
            if (gameWorld?.bgImage) {
                gameWorld.bgImage.src = 'Assets/Assets/PNG/Ice-Background.png';
            }
            roster = ['brute', 'brute', 'goblin', 'goblin', 'eye'];
        } else if (this.waveNumber === 5) {
            banner = 'BOSS: The Dark Necromancer';
            roster = ['caster', 'skeleton', 'skeleton', 'wraith', 'wraith'];
        } else if (this.waveNumber === 6) {
            banner = 'FINAL CLIMAX: Malakar, The Fallen Knight';
            roster = ['boss'];
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

    update(dt) {
        if (this.bannerTimer > 0) this.bannerTimer -= dt;

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
        const sortedByDepth = [...this.enemies].sort((a, b) => a.y - b.y);
        for (const enemy of sortedByDepth) {
            enemy.render(ctx);
        }
    }

    getEnemyCount() {
        return this.enemies.filter(e => !e.isDead).length;
    }
}
