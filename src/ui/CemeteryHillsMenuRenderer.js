/**
 * VALORIA - CemeteryHills Menu Scene Renderer
 * Live pixel-art interactive main menu featuring the CemeteryHills parallax environment,
 * 3 idle playable champions on the terrain, floating nameplates, and atmospheric dark fantasy VFX.
 */

export class CemeteryHillsMenuRenderer {
    constructor() {
        this.skyImg = new Image();
        this.skyImg.src = 'CemeteryHills/Pack/Background/Sky_Background.png';

        this.mountainsImg = new Image();
        this.mountainsImg.src = 'CemeteryHills/Pack/Background/Mountains_Background.png';

        this.midgroundImg = new Image();
        this.midgroundImg.src = 'CemeteryHills/Pack/Background/Midground_Sample.png';

        this.sheetImg = new Image();
        this.sheetImg.src = 'CemeteryHills/Pack/CemeteryHills_Sheet.png';

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
                classLabel: 'Heavy Knight',
                ratioX: 0.31,
                scale: 2.1,
                frameW: 120,
                frameH: 80,
                totalFrames: 10,
                fps: 10,
                anchorOffsetX: 60,
                anchorOffsetY: 72,
                themeColor: '#5dade2',
                glowColor: 'rgba(93, 173, 226, 0.45)',
            },
            {
                id: 'blonde',
                name: 'LADY SYLVIA',
                title: 'THE RADIANT BLADE',
                classLabel: 'Radiant Valkyrie',
                ratioX: 0.50,
                scale: 2.3,
                frameW: 69,
                frameH: 44,
                totalFrames: 6,
                fps: 8,
                anchorOffsetX: 35,
                anchorOffsetY: 38,
                themeColor: '#f4d03f',
                glowColor: 'rgba(244, 208, 63, 0.55)',
            },
            {
                id: 'brown',
                name: 'KAELEN',
                title: 'THE SHADOW BLADE',
                classLabel: 'Shadow Assassin',
                ratioX: 0.69,
                scale: 2.3,
                frameW: 69,
                frameH: 44,
                totalFrames: 6,
                fps: 8,
                anchorOffsetX: 35,
                anchorOffsetY: 38,
                themeColor: '#af7ac5',
                glowColor: 'rgba(175, 122, 197, 0.45)',
            },
        ];

        this.selectedHeroId = 'knight';
        this.hoveredHeroId = null;
        this.heroHitboxes = [];
        this.time = 0;
        this.onSelectHero = null;

        // Ambient cemetery fireflies & fog motes
        this.motes = Array.from({ length: 42 }, () => ({
            x: Math.random() * 1920,
            y: Math.random() * 1080,
            radius: 1 + Math.random() * 2.2,
            speedX: 12 + Math.random() * 18,
            swayFreq: 0.8 + Math.random() * 1.5,
            swayAmp: 15 + Math.random() * 20,
            baseAlpha: 0.15 + Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2,
            isEmber: Math.random() > 0.6,
        }));
    }

    setSelectedHero(heroId) {
        if (this.heroes.some(h => h.id === heroId)) {
            this.selectedHeroId = heroId;
        }
    }

    handleMouseMove(mouseX, mouseY) {
        let foundHover = null;
        for (const box of this.heroHitboxes) {
            if (
                mouseX >= box.x &&
                mouseX <= box.x + box.w &&
                mouseY >= box.y &&
                mouseY <= box.y + box.h
            ) {
                foundHover = box.id;
                break;
            }
        }

        const changed = this.hoveredHeroId !== foundHover;
        this.hoveredHeroId = foundHover;
        return { cursor: foundHover ? 'pointer' : 'default', changed };
    }

    handleClick(mouseX, mouseY) {
        for (const box of this.heroHitboxes) {
            if (
                mouseX >= box.x &&
                mouseX <= box.x + box.w &&
                mouseY >= box.y &&
                mouseY <= box.y + box.h
            ) {
                this.selectedHeroId = box.id;
                this.onSelectHero?.(box.id);
                return box.id;
            }
        }
        return null;
    }

    render(ctx, width, height, dt = 0.016) {
        this.time += dt;

        // 1. Draw Parallax Background
        this.renderBackgroundLayers(ctx, width, height);

        // 2. Draw Cemetery Hills Terrain & Props
        const groundY = Math.floor(height * 0.71);
        this.renderTerrainAndProps(ctx, width, height, groundY);

        // 3. Draw Idle Heroes & Selection Effects
        this.renderHeroes(ctx, width, groundY);

        // 4. Draw Ambient VFX (Fireflies & Fog)
        this.renderAmbientMotes(ctx, width, height);

        // 5. Draw Atmospheric Edge Vignette
        this.renderVignette(ctx, width, height);
    }

    renderBackgroundLayers(ctx, width, height) {
        // Sky Background
        if (this.skyImg.complete && this.skyImg.naturalWidth > 0) {
            const skyW = this.skyImg.naturalWidth;
            const skyH = this.skyImg.naturalHeight;
            const scaleY = (height * 0.75) / skyH;
            const renderW = skyW * scaleY;
            const tilesNeeded = Math.ceil(width / renderW) + 1;
            const offset = (this.time * 6) % renderW;

            for (let i = 0; i < tilesNeeded; i++) {
                ctx.drawImage(this.skyImg, i * renderW - offset, 0, renderW + 1, height * 0.75);
            }
        } else {
            const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.75);
            skyGrad.addColorStop(0, '#0a0d18');
            skyGrad.addColorStop(1, '#1b1b2f');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, width, height * 0.75);
        }

        // Mountain Background
        if (this.mountainsImg.complete && this.mountainsImg.naturalWidth > 0) {
            const mtnW = this.mountainsImg.naturalWidth;
            const mtnH = this.mountainsImg.naturalHeight;
            const scaleY = (height * 0.55) / mtnH;
            const renderW = mtnW * scaleY;
            const startY = height * 0.22;
            const tilesNeeded = Math.ceil(width / renderW) + 1;
            const offset = (this.time * 3) % renderW;

            ctx.save();
            ctx.globalAlpha = 0.92;
            for (let i = 0; i < tilesNeeded; i++) {
                ctx.drawImage(this.mountainsImg, i * renderW - offset, startY, renderW + 1, height * 0.55);
            }
            ctx.restore();
        }

        // Midground Tree Silhouettes
        if (this.midgroundImg.complete && this.midgroundImg.naturalWidth > 0) {
            const midW = this.midgroundImg.naturalWidth;
            const midH = this.midgroundImg.naturalHeight;
            const scale = 2.4;
            const renderW = midW * scale;
            const renderH = midH * scale;
            const startY = height * 0.71 - renderH + 24;
            const tilesNeeded = Math.ceil(width / renderW) + 1;

            ctx.save();
            ctx.globalAlpha = 0.88;
            for (let i = 0; i < tilesNeeded; i++) {
                ctx.drawImage(this.midgroundImg, i * renderW, startY, renderW, renderH);
            }
            ctx.restore();
        }
    }

    renderTerrainAndProps(ctx, width, height, groundY) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const tileScale = 2.5;
        const tileSize = 16 * tileScale;

        // Subterranean dark fill beneath ground line
        const dirtGrad = ctx.createLinearGradient(0, groundY, 0, height);
        dirtGrad.addColorStop(0, '#1a191c');
        dirtGrad.addColorStop(0.3, '#100f13');
        dirtGrad.addColorStop(1, '#08080a');
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(0, groundY, width, height - groundY);

        if (this.sheetImg.complete && this.sheetImg.naturalWidth > 0) {
            // Draw surface grass tiles across horizon
            const tileCols = Math.ceil(width / tileSize) + 1;
            for (let col = 0; col < tileCols; col++) {
                const srcCol = 1 + (col % 4);
                ctx.drawImage(
                    this.sheetImg,
                    srcCol * 16, 0, 16, 16,
                    col * tileSize, groundY - 6, tileSize, tileSize
                );
            }

            // Draw Cemetery Props:
            // 1. Twisted Gothic Tree on Far Left
            ctx.drawImage(this.sheetImg, 320, 0, 96, 112, width * 0.08, groundY - 112 * 2.2 + 8, 96 * 2.2, 112 * 2.2);

            // 2. Weathered Iron Fence Section Left
            ctx.drawImage(this.sheetImg, 224, 96, 64, 32, width * 0.20, groundY - 32 * 2.0, 64 * 2.0, 32 * 2.0);

            // 3. Tombstone 1 between Roland and Sylvia
            ctx.drawImage(this.sheetImg, 192, 16, 32, 32, width * 0.40, groundY - 32 * 2.0 + 4, 32 * 2.0, 32 * 2.0);

            // 4. Stone Cross between Sylvia and Kaelen
            ctx.drawImage(this.sheetImg, 272, 32, 32, 32, width * 0.60, groundY - 32 * 2.0 + 4, 32 * 2.0, 32 * 2.0);

            // 5. Weathered Iron Fence Section Right
            ctx.drawImage(this.sheetImg, 224, 96, 64, 32, width * 0.79, groundY - 32 * 2.0, 64 * 2.0, 32 * 2.0);

            // 6. Gothic Tree on Far Right
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(this.sheetImg, 320, 0, 96, 112, -(width * 0.94), groundY - 112 * 2.1 + 8, 96 * 2.1, 112 * 2.1);
            ctx.restore();
        }

        ctx.restore();
    }

    renderHeroes(ctx, width, groundY) {
        this.heroHitboxes = [];

        for (const hero of this.heroes) {
            const sprite = this.heroSprites[hero.id];
            const isSelected = this.selectedHeroId === hero.id;
            const isHovered = this.hoveredHeroId === hero.id;

            const posX = Math.floor(width * hero.ratioX);
            const posY = groundY;

            const renderW = hero.frameW * hero.scale;
            const renderH = hero.frameH * hero.scale;
            const drawX = Math.floor(posX - hero.anchorOffsetX * hero.scale);
            const drawY = Math.floor(posY - hero.anchorOffsetY * hero.scale);

            // Interactive Hitbox (centered on the champion's standing body)
            const boxW = Math.min(renderW * 0.65, 120);
            const boxH = Math.min(renderH * 0.85, 140);
            const boxX = posX - boxW / 2;
            const boxY = posY - boxH;

            this.heroHitboxes.push({
                id: hero.id,
                x: boxX,
                y: boxY,
                w: boxW,
                h: boxH,
            });

            // 1. Ground Shadow
            ctx.save();
            ctx.fillStyle = 'rgba(5, 5, 8, 0.65)';
            ctx.beginPath();
            ctx.ellipse(posX, posY + 4, boxW * 0.55, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 2. Selection Ring / Halo under feet
            if (isSelected) {
                this.renderSelectionHalo(ctx, posX, posY, hero.themeColor, hero.glowColor);
            }

            // 3. Render Hero Idle Sprite
            if (sprite.complete && sprite.naturalWidth > 0) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;

                const frameIndex = Math.floor(this.time * hero.fps) % hero.totalFrames;
                const srcX = frameIndex * hero.frameW;
                const srcY = 0;

                // Subtle hover brightening
                if (isHovered && !isSelected) {
                    ctx.filter = 'brightness(1.15) drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))';
                }

                ctx.drawImage(
                    sprite,
                    srcX, srcY, hero.frameW, hero.frameH,
                    drawX, drawY, renderW, renderH
                );
                ctx.restore();
            }

            // 4. Floating Nameplate (Above Selected or Hovered Hero)
            if (isSelected || isHovered) {
                this.renderNameplate(ctx, posX, boxY - 14, hero, isSelected);
            }
        }
    }

    renderSelectionHalo(ctx, x, y, themeColor, glowColor) {
        ctx.save();
        const pulse = 0.8 + Math.sin(this.time * 3.5) * 0.2;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(x, y + 2, 8, x, y + 2, 48 * pulse);
        glowGrad.addColorStop(0, glowColor);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 54 * pulse, 16 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing ring
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 38, 11, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    renderNameplate(ctx, x, y, hero, isSelected) {
        ctx.save();
        const nameText = hero.name;
        const titleText = hero.title;

        ctx.font = '700 13px Cinzel, serif';
        const nameMetrics = ctx.measureText(nameText);
        ctx.font = '600 9px Cinzel, serif';
        const titleMetrics = ctx.measureText(titleText);

        const bannerW = Math.max(nameMetrics.width, titleMetrics.width) + 36;
        const bannerH = 42;
        const bannerX = Math.floor(x - bannerW / 2);
        const bannerY = Math.floor(y - bannerH);

        // Pill / Parchment container background
        ctx.fillStyle = 'rgba(15, 12, 16, 0.88)';
        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
        ctx.fill();

        // Dual metallic gold/theme border
        ctx.strokeStyle = isSelected ? hero.themeColor : '#7d6608';
        ctx.lineWidth = isSelected ? 1.8 : 1.2;
        ctx.shadowColor = isSelected ? hero.themeColor : 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = isSelected ? 8 : 4;
        ctx.stroke();

        // Inner subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.strokeRect(bannerX + 2, bannerY + 2, bannerW - 4, bannerH - 4);

        // Name text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 13px Cinzel, serif';
        ctx.fillStyle = isSelected ? '#f7dc6f' : '#eaeded';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 5;
        ctx.fillText(nameText, x, bannerY + 16);

        // Title / Class text (strictly NO level indicator)
        ctx.font = '600 9px Cinzel, serif';
        ctx.fillStyle = isSelected ? hero.themeColor : '#a6acaf';
        ctx.fillText(titleText, x, bannerY + 30);

        // Downward Pointer Triangle
        ctx.fillStyle = isSelected ? hero.themeColor : '#7d6608';
        ctx.beginPath();
        ctx.moveTo(x - 5, bannerY + bannerH);
        ctx.lineTo(x + 5, bannerY + bannerH);
        ctx.lineTo(x, bannerY + bannerH + 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    renderAmbientMotes(ctx, width, height) {
        ctx.save();
        for (const m of this.motes) {
            m.x += m.speedX * 0.016;
            if (m.x > width + 40) {
                m.x = -20;
                m.y = Math.random() * height;
            }

            const currentY = m.y + Math.sin(this.time * m.swayFreq + m.phase) * m.swayAmp;
            const alpha = m.baseAlpha * (0.6 + Math.sin(this.time * 2 + m.phase) * 0.4);

            ctx.fillStyle = m.isEmber
                ? `rgba(230, 126, 34, ${alpha})`
                : `rgba(174, 214, 241, ${alpha * 0.75})`;
            ctx.shadowColor = m.isEmber ? '#e67e22' : '#aed6f1';
            ctx.shadowBlur = 6;

            ctx.beginPath();
            ctx.arc(m.x, currentY, m.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderVignette(ctx, width, height) {
        ctx.save();
        const vignette = ctx.createRadialGradient(
            width / 2, height / 2, height * 0.35,
            width / 2, height / 2, Math.max(width, height) * 0.75
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.7, 'rgba(5, 5, 8, 0.45)');
        vignette.addColorStop(1, 'rgba(2, 2, 4, 0.88)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
}
