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
            Jump: ['Space'],
            Up: ['KeyW', 'ArrowUp'],
            Down: ['KeyS', 'ArrowDown'],
            Dodge: ['ShiftLeft', 'ShiftRight', 'ControlLeft'],
            Skill1: ['KeyQ'],
            Skill2: ['KeyE'],
            Skill3: ['KeyR'],
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

        // Releasing keys while the tab is unfocused never fires keyup.
        window.addEventListener('blur', () => this.reset());

        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseCanvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
            this.mouseCanvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.left = true;
                this.mouse.leftPressed = true;
            } else if (e.button === 2) {
                this.mouse.right = true;
                this.mouse.rightPressed = true;
            }
        });

        // Listen on window so releasing outside the canvas still registers.
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.left = false;
            else if (e.button === 2) this.mouse.right = false;
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
        return this.mouse.leftPressed;
    }

    isHeavyAttackPressed() {
        return this.mouse.rightPressed;
    }

    isHeavyAttackHeld() {
        return this.mouse.right;
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
