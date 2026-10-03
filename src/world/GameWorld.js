/**
 * VALORIA - Game World
 * Handles the arena environment and rendering with atmospheric depth
 */

import { GAME_CONFIG, enemyManager } from '../main.js';

const ARENA_EDGE_PADDING = 40;

export class GameWorld {
    get isIceStage() {
        return enemyManager?.stage === 2;
    }

    constructor() {
        // Arena dimensions
        this.arenaWidth = 1400;
        this.arenaHeight = 600;
        this.viewHeight = GAME_CONFIG.CANVAS_HEIGHT;
        this.floorY = 500;

        // Environment elements
        this.platforms = [];
        this.decorations = [];
        this.lights = [];

        // Particles
        this.ambientParticles = [];
        this.emberParticles = [];

        // Time for animations
        this.time = 0;

        // Background layers for parallax
        this.bgLayers = [];

        // Castle background sprite
        this.bgImage = new Image();
        this.bgImage.src = 'Assets/Assets/PNG/Castle-Background.png';
        this.bgLoaded = false;
        this.bgImage.onload = () => { this.bgLoaded = true; };
    }

    clampX(x, halfWidth = 0) {
        const min = ARENA_EDGE_PADDING + halfWidth;
        const max = this.arenaWidth - ARENA_EDGE_PADDING - halfWidth;
        return Math.max(min, Math.min(max, x));
    }

    // Camera center limits that keep the view inside the arena.
    getCameraBounds() {
        const halfViewWidth = GAME_CONFIG.CANVAS_WIDTH / 2;
        const centerY = this.viewHeight / 2;
        return {
            minX: halfViewWidth,
            maxX: Math.max(halfViewWidth, this.arenaWidth - halfViewWidth),
            minY: centerY,
            maxY: centerY,
        };
    }

    init() {
        this.time = 0;

        // Set up platforms (main floor + elevated ramparts)
        this.platforms = [
            { x: 0, y: this.floorY, width: this.arenaWidth, height: 100 },
            { x: 260, y: 340, width: 220, height: 20 },
            { x: 920, y: 340, width: 220, height: 20 }
        ];

        // Set up climbable ladders
        this.ladders = [
            { x: 370, topY: 340, bottomY: this.floorY, width: 28 },
            { x: 1030, topY: 340, bottomY: this.floorY, width: 28 }
        ];

        // Set up decorations
        this.decorations = [
            // Stone pillars with variety
            { type: 'pillar', x: 100, y: this.floorY, width: 45, height: 160, damage: 0.3 },
            { type: 'pillar', x: 300, y: this.floorY, width: 40, height: 130, damage: 0.5 },
            { type: 'pillar', x: 700, y: this.floorY, width: 50, height: 150, damage: 0.2 },
            { type: 'pillar', x: 1000, y: this.floorY, width: 42, height: 140, damage: 0.4 },
            { type: 'pillar', x: 1300, y: this.floorY, width: 48, height: 165, damage: 0.35 },

            // Broken walls
            { type: 'wall', x: 0, y: this.floorY - 80, width: 80, height: 80, damage: 0.6 },
            { type: 'wall', x: this.arenaWidth - 60, y: this.floorY - 100, width: 60, height: 100, damage: 0.4 },

            // Rubble clusters
            { type: 'rubble', x: 180, y: this.floorY, width: 80, height: 25 },
            { type: 'rubble', x: 480, y: this.floorY, width: 100, height: 20 },
            { type: 'rubble', x: 880, y: this.floorY, width: 70, height: 22 },
            { type: 'rubble', x: 1130, y: this.floorY, width: 90, height: 28 }
        ];

        // Random shapes are rolled once here; rolling them in render() made walls and rubble jitter every frame.
        this.decorations.forEach((dec, index) => {
            if (dec.type === 'wall') dec.shape = this.createWallShape(dec, index);
            if (dec.type === 'rubble') dec.shape = this.createRubbleShape(dec, index);
        });

        // Set up torch lights
        this.lights = [
            { x: 150, y: this.floorY - 180, intensity: 0.5, flicker: 0.12 },
            { x: 500, y: this.floorY - 180, intensity: 0.4, flicker: 0.15 },
            { x: 850, y: this.floorY - 180, intensity: 0.5, flicker: 0.1 },
            { x: 1200, y: this.floorY - 180, intensity: 0.45, flicker: 0.08 }
        ];

        // Initialize background layers
        this.bgLayers = [];
        this.initBackgroundLayers();

        // Ambient particles
        this.ambientParticles = [];
        for (let i = 0; i < 50; i++) {
            this.ambientParticles.push(this.createAmbientParticle());
        }

        // Ember particles (warm, from torches)
        this.emberParticles = [];
        for (let i = 0; i < 20; i++) {
            this.emberParticles.push(this.createEmberParticle());
        }
    }

    createWallShape(wall, seed) {
        const segments = Math.floor(wall.width / 15);
        return Array.from({ length: segments }, (_, i) => ({
            width: 12 + this.seededRandom(seed * 31 + i) * 8,
            height: 8 + this.seededRandom(seed * 47 + i) * 15,
        }));
    }

    createRubbleShape(rubble, seed) {
        const pieceCount = 3 + Math.floor(rubble.width / 30);
        const pieces = Array.from({ length: pieceCount }, (_, i) => ({
            width: 15 + this.seededRandom(seed * 13 + i) * 20,
            height: rubble.height * (0.5 + this.seededRandom(seed * 17 + i) * 0.5),
        }));
        const debris = Array.from({ length: 5 }, (_, i) => ({
            x: this.seededRandom(seed * 19 + i) * rubble.width,
            width: 3 + this.seededRandom(seed * 23 + i) * 5,
            height: 2 + this.seededRandom(seed * 29 + i) * 4,
        }));
        return { pieces, debris };
    }

    createAmbientParticle() {
        return {
            x: Math.random() * this.arenaWidth,
            y: Math.random() * this.arenaHeight * 0.8,
            size: 1 + Math.random() * 2,
            speed: 5 + Math.random() * 15,
            drift: Math.random() * Math.PI * 2,
            alpha: 0.1 + Math.random() * 0.25,
            wobble: Math.random() * Math.PI * 2,
            color: Math.random() > 0.7 ? 'warm' : 'cool'
        };
    }

    createEmberParticle() {
        // Embers rise from torch positions
        const torchIdx = Math.floor(Math.random() * this.lights.length);
        const torch = this.lights[torchIdx];
        return {
            x: torch.x + (Math.random() - 0.5) * 30,
            y: torch.y - 30 + Math.random() * 20,
            size: 1 + Math.random() * 2,
            speed: 20 + Math.random() * 40,
            drift: torch.x + (Math.random() - 0.5) * 50,
            alpha: 0.4 + Math.random() * 0.4,
            life: 1 + Math.random() * 2,
            maxLife: 1 + Math.random() * 2
        };
    }

    createSnowParticle() {
        return {
            x: Math.random() * this.arenaWidth,
            y: Math.random() * (this.floorY - 60),
            size: 1.5 + Math.random() * 2.5,
            speed: 30 + Math.random() * 45,
            drift: Math.random() * Math.PI * 2,
            alpha: 0.4 + Math.random() * 0.4,
            life: 2 + Math.random() * 3,
            maxLife: 5
        };
    }

    initBackgroundLayers() {
        // Far background - distant mountains/sky
        this.bgLayers.push({
            type: 'mountains',
            parallax: 0.1,
            color: '#080606'
        });

        // Mid background - castle ruins
        this.bgLayers.push({
            type: 'ruins',
            parallax: 0.3,
            color: '#0a0808'
        });

        // Near background - broken walls
        this.bgLayers.push({
            type: 'walls',
            parallax: 0.5,
            color: '#0c0a08'
        });
    }

    update(dt) {
        this.time += dt;

        // Update ambient particles
        for (const p of this.ambientParticles) {
            p.y -= p.speed * dt;
            p.x += Math.sin(this.time * 2 + p.drift) * 8 * dt;
            p.wobble += dt * 2;

            if (p.y < -10) {
                p.y = this.arenaHeight * 0.8;
                p.x = Math.random() * this.arenaWidth;
            }
        }

        // Update ember / snow particles
        const isIce = this.isIceStage;
        for (let i = this.emberParticles.length - 1; i >= 0; i--) {
            const p = this.emberParticles[i];
            if (isIce) {
                // Falling gentle snow in Stage 2
                p.y += p.speed * 0.8 * dt;
                p.x += Math.sin(this.time * 2 + i) * 15 * dt;
                p.life -= dt;
                p.alpha = Math.min(0.8, p.life / p.maxLife);

                if (p.life <= 0 || p.y > this.floorY) {
                    this.emberParticles[i] = this.createSnowParticle();
                }
            } else {
                p.y -= p.speed * dt;
                p.x += Math.sin(this.time * 3 + i) * 15 * dt;
                p.life -= dt;
                p.alpha = (p.life / p.maxLife) * 0.6;

                if (p.life <= 0 || p.y < this.floorY - 300) {
                    this.emberParticles[i] = this.createEmberParticle();
                }
            }
        }
    }

    render(ctx) {
        // Background with depth
        this.renderBackground(ctx);

        // Floor & platforms
        this.renderFloor(ctx);
        this.renderPlatforms(ctx);

        // Decorations (back layer) & Ladders
        this.renderDecorationsBack(ctx);
        this.renderLadders(ctx);

        // Lights
        this.renderLights(ctx);

        // Ambient particles
        this.renderAmbientParticles(ctx);

        // Ember / snow particles
        this.renderEmberParticles(ctx);

        // Fog/atmosphere
        this.renderAtmosphere(ctx);

        // Decorations (front layer)
        this.renderDecorationsFront(ctx);
    }

    renderBackground(ctx) {
        const isIce = this.isIceStage;

        // Multi-layer sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.arenaHeight);
        if (isIce) {
            gradient.addColorStop(0, '#040914');     // Deep arctic polar night
            gradient.addColorStop(0.35, '#07182c');   // Cyan dusk
            gradient.addColorStop(0.7, '#0b233c');    // Glacial horizon
            gradient.addColorStop(1, '#061424');     // Frozen ice line
        } else {
            gradient.addColorStop(0, '#0c0a0a');     // Dark sky
            gradient.addColorStop(0.3, '#0a0808');   // Mid sky
            gradient.addColorStop(0.6, '#080606');   // Lower sky
            gradient.addColorStop(1, '#0a0808');     // Horizon
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);

        // Background art covering full wall height from top to floor
        if (this.bgLoaded && this.bgImage) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const bgScale = (this.floorY + 20) / 190;
            const bgW = 426 * bgScale;
            const bgH = 190 * bgScale;
            const bgY = this.floorY - bgH + 20;
            const tiles = Math.ceil(this.arenaWidth / bgW) + 1;
            for (let i = 0; i < tiles; i++) {
                ctx.drawImage(this.bgImage, i * bgW, bgY, bgW, bgH);
            }
            ctx.restore();
        }

        // Atmospheric haze (cool blue mist on ice, warm haze on castle)
        const haze = ctx.createLinearGradient(0, 0, 0, this.floorY);
        if (isIce) {
            haze.addColorStop(0, 'rgba(186, 230, 253, 0.12)');
            haze.addColorStop(0.65, 'rgba(14, 165, 233, 0.08)');
            haze.addColorStop(1, 'rgba(2, 132, 199, 0.22)');
        } else {
            haze.addColorStop(0, 'rgba(12, 10, 14, 0.2)');
            haze.addColorStop(0.7, 'rgba(16, 12, 14, 0.1)');
            haze.addColorStop(1, 'rgba(10, 8, 6, 0.35)');
        }
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, this.arenaWidth, this.floorY);
    }

    renderSilhouettes(ctx) {
        // Distant ruined fortress silhouettes
        ctx.fillStyle = '#050404';

        // Far layer - distant mountains/ruins
        for (let i = 0; i < 10; i++) {
            const x = i * 160 - 80;
            const h = 80 + this.seededRandom(i * 3) * 60;
            const w = 60 + this.seededRandom(i * 5) * 40;

            // Mountain/fortress shape
            ctx.beginPath();
            ctx.moveTo(x, this.arenaHeight - 180);
            ctx.lineTo(x + w * 0.3, this.arenaHeight - 180 - h * 0.6);
            ctx.lineTo(x + w * 0.5, this.arenaHeight - 180 - h);  // Peak
            ctx.lineTo(x + w * 0.7, this.arenaHeight - 180 - h * 0.5);
            ctx.lineTo(x + w, this.arenaHeight - 180);
            ctx.closePath();
            ctx.fill();

            // Crenellations on top
            for (let j = 0; j < 3; j++) {
                const cw = 12 + this.seededRandom(i * 7 + j) * 8;
                const ch = 10 + this.seededRandom(i * 11 + j) * 10;
                ctx.fillRect(
                    x + w * 0.2 + j * 15,
                    this.arenaHeight - 180 - h * 0.4 - ch,
                    cw, ch
                );
            }
        }

        // Mid layer - broken towers
        ctx.fillStyle = '#080606';
        for (let i = 0; i < 6; i++) {
            const x = i * 250 - 50;
            const h = 100 + this.seededRandom(i * 13) * 80;
            const w = 40 + this.seededRandom(i * 17) * 30;

            // Tower shape with damage
            ctx.beginPath();
            ctx.moveTo(x, this.arenaHeight - 150);
            ctx.lineTo(x + 5, this.arenaHeight - 150 - h);

            // Jagged top
            const segments = 4;
            for (let j = 0; j < segments; j++) {
                const sx = x + 5 + (w - 10) * (j / segments);
                const sh = (this.seededRandom(i * 19 + j) - 0.3) * 30;
                ctx.lineTo(sx, this.arenaHeight - 150 - h + sh);
            }
            ctx.lineTo(x + w - 5, this.arenaHeight - 150 - h);
            ctx.lineTo(x + w, this.arenaHeight - 150);
            ctx.closePath();
            ctx.fill();
        }
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    renderPlatforms(ctx) {
        const isIce = this.isIceStage;
        for (const p of this.platforms) {
            if (p.y >= this.floorY) continue; // ground handled by renderFloor
            ctx.save();

            if (isIce) {
                // STAGE 2: Frosted Glacial Ice Slab (NO WOOD)
                const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
                grad.addColorStop(0, '#1c3d5a');
                grad.addColorStop(0.5, '#0e2438');
                grad.addColorStop(1, '#061320');
                ctx.fillStyle = grad;
                ctx.fillRect(p.x, p.y, p.width, p.height);

                // Snow crust on top of ice platform
                ctx.fillStyle = '#f0f9ff';
                ctx.fillRect(p.x, p.y, p.width, 4);

                // Glistening cyan ice line
                ctx.fillStyle = '#7dd3fc';
                ctx.fillRect(p.x, p.y + 4, p.width, 1);

                // Ice crystal joints
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1;
                for (let bx = p.x + 36; bx < p.x + p.width; bx += 40) {
                    ctx.beginPath();
                    ctx.moveTo(bx, p.y + 4);
                    ctx.lineTo(bx - 3, p.y + p.height);
                    ctx.stroke();
                }

                // Sharp hanging icicles underneath! (Zero wood!)
                for (let ix = p.x + 8; ix < p.x + p.width - 8; ix += 16) {
                    const icicleLen = 14 + ((ix * 17) % 20);
                    const icicleGrad = ctx.createLinearGradient(ix, p.y + p.height, ix, p.y + p.height + icicleLen);
                    icicleGrad.addColorStop(0, '#bae6fd');
                    icicleGrad.addColorStop(0.7, '#38bdf8');
                    icicleGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = icicleGrad;
                    ctx.beginPath();
                    ctx.moveTo(ix, p.y + p.height);
                    ctx.lineTo(ix + 6, p.y + p.height);
                    ctx.lineTo(ix + 3, p.y + p.height + icicleLen);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                // STAGE 1: Ancient Castle Stone Platform
                const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
                grad.addColorStop(0, '#382f28');
                grad.addColorStop(0.3, '#261f1a');
                grad.addColorStop(1, '#15110d');
                ctx.fillStyle = grad;
                ctx.fillRect(p.x, p.y, p.width, p.height);

                // Platform top stone lip
                ctx.fillStyle = '#4f4136';
                ctx.fillRect(p.x, p.y, p.width, 3);

                // Brick joints
                ctx.strokeStyle = '#18120e';
                ctx.lineWidth = 1.5;
                for (let bx = p.x + 36; bx < p.x + p.width; bx += 40) {
                    ctx.beginPath();
                    ctx.moveTo(bx, p.y);
                    ctx.lineTo(bx, p.y + p.height);
                    ctx.stroke();
                }

                // Stone corbels / brackets
                ctx.fillStyle = '#1c1510';
                ctx.beginPath();
                ctx.moveTo(p.x + 10, p.y + p.height);
                ctx.lineTo(p.x + 35, p.y + p.height);
                ctx.lineTo(p.x + 10, p.y + p.height + 25);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(p.x + p.width - 35, p.y + p.height);
                ctx.lineTo(p.x + p.width - 10, p.y + p.height);
                ctx.lineTo(p.x + p.width - 10, p.y + p.height + 25);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }
    }

    renderLadders(ctx) {
        if (!this.ladders) return;
        const isIce = this.isIceStage;

        for (const lad of this.ladders) {
            ctx.save();
            const topY = lad.topY;
            const botY = lad.bottomY;
            const w = lad.width;
            const x = lad.x;
            const leftRail = x - w / 2;
            const rightRail = x + w / 2 - 4;

            if (isIce) {
                // STAGE 2: FROSTED COBALT IRON & HANGING ICE RUNGS (NO WOOD!)
                const railGrad = ctx.createLinearGradient(leftRail, topY, leftRail + 5, topY);
                railGrad.addColorStop(0, '#38bdf8');
                railGrad.addColorStop(0.5, '#e0f2fe');
                railGrad.addColorStop(1, '#0284c7');
                ctx.fillStyle = railGrad;
                ctx.fillRect(leftRail, topY - 14, 5, (botY - topY) + 14);
                ctx.fillRect(rightRail, topY - 14, 5, (botY - topY) + 14);

                // Frost glaze
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(leftRail + 1, topY - 14, 2, (botY - topY) + 14);
                ctx.fillRect(rightRail + 1, topY - 14, 2, (botY - topY) + 14);

                // Heavy frost anchor brackets
                ctx.fillStyle = '#0ea5e9';
                ctx.fillRect(leftRail - 3, topY + 2, 10, 6);
                ctx.fillRect(rightRail - 2, topY + 2, 10, 6);
                ctx.fillRect(leftRail - 3, botY - 10, 10, 6);
                ctx.fillRect(rightRail - 2, botY - 10, 10, 6);

                // Silver ice rungs
                const rungStep = 18;
                for (let ry = topY + 8; ry < botY; ry += rungStep) {
                    // Cold steel rung
                    ctx.fillStyle = '#0369a1';
                    ctx.fillRect(leftRail + 2, ry + 2, w - 6, 4);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(leftRail + 2, ry, w - 6, 3);
                    ctx.fillStyle = '#f0f9ff';
                    ctx.fillRect(leftRail + 2, ry, w - 6, 1);

                    // Tiny hanging icicles below rung
                    const icicleH = 5 + ((ry * 7) % 6);
                    ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
                    ctx.beginPath();
                    ctx.moveTo(x - 4, ry + 4);
                    ctx.lineTo(x, ry + 4 + icicleH);
                    ctx.lineTo(x + 4, ry + 4);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                // STAGE 1: Castle Dungeon Timber Ladder
                ctx.fillStyle = '#2c1e13';
                ctx.fillRect(leftRail, topY - 14, 5, (botY - topY) + 14);
                ctx.fillRect(rightRail, topY - 14, 5, (botY - topY) + 14);

                ctx.fillStyle = '#483321';
                ctx.fillRect(leftRail + 1, topY - 14, 2, (botY - topY) + 14);
                ctx.fillRect(rightRail + 1, topY - 14, 2, (botY - topY) + 14);

                ctx.fillStyle = '#555';
                ctx.fillRect(leftRail - 2, topY + 4, 8, 4);
                ctx.fillRect(rightRail - 1, topY + 4, 8, 4);
                ctx.fillRect(leftRail - 2, botY - 8, 8, 4);
                ctx.fillRect(rightRail - 1, botY - 8, 8, 4);

                const rungStep = 18;
                for (let ry = topY + 8; ry < botY; ry += rungStep) {
                    ctx.fillStyle = '#150d08';
                    ctx.fillRect(leftRail + 2, ry + 2, w - 6, 4);
                    ctx.fillStyle = '#3a2718';
                    ctx.fillRect(leftRail + 2, ry, w - 6, 3);
                    ctx.fillStyle = '#5c3f27';
                    ctx.fillRect(leftRail + 2, ry, w - 6, 1);
                }
            }

            ctx.restore();
        }
    }

    renderFloor(ctx) {
        const floorBottom = this.viewHeight;
        const isIce = this.isIceStage;

        if (isIce) {
            // STAGE 2: Deep Arctic Glacial Ice Shelf
            const floorGradient = ctx.createLinearGradient(0, this.floorY, 0, floorBottom);
            floorGradient.addColorStop(0, '#0f2942');
            floorGradient.addColorStop(0.25, '#091b2c');
            floorGradient.addColorStop(0.6, '#04101c');
            floorGradient.addColorStop(1, '#02070d');
            ctx.fillStyle = floorGradient;
            ctx.fillRect(0, this.floorY, this.arenaWidth, floorBottom - this.floorY);

            // Glistening ice surface line
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(0, this.floorY, this.arenaWidth, 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(0, this.floorY + 2, this.arenaWidth, 2);

            // Glacial ice grid fractures
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1;

            for (let y = this.floorY + 15; y < floorBottom; y += 25) {
                ctx.globalAlpha = 0.45;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.arenaWidth, y);
                ctx.stroke();
            }

            for (let x = 0; x < this.arenaWidth; x += 55) {
                const offset = (Math.floor(x / 55) % 2) * 12;
                ctx.beginPath();
                ctx.moveTo(x, this.floorY + offset);
                ctx.lineTo(x, floorBottom);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            this.renderFloorDamage(ctx);
            this.renderFloorHighlights(ctx);
        } else {
            // STAGE 1: Castle Stone Floor
            const floorGradient = ctx.createLinearGradient(0, this.floorY, 0, floorBottom);
            floorGradient.addColorStop(0, '#1a1512');
            floorGradient.addColorStop(0.2, '#151210');
            floorGradient.addColorStop(0.5, '#121010');
            floorGradient.addColorStop(1, '#080606');
            ctx.fillStyle = floorGradient;
            ctx.fillRect(0, this.floorY, this.arenaWidth, floorBottom - this.floorY);

            ctx.strokeStyle = '#0d0b09';
            ctx.lineWidth = 1;

            for (let y = this.floorY + 15; y < floorBottom; y += 25) {
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.arenaWidth, y);
                ctx.stroke();
            }

            for (let x = 0; x < this.arenaWidth; x += 50) {
                const offset = (Math.floor(x / 50) % 2) * 12;
                ctx.beginPath();
                ctx.moveTo(x, this.floorY + offset);
                ctx.lineTo(x, floorBottom);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            this.renderFloorDamage(ctx);
            this.renderFloorHighlights(ctx);
        }
    }

    renderFloorDamage(ctx) {
        const isIce = this.isIceStage;
        ctx.strokeStyle = isIce ? 'rgba(56, 189, 248, 0.7)' : '#060504';
        ctx.lineWidth = 2;

        const cracks = [
            { points: [[200, this.floorY + 5], [215, this.floorY + 25], [208, this.floorY + 50], [220, this.floorY + 70]], width: 2 },
            { points: [[600, this.floorY + 8], [585, this.floorY + 30], [595, this.floorY + 55]], width: 1.5 },
            { points: [[900, this.floorY + 3], [918, this.floorY + 28], [905, this.floorY + 50], [925, this.floorY + 80]], width: 2 },
            { points: [[1100, this.floorY + 10], [1085, this.floorY + 35], [1095, this.floorY + 60]], width: 1.5 },
            { points: [[400, this.floorY + 15], [420, this.floorY + 40]], width: 1 }
        ];

        for (const crack of cracks) {
            ctx.beginPath();
            ctx.moveTo(crack.points[0][0], crack.points[0][1]);
            for (let i = 1; i < crack.points.length; i++) {
                ctx.lineTo(crack.points[i][0], crack.points[i][1]);
            }
            ctx.lineWidth = crack.width;
            ctx.stroke();
        }
    }

    renderFloorHighlights(ctx) {
        const isIce = this.isIceStage;
        for (const light of this.lights) {
            const patchX = light.x;
            const patchY = this.floorY + 20;

            const highlight = ctx.createRadialGradient(
                patchX, patchY, 0,
                patchX, patchY, 80
            );
            if (isIce) {
                highlight.addColorStop(0, 'rgba(186, 230, 253, 0.28)');
                highlight.addColorStop(0.5, 'rgba(56, 189, 248, 0.12)');
                highlight.addColorStop(1, 'rgba(2, 132, 199, 0)');
            } else {
                highlight.addColorStop(0, 'rgba(40, 30, 20, 0.15)');
                highlight.addColorStop(1, 'rgba(40, 30, 20, 0)');
            }
            ctx.fillStyle = highlight;
            ctx.fillRect(patchX - 80, patchY - 30, 160, 80);
        }
    }

    renderDecorationsBack(ctx) {
        for (const dec of this.decorations) {
            if (dec.type === 'pillar' && dec.y < this.floorY) {
                // Skip pillars in back (they'll be rendered in front)
            } else {
                this.renderDecoration(ctx, dec);
            }
        }
    }

    renderDecorationsFront(ctx) {
        for (const dec of this.decorations) {
            if (dec.type === 'pillar') {
                this.renderPillar(ctx, dec);
            } else {
                this.renderDecoration(ctx, dec);
            }
        }
    }

    renderDecoration(ctx, dec) {
        switch (dec.type) {
            case 'wall':
                this.renderWall(ctx, dec);
                break;
            case 'rubble':
                this.renderRubble(ctx, dec);
                break;
        }
    }

    renderPillar(ctx, pillar) {
        const x = pillar.x;
        const y = pillar.y;
        const w = pillar.width;
        const h = pillar.height;
        const damage = pillar.damage || 0.3;
        const isIce = this.isIceStage;

        // Pillar shadow
        ctx.fillStyle = isIce ? 'rgba(0, 15, 30, 0.4)' : 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x - w/2 + 5, y - 5, w, 10);

        // Pillar body gradient
        const gradient = ctx.createLinearGradient(x - w/2, 0, x + w/2, 0);
        if (isIce) {
            gradient.addColorStop(0, '#0c2238');
            gradient.addColorStop(0.3, '#163c5e');
            gradient.addColorStop(0.7, '#1b456b');
            gradient.addColorStop(1, '#0c2238');
        } else {
            gradient.addColorStop(0, '#151310');
            gradient.addColorStop(0.3, '#201d1a');
            gradient.addColorStop(0.7, '#252220');
            gradient.addColorStop(1, '#151310');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(x - w/2, y - h, w, h);

        // Pillar top cap
        ctx.fillStyle = isIce ? '#204a70' : '#2a2725';
        ctx.fillRect(x - w/2 - 4, y - h - 12, w + 8, 15);

        // Snow / frost cap on ice pillar
        if (isIce) {
            ctx.fillStyle = '#f0f9ff';
            ctx.fillRect(x - w/2 - 4, y - h - 16, w + 8, 5);

            // Small hanging icicle from pillar cap
            ctx.fillStyle = '#bae6fd';
            ctx.beginPath();
            ctx.moveTo(x - w/2, y - h + 3);
            ctx.lineTo(x - w/2 + 4, y - h + 3);
            ctx.lineTo(x - w/2 + 2, y - h + 15);
            ctx.closePath();
            ctx.fill();
        }

        // Pillar base
        ctx.fillStyle = isIce ? '#163857' : '#2a2725';
        ctx.fillRect(x - w/2 - 2, y - 8, w + 4, 12);

        // Damage marks based on damage level
        if (damage > 0.2) {
            ctx.fillStyle = isIce ? '#061320' : '#0a0808';
            // Chunks missing
            const chunkSize = damage * 15;
            ctx.fillRect(x - w/2, y - h * 0.4, chunkSize, chunkSize);
            ctx.fillRect(x + w/2 - chunkSize * 0.7, y - h * 0.7, chunkSize * 0.7, chunkSize * 0.8);
        }

        // Vertical cracks
        ctx.strokeStyle = isIce ? 'rgba(56, 189, 248, 0.6)' : '#0a0808';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - w/4, y - h * 0.3);
        ctx.lineTo(x - w/4 + 3, y - h * 0.5);
        ctx.lineTo(x - w/4, y - h * 0.7);
        ctx.stroke();

        // Subtle base weathering / frost
        ctx.fillStyle = isIce ? 'rgba(186, 230, 253, 0.3)' : 'rgba(30, 40, 30, 0.3)';
        ctx.fillRect(x - w/2, y - 15, w, 15);
    }

    renderWall(ctx, wall) {
        const x = wall.x;
        const y = wall.y;
        const w = wall.width;
        const h = wall.height;

        // Wall body
        ctx.fillStyle = '#121010';
        ctx.fillRect(x, y, w, h);

        // Broken top edge
        ctx.fillStyle = '#080606';
        wall.shape.forEach((segment, i) => {
            ctx.fillRect(x + i * 15, y - segment.height, segment.width, segment.height);
        });

        // Stone texture lines
        ctx.strokeStyle = '#0a0808';
        ctx.lineWidth = 1;
        for (let row = 0; row < 4; row++) {
            ctx.beginPath();
            ctx.moveTo(x, y + row * 20);
            ctx.lineTo(x + w, y + row * 20);
            ctx.stroke();
        }
    }

    renderRubble(ctx, rubble) {
        const { pieces, debris } = rubble.shape;
        ctx.fillStyle = '#1a1815';

        // Multiple irregular pieces
        pieces.forEach((piece, i) => {
            const px = rubble.x + (i / pieces.length) * rubble.width;
            const pw = piece.width;
            const ph = piece.height;

            ctx.beginPath();
            ctx.moveTo(px, rubble.y);
            ctx.lineTo(px + pw * 0.3, rubble.y - ph);
            ctx.lineTo(px + pw * 0.7, rubble.y - ph * 0.8);
            ctx.lineTo(px + pw, rubble.y);
            ctx.closePath();
            ctx.fill();
        });

        // Smaller debris
        ctx.fillStyle = '#151310';
        for (const chip of debris) {
            ctx.fillRect(rubble.x + chip.x, rubble.y - chip.height, chip.width, chip.height);
        }
    }

    renderLights(ctx) {
        // Enable additive blending for light glow
        ctx.globalCompositeOperation = 'lighter';

        for (const light of this.lights) {
            this.renderTorch(ctx, light);
        }

        // Reset blending
        ctx.globalCompositeOperation = 'source-over';
    }

    renderTorch(ctx, light) {
        const isIce = this.isIceStage;
        const flicker = light.intensity + Math.sin(this.time * 12 + light.flicker * 100) * light.flicker;
        const flicker2 = light.intensity + Math.sin(this.time * 8 + light.flicker * 50) * light.flicker * 0.7;

        // Large ambient glow
        const glowGradient = ctx.createRadialGradient(
            light.x, light.y - 25, 0,
            light.x, light.y - 25, 200
        );

        if (isIce) {
            // Arctic Frost Wisp Glow
            glowGradient.addColorStop(0, `rgba(56, 189, 248, ${flicker * 0.18})`);
            glowGradient.addColorStop(0.35, `rgba(14, 165, 233, ${flicker * 0.08})`);
            glowGradient.addColorStop(0.7, `rgba(2, 132, 199, ${flicker * 0.03})`);
            glowGradient.addColorStop(1, 'rgba(2, 132, 199, 0)');
        } else {
            // Warm Torch Flame Glow
            glowGradient.addColorStop(0, `rgba(255, 140, 60, ${flicker * 0.15})`);
            glowGradient.addColorStop(0.3, `rgba(255, 100, 40, ${flicker * 0.08})`);
            glowGradient.addColorStop(0.6, `rgba(200, 80, 30, ${flicker * 0.03})`);
            glowGradient.addColorStop(1, 'rgba(100, 50, 20, 0)');
        }
        ctx.fillStyle = glowGradient;
        ctx.fillRect(light.x - 200, light.y - 225, 400, 400);

        // Ground light pool
        const groundGlow = ctx.createRadialGradient(
            light.x, this.floorY, 0,
            light.x, this.floorY, 120
        );
        if (isIce) {
            groundGlow.addColorStop(0, `rgba(56, 189, 248, ${flicker2 * 0.15})`);
            groundGlow.addColorStop(0.5, `rgba(14, 165, 233, ${flicker2 * 0.06})`);
            groundGlow.addColorStop(1, 'rgba(2, 132, 199, 0)');
        } else {
            groundGlow.addColorStop(0, `rgba(255, 150, 80, ${flicker2 * 0.12})`);
            groundGlow.addColorStop(0.5, `rgba(200, 100, 50, ${flicker2 * 0.05})`);
            groundGlow.addColorStop(1, 'rgba(100, 50, 20, 0)');
        }
        ctx.fillStyle = groundGlow;
        ctx.fillRect(light.x - 120, this.floorY - 30, 240, 80);

        // Torch bracket
        ctx.fillStyle = isIce ? '#1e3852' : '#2a2520';
        ctx.fillRect(light.x - 4, light.y - 35, 8, 40);

        // Torch head
        ctx.fillStyle = isIce ? '#38bdf8' : '#3a3020';
        ctx.fillRect(light.x - 6, light.y - 40, 12, 12);

        // Flame layers
        const flameHeight = 20 + Math.sin(this.time * 15) * 4;

        if (isIce) {
            // Cold Frost Spirit Flame
            ctx.fillStyle = `rgba(14, 165, 233, ${flicker * 0.85})`;
            ctx.beginPath();
            ctx.moveTo(light.x, light.y - 52);
            ctx.quadraticCurveTo(light.x - 10, light.y - 45 - flameHeight * 0.3, light.x, light.y - 40 - flameHeight);
            ctx.quadraticCurveTo(light.x + 10, light.y - 45 - flameHeight * 0.3, light.x, light.y - 52);
            ctx.fill();

            ctx.fillStyle = `rgba(186, 230, 253, ${flicker * 0.95})`;
            ctx.beginPath();
            ctx.moveTo(light.x, light.y - 52);
            ctx.quadraticCurveTo(light.x - 6, light.y - 48 - flameHeight * 0.3, light.x, light.y - 42 - flameHeight * 0.7);
            ctx.quadraticCurveTo(light.x + 6, light.y - 48 - flameHeight * 0.3, light.x, light.y - 52);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 255, ${flicker})`;
            ctx.beginPath();
            ctx.arc(light.x, light.y - 45, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Outer flame (darker)
            ctx.fillStyle = `rgba(200, 80, 30, ${flicker * 0.8})`;
            ctx.beginPath();
            ctx.moveTo(light.x, light.y - 52);
            ctx.quadraticCurveTo(light.x - 10, light.y - 45 - flameHeight * 0.3, light.x, light.y - 40 - flameHeight);
            ctx.quadraticCurveTo(light.x + 10, light.y - 45 - flameHeight * 0.3, light.x, light.y - 52);
            ctx.fill();

            // Inner flame (brighter)
            ctx.fillStyle = `rgba(255, 180, 80, ${flicker * 0.9})`;
            ctx.beginPath();
            ctx.moveTo(light.x, light.y - 52);
            ctx.quadraticCurveTo(light.x - 6, light.y - 48 - flameHeight * 0.3, light.x, light.y - 42 - flameHeight * 0.7);
            ctx.quadraticCurveTo(light.x + 6, light.y - 48 - flameHeight * 0.3, light.x, light.y - 52);
            ctx.fill();

            // Core (hottest)
            ctx.fillStyle = `rgba(255, 240, 200, ${flicker})`;
            ctx.beginPath();
            ctx.arc(light.x, light.y - 45, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderAmbientParticles(ctx) {
        for (const p of this.ambientParticles) {
            const color = p.color === 'warm'
                ? `rgba(160, 140, 120, ${p.alpha})`
                : `rgba(100, 100, 110, ${p.alpha})`;

            ctx.fillStyle = color;
            ctx.beginPath();
            // Slightly irregular shape
            const wobbleX = Math.sin(p.wobble) * 0.3;
            const wobbleY = Math.cos(p.wobble * 1.3) * 0.3;
            ctx.ellipse(p.x, p.y, p.size * (1 + wobbleX), p.size * (1 + wobbleY), 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderEmberParticles(ctx) {
        for (const p of this.emberParticles) {
            // Glowing ember
            ctx.fillStyle = `rgba(255, ${150 + Math.random() * 50}, 50, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Glow
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            glow.addColorStop(0, `rgba(255, 100, 30, ${p.alpha * 0.5})`);
            glow.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderAtmosphere(ctx) {
        // Layered ground fog
        const fogGradient = ctx.createLinearGradient(0, this.floorY - 60, 0, this.floorY + 40);
        fogGradient.addColorStop(0, 'rgba(20, 15, 12, 0)');
        fogGradient.addColorStop(0.4, 'rgba(25, 20, 18, 0.25)');
        fogGradient.addColorStop(0.6, 'rgba(25, 20, 18, 0.3)');
        fogGradient.addColorStop(1, 'rgba(20, 15, 12, 0)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, this.floorY - 60, this.arenaWidth, 100);

        // Moving fog wisps
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 5; i++) {
            const wispX = (this.time * 20 + i * 300) % (this.arenaWidth + 200) - 100;
            const wispY = this.floorY - 20 + Math.sin(this.time + i) * 15;

            ctx.fillStyle = 'rgba(40, 35, 30, 0.3)';
            ctx.beginPath();
            ctx.ellipse(wispX, wispY, 80 + i * 10, 15, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Strong vignette
        const centerY = this.viewHeight / 2;
        const vignetteGradient = ctx.createRadialGradient(
            this.arenaWidth / 2, centerY, this.arenaWidth * 0.25,
            this.arenaWidth / 2, centerY, this.arenaWidth * 0.7
        );
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
        vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, this.arenaWidth, this.viewHeight);

        // Edge darkening
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, 50, this.viewHeight);
        ctx.fillRect(this.arenaWidth - 50, 0, 50, this.viewHeight);
        ctx.fillRect(0, 0, this.arenaWidth, 40);
    }
}
