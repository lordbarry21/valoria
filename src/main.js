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

    setupInputHandlers();
    setupUIHandlers();

    showScreen('main-menu');
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth || window.innerWidth;
    const containerHeight = container.clientHeight || window.innerHeight;
    const gameRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT;
    const containerRatio = containerWidth / containerHeight;

    // Fit the canvas inside the container while keeping the game's aspect ratio
    let canvasWidth, canvasHeight;

    if (containerRatio > gameRatio) {
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight * gameRatio;
    } else {
        canvasWidth = containerWidth;
        canvasHeight = canvasWidth / gameRatio;
    }

    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.left = `${(containerWidth - canvasWidth) / 2}px`;
    canvas.style.top = `${(containerHeight - canvasHeight) / 2}px`;
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
    document.getElementById('btn-start').addEventListener('click', startGame);
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
    // Dark atmospheric background for menu
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, '#1a0a0a');
    gradient.addColorStop(1, '#050505');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some ambient particles
    ctx.fillStyle = 'rgba(139, 0, 0, 0.1)';
    const menuTime = lastTime / 1000;
    for (let i = 0; i < 50; i++) {
        const x = (Math.sin(menuTime * 0.5 + i * 0.5) + 1) * canvas.width / 2;
        const y = (i / 50) * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
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
