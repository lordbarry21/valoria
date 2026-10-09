/**
 * VALORIA - Dark Fantasy 2D Action RPG
 * Main Entry Point
 */

// ============================================================================
// GAME CONSTANTS
// ============================================================================
export const GAME_CONFIG = {
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    GRAVITY: 1800,
    DEBUG: false,
    SHOW_HITBOXES: false,
};

// ============================================================================
// GAME STATE
// ============================================================================
export const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    DEAD: 'dead',
    VICTORY: 'victory',
};

let currentState = GameState.MENU;
let lastTime = 0;
let deltaTime = 0;
let gameTime = 0;
let settingsReturnScreen = 'main-menu';

// ============================================================================
// CORE SYSTEMS
// ============================================================================
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { Camera } from './core/Camera.js';
import { GameWorld } from './world/GameWorld.js';
import { Player } from './player/Player.js';
import { EnemyManager } from './enemies/EnemyManager.js';
import { CombatSystem } from './combat/CombatSystem.js';
import { VFXManager } from './effects/VFXManager.js';
import { UIManager } from './ui/UIManager.js';
import { CemeteryHillsMenuRenderer } from './ui/CemeteryHillsMenuRenderer.js';

// Global references
export let canvas, ctx;
export let inputManager;
export let audioManager;
export let camera;
export let gameWorld;
export let player;
export let enemyManager;
export let combatSystem;
export let vfxManager;
export let uiManager;
export let cemeteryMenuRenderer;
let selectedChampion = 'knight';

// ============================================================================
// INITIALIZATION
// ============================================================================
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Set canvas to game resolution immediately
    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    inputManager = new InputManager();
    audioManager = new AudioManager();
    camera = new Camera();
    vfxManager = new VFXManager();
    combatSystem = new CombatSystem();
    gameWorld = new GameWorld();
    enemyManager = new EnemyManager();
    player = new Player();
    uiManager = new UIManager();
    cemeteryMenuRenderer = new CemeteryHillsMenuRenderer();
    const urlHero = new URLSearchParams(window.location.search).get('hero');
    if (urlHero && ['knight', 'blonde', 'brown'].includes(urlHero)) {
        selectedChampion = urlHero;
        player.setCharacter(urlHero);
    }
    cemeteryMenuRenderer.setSelectedHero(selectedChampion);
    cemeteryMenuRenderer.onSelectHero = (heroId) => {
        selectedChampion = heroId;
        player.setCharacter(heroId);
    };

    setupInputHandlers();
    setupUIHandlers();
    syncFullscreenLabel();

    window.valoria = {
        get player() { return player; },
        get inputManager() { return inputManager; },
        get audioManager() { return audioManager; },
        get currentState() { return currentState; },
        get enemyManager() { return enemyManager; },
        get combatSystem() { return combatSystem; },
        get vfxManager() { return vfxManager; },
        startGame
    };

    const testMode = new URLSearchParams(window.location.search).get('test');
    if (testMode === 'portal') {
        startGame();
        enemyManager.enemies = [];
        enemyManager.spawnPortal();
    } else if (testMode === 'at_portal') {
        startGame();
        enemyManager.enemies = [];
        enemyManager.spawnPortal();
        player.x = 2240;
        camera.x = 2240;
    } else {
        showScreen('main-menu');
        audioManager.playMusic('menu');
    }

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth || window.innerWidth;
    const containerHeight = container.clientHeight || window.innerHeight;

    // Responsive full-bleed canvas: matches exact container aspect ratio with no letterbox black bars
    const targetHeight = 540;
    const targetWidth = Math.max(960, Math.round(targetHeight * (containerWidth / containerHeight)));

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    GAME_CONFIG.CANVAS_WIDTH = targetWidth;
    GAME_CONFIG.CANVAS_HEIGHT = targetHeight;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.left = '0px';
    canvas.style.top = '0px';

    if (camera) {
        camera.bounds.maxX = Math.max(targetWidth, gameWorld?.arenaWidth || 2600);
        camera.bounds.maxY = targetHeight;
    }
}

// ============================================================================
// INPUT HANDLERS
// ============================================================================
function setupInputHandlers() {
    inputManager.bindAction('Pause', 'Escape', () => {
        if (currentState === GameState.PLAYING) {
            pauseGame();
        } else if (currentState === GameState.PAUSED) {
            resumeGame();
        }
    });

    inputManager.bindAction('Fullscreen', 'KeyF', () => {
        toggleFullscreen();
    });

    inputManager.bindAction('Debug', 'F1', () => {
        GAME_CONFIG.DEBUG = !GAME_CONFIG.DEBUG;
        GAME_CONFIG.SHOW_HITBOXES = GAME_CONFIG.DEBUG;
        document.getElementById('debug-info').classList.toggle('hidden', !GAME_CONFIG.DEBUG);
    });

    // Pause only when user actually switches away from the browser tab
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && currentState === GameState.PLAYING) {
            pauseGame();
        }
    });
}

// ============================================================================
// UI HANDLERS
// ============================================================================
function openSettings(returnScreen) {
    settingsReturnScreen = returnScreen;
    showScreen('settings-menu');
}

function setupUIHandlers() {
    // Start Game: launches battle directly with the currently selected champion
    document.getElementById('btn-start').addEventListener('click', () => {
        audioManager.playSFX('ui_click');
        player.setCharacter(selectedChampion);
        startGame();
    });

    // Enter / Space to start game from main menu
    window.addEventListener('keydown', (e) => {
        if (currentState === GameState.MENU) {
            const charSelect = document.getElementById('char-select-screen');
            const settingsMenu = document.getElementById('settings-menu');
            const isSubmenuOpen = (!charSelect?.classList.contains('hidden')) || (!settingsMenu?.classList.contains('hidden'));
            if (!isSubmenuOpen) {
                if (e.code === 'Enter' || e.code === 'Space') {
                    e.preventDefault();
                    audioManager.playSFX('ui_click');
                    player.setCharacter(selectedChampion);
                    startGame();
                }
            }
        }
    });

    // Circular Hero Select Button
    document.getElementById('btn-menu-heroes')?.addEventListener('click', () => {
        audioManager.playSFX('ui_click');
        showScreen('char-select-screen');
    });

    document.getElementById('btn-char-select-back').addEventListener('click', () => {
        audioManager.playSFX('ui_click');
        showScreen('main-menu');
        cemeteryMenuRenderer.setSelectedHero(selectedChampion);
    });

    // Hero on main menu is purely a scenic centerpiece (selection done via CHOOSE HERO button)

    document.getElementById('btn-settings').addEventListener('click', () => openSettings('main-menu'));
    document.getElementById('btn-settings-back').addEventListener('click', () => showScreen(settingsReturnScreen));

    // Hero Select Cards & Buttons
    document.querySelectorAll('.hero-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const charId = card.dataset.char;
            if (!charId) return;
            selectedChampion = charId;
            cemeteryMenuRenderer.setSelectedHero(charId);
            player.setCharacter(charId);
            audioManager.playSFX('ui_select');
            showScreen('main-menu');
        });
    });

    document.querySelectorAll('.hero-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const charId = btn.dataset.char;
            if (!charId) return;
            selectedChampion = charId;
            cemeteryMenuRenderer.setSelectedHero(charId);
            player.setCharacter(charId);
            audioManager.playSFX('ui_select');
            showScreen('main-menu');
        });
    });

    const bindVolumeSlider = (sliderId, labelId, applyVolume) => {
        document.getElementById(sliderId).addEventListener('input', (e) => {
            const value = Number(e.target.value);
            document.getElementById(labelId).textContent = `${value}%`;
            applyVolume(value / 100);
        });
    };

    bindVolumeSlider('master-volume', 'master-value', v => audioManager.setMasterVolume(v));
    bindVolumeSlider('music-volume', 'music-value', v => audioManager.setMusicVolume(v));
    bindVolumeSlider('sfx-volume', 'sfx-value', v => audioManager.setSFXVolume(v));

    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
    document.getElementById('btn-quick-fullscreen')?.addEventListener('click', toggleFullscreen);
    document.getElementById('btn-menu-fullscreen')?.addEventListener('click', (e) => {
        e.stopPropagation();
        audioManager.playSFX('ui_click');
        toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', () => {
        resizeCanvas();
        syncFullscreenLabel();
    });
    document.addEventListener('webkitfullscreenchange', () => {
        resizeCanvas();
        syncFullscreenLabel();
    });
    window.addEventListener('resize', () => {
        resizeCanvas();
        syncFullscreenLabel();
    });

    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-pause-settings').addEventListener('click', () => openSettings('pause-menu'));
    document.getElementById('btn-quit').addEventListener('click', quitToMenu);

    document.getElementById('btn-restart').addEventListener('click', restartGame);
    document.getElementById('btn-death-menu').addEventListener('click', quitToMenu);

    document.getElementById('btn-victory-restart').addEventListener('click', restartGame);
    document.getElementById('btn-victory-menu').addEventListener('click', quitToMenu);
}

// ============================================================================
// SCREEN MANAGEMENT
// ============================================================================
function showScreen(screenId) {
    document.getElementById('fullscreen-modal')?.classList.add('hidden');
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });

    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('hidden');
        screen.classList.add('screen-enter');
        setTimeout(() => screen.classList.remove('screen-enter'), 500);
    }

    const inGameplay = screenId === 'none';
    const onTitleScreens = screenId !== 'none' && screenId !== 'pause-menu';
    document.getElementById('game-hud').classList.toggle('hidden', onTitleScreens);
    document.getElementById('controls-help').classList.toggle('hidden', !inGameplay);

    // A button that keeps focus after being clicked would be re-activated by Space (jump).
    if (inGameplay) {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        if (canvas) {
            canvas.tabIndex = 1;
            canvas.focus();
        }
        window.focus();
    }
}

export function isHtmlFullscreen() {
    return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
}

export function isGameFullscreen() {
    return Boolean(
        isHtmlFullscreen() ||
        window.matchMedia?.('(display-mode: fullscreen)')?.matches
    );
}

export async function requestGameFullscreen() {
    try {
        if (!isHtmlFullscreen()) {
            const elem = document.documentElement;
            const req = elem.requestFullscreen ||
                        elem.webkitRequestFullscreen ||
                        elem.mozRequestFullScreen ||
                        elem.msRequestFullscreen;
            if (req) {
                await req.call(elem);
            }
        }
    } catch (err) {
        console.warn('Fullscreen request failed on root element, trying container fallback:', err);
        try {
            const container = document.getElementById('game-container');
            const req = container?.requestFullscreen ||
                        container?.webkitRequestFullscreen ||
                        container?.mozRequestFullScreen ||
                        container?.msRequestFullscreen;
            if (req) await req.call(container);
        } catch (innerErr) {
            console.error('All fullscreen requests failed:', innerErr);
        }
    } finally {
        setTimeout(() => {
            resizeCanvas();
            syncFullscreenLabel();
        }, 100);
    }
}

export async function exitGameFullscreen() {
    try {
        if (isHtmlFullscreen()) {
            const exit = document.exitFullscreen ||
                         document.webkitExitFullscreen ||
                         document.mozCancelFullScreen ||
                         document.msExitFullscreen;
            if (exit) {
                await exit.call(document);
            }
        }
    } catch (err) {
        console.warn('Exit fullscreen failed:', err);
    } finally {
        setTimeout(() => {
            resizeCanvas();
            syncFullscreenLabel();
        }, 100);
    }
}

export async function toggleFullscreen() {
    if (isHtmlFullscreen()) {
        await exitGameFullscreen();
    } else {
        await requestGameFullscreen();
    }
}

function syncFullscreenLabel() {
    const isFs = isGameFullscreen();
    const settingsBtn = document.getElementById('btn-fullscreen');
    if (settingsBtn) settingsBtn.textContent = isFs ? 'ON' : 'OFF';

    // Toggle menu fullscreen button icon & tooltip
    const menuFsBtn = document.getElementById('btn-menu-fullscreen');
    if (menuFsBtn) {
        menuFsBtn.title = isFs ? 'Exit Fullscreen (F)' : 'Toggle Fullscreen (F)';
        menuFsBtn.setAttribute('aria-label', isFs ? 'Exit Fullscreen' : 'Toggle Fullscreen');
        const iconExpand = menuFsBtn.querySelector('.fs-icon.icon-expand');
        const iconCompress = menuFsBtn.querySelector('.fs-icon.icon-compress');
        if (iconExpand && iconCompress) {
            iconExpand.classList.toggle('hidden', isFs);
            iconCompress.classList.toggle('hidden', !isFs);
        }
    }

    const quickFsBtn = document.getElementById('btn-quick-fullscreen');
    if (quickFsBtn) {
        quickFsBtn.title = isFs ? 'Exit Fullscreen (F)' : 'Fullscreen (F)';
    }
}

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================
function startGame() {
    currentState = GameState.PLAYING;
    showScreen('none');

    inputManager.reset();
    gameWorld.init();
    player.init();
    enemyManager.init();
    combatSystem.init();
    vfxManager.init();
    uiManager.init();

    const bounds = gameWorld.getCameraBounds();
    camera.reset();
    camera.setBounds(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY);
    camera.follow(player, 0);
    camera.snapToTarget();

    enemyManager.spawnWave();
    audioManager.playMusic(enemyManager.stage === 2 ? 'stage2' : 'stage1');

    gameTime = 0;

    if (canvas) {
        canvas.tabIndex = 1;
        canvas.focus();
    }
    window.focus();
}

function pauseGame() {
    currentState = GameState.PAUSED;
    showScreen('pause-menu');
    audioManager.pauseMusic();
}

function resumeGame() {
    currentState = GameState.PLAYING;
    inputManager.reset();
    showScreen('none');
    audioManager.resumeMusic();
}

function quitToMenu() {
    currentState = GameState.MENU;
    showScreen('main-menu');
    audioManager.playMusic('menu');
}

function restartGame() {
    startGame();
}

export function playerDied() {
    currentState = GameState.DEAD;
    showScreen('death-screen');
    audioManager.stopMusic();
}

export function victoryAchieved() {
    currentState = GameState.VICTORY;
    showScreen('victory-screen');
    audioManager.stopMusic();
    audioManager.playSFX('victory');
}

// ============================================================================
// GAME LOOP
// ============================================================================
function gameLoop(timestamp) {
    // Cap at 100ms so a background tab doesn't produce one giant physics step
    deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    if (currentState === GameState.PLAYING) {
        update(deltaTime);
    }

    render();

    if (GAME_CONFIG.DEBUG) {
        updateDebugInfo();
    }

    inputManager.endFrame();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    gameTime += dt;

    gameWorld.update(dt);
    player.update(dt);
    camera.follow(player, player.facing * 50);

    enemyManager.update(dt);
    combatSystem.update(dt);
    vfxManager.update(dt);
    camera.update(dt);
    uiManager.update(dt);
}

function render() {
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentState === GameState.MENU) {
        renderMenuBackground();
        return;
    }

    ctx.save();
    camera.applyTransform(ctx);

    gameWorld.render(ctx);
    enemyManager.render(ctx);
    combatSystem.render(ctx);
    player.render(ctx);
    vfxManager.render(ctx);

    if (GAME_CONFIG.SHOW_HITBOXES) {
        renderHitboxes();
    }

    ctx.restore();

    renderWaveBanner();
}

function renderMenuBackground() {
    cemeteryMenuRenderer.render(ctx, canvas.width, canvas.height, deltaTime);

    // Render live animated pixel-art idle sprites in character selection cards if open
    const charSelectScreen = document.getElementById('char-select-screen');
    if (charSelectScreen && !charSelectScreen.classList.contains('hidden')) {
        renderHeroPreviews(lastTime / 1000);
    }
}

const previewImages = {
    knight: new Image(),
    blonde: new Image(),
    brown: new Image()
};
previewImages.knight.src = 'FreeKnight/Colour1/Outline/120x80_PNGSheets/_Idle.png';
previewImages.blonde.src = 'girl warior.png';
previewImages.brown.src = 'Girl Warior brown hair/Warrior/SpriteSheet/Warrior_Sheet-Effect.png';

function renderHeroPreviews(time) {
    // Knight Preview - centered squarely at x=70, grounded at y=112 in 140x120 canvas
    const cK = document.getElementById('hero-preview-knight');
    if (cK && previewImages.knight.complete && previewImages.knight.naturalWidth > 0) {
        const ctxK = cK.getContext('2d');
        ctxK.imageSmoothingEnabled = false;
        ctxK.clearRect(0, 0, cK.width, cK.height);
        const frame = Math.floor(time * 10) % 10;
        // Knight frame 120x80; visual center is at x=55, boot soles at y=79
        const scale = 2.4;
        const spriteW = 120 * scale;
        const spriteH = 80 * scale;
        const dx = Math.round(cK.width / 2 - 55 * scale);
        const dy = Math.round((cK.height - 20) - 79 * scale);
        ctxK.drawImage(previewImages.knight, frame * 120, 0, 120, 80, dx, dy, spriteW, spriteH);
    }

    // Blonde Valkyrie Preview - centered squarely at x=70, grounded at y=112 in 140x120 canvas
    const cB = document.getElementById('hero-preview-blonde');
    if (cB && previewImages.blonde.complete && previewImages.blonde.naturalWidth > 0) {
        const ctxB = cB.getContext('2d');
        ctxB.imageSmoothingEnabled = false;
        ctxB.clearRect(0, 0, cB.width, cB.height);
        const frame = Math.floor(time * 7.2) % 6;
        // Blonde frame 69x44; visual center is at x=27, boot soles at y=43
        const scale = 2.6;
        const spriteW = 69 * scale;
        const spriteH = 44 * scale;
        const dx = Math.round(cB.width / 2 - 27 * scale);
        const dy = Math.round((cB.height - 8) - 43 * scale);
        ctxB.drawImage(previewImages.blonde, frame * 69, 0, 69, 44, dx, dy, spriteW, spriteH);
    }

    // Brown Assassin Preview - centered squarely at x=70, grounded at y=112 in 140x120 canvas
    const cBr = document.getElementById('hero-preview-brown');
    if (cBr && previewImages.brown.complete && previewImages.brown.naturalWidth > 0) {
        const ctxBr = cBr.getContext('2d');
        ctxBr.imageSmoothingEnabled = false;
        ctxBr.clearRect(0, 0, cBr.width, cBr.height);
        const frame = Math.floor(time * 7.2) % 6;
        // Brown frame 69x44; visual center is at x=27, boot soles at y=43
        const scale = 2.6;
        const spriteW = 69 * scale;
        const spriteH = 44 * scale;
        const dx = Math.round(cBr.width / 2 - 27 * scale);
        const dy = Math.round((cBr.height - 8) - 43 * scale);
        ctxBr.drawImage(previewImages.brown, frame * 69, 0, 69, 44, dx, dy, spriteW, spriteH);
    }
}

function parseBannerText(rawText) {
    if (!rawText) return { category: 'VALORIA', title: '', subtitle: '', theme: 'gold' };

    if (rawText.toUpperCase().includes('PORTAL')) {
        return {
            category: 'DIMENSIONAL GATEWAY',
            title: 'FROST PORTAL UNLOCKED',
            subtitle: 'Follow the runic compass beacon to advance',
            theme: 'frost'
        };
    }

    if (rawText.toLowerCase().includes('wave cleared')) {
        return {
            category: 'VICTORY',
            title: 'WAVE CLEARED',
            subtitle: 'Prepare for the oncoming onslaught',
            theme: 'gold'
        };
    }

    if (rawText.startsWith('MINI-BOSS:')) {
        const parts = rawText.replace('MINI-BOSS:', '').trim().split('&');
        return {
            category: 'MINI-BOSS ENCOUNTER',
            title: parts[0]?.trim().toUpperCase() || 'MINI-BOSS',
            subtitle: parts[1] ? `& ${parts[1].trim()}` : 'Eliminate the abomination',
            theme: 'crimson'
        };
    }

    if (rawText.startsWith('BOSS:')) {
        const parts = rawText.replace('BOSS:', '').trim().split('&');
        return {
            category: 'SUPREME THREAT DETECTED',
            title: parts[0]?.trim().toUpperCase() || 'BOSS',
            subtitle: parts[1] ? `& ${parts[1].trim()}` : 'A sinister terror approaches',
            theme: 'crimson'
        };
    }

    if (rawText.startsWith('FINAL CLIMAX:')) {
        return {
            category: 'FINAL CLIMAX',
            title: 'MALAKAR, THE FALLEN KNIGHT',
            subtitle: 'The fate of Valoria rests upon your blade',
            theme: 'purple'
        };
    }

    if (rawText.includes(':')) {
        const [cat, rest] = rawText.split(':');
        const [title, sub] = (rest || '').split('-');
        return {
            category: cat.trim().toUpperCase(),
            title: (title || '').trim().toUpperCase(),
            subtitle: (sub || '').trim(),
            theme: cat.toUpperCase().includes('STAGE 2') ? 'frost' : 'gold'
        };
    }

    return {
        category: 'VALORIA',
        title: rawText.toUpperCase(),
        subtitle: '',
        theme: 'gold'
    };
}

function renderWaveBanner() {
    if (currentState !== GameState.PLAYING || enemyManager.bannerTimer <= 0) return;

    const parsed = parseBannerText(enemyManager.bannerText);
    const duration = enemyManager.bannerDuration || 3.0;
    const timeLeft = enemyManager.bannerTimer;
    const elapsed = duration - timeLeft;

    let alpha = 1;
    let scale = 1;
    let offsetY = 0;

    if (elapsed < 0.35) {
        const progress = elapsed / 0.35;
        alpha = progress;
        scale = 0.94 + 0.06 * Math.sin(progress * Math.PI * 0.5);
    } else if (timeLeft < 0.5) {
        const progress = timeLeft / 0.5;
        alpha = progress;
        offsetY = (1 - progress) * -8;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const centerX = canvas.width / 2;
    const bannerY = 170 + offsetY;

    const themes = {
        gold: {
            accent: '#facc15',
            gradientStart: '#ffffff',
            gradientEnd: '#f59e0b',
            border: 'rgba(217, 119, 6, 0.75)'
        },
        frost: {
            accent: '#7dd3fc',
            gradientStart: '#ffffff',
            gradientEnd: '#38bdf8',
            border: 'rgba(14, 165, 233, 0.75)'
        },
        crimson: {
            accent: '#f87171',
            gradientStart: '#ffffff',
            gradientEnd: '#ef4444',
            border: 'rgba(220, 38, 38, 0.75)'
        },
        purple: {
            accent: '#c084fc',
            gradientStart: '#ffffff',
            gradientEnd: '#a855f7',
            border: 'rgba(147, 51, 234, 0.75)'
        }
    };
    const tStyle = themes[parsed.theme] || themes.gold;

    ctx.font = '700 16px Cinzel, serif';
    const titleMetrics = ctx.measureText(parsed.title);
    const bannerW = Math.max(320, Math.min(500, Math.round(titleMetrics.width + 120)));
    const bannerH = parsed.subtitle ? 46 : 36;

    ctx.translate(centerX, bannerY);
    ctx.scale(scale, scale);

    // 1. Sleek Obsidian Background Ribbon
    ctx.fillStyle = 'rgba(8, 6, 14, 0.92)';
    ctx.beginPath();
    ctx.roundRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 4);
    ctx.fill();

    // 2. Filigree Hairline Borders
    ctx.strokeStyle = tStyle.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-bannerW * 0.44, -bannerH / 2);
    ctx.lineTo(bannerW * 0.44, -bannerH / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-bannerW * 0.44, bannerH / 2);
    ctx.lineTo(bannerW * 0.44, bannerH / 2);
    ctx.stroke();

    // Center Ornamental Diamonds
    ctx.fillStyle = tStyle.accent;
    ctx.shadowColor = tStyle.accent;
    ctx.shadowBlur = 5;
    drawBannerDiamond(ctx, 0, -bannerH / 2, 2.5);
    drawBannerDiamond(ctx, 0, bannerH / 2, 2.5);
    ctx.shadowBlur = 0;

    // 3. Category / Badge
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 9px Cinzel, serif';
    ctx.fillStyle = tStyle.accent;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    const catY = parsed.subtitle ? -bannerH / 2 + 10 : -bannerH / 2 + 11;
    ctx.fillText(parsed.category, 0, catY);

    // 4. Main Title
    ctx.font = '700 16px Cinzel, serif';
    const textGrad = ctx.createLinearGradient(0, -8, 0, 8);
    textGrad.addColorStop(0, tStyle.gradientStart);
    textGrad.addColorStop(1, tStyle.gradientEnd);
    ctx.fillStyle = textGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 6;
    const titleY = parsed.subtitle ? -bannerH / 2 + 24 : -bannerH / 2 + 23;
    ctx.fillText(parsed.title, 0, titleY);

    // 5. Subtitle (if present)
    if (parsed.subtitle) {
        ctx.font = '10px Cinzel, serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(parsed.subtitle, 0, -bannerH / 2 + 37);
    }

    ctx.restore();
}

function drawBannerDiamond(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
}

function renderHitboxes() {
    ctx.lineWidth = 2;

    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.strokeRect(player.x - player.width / 2, player.y - player.height, player.width, player.height);

    const attackBox = combatSystem.getPlayerHitbox();
    if (attackBox) {
        const isActive = player.stateMachine.attackPhase === 'active';
        ctx.fillStyle = isActive ? 'rgba(255, 0, 0, 0.35)' : 'rgba(255, 0, 0, 0.12)';
        ctx.fillRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
    }

    for (const enemy of enemyManager.enemies) {
        const hurtbox = enemy.getHurtbox();
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.strokeRect(hurtbox.x, hurtbox.y, hurtbox.width, hurtbox.height);

        const enemyAttack = enemy.getAttackHitbox();
        if (enemyAttack) {
            ctx.fillStyle = 'rgba(255, 128, 0, 0.35)';
            ctx.fillRect(enemyAttack.x, enemyAttack.y, enemyAttack.width, enemyAttack.height);
        }
    }
}

function updateDebugInfo() {
    document.getElementById('debug-state').textContent = `State: ${player?.stateMachine?.currentState ?? 'N/A'}`;
    document.getElementById('debug-fps').textContent = `FPS: ${deltaTime > 0 ? Math.round(1 / deltaTime) : 0}`;
    document.getElementById('debug-enemies').textContent = `Enemies: ${enemyManager?.getEnemyCount() ?? 0} (wave ${enemyManager?.waveNumber ?? 0}/${enemyManager?.totalWaves ?? 0})`;
}

// ============================================================================
// START THE GAME
// ============================================================================
window.addEventListener('load', init);
