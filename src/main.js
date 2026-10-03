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
    cemeteryMenuRenderer.setSelectedHero(selectedChampion);
    cemeteryMenuRenderer.onSelectHero = (heroId) => {
        selectedChampion = heroId;
        player.setCharacter(heroId);
    };

    setupInputHandlers();
    setupUIHandlers();

    showScreen('main-menu');
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

    // Tabbing away mid-fight shouldn't leave the player getting hit with no input.
    window.addEventListener('blur', () => {
        if (currentState === GameState.PLAYING) pauseGame();
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
    const fsModal = document.getElementById('fullscreen-modal');
    document.getElementById('btn-start').addEventListener('click', () => {
        audioManager.playSound('ui_click');
        player.setCharacter(selectedChampion);
        if (!document.fullscreenElement) {
            fsModal?.classList.remove('hidden');
        } else {
            startGame();
        }
    });

    document.getElementById('btn-fs-yes')?.addEventListener('click', async () => {
        fsModal?.classList.add('hidden');
        try {
            await document.documentElement.requestFullscreen?.();
        } catch (_) {}
        player.setCharacter(selectedChampion);
        startGame();
    });

    document.getElementById('btn-fs-no')?.addEventListener('click', () => {
        fsModal?.classList.add('hidden');
        player.setCharacter(selectedChampion);
        startGame();
    });

    // Circular Hero Select Button
    document.getElementById('btn-menu-heroes')?.addEventListener('click', () => {
        audioManager.playSound('ui_click');
        showScreen('char-select-screen');
    });

    document.getElementById('btn-char-select-back').addEventListener('click', () => {
        audioManager.playSound('ui_click');
        showScreen('main-menu');
        cemeteryMenuRenderer.setSelectedHero(selectedChampion);
    });

    // Direct Play buttons on each character card: One-click immediately starts game!
    document.querySelectorAll('.btn-direct-play').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const charId = e.currentTarget.dataset.char;
            selectedChampion = charId;
            cemeteryMenuRenderer.setSelectedHero(charId);
            player.setCharacter(charId);
            startGame();
        });
    });

    // Interactive Hero selection on CemeteryHills main menu
    const mainMenuEl = document.getElementById('main-menu');
    if (mainMenuEl) {
        mainMenuEl.addEventListener('mousemove', (e) => {
            if (currentState !== GameState.MENU) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            const { cursor } = cemeteryMenuRenderer.handleMouseMove(mouseX, mouseY);
            mainMenuEl.style.cursor = cursor;
        });

        mainMenuEl.addEventListener('click', (e) => {
            if (currentState !== GameState.MENU) return;
            if (e.target.closest('button')) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            const clickedHero = cemeteryMenuRenderer.handleClick(mouseX, mouseY);
            if (clickedHero) {
                selectedChampion = clickedHero;
                player.setCharacter(clickedHero);
                audioManager.playSound('ui_select');
            }
        });
    }

    document.getElementById('btn-settings').addEventListener('click', () => openSettings('main-menu'));
    document.getElementById('btn-settings-back').addEventListener('click', () => showScreen(settingsReturnScreen));

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
    document.addEventListener('fullscreenchange', syncFullscreenLabel);

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
    if (inGameplay && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

function syncFullscreenLabel() {
    document.getElementById('btn-fullscreen').textContent = document.fullscreenElement ? 'ON' : 'OFF';
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
    audioManager.playMusic('combat');

    gameTime = 0;
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
    // Knight Preview
    const cK = document.getElementById('hero-preview-knight');
    if (cK && previewImages.knight.complete && previewImages.knight.naturalWidth > 0) {
        const ctxK = cK.getContext('2d');
        ctxK.imageSmoothingEnabled = false;
        ctxK.clearRect(0, 0, cK.width, cK.height);
        const frame = Math.floor(time * 10) % 10;
        const scale = 1.8;
        const dx = 55 - 55 * scale;
        const dy = 88 - 80 * scale;
        ctxK.drawImage(previewImages.knight, frame * 120, 0, 120, 80, dx, dy, 120 * scale, 80 * scale);
    }

    // Blonde Valkyrie Preview
    const cB = document.getElementById('hero-preview-blonde');
    if (cB && previewImages.blonde.complete && previewImages.blonde.naturalWidth > 0) {
        const ctxB = cB.getContext('2d');
        ctxB.imageSmoothingEnabled = false;
        ctxB.clearRect(0, 0, cB.width, cB.height);
        const frame = Math.floor(time * 8) % 6;
        const scale = 2.0;
        const dx = 55 - 27 * scale;
        const dy = 88 - 43 * scale;
        ctxB.drawImage(previewImages.blonde, frame * 69, 0, 69, 44, dx, dy, 69 * scale, 44 * scale);
    }

    // Brown Assassin Preview
    const cBr = document.getElementById('hero-preview-brown');
    if (cBr && previewImages.brown.complete && previewImages.brown.naturalWidth > 0) {
        const ctxBr = cBr.getContext('2d');
        ctxBr.imageSmoothingEnabled = false;
        ctxBr.clearRect(0, 0, cBr.width, cBr.height);
        const frame = Math.floor(time * 8) % 6;
        const scale = 2.0;
        const dx = 55 - 27 * scale;
        const dy = 88 - 43 * scale;
        ctxBr.drawImage(previewImages.brown, frame * 69, 0, 69, 44, dx, dy, 69 * scale, 44 * scale);
    }
}

function renderWaveBanner() {
    if (currentState !== GameState.PLAYING || enemyManager.bannerTimer <= 0) return;

    const fade = Math.min(1, enemyManager.bannerTimer / 0.5);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center';
    ctx.font = '600 44px Cinzel, serif';
    ctx.fillStyle = '#c9a227';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(enemyManager.bannerText, canvas.width / 2, 150);
    ctx.restore();
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
