// Main Game Loop, Input Handlers, UI controller and Engine - Iguana Theme

import { audio, stateManager, FOOD_COST } from './ui.js';
import { Iguana } from './iguana.js';
import { Food } from './food.js';
import { Coin } from './coin.js';
import { Tortoise } from './tortoise.js';

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Entity arrays
        this.iguanaList = [];
        this.foodList = [];
        this.coinList = [];
        this.tortoise = null;
        this.bubbles = []; // ambient air/spore bubbles
        this.particles = [];

        // Ambient rays angle
        this.rayAngle = 0;

        // Game loop states
        this.lastTime = 0;
        this.secondsTimer = 0;
        this.gameStarted = false;

        // Initialize canvas and core settings
        this.initCanvas();
        this.setupEventListeners();
        this.spawnInitialBubbles();

        // Handle the Name Input Prompt before game starts
        this.checkNameRequirement();
    }

    initCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);

        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
    }

    checkNameRequirement() {
        const state = stateManager.state;
        const nameModal = document.getElementById('name-modal');
        const overlay = document.getElementById('modal-overlay');
        const nameInput = document.getElementById('input-target-name');

        if (state.feedTargetName) {
            // Fill with previously used name
            nameInput.value = state.feedTargetName;
        }

        // Show the prompt, hide other modals inside overlay
        overlay.classList.remove('hidden');
        nameModal.classList.remove('hidden');
        document.getElementById('stats-modal').classList.add('hidden');
        document.getElementById('victory-modal').classList.add('hidden');
    }

    startGameLoop(targetName) {
        // Save target name to state
        stateManager.state.feedTargetName = targetName.trim() || 'Chicken';
        stateManager.save();

        // Hide prompt overlay
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('name-modal').classList.add('hidden');

        // Load entities
        this.loadGameEntities();

        // Start game loop if not already running
        if (!this.gameStarted) {
            this.gameStarted = true;
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    loadGameEntities() {
        const state = stateManager.state;

        // Spawn Iguanas
        const count = state.fishCount > 0 ? state.fishCount : 2;
        this.iguanaList = [];
        for (let i = 0; i < count; i++) {
            this.iguanaList.push(new Iguana(
                50 + Math.random() * (this.width - 100),
                100 + Math.random() * (this.height - 200)
            ));
        }

        if (state.fishCount === 0) {
            state.fishCount = 2;
            stateManager.save();
        }

        // Spawn Tortoise Helper
        if (state.hasSnail) {
            this.tortoise = new Tortoise(this.width / 2, this.height - 20);
        } else {
            this.tortoise = null;
        }

        this.updateHUD();
        this.updateShopButtons();
    }

    spawnInitialBubbles() {
        // Ambient green spore particles floating upwards
        for (let i = 0; i < 15; i++) {
            this.bubbles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: 1.5 + Math.random() * 4,
                speed: 0.3 + Math.random() * 0.8,
                sway: Math.random() * 100
            });
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.initCanvas());

        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this.gameStarted) return;
            this.handleTap(e);
        });

        // Start Game Button click
        document.getElementById('btn-start-game').addEventListener('click', () => {
            const nameInput = document.getElementById('input-target-name');
            if (nameInput.value.trim() === '') {
                alert('Please enter a name first!');
                return;
            }
            audio.playUpgrade();
            this.startGameLoop(nameInput.value);
        });

        // Shop Drawer Toggle
        const drawer = document.getElementById('shop-drawer');
        const handle = document.getElementById('drawer-handle');
        handle.addEventListener('click', () => {
            drawer.classList.toggle('closed');
            audio.playRustle();
        });

        // Shop Items Purchasing
        document.getElementById('shop-buy-fish').addEventListener('click', () => this.buyIguana());
        document.getElementById('shop-upgrade-food-qty').addEventListener('click', () => this.upgradeFoodQty());
        document.getElementById('shop-upgrade-food-qual').addEventListener('click', () => this.upgradeFoodQual());
        document.getElementById('shop-buy-snail').addEventListener('click', () => this.buyTortoise());
        document.getElementById('shop-buy-egg').addEventListener('click', () => this.buyEggPart());

        // Stats Modal Buttons
        document.getElementById('btn-stats').addEventListener('click', () => {
            this.openStatsModal();
            audio.playRustle();
        });
        document.getElementById('btn-close-stats').addEventListener('click', () => {
            this.closeModals();
            audio.playRustle();
        });
        document.getElementById('btn-reset-game').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all sanctuary progress?')) {
                stateManager.reset();
                this.closeModals();
                this.checkNameRequirement(); // Re-prompt name at reset
                this.showToast('Sanctuary reset successfully!');
            }
        });

        // Victory Modal Buttons
        document.getElementById('btn-victory-continue').addEventListener('click', () => {
            this.closeModals();
            audio.playRustle();
        });
        document.getElementById('btn-victory-reset').addEventListener('click', () => {
            stateManager.reset();
            this.closeModals();
            this.checkNameRequirement(); // Start new game with fresh name
            this.showToast('New sanctuary started!');
        });
    }

    handleTap(e) {
        const rect = this.canvas.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const tapY = e.clientY - rect.top;

        // Collect coins
        let coinCollected = false;
        for (const coin of this.coinList) {
            if (coin.isCollected) continue;
            const dist = Math.hypot(coin.x - tapX, coin.y - tapY);
            if (dist < 45) {
                this.collectCoinEntity(coin);
                coinCollected = true;
                break;
            }
        }

        if (coinCollected) return;

        // Drop food
        if (tapY > 80 && tapY < this.height - 60) {
            this.dropFood(tapX, tapY);
        }
    }

    dropFood(x, y) {
        const state = stateManager.state;
        const activeFoodCount = this.foodList.filter(f => !f.isEaten).length;
        if (activeFoodCount >= state.maxFood) {
            this.showToast('Max feeding limit reached! Upgrade capacity.');
            return;
        }

        if (state.coins < FOOD_COST) {
            this.showToast('Not enough coins to buy food! (Cost: 🪙5)');
            return;
        }

        state.coins -= FOOD_COST;
        state.stats.foodDropped++;
        stateManager.save();
        this.updateHUD();

        this.foodList.push(new Food(x, y, state.foodQuality));
        audio.playRustle();
        this.updateShopButtons();
        this.spawnRipple(x, y);
    }

    collectCoinEntity(coin) {
        audio.playCoin();
        coin.collect(45, 35);
    }

    spawnRipple(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 1.4,
                vy: Math.sin(angle) * 1.4,
                radius: 1.5 + Math.random() * 1.5,
                color: 'rgba(46, 204, 113, 0.5)',
                alpha: 1,
                life: 25
            });
        }
    }

    spawnEatParticles(x, y, color) {
        for (let i = 0; i < 7; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                radius: 1.5 + Math.random() * 2,
                color: color,
                alpha: 1,
                life: 20
            });
        }
    }

    buyIguana() {
        const cost = stateManager.getFishCost();
        if (stateManager.state.coins >= cost) {
            stateManager.state.coins -= cost;
            stateManager.state.fishCount++;
            stateManager.state.stats.fishPurchased++;
            stateManager.save();

            this.iguanaList.push(new Iguana(
                Math.random() * this.width,
                150 + Math.random() * (this.height - 300)
            ));

            audio.playUpgrade();
            this.showToast('New Iguana joined your sanctuary!');
            this.updateHUD();
            this.updateShopButtons();
        }
    }

    upgradeFoodQty() {
        const cost = stateManager.getFoodQtyCost();
        if (stateManager.state.coins >= cost) {
            stateManager.state.coins -= cost;
            stateManager.state.maxFood++;
            stateManager.save();

            audio.playUpgrade();
            this.showToast(`Max feeding capacity increased to ${stateManager.state.maxFood}!`);
            this.updateHUD();
            this.updateShopButtons();
        }
    }

    upgradeFoodQual() {
        const cost = stateManager.getFoodQualCost();
        if (stateManager.state.coins >= cost) {
            stateManager.state.coins -= cost;
            stateManager.state.foodQuality++;
            stateManager.save();

            audio.playUpgrade();
            const qualityName = stateManager.state.foodQuality === 2 ? 'Roasted Chicken' : 'Deluxe Glazed Chicken';
            this.showToast(`Feed upgraded to ${qualityName}!`);
            this.updateHUD();
            this.updateShopButtons();
        }
    }

    buyTortoise() {
        const cost = stateManager.getSnailCost();
        if (stateManager.state.coins >= cost && !stateManager.state.hasSnail) {
            stateManager.state.coins -= cost;
            stateManager.state.hasSnail = true;
            stateManager.save();

            this.tortoise = new Tortoise(this.width / 2, this.height - 20);

            audio.playUpgrade();
            this.showToast('Tortoise helper unlocked!');
            this.updateHUD();
            this.updateShopButtons();
        }
    }

    buyEggPart() {
        const cost = stateManager.getEggCost();
        if (stateManager.state.coins >= cost && stateManager.state.eggProgress < 3) {
            stateManager.state.coins -= cost;
            stateManager.state.eggProgress++;
            stateManager.save();

            audio.playUpgrade();
            this.showToast(`Hatched dragon egg part ${stateManager.state.eggProgress}/3!`);
            this.updateHUD();
            this.updateShopButtons();

            if (stateManager.state.eggProgress === 3) {
                this.triggerVictory();
            }
        }
    }

    triggerVictory() {
        audio.playVictory();
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById('victory-modal').classList.remove('hidden');
    }

    openStatsModal() {
        const stats = stateManager.state.stats;
        document.getElementById('stat-total-coins').textContent = stats.totalCoins;
        document.getElementById('stat-fish-purchased').textContent = stats.fishPurchased;
        document.getElementById('stat-food-dropped').textContent = stats.foodDropped;
        document.getElementById('stat-time-elapsed').textContent = `${Math.floor(stats.timeElapsed)}s`;

        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById('stats-modal').classList.remove('hidden');
    }

    closeModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('stats-modal').classList.add('hidden');
        document.getElementById('victory-modal').classList.add('hidden');
    }

    updateHUD() {
        document.getElementById('coin-count').textContent = stateManager.state.coins;
        const liveIguanas = this.iguanaList.filter(i => !i.isDead).length;
        document.getElementById('fish-count').textContent = liveIguanas;
        
        stateManager.state.fishCount = this.iguanaList.length;
        stateManager.save();
    }

    updateShopButtons() {
        const state = stateManager.state;

        // Buy Iguana Button
        const fishBtn = document.getElementById('shop-buy-fish');
        const fishCost = stateManager.getFishCost();
        document.getElementById('cost-buy-fish').textContent = `🪙 ${fishCost}`;
        this.toggleBtnState(fishBtn, state.coins >= fishCost);

        // Food Qty Button
        const qtyBtn = document.getElementById('shop-upgrade-food-qty');
        const qtyCost = stateManager.getFoodQtyCost();
        document.getElementById('cost-food-qty').textContent = `🪙 ${qtyCost}`;
        this.toggleBtnState(qtyBtn, state.coins >= qtyCost);

        // Food Qual Button
        const qualBtn = document.getElementById('shop-upgrade-food-qual');
        const qualCost = stateManager.getFoodQualCost();
        const costLabel = document.getElementById('cost-food-qual');
        if (state.foodQuality >= 3) {
            costLabel.textContent = 'MAX';
            qualBtn.classList.add('maxed');
            this.toggleBtnState(qualBtn, false);
        } else {
            costLabel.textContent = `🪙 ${qualCost}`;
            qualBtn.classList.remove('maxed');
            this.toggleBtnState(qualBtn, state.coins >= qualCost);
        }

        // Tortoise Helper Button
        const snailBtn = document.getElementById('shop-buy-snail');
        const snailCost = stateManager.getSnailCost();
        const snailLabel = document.getElementById('cost-buy-snail');
        if (state.hasSnail) {
            snailLabel.textContent = 'OWNED';
            snailBtn.classList.add('maxed');
            this.toggleBtnState(snailBtn, false);
        } else {
            snailLabel.textContent = `🪙 ${snailCost}`;
            snailBtn.classList.remove('maxed');
            this.toggleBtnState(snailBtn, state.coins >= snailCost);
        }

        // Egg Progress Button
        const eggBtn = document.getElementById('shop-buy-egg');
        const eggCost = stateManager.getEggCost();
        const eggLabel = document.getElementById('cost-buy-egg');
        document.getElementById('egg-progress').textContent = `${state.eggProgress}/3`;
        if (state.eggProgress >= 3) {
            eggLabel.textContent = 'COMPLETE';
            eggBtn.classList.add('maxed');
            this.toggleBtnState(eggBtn, false);
        } else {
            eggLabel.textContent = `🪙 ${eggCost}`;
            eggBtn.classList.remove('maxed');
            this.toggleBtnState(eggBtn, state.coins >= eggCost);
        }
    }

    toggleBtnState(btn, isEnabled) {
        if (isEnabled) {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = 'auto';
        } else {
            btn.classList.add('disabled');
            if (btn.classList.contains('maxed')) {
                btn.style.pointerEvents = 'none';
            }
        }
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2500);
    }

    // Game loop
    loop(timestamp) {
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.secondsTimer += delta;
        if (this.secondsTimer >= 1000) {
            stateManager.state.stats.timeElapsed += 1;
            this.secondsTimer -= 1000;
            stateManager.save();
        }

        this.update();
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        const state = stateManager.state;

        // 1. Update Iguanas List
        for (let i = this.iguanaList.length - 1; i >= 0; i--) {
            const iguana = this.iguanaList[i];
            
            iguana.hasEaten = false;
            iguana.update(this.foodList, this.width, this.height, (x, y, value) => {
                this.coinList.push(new Coin(x, y, value));
            });

            if (iguana.hasEaten) {
                audio.playEat();
                this.spawnEatParticles(iguana.x + (iguana.isFacingRight ? 18 : -18), iguana.y, '#e74c3c');
            }

            if (iguana.isDead && iguana.deathTimer > 300) {
                this.iguanaList.splice(i, 1);
                this.updateHUD();
            }
        }

        // 2. Update Food List
        for (let i = this.foodList.length - 1; i >= 0; i--) {
            const food = this.foodList[i];
            food.update(this.height);

            if (food.isEaten) {
                this.foodList.splice(i, 1);
            }
        }

        // 3. Update Tortoise Helper
        if (this.tortoise) {
            this.tortoise.update(this.coinList, this.width, this.height, (coin) => {
                this.collectCoinEntity(coin);
            });
        }

        // 4. Update Coin List
        for (let i = this.coinList.length - 1; i >= 0; i--) {
            const coin = this.coinList[i];
            const finishedCollecting = coin.update(this.height);

            if (finishedCollecting) {
                state.coins += coin.value;
                state.stats.totalCoins += coin.value;
                stateManager.save();
                this.updateHUD();
                this.updateShopButtons();

                this.spawnRipple(coin.x, coin.y);
                this.coinList.splice(i, 1);
            }
        }

        // 5. Update Ambient Spores (formerly bubbles)
        for (const bubble of this.bubbles) {
            bubble.y -= bubble.speed;
            bubble.sway += 0.015;
            bubble.x += Math.sin(bubble.sway) * 0.25;

            if (bubble.y < -10) {
                bubble.y = this.height + 10;
                bubble.x = Math.random() * this.width;
            }
        }

        // 6. Update Custom Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = p.life / 30;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Forest light rays filtering down
        this.rayAngle += 0.003;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(46, 204, 113, 0.04)';
        for (let i = 0; i < 4; i++) {
            const angleOffset = this.rayAngle + (i * Math.PI / 2);
            const w1 = Math.sin(angleOffset) * 45 + 55;
            const w2 = Math.cos(angleOffset) * 55 + 75;

            this.ctx.beginPath();
            this.ctx.moveTo(this.width / 2, 0);
            this.ctx.lineTo((this.width / 2) - w1, this.height);
            this.ctx.lineTo((this.width / 2) + w2, this.height);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.restore();

        // 2. Draw Spores
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(46, 204, 113, 0.15)';
        this.ctx.fillStyle = 'rgba(46, 204, 113, 0.05)';
        this.ctx.lineWidth = 1;
        for (const bubble of this.bubbles) {
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        this.ctx.restore();

        // 3. Draw Tortoise Helper
        if (this.tortoise) {
            this.tortoise.draw(this.ctx);
        }

        // 4. Draw Food Pellets (Chicken Drumsticks)
        for (const food of this.foodList) {
            food.draw(this.ctx);
        }

        // 5. Draw Coins
        for (const coin of this.coinList) {
            coin.draw(this.ctx);
        }

        // 6. Draw Iguanas
        for (const iguana of this.iguanaList) {
            iguana.draw(this.ctx);
        }

        // 7. Draw Particles
        this.ctx.save();
        for (const p of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fill();
        }
        this.ctx.restore();
    }
}

// Start Game on page load
window.addEventListener('DOMContentLoaded', () => {
    new GameEngine();
});
