/**
 * VALORIA - Character Data & Archetypes
 * Defines the 3 playable heroes with distinct traits, stats, and skills.
 */

export const CHARACTERS = {
    knight: {
        id: 'knight',
        name: 'Sir Roland',
        title: 'The Iron Bulwark',
        role: 'Heavy Tank / Melee Titan',
        difficulty: 'EASY',
        color: '#e67e22',
        themeColor: '#ff6600',
        spriteType: 'freeknight',
        stats: {
            hp: 150,
            damageMultiplier: 1.3,
            speed: 275,
            defense: 'S'
        },
        trait: 'Heavy Armor: +50% Max HP & heavy poise. Cannot climb ladders.',
        canClimb: false,
        width: 44,
        height: 76,
        scale: 2.0,
        anchorX: 55,
        anchorY: 80,
        skills: {
            skill1: {
                id: 'valorStrike',
                name: 'Valor Strike',
                key: 'Q',
                cooldown: 4.0,
                icon: 'icon-valor-strike',
                desc: 'Blazing forward ground rupture that shreds enemy armor.'
            },
            skill2: {
                id: 'ironBreaker',
                name: 'Iron Breaker',
                key: 'E',
                cooldown: 7.0,
                icon: 'icon-iron-breaker',
                desc: 'Crushing seismic hammer slam, fracturing the earth and stunning foes.'
            },
            skill3: {
                id: 'valoriaRage',
                name: 'Valoria Rage',
                key: 'R',
                cooldown: 15.0,
                icon: 'icon-valoria-rage',
                desc: 'ULTIMATE: Slam earth in a massive Hellfire Eruption (160 AoE dmg) and unleash 8s Berserk Mode (+80% dmg & flame waves).'
            }
        }
    },
    blonde: {
        id: 'blonde',
        name: 'Lady Sylvia',
        title: 'The Radiant Blade',
        role: 'Holy Magic & Swift Duelist',
        difficulty: 'MEDIUM',
        color: '#ffd700',
        themeColor: '#ffe066',
        spriteType: 'sheet_blonde',
        spriteFile: 'girl warior.png',
        stats: {
            hp: 100,
            damageMultiplier: 1.15,
            speed: 320,
            defense: 'B+'
        },
        trait: 'Sacred Agility: High speed. Can climb ladders! Hits restore HP on strike.',
        canClimb: true,
        width: 38,
        height: 72,
        scale: 2.4,
        anchorX: 34,
        anchorY: 43,
        skills: {
            skill1: {
                id: 'solarPiercer',
                name: 'Solar Piercer',
                key: 'Q',
                cooldown: 3.5,
                icon: 'icon-solar-piercer',
                desc: 'Holy dash thrust releasing a blinding beam of sacred sunlight.'
            },
            skill2: {
                id: 'radiantTempest',
                name: 'Radiant Tempest',
                key: 'E',
                cooldown: 6.0,
                icon: 'icon-radiant-tempest',
                desc: 'Whirling vortex of golden holy energy blades slicing all nearby foes.'
            },
            skill3: {
                id: 'dawnOfJudgment',
                name: 'Dawn of Judgment',
                key: 'R',
                cooldown: 14.0,
                icon: 'icon-dawn-judgment',
                desc: 'ULTIMATE: Ascends and commands celestial spears of holy light to bombard the arena!'
            }
        }
    },
    brown: {
        id: 'brown',
        name: 'Kaelen',
        title: 'The Shadow Blade',
        role: 'Phantom Assassin & Wind Magic',
        difficulty: 'HARD',
        color: '#9b59b6',
        themeColor: '#c084fc',
        spriteType: 'sheet_brown',
        spriteFile: 'Girl Warior brown hair/Warrior/SpriteSheet/Warrior_Sheet-Effect.png',
        stats: {
            hp: 85,
            damageMultiplier: 1.25,
            speed: 345,
            defense: 'B'
        },
        trait: 'Phantom Walker: Double jump! Can climb ladders! Dodging leaves a shadow clone.',
        canClimb: true,
        width: 38,
        height: 72,
        scale: 2.4,
        anchorX: 34,
        anchorY: 43,
        skills: {
            skill1: {
                id: 'phantomBlink',
                name: 'Phantom Blink',
                key: 'Q',
                cooldown: 3.0,
                icon: 'icon-phantom-blink',
                desc: 'Instantly teleports through enemies in dark smoke, executing a critical backstab.'
            },
            skill2: {
                id: 'cycloneBlade',
                name: 'Cyclone Blade',
                key: 'E',
                cooldown: 5.5,
                icon: 'icon-cyclone-blade',
                desc: 'Leaping aerial tornado launching razor-sharp wind blades forward.'
            },
            skill3: {
                id: 'eclipseExecution',
                name: 'Eclipse Execution',
                key: 'R',
                cooldown: 14.0,
                icon: 'icon-eclipse-execution',
                desc: 'ULTIMATE: Dark eclipse slows time as 4 shadow clones shred targets with cross slashes!'
            }
        }
    }
};
