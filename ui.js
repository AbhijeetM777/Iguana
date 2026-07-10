// UI, Audio Synthesizer, and State Manager

class AudioManager {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playBubble() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playEat() {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playCoin() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const playTone = (freq, delay, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);

            gain.gain.setValueAtTime(0.15, now + delay);
            gain.gain.linearRampToValueAtTime(0.001, now + delay + duration);

            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };

        playTone(523.25, 0, 0.08); // C5
        playTone(659.25, 0.05, 0.08); // E5
        playTone(783.99, 0.1, 0.15); // G5
    }

    playUpgrade() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const playTone = (freq, delay, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + delay);

            gain.gain.setValueAtTime(0.2, now + delay);
            gain.gain.linearRampToValueAtTime(0.001, now + delay + duration);

            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };

        playTone(587.33, 0, 0.1); // D5
        playTone(698.46, 0.1, 0.1); // F5
        playTone(880.00, 0.2, 0.25); // A5
    }

    playVictory() {
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const playTone = (freq, delay, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);

            gain.gain.setValueAtTime(0.25, now + delay);
            gain.gain.linearRampToValueAtTime(0.001, now + delay + duration);

            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            playTone(freq, idx * 0.12, 0.3);
        });
    }
}

export const audio = new AudioManager();

export class GameState {
    constructor() {
        this.defaultState = {
            coins: 150,
            fishCount: 0,
            maxFood: 2,
            foodQuality: 1, // 1: Bronze, 2: Silver, 3: Gold
            hasSnail: false,
            eggProgress: 0, // 0 to 3
            stats: {
                totalCoins: 150,
                fishPurchased: 0,
                foodDropped: 0,
                timeElapsed: 0
            }
        };
        this.load();
    }

    load() {
        const saved = localStorage.getItem('aquafeed_save');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
                // Ensure stats exist
                if (!this.state.stats) {
                    this.state.stats = { ...this.defaultState.stats };
                }
            } catch (e) {
                this.state = { ...this.defaultState };
            }
        } else {
            this.state = { ...this.defaultState };
        }
    }

    save() {
        localStorage.setItem('aquafeed_save', JSON.stringify(this.state));
    }

    reset() {
        this.state = JSON.parse(JSON.stringify(this.defaultState));
        this.save();
    }

    // Costs getters
    getFishCost() {
        return 100 + (this.state.stats.fishPurchased * 25);
    }

    getFoodQtyCost() {
        return 200 + ((this.state.maxFood - 2) * 150);
    }

    getFoodQualCost() {
        if (this.state.foodQuality >= 3) return Infinity;
        return this.state.foodQuality === 1 ? 300 : 800;
    }

    getSnailCost() {
        return this.state.hasSnail ? Infinity : 500;
    }

    getEggCost() {
        if (this.state.eggProgress >= 3) return Infinity;
        return (this.state.eggProgress + 1) * 1000;
    }
}

export const stateManager = new GameState();
export const FOOD_COST = 5;
