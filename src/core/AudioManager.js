/**
 * VALORIA - Audio Manager
 * Handles all audio playback with synthesized sounds
 */

export class AudioManager {
    constructor() {
        // Audio context
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        // Volume levels
        this.masterVolume = 0.8;
        this.musicVolume = 0.6;
        this.sfxVolume = 0.8;

        // Sound buffers cache
        this.sounds = {};

        // Currently playing
        this.currentMusic = null;
        this.musicNodes = [];
        this.musicTrackGain = null;
        this.musicScheduler = null;

        // Initialize audio context on first user interaction
        this.initialized = false;
        this.setupAudioContext();
    }

    setupAudioContext() {
        // Wait for user interaction to create audio context
        const initAudio = () => {
            if (this.initialized) return;

            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();

                // Create gain nodes
                this.masterGain = this.ctx.createGain();
                this.musicGain = this.ctx.createGain();
                this.sfxGain = this.ctx.createGain();

                this.masterGain.connect(this.ctx.destination);
                this.musicGain.connect(this.masterGain);
                this.sfxGain.connect(this.masterGain);

                // Set initial volumes
                this.masterGain.gain.value = this.masterVolume;
                this.musicGain.gain.value = this.musicVolume;
                this.sfxGain.gain.value = this.sfxVolume;

                this.initialized = true;
                this.generateAllSounds();

                window.removeEventListener('pointerdown', initAudio, true);
                window.removeEventListener('keydown', initAudio, true);
            } catch (e) {
                console.warn('Audio context creation failed:', e);
            }
        };

        // Capture phase: runs before any button handler that wants to play sound on the same click.
        window.addEventListener('pointerdown', initAudio, true);
        window.addEventListener('keydown', initAudio, true);
    }

    /**
     * Generate all sound effects using Web Audio API
     */
    generateAllSounds() {
        // Player sounds
        this.sounds.sword_swing_light = this.createSwordSwingSound(0.15, 400, 600);
        this.sounds.sword_swing_heavy = this.createSwordSwingSound(0.25, 200, 400);
        this.sounds.sword_impact_light = this.createImpactSound(0.2, 300, 800);
        this.sounds.sword_impact_heavy = this.createImpactSound(0.35, 150, 400);
        this.sounds.sword_impact_metal = this.createMetalImpactSound(0.25);
        this.sounds.player_hurt = this.createHurtSound(0.3);
        this.sounds.player_death = this.createDeathSound(0.5);
        this.sounds.player_dodge = this.createDodgeSound(0.15);
        this.sounds.player_jump = this.createJumpSound(0.1);
        this.sounds.player_land = this.createLandSound(0.15);
        this.sounds.player_block = this.createBlockSound(0.2);

        // Skill sounds
        this.sounds.valor_strike = this.createValorStrikeSound(0.3);
        this.sounds.iron_breaker = this.createIronBreakerSound(0.4);
        this.sounds.valoria_rage_start = this.createRageStartSound(0.4);
        this.sounds.valoria_rage_end = this.createRageEndSound(0.3);

        // Enemy sounds
        this.sounds.enemy_hurt = this.createEnemyHurtSound(0.25);
        this.sounds.enemy_death = this.createEnemyDeathSound(0.4);
        this.sounds.enemy_attack = this.createEnemyAttackSound(0.2);

        // UI sounds
        this.sounds.ui_click = this.createUIClickSound(0.1);
        this.sounds.ui_select = this.createUISelectSound(0.15);
        this.sounds.skill_ready = this.createSkillReadySound(0.2);
        this.sounds.victory = this.createVictorySound(0.5);

        // Ambient sounds
        this.sounds.ambient_wind = this.createAmbientWindSound();
        this.sounds.combat_drums = this.createCombatDrumsSound();
    }

    // ============================================================================
    // SOUND GENERATORS
    // ============================================================================

    createSwordSwingSound(duration, freqStart, freqEnd) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);

            filter.type = 'lowpass';
            filter.frequency.value = 2000;

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createImpactSound(duration, freqStart, freqEnd) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const noise = this.createNoiseNode(duration);
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration * 0.5);

            filter.type = 'lowpass';
            filter.frequency.value = 1500;

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(filter);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
            noise.start();
            noise.stop(this.ctx.currentTime + duration);
        };
    }

    createMetalImpactSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(1200, this.ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + duration);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(2400, this.ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.sfxGain);

            osc1.start();
            osc1.stop(this.ctx.currentTime + duration);
            osc2.start();
            osc2.stop(this.ctx.currentTime + duration);
        };
    }

    createHurtSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createDeathSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createDodgeSound(duration) {
        return () => {
            if (!this.initialized) return;

            const noise = this.createNoiseNode(duration);
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            filter.type = 'bandpass';
            filter.frequency.value = 1000;
            filter.Q.value = 2;

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            noise.start();
            noise.stop(this.ctx.currentTime + duration);
        };
    }

    createJumpSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createLandSound(duration) {
        return () => {
            if (!this.initialized) return;

            const noise = this.createNoiseNode(duration * 0.5);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

            filter.type = 'lowpass';
            filter.frequency.value = 200;

            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            noise.connect(filter);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            noise.start();
            noise.stop(this.ctx.currentTime + duration);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createBlockSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createValorStrikeSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + duration * 0.3);

            osc2.type = 'square';
            osc2.frequency.setValueAtTime(100, this.ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.sfxGain);

            osc1.start();
            osc1.stop(this.ctx.currentTime + duration);
            osc2.start();
            osc2.stop(this.ctx.currentTime + duration);
        };
    }

    createIronBreakerSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const noise = this.createNoiseNode(duration);
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(filter);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
            noise.start();
            noise.stop(this.ctx.currentTime + duration);
        };
    }

    createRageStartSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(50, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createRageEndSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createEnemyHurtSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(250, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createEnemyDeathSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const noise = this.createNoiseNode(duration);
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + duration);

            filter.type = 'lowpass';
            filter.frequency.value = 400;

            gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

            osc.connect(filter);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
            noise.start();
            noise.stop(this.ctx.currentTime + duration);
        };
    }

    createEnemyAttackSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createUIClickSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createUISelectSound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + duration);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createSkillReadySound(duration) {
        return () => {
            if (!this.initialized) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, this.ctx.currentTime);
            osc.frequency.setValueAtTime(600, this.ctx.currentTime + duration * 0.3);
            osc.frequency.setValueAtTime(800, this.ctx.currentTime + duration * 0.6);

            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        };
    }

    createVictorySound(duration) {
        return () => {
            if (!this.initialized) return;

            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;

                const startTime = this.ctx.currentTime + i * 0.15;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, startTime + duration);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(startTime);
                osc.stop(startTime + duration);
            });
        };
    }

    createNoiseNode(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        return noise;
    }

    createAmbientWindSound() {
        return (output) => {
            if (!this.initialized) return null;

            // Simple wind ambience
            const bufferSize = this.ctx.sampleRate * 10;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 200;

            const gain = this.ctx.createGain();
            gain.gain.value = 0.1;

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(output);

            noise.start();
            return { stop: () => noise.stop() };
        };
    }

    // Schedules one bar at a time slightly ahead of the audio clock instead of
    // queueing minutes of drums up front, so stopping is instant and nothing stacks on restart.
    createCombatDrumsSound() {
        return (output) => {
            if (!this.initialized) return null;

            const bpm = 80;
            const beatDuration = 60 / bpm;
            const barDuration = beatDuration * 4;
            const scheduleAhead = 1.0;

            const playDrum = (time, type) => {
                if (type === 'snare') {
                    const noise = this.createNoiseNode(0.1);
                    const noiseGain = this.ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.2, time);
                    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
                    noise.connect(noiseGain);
                    noiseGain.connect(output);
                    noise.start(time);
                    noise.stop(time + 0.1);
                    return;
                }

                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.frequency.setValueAtTime(150, time);
                osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
                gain.gain.setValueAtTime(0.4, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                osc.connect(gain);
                gain.connect(output);
                osc.start(time);
                osc.stop(time + 0.2);
            };

            let nextBarTime = this.ctx.currentTime + 0.05;
            const scheduleBars = () => {
                while (nextBarTime < this.ctx.currentTime + scheduleAhead) {
                    playDrum(nextBarTime, 'kick');
                    playDrum(nextBarTime + beatDuration, 'snare');
                    playDrum(nextBarTime + beatDuration * 2, 'kick');
                    playDrum(nextBarTime + beatDuration * 3, 'snare');
                    nextBarTime += barDuration;
                }
            };

            scheduleBars();
            const timerId = setInterval(scheduleBars, 250);
            return { stop: () => clearInterval(timerId) };
        };
    }

    // ============================================================================
    // PLAYBACK METHODS
    // ============================================================================

    playSFX(soundName) {
        if (!this.initialized) return;

        const sound = this.sounds[soundName];
        if (sound && typeof sound === 'function') {
            sound();
        }
    }

    playMusic(musicType) {
        if (!this.initialized) return;

        this.stopMusic();
        this.resumeMusic();

        // Each track gets its own gain node so stopMusic() can cut it instantly,
        // including notes that were already scheduled.
        this.musicTrackGain = this.ctx.createGain();
        this.musicTrackGain.connect(this.musicGain);

        const track = musicType === 'menu'
            ? this.sounds.ambient_wind(this.musicTrackGain)
            : musicType === 'combat'
                ? this.sounds.combat_drums(this.musicTrackGain)
                : null;

        this.currentMusic = musicType;
        if (track) this.musicNodes.push(track);
    }

    stopMusic() {
        this.musicNodes.forEach(node => {
            try {
                node.stop();
            } catch (e) {
                // Node may already be stopped
            }
        });
        this.musicNodes = [];
        this.currentMusic = null;

        if (this.musicTrackGain) {
            this.musicTrackGain.disconnect();
            this.musicTrackGain = null;
        }
    }

    pauseMusic() {
        if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend();
        }
    }

    resumeMusic() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }
}
