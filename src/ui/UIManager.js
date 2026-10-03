/**
 * VALORIA - UI Manager
 * Handles HUD updates and UI state with the new design system
 */

import { player, enemyManager } from '../main.js';

export class UIManager {
    constructor() {
        // DOM elements
        this.healthFill = document.getElementById('health-fill');
        this.healthCurrent = document.getElementById('health-current');
        this.healthMax = document.getElementById('health-max');
        this.healthBar = document.querySelector('.health-bar');

        this.staminaFill = document.getElementById('stamina-fill');
        this.staminaCurrent = document.getElementById('stamina-current');

        this.rageFill = document.getElementById('rage-fill');
        this.rageCurrent = document.getElementById('rage-current');
        this.rageBar = document.getElementById('rage-bar-container');

        this.abilityQ = document.getElementById('ability-q');
        this.abilityE = document.getElementById('ability-e');
        this.abilityR = document.getElementById('ability-r');

        this.cooldownQ = document.getElementById('cooldown-q');
        this.cooldownE = document.getElementById('cooldown-e');
        this.cooldownR = document.getElementById('cooldown-r');

        this.cooldownTextQ = document.getElementById('cooldown-text-q');
        this.cooldownTextE = document.getElementById('cooldown-text-e');
        this.cooldownTextR = document.getElementById('cooldown-text-r');

        // Track previous states for animations
        this._prevHealth = 100;
        this._prevRage = 0;
        this._lowHealthTriggered = false;
    }

    init() {
        this.updateHealth();
        this.updateStamina();
        this.updateRage();
        this.updateAbilities();
        this._prevHealth = player?.health || 100;
        this._prevRage = player?.rage || 0;
    }

    update(dt) {
        if (!player) return;

        this.updateHealth();
        this.updateStamina();
        this.updateRage();
        this.updateAbilities();
    }

    updateHealth() {
        if (!player) return;

        const healthPercent = (player.health / player.maxHealth) * 100;
        const prevHealthPercent = (this._prevHealth / player.maxHealth) * 100;

        // Update fill width
        this.healthFill.style.width = `${healthPercent}%`;

        // Update text
        this.healthCurrent.textContent = Math.ceil(player.health);
        this.healthMax.textContent = player.maxHealth;

        // Low health warning state
        if (healthPercent < 25 && !this._lowHealthTriggered) {
            this._lowHealthTriggered = true;
            this.healthFill.classList.add('low');
            this.healthBar.classList.add('low');
        } else if (healthPercent >= 25 && this._lowHealthTriggered) {
            this._lowHealthTriggered = false;
            this.healthFill.classList.remove('low');
            this.healthBar.classList.remove('low');
        }

        // Damage flash effect
        if (this._prevHealth - player.health > 5) {
            this.healthBar.classList.add('damage-flash');
            setTimeout(() => {
                this.healthBar.classList.remove('damage-flash');
            }, 150);
        }

        this._prevHealth = player.health;
    }

    updateStamina() {
        if (!player) return;

        const percent = (player.stamina / player.maxStamina) * 100;
        this.staminaFill.style.width = `${percent}%`;
        this.staminaCurrent.textContent = Math.ceil(player.stamina);
    }

    updateRage() {
        if (!player) return;

        const percent = (player.rage / player.maxRage) * 100;
        this.rageFill.style.width = `${percent}%`;
        this.rageCurrent.textContent = Math.ceil(player.rage);

        // Rage ready state
        const isReady = player.rage >= 100;

        if (isReady && !this.rageBar.classList.contains('ready')) {
            this.rageBar.classList.add('ready');
            this.triggerRageReady();
        } else if (!isReady && this.rageBar.classList.contains('ready')) {
            this.rageBar.classList.remove('ready');
        }

        this._prevRage = player.rage;
    }

    updateAbilities() {
        if (!player) return;

        // Q - Valor Strike
        this.updateAbilitySlot(
            this.abilityQ,
            this.cooldownQ,
            this.cooldownTextQ,
            player.skills.valorStrike,
            true
        );

        // E - Iron Breaker
        this.updateAbilitySlot(
            this.abilityE,
            this.cooldownE,
            this.cooldownTextE,
            player.skills.ironBreaker,
            true
        );

        // R - Valeria Rage (requires rage >= 100)
        const rageReady = player.rage >= 100;
        this.updateAbilitySlot(
            this.abilityR,
            this.cooldownR,
            this.cooldownTextR,
            player.skills.valoriaRage,
            rageReady
        );
    }

    updateAbilitySlot(slot, overlay, textEl, skill, resourceReady) {
        const onCooldown = skill.cooldown > 0 || !resourceReady;

        if (onCooldown) {
            slot.classList.remove('ready');
            slot.classList.add('on-cooldown');

            if (skill.cooldown > 0) {
                const cooldownPercent = (skill.cooldown / skill.maxCooldown) * 100;
                overlay.style.height = `${cooldownPercent}%`;
                textEl.textContent = Math.ceil(skill.cooldown);
            } else {
                overlay.style.height = '100%';
                textEl.textContent = resourceReady ? 'RDY' : '';
            }
        } else {
            slot.classList.add('ready');
            slot.classList.remove('on-cooldown');
            overlay.style.height = '0%';
            textEl.textContent = '';

            // Ready animation (only trigger once per cooldown)
            if (slot.dataset.lastState === 'cooldown') {
                this.triggerSkillReady(slot);
            }
        }

        slot.dataset.lastState = onCooldown ? 'cooldown' : 'ready';
    }

    triggerRageReady() {
        // Add pulse animation
        const rageBar = this.rageBar;
        rageBar.style.animation = 'none';
        rageBar.offsetHeight; // Trigger reflow
        rageBar.style.animation = 'rageReady 1s ease-in-out infinite';

        // Play sound (handled by AudioManager via player state)
    }

    triggerSkillReady(slot) {
        // Brief glow animation
        slot.classList.add('just-ready');
        setTimeout(() => {
            slot.classList.remove('just-ready');
        }, 300);
    }

    // Screen transition helpers
    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        // Show target screen with animation
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.remove('hidden');
            screen.classList.add('screen-enter');

            // Remove animation class after it completes
            setTimeout(() => {
                screen.classList.remove('screen-enter');
            }, 500);
        }

        // Update HUD visibility
        const hud = document.getElementById('game-hud');
        const controls = document.getElementById('controls-help');

        if (screenId === 'main-menu' || screenId === 'settings-menu') {
            hud.classList.add('hidden');
            controls.classList.add('hidden');
        } else if (screenId === 'none') {
            hud.classList.remove('hidden');
            controls.classList.remove('hidden');
        }
    }

    // Screen shake for damage
    shakeLight() {
        const hud = document.getElementById('game-hud');
        hud.classList.add('shake-light');
        setTimeout(() => hud.classList.remove('shake-light'), 100);
    }

    shakeMedium() {
        const hud = document.getElementById('game-hud');
        hud.classList.add('shake-medium');
        setTimeout(() => hud.classList.remove('shake-medium'), 150);
    }
}
