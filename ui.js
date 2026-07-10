// UI, Audio Synthesizer, and State Manager - Iguana Theme

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

    playRustle() {
        this.init();
        if (!this.ctx) return;

        // White noise node for forest rustle sound
        const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
        noise.stop(this.ctx.currentTime + 0.1);
    }

    playEat() {
        this.init();
        if (!this.ctx) return;

        // Low crunch sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
        
        // Quick rustle overlap for bite crunch
        setTimeout(() => this.playRustle(), 30);
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

            gain.gain.setValueAtTime(0.12, now + delay);
            gain.gain.linearRampToValueAtTime(0.001, now + delay + duration);

            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };

        playTone(587.33, 0, 0.08); // D5
        playTone(739.99, 0.05, 0.08); // F#5
        playTone(880.00, 0.1, 0.15); // A5
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

            gain.gain.setValueAtTime(0.15, now + delay);
            gain.gain.linearRampToValueAtTime(0.001, now + delay + duration);

            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };

        playTone(523.25, 0, 0.1); // C5
        playTone(659.25, 0.08, 0.1); // E5
        playTone(783.99, 0.16, 0.1); // G5
        playTone(1046.50, 0.24, 0.25); // C6
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

            gain.gain.setValueAtTime(0.2, now + delay);
            gain.gain.linearRampToValueAtTime(0.001, now + delay + duration);

            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };

        const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
        notes.forEach((freq, idx) => {
            playTone(freq, idx * 0.12, 0.35);
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
            foodQuality: 1, // 1: Raw, 2: Roasted, 3: Golden Deluxe
            hasSnail: false,
            eggProgress: 0, // 0 to 3
            feedTargetName: '', // Question input
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
        const saved = localStorage.getItem('iguana_sanctuary_save');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
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
        localStorage.setItem('iguana_sanctuary_save', JSON.stringify(this.state));
    }

    reset() {
        this.state = JSON.parse(JSON.stringify(this.defaultState));
        this.save();
    }

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
