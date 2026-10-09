/**
 * VALORIA - Input Manager
 * Keyboard and mouse input with action mapping.
 *
 * "Just pressed" state is accumulated between frames and cleared by endFrame(),
 * which the game loop calls after every update so nothing is dropped or double-read.
 */

const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1', 'Tab']);

export class InputManager {
    constructor() {
        this.heldKeys = new Set();
        this.pressedKeys = new Set();
        this.mouse = {
            x: 0,
            y: 0,
            left: false,
            right: false,
            leftPressed: false,
            rightPressed: false
        };

        this.actions = {};

        this.bindings = {
            MoveLeft: ['KeyA', 'ArrowLeft'],
            MoveRight: ['KeyD', 'ArrowRight'],
            Jump: ['Space', 'KeyW', 'ArrowUp'],
            Up: ['KeyW', 'ArrowUp'],
            Down: ['KeyS', 'ArrowDown'],
            Dodge: ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'KeyL', 'KeyV'],
            Skill1: ['KeyQ', 'Digit1'],
            Skill2: ['KeyE', 'Digit2'],
            Skill3: ['KeyR', 'Digit3'],
            Attack: ['KeyJ', 'KeyC', 'KeyZ'],
            HeavyAttack: ['KeyK', 'KeyX'],
            Pause: ['Escape'],
        };

        this.mouseCanvasX = 0;
        this.mouseCanvasY = 0;

        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            if (GAME_KEYS.has(e.code)) e.preventDefault();
            if (e.repeat) return;

            this.heldKeys.add(e.code);
            this.pressedKeys.add(e.code);
            this.triggerActionCallback(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.heldKeys.delete(e.code);
        });

        // Clear held inputs when switching away from the tab
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.reset();
        });

        const canvas = document.getElementById('game-canvas');

        const updateMousePosition = (clientX, clientY) => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.mouseCanvasX = (clientX - rect.left) * (canvas.width / rect.width);
                this.mouseCanvasY = (clientY - rect.top) * (canvas.height / rect.height);
            }
            this.mouse.x = clientX;
            this.mouse.y = clientY;
        };

        window.addEventListener('mousemove', (e) => {
            updateMousePosition(e.clientX, e.clientY);
        });

        window.addEventListener('mousedown', (e) => {
            // Do not capture clicks on interactive menu buttons, sliders, or modals
            if (e.target && e.target.closest && e.target.closest('button, input, select, a, .menu-circle-btn, .modal-card, .hero-card')) {
                return;
            }
            updateMousePosition(e.clientX, e.clientY);
            if (e.button === 0) {
                this.mouse.left = true;
                this.mouse.leftPressed = true;
            } else if (e.button === 2) {
                this.mouse.right = true;
                this.mouse.rightPressed = true;
            }
        });

        // Listen on window so releasing outside canvas still registers
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.left = false;
            else if (e.button === 2) this.mouse.right = false;
        });

        window.addEventListener('contextmenu', (e) => {
            if (e.target && e.target.closest && e.target.closest('input, textarea')) return;
            e.preventDefault();
        });
    }

    triggerActionCallback(code) {
        for (const [action, keys] of Object.entries(this.bindings)) {
            if (keys.includes(code)) {
                this.actions[action]?.();
                return;
            }
        }
    }

    bindAction(action, key, callback) {
        this.actions[action] = callback;

        if (!key || key.startsWith('Mouse')) return;
        this.bindings[action] ??= [];
        if (!this.bindings[action].includes(key)) {
            this.bindings[action].push(key);
        }
    }

    isActionPressed(action) {
        return this.bindings[action]?.some(key => this.heldKeys.has(key)) ?? false;
    }

    isActionJustPressed(action) {
        return this.bindings[action]?.some(key => this.pressedKeys.has(key)) ?? false;
    }

    getHorizontalInput() {
        let dir = 0;
        if (this.isActionPressed('MoveLeft')) dir -= 1;
        if (this.isActionPressed('MoveRight')) dir += 1;
        return dir;
    }

    getVerticalInput() {
        let dir = 0;
        if (this.isActionPressed('Up')) dir -= 1;
        if (this.isActionPressed('Down')) dir += 1;
        return dir;
    }

    isUpPressed() {
        return this.isActionJustPressed('Up');
    }

    isDownPressed() {
        return this.isActionJustPressed('Down');
    }

    isJumpPressed() {
        return this.isActionPressed('Jump');
    }

    isJumpJustPressed() {
        return this.isActionJustPressed('Jump');
    }

    isAttackPressed() {
        return this.mouse.leftPressed || this.isActionJustPressed('Attack');
    }

    isHeavyAttackPressed() {
        return this.mouse.rightPressed || this.isActionJustPressed('HeavyAttack');
    }

    isHeavyAttackHeld() {
        return this.mouse.right || this.isActionPressed('HeavyAttack');
    }

    isDodgePressed() {
        return this.isActionJustPressed('Dodge');
    }

    isSkill1Pressed() {
        return this.isActionJustPressed('Skill1');
    }

    isSkill2Pressed() {
        return this.isActionJustPressed('Skill2');
    }

    isSkill3Pressed() {
        return this.isActionJustPressed('Skill3');
    }

    getMouseCanvasPosition() {
        return { x: this.mouseCanvasX, y: this.mouseCanvasY };
    }

    endFrame() {
        this.pressedKeys.clear();
        this.mouse.leftPressed = false;
        this.mouse.rightPressed = false;
    }

    reset() {
        this.heldKeys.clear();
        this.pressedKeys.clear();
        this.mouse.left = false;
        this.mouse.right = false;
        this.mouse.leftPressed = false;
        this.mouse.rightPressed = false;
    }
}
