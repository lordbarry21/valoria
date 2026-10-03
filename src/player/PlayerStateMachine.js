/**
 * VALORIA - Player State Machine
 * Explicit state transitions plus startup/active/recovery attack timing.
 */

const TRANSITIONS = {
    Idle: ['Walk', 'Run', 'Jump', 'Fall', 'Attack', 'HeavyAttack', 'SkillCast', 'Dodge', 'Hurt', 'Death', 'Climb'],
    Walk: ['Idle', 'Run', 'Jump', 'Fall', 'Attack', 'HeavyAttack', 'SkillCast', 'Dodge', 'Hurt', 'Death', 'Climb'],
    Run: ['Idle', 'Walk', 'Jump', 'Fall', 'Attack', 'HeavyAttack', 'SkillCast', 'Dodge', 'Hurt', 'Death', 'Climb'],
    Jump: ['Fall', 'Land', 'Attack', 'SkillCast', 'Dodge', 'Hurt', 'Death', 'Climb'],
    Fall: ['Land', 'Attack', 'SkillCast', 'Dodge', 'Hurt', 'Death', 'Climb'],
    Land: ['Idle', 'Walk', 'Run', 'Jump', 'Attack', 'HeavyAttack', 'SkillCast', 'Dodge', 'Hurt', 'Death', 'Climb'],
    Attack: ['Idle', 'Walk', 'Run', 'Jump', 'Fall', 'SkillCast', 'Dodge', 'Hurt', 'Death'],
    HeavyAttack: ['Idle', 'Walk', 'Attack', 'Hurt', 'Death'],
    SkillCast: ['Idle', 'Walk', 'Run', 'Fall', 'Dodge', 'Hurt', 'Death'],
    Dodge: ['Idle', 'Walk', 'Run', 'Jump', 'Fall', 'Hurt', 'Death'],
    Hurt: ['Idle', 'Walk', 'Run', 'Fall', 'Death'],
    Climb: ['Idle', 'Walk', 'Run', 'Jump', 'Fall', 'Hurt', 'Death'],
    Death: [],
};

const LAND_DURATION = 0.1;

export class PlayerStateMachine {
    constructor(player) {
        this.player = player;
        this.reset();
    }

    reset() {
        this.currentState = 'Idle';
        this.previousState = 'Idle';
        this.stateTime = 0;
        this.clearAttackTiming();
    }

    clearAttackTiming() {
        this.attackPhase = 'none';
        this.attackProgress = 0;
        this.attackStartDuration = 0;
        this.attackActiveDuration = 0;
        this.attackRecoveryDuration = 0;
    }

    setState(newState) {
        if (this.currentState === newState) return false;
        if (!this.canTransition(newState)) return false;

        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTime = 0;
        this.clearAttackTiming();
        return true;
    }

    canTransition(newState) {
        return TRANSITIONS[this.currentState]?.includes(newState) ?? false;
    }

    // Input is blocked until the swing reaches recovery, which is where
    // combos, dodge-cancels and skill-cancels are allowed.
    isLocked() {
        return this.attackPhase === 'startup' || this.attackPhase === 'active';
    }

    setAttackTiming(startup, active, recovery) {
        this.attackStartDuration = startup;
        this.attackActiveDuration = active;
        this.attackRecoveryDuration = recovery;
        this.attackPhase = 'startup';
        this.attackProgress = 0;
    }

    update(dt) {
        this.stateTime += dt;
        this.updateAttackTiming(dt);
        this.updateStateBehavior();
    }

    updateAttackTiming(dt) {
        if (this.attackPhase === 'none') return;

        this.attackProgress += dt;
        const activeEnd = this.attackStartDuration + this.attackActiveDuration;
        const total = activeEnd + this.attackRecoveryDuration;

        if (this.attackProgress < this.attackStartDuration) {
            this.attackPhase = 'startup';
        } else if (this.attackProgress < activeEnd) {
            this.attackPhase = 'active';
        } else if (this.attackProgress < total) {
            this.attackPhase = 'recovery';
        } else {
            this.player.currentAttack = null;
            this.settle();
        }
    }

    settle() {
        if (this.player.grounded) this.setState('Idle');
        else this.setState('Fall');
        this.clearAttackTiming();
    }

    updateStateBehavior() {
        const player = this.player;

        switch (this.currentState) {
            case 'Idle':
            case 'Walk':
            case 'Run':
                if (!player.grounded && player.vy > 0) this.setState('Fall');
                break;
            case 'Jump':
                if (player.grounded) this.land();
                else if (player.vy >= 0) this.setState('Fall');
                break;
            case 'Fall':
                if (player.grounded) this.land();
                break;
            case 'Land':
                if (this.stateTime >= LAND_DURATION) this.setState('Idle');
                break;
            case 'Dodge':
                if (this.stateTime >= player.dodgeDuration) {
                    player.onDodgeEnd();
                    this.settle();
                }
                break;
            case 'Hurt':
                if (this.stateTime >= player.hurtDuration) this.settle();
                break;
        }
    }

    land() {
        if (this.setState('Land')) this.player.onLanded();
    }
}
