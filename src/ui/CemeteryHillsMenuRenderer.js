/**
 * VALORIA - CemeteryHills Menu Scene Renderer
 * Live interactive main menu using Gemini_Generated_Image_h3361hh3361hh336.jpg as the backdrop:
 * - A single champion standing exactly in the center on the cliff plateau
 * - Nameplate positioned tightly and directly above the hero's head (matching reference)
 * - 10% slowed female idle animation
 * - Subtle ambient fireflies and clean edge vignette
 */

export class CemeteryHillsMenuRenderer {
    constructor() {
        this.bgImg = new Image();
        this.bgImg.src = 'Gemini_Generated_Image_h3361hh3361hh336.jpg';

        this.heroSprites = {
            knight: new Image(),
            blonde: new Image(),
            brown: new Image(),
        };
        this.heroSprites.knight.src = 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Idle.png';
        this.heroSprites.blonde.src = 'girl warior.png';
        this.heroSprites.brown.src = 'Girl Warior brown hair/Warrior/SpriteSheet/Warrior_Sheet-Effect.png';

        this.heroes = [
            {
                id: 'knight',
                name: 'SIR ROLAND',
                title: 'THE IRON BULWARK',
                scale: 2.15,
                frameW: 120,
                frameH: 80,
                totalFrames: 10,
                fps: 10,
                anchorOffsetX: 55, // True visual center of 120x80 frame (bbox: 44..65 -> 54.5)
                anchorOffsetY: 78, // Boot soles touch ground cleanly at frame bottom (bbox: 80)
                headOffsetY: 76,   // Exact helmet top relative to feet
                themeColor: '#5dade2',
                glowColor: 'rgba(93, 173, 226, 0.45)',
            },
            {
                id: 'blonde',
                name: 'LADY SYLVIA',
                title: 'THE RADIANT BLADE',
                scale: 2.35,
                frameW: 69,
                frameH: 44,
                totalFrames: 6,
                fps: 7.2, // Slowed down by 10% for natural breathing motion
                anchorOffsetX: 27, // True visual center of 69x44 frame (bbox: 18..36 -> 27)
                anchorOffsetY: 43, // Boot soles touch ground cleanly at frame bottom (bbox: 43)
                headOffsetY: 77,   // Exact hair top relative to feet
                themeColor: '#f4d03f',
                glowColor: 'rgba(244, 208, 63, 0.55)',
            },
            {
                id: 'brown',
                name: 'KAELEN',
                title: 'THE SHADOW BLADE',
                scale: 2.35,
                frameW: 69,
                frameH: 44,
                totalFrames: 6,
                fps: 7.2, // Slowed down by 10% for natural breathing motion
                anchorOffsetX: 27, // True visual center of 69x44 frame (bbox: 18..36 -> 27)
                anchorOffsetY: 43, // Boot soles touch ground cleanly at frame bottom (bbox: 43)
                headOffsetY: 77,   // Exact hair top relative to feet
                themeColor: '#af7ac5',
                glowColor: 'rgba(175, 122, 197, 0.45)',
            },
        ];

        this.selectedHeroId = 'knight';
        this.isHeroHovered = false;
        this.heroHitbox = null;
        this.time = 0;
        this.onHeroClick = null;

        // Ambient green & gold fireflies drifting around the cliff (matching reference)
        this.fireflies = Array.from({ length: 32 }, () => ({
            x: Math.random() * 1920,
            y: Math.random() * 1080,
            radius: 1.2 + Math.random() * 1.8,
            speedX: 8 + Math.random() * 14,
            swayFreq: 0.6 + Math.random() * 1.2,
            swayAmp: 10 + Math.random() * 16,
            baseAlpha: 0.25 + Math.random() * 0.45,
            phase: Math.random() * Math.PI * 2,
            isGreen: Math.random() > 0.35,
        }));
    }

    setSelectedHero(heroId) {
        if (this.heroes.some(h => h.id === heroId)) {
            this.selectedHeroId = heroId;
        }
    }

    handleMouseMove(mouseX, mouseY) {
        if (!this.heroHitbox) {
            this.isHeroHovered = false;
            return { cursor: 'default', changed: false };
        }

        const hovered = (
            mouseX >= this.heroHitbox.x &&
            mouseX <= this.heroHitbox.x + this.heroHitbox.w &&
            mouseY >= this.heroHitbox.y &&
            mouseY <= this.heroHitbox.y + this.heroHitbox.h
        );

        const changed = this.isHeroHovered !== hovered;
        this.isHeroHovered = hovered;
        return { cursor: hovered ? 'pointer' : 'default', changed };
    }

    handleClick(mouseX, mouseY) {
        if (
            this.heroHitbox &&
            mouseX >= this.heroHitbox.x &&
            mouseX <= this.heroHitbox.x + this.heroHitbox.w &&
            mouseY >= this.heroHitbox.y &&
            mouseY <= this.heroHitbox.y + this.heroHitbox.h
        ) {
            this.onHeroClick?.(this.selectedHeroId);
            return this.selectedHeroId;
        }
        return null;
    }

    render(ctx, width, height, dt = 0.016) {
        this.time += dt;

        // 1. Draw Full Background Scene from Gemini_Generated_Image_h3361hh3361hh336.jpg
        const { renderX, renderY, renderW, renderH } = this.renderBackground(ctx, width, height);

        // 2. Position the Hero squarely on the flat Cliff Plateau (shifted slightly right of center)
        const heroX = Math.round(renderX + renderW * 0.536);
        // The cliff top in the generated image is at 58.2% of its height
        const heroY = Math.round(renderY + renderH * 0.582);

        // 3. Draw The Single Selected Champion & Nameplate
        this.renderSingleHero(ctx, heroX, heroY);

        // 4. Draw Atmospheric Green/Gold Fireflies
        this.renderFireflies(ctx, width, height);

        // 5. Cinematic Vignette
        this.renderVignette(ctx, width, height);
    }

    renderBackground(ctx, width, height) {
        if (this.bgImg.complete && this.bgImg.naturalWidth > 0) {
            const imgW = this.bgImg.naturalWidth;
            const imgH = this.bgImg.naturalHeight;
            // Cover fit to fill the canvas completely while maintaining aspect ratio
            const scale = Math.max(width / imgW, height / imgH);
            const renderW = Math.round(imgW * scale);
            const renderH = Math.round(imgH * scale);
            const renderX = Math.round((width - renderW) / 2);
            const renderY = Math.round((height - renderH) / 2);

            ctx.save();
            ctx.drawImage(this.bgImg, renderX, renderY, renderW, renderH);
            ctx.restore();

            return { renderX, renderY, renderW, renderH };
        }

        // Fallback atmospheric gradient if image still loading
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#100c18');
        skyGrad.addColorStop(0.5, '#281c2f');
        skyGrad.addColorStop(1, '#0e0b12');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);
        return { renderX: 0, renderY: 0, renderW: width, renderH: height };
    }

    renderSingleHero(ctx, posX, posY) {
        const hero = this.heroes.find(h => h.id === this.selectedHeroId) || this.heroes[0];
        const sprite = this.heroSprites[hero.id];

        const renderW = hero.frameW * hero.scale;
        const renderH = hero.frameH * hero.scale;
        const drawX = Math.floor(posX - hero.anchorOffsetX * hero.scale);
        const drawY = Math.floor(posY - hero.anchorOffsetY * hero.scale);

        // Precise clickable hitbox over champion's body
        const boxW = 84;
        const boxH = Math.round(hero.headOffsetY + 10);
        const boxX = Math.floor(posX - boxW / 2);
        const boxY = Math.floor(posY - boxH);

        this.heroHitbox = { x: boxX, y: boxY, w: boxW, h: boxH };

        // 1. Contact Ground Shadow on cliff grass
        ctx.save();
        ctx.fillStyle = 'rgba(10, 8, 12, 0.75)';
        ctx.beginPath();
        ctx.ellipse(posX, posY + 2, 38, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Subtle Elemental / Rune Halo at feet
        ctx.save();
        const pulse = 0.85 + Math.sin(this.time * 3) * 0.15;
        const glowGrad = ctx.createRadialGradient(posX, posY + 2, 4, posX, posY + 2, 36 * pulse);
        glowGrad.addColorStop(0, hero.glowColor);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(posX, posY + 2, 40 * pulse, 11 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hero.themeColor;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = hero.themeColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(posX, posY + 2, 28, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 3. Render Hero Idle Sprite (with 10% slowed female idle)
        if (sprite.complete && sprite.naturalWidth > 0) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;

            const frameIndex = Math.floor(this.time * hero.fps) % hero.totalFrames;
            const srcX = frameIndex * hero.frameW;
            const srcY = 0;

            if (this.isHeroHovered) {
                ctx.filter = 'brightness(1.18) drop-shadow(0 0 8px rgba(244, 208, 63, 0.55))';
            }

            ctx.drawImage(
                sprite,
                srcX, srcY, hero.frameW, hero.frameH,
                drawX, drawY, renderW, renderH
            );
            ctx.restore();
        }

        // 4. Exact Nameplate Positioned Directly and Tightly Above the Hero's Head
        // Arrow tip sits 8px directly above helmet/hair
        const nameplateBottomY = posY - hero.headOffsetY - 10;
        this.renderNameplate(ctx, posX, nameplateBottomY, hero);
    }

    renderNameplate(ctx, x, bottomY, hero) {
        ctx.save();
        const nameText = hero.name;

        ctx.font = '700 13px Cinzel, serif';
        const nameMetrics = ctx.measureText(nameText);
        const padX = 18;
        const bannerW = Math.max(Math.round(nameMetrics.width + padX * 2), 104);
        const bannerH = 26;
        const bannerX = Math.round(x - bannerW / 2);
        const bannerY = Math.round(bottomY - bannerH);

        // Sleek minimalist dark pill matching reference [Image #1]
        ctx.fillStyle = 'rgba(18, 14, 20, 0.82)';
        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 4);
        ctx.fill();

        // Subtle elegant border
        ctx.strokeStyle = this.isHeroHovered ? '#f4d03f' : 'rgba(244, 208, 63, 0.4)';
        ctx.lineWidth = 1;
        ctx.shadowColor = this.isHeroHovered ? '#f4d03f' : 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = this.isHeroHovered ? 8 : 4;
        ctx.stroke();

        // Centered Hero Name (crisp, zero level tag)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 12px Cinzel, serif';
        ctx.fillStyle = '#f7dc6f';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(nameText, x, bannerY + bannerH / 2);

        // Small downward pointer triangle touching right near the head
        ctx.fillStyle = this.isHeroHovered ? '#f4d03f' : 'rgba(244, 208, 63, 0.55)';
        ctx.beginPath();
        ctx.moveTo(x - 4, bannerY + bannerH);
        ctx.lineTo(x + 4, bannerY + bannerH);
        ctx.lineTo(x, bannerY + bannerH + 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    renderFireflies(ctx, width, height) {
        ctx.save();
        for (const f of this.fireflies) {
            f.x += f.speedX * 0.016;
            if (f.x > width + 30) {
                f.x = -20;
                f.y = Math.random() * height;
            }

            const currentY = f.y + Math.sin(this.time * f.swayFreq + f.phase) * f.swayAmp;
            const alpha = f.baseAlpha * (0.6 + Math.sin(this.time * 2.5 + f.phase) * 0.4);

            // Reference [Image #1] features bright lime-green floating motes
            const color = f.isGreen
                ? `rgba(74, 222, 128, ${alpha})`
                : `rgba(250, 204, 21, ${alpha * 0.85})`;
            ctx.fillStyle = color;
            ctx.shadowColor = f.isGreen ? '#4ade80' : '#facc15';
            ctx.shadowBlur = 6;

            ctx.beginPath();
            ctx.arc(f.x, currentY, f.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderVignette(ctx, width, height) {
        ctx.save();
        const vignette = ctx.createRadialGradient(
            width / 2, height / 2, height * 0.38,
            width / 2, height / 2, Math.max(width, height) * 0.72
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.7, 'rgba(4, 4, 6, 0.3)');
        vignette.addColorStop(1, 'rgba(2, 2, 4, 0.75)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
}
