// Main Game Loop, Input Handlers, UI controller and Engine

import { audio, stateManager, FOOD_COST } from './ui.js';
import { Fish } from './fish.js';
import { Food } from './food.js';
import { Coin } from './coin.js';
import { Snail } from './snail.js';

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Entity arrays
        this.fishList = [];
        this.foodList = [];
        this.coinList = [];
        this.snail = null;
        this.bubbles = [];
        this.particles = [];

        // Ambient rays angle
        this.rayAngle = 0;

        // Game loop states
        this.lastTime = 0;
        this.secondsTimer = 0;

        // Initialize everything
        this.initCanvas();
        this.loadGameEntities();
        this.setupEventListeners();
        this.spawnInitialBubbles();

        // Start loop
        requestAnimationFrame((t) => this.loop(t));
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

    loadGameEntities() {
        const state = stateManager.state;

        // Spawning fish based on saved count or default to 2
        const count = state.fishCount > 0 ? state.fishCount : 2;
        this.fishList = [];
        for (let i = 0; i < count; i++) {
            this.fishList.push(new Fish(
                50 + Math.random() * (this.width - 100),
                100 + Math.random() * (this.height - 200)
            ));
        }
        // Save initial 2 fish count back if it was 0
        if (state.fishCount === 0) {
            state.fishCount = 2;
            stateManager.save();
        }

        // Spawn snail if unlocked
        if (state.hasSnail) {
            this.snail = new Snail(this.width / 2, this.height - 20);
        } else {
            this.snail = null;
        }

        this.updateHUD();
        this.updateShopButtons();
    }

    spawnInitialBubbles() {
        for (let i = 0; i < 15; i++) {
            this.bubbles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: 2 + Math.random() * 6,
                speed: 0.5 + Math.random() * 1.2,
                sway: Math.random() * 100
            });
        }
    }

    setupEventListeners() {
        // Window Resize
        window.addEventListener('resize', () => this.initCanvas());

        // Tap/Click interaction on Canvas
        this.canvas.addEventListener('pointerdown', (e) => this.handleTap(e));

        // Shop Toggle
        const drawer = document.getElementById('shop-drawer');
        const handle = document.getElementById('drawer-handle');
        handle.addEventListener('click', () => {
            drawer.classList.toggle('closed');
            audio.playBubble();
        });

        // Shop Items Purchasing
        document.getElementById('shop-buy-fish').addEventListener('click', () => this.buyFish());
        document.getElementById('shop-upgrade-food-qty').addEventListener('click', () => this.upgradeFoodQty());
        document.getElementById('shop-upgrade-food-qual').addEventListener('click', () => this.upgradeFoodQual());
        document.getElementById('shop-buy-snail').addEventListener('click', () => this.buySnail());
        document.getElementById('shop-buy-egg').addEventListener('click', () => this.buyEggPart());

        // Stats Modal Buttons
        document.getElementById('btn-stats').addEventListener('click', () => {
            this.openStatsModal();
            audio.playBubble();
        });
        document.getElementById('btn-close-stats').addEventListener('click', () => {
            this.closeModals();
            audio.playBubble();
        });
        document.getElementById('btn-reset-game').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all progress?')) {
                stateManager.reset();
                this.loadGameEntities();
                this.closeModals();
                this.showToast('Aquarium reset successfully!');
            }
        });

        // Victory Modal Buttons
        document.getElementById('btn-victory-continue').addEventListener('click', () => {
            this.closeModals();
            audio.playBubble();
        });
        document.getElementById('btn-victory-reset').addEventListener('click', () => {
            stateManager.reset();
            this.loadGameEntities();
            this.closeModals();
            this.showToast('New aquarium started!');
        });
    }

    handleTap(e) {
        // Get correct coordinates relative to the canvas bounding box
        const rect = this.canvas.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const tapY = e.clientY - rect.top;

        // 1. Try to collect close coins first
        let coinCollected = false;
        for (const coin of this.coinList) {
            if (coin.isCollected) continue;
            const dist = Math.hypot(coin.x - tapX, coin.y - tapY);
            // generous tap area on phones (40px radius)
            if (dist < 45) {
                this.collectCoinEntity(coin);
                coinCollected = true;
                break; // Collect one coin per tap
            }
        }

        if (coinCollected) return;

        // 2. Drop food if tap is inside the tank area (not overlapping HUD or Shop)
        if (tapY > 80 && tapY < this.height - 60) {
            this.dropFood(tapX, tapY);
        }
    }

    dropFood(x, y) {
        const state = stateManager.state;

        // Check food limits
        const activeFoodCount = this.foodList.filter(f => !f.isEaten).length;
        if (activeFoodCount >= state.maxFood) {
            this.showToast('Max food limit reached! Upgrade capacity.');
            return;
        }

        // Cost check
        if (state.coins < FOOD_COST) {
            this.showToast('Not enough coins to buy food! (Cost: 🪙5)');
            return;
        }

        // Deduct money & record stats
        state.coins -= FOOD_COST;
        state.stats.foodDropped++;
        stateManager.save();
        this.updateHUD();

        // Spawn food
        this.foodList.push(new Food(x, y, state.foodQuality));
        audio.playBubble();
        this.updateShopButtons();

        // Create ripple particles at tap location
        this.spawnRipple(x, y);
    }

    collectCoinEntity(coin) {
        // Play coin sound
        audio.playCoin();

        // Send coin flying towards the HUD coin tracker location
        // Top-left is roughly x: 45, y: 35
        coin.collect(45, 35);
    }

    spawnRipple(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 1.5,
                vy: Math.sin(angle) * 1.5,
                radius: 1.5 + Math.random() * 2,
                color: 'rgba(255, 255, 255, 0.6)',
                alpha: 1,
                life: 30
            });
        }
    }

    spawnEatParticles(x, y, color) {
        for (let i = 0; i < 6; i++) {
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

    // --- Shop Buy Methods ---
    buyFish() {
        const cost = stateManager.getFishCost();
        if (stateManager.state.coins >= cost) {
            stateManager.state.coins -= cost;
            stateManager.state.fishCount++;
            stateManager.state.stats.fishPurchased++;
            stateManager.save();

            // Spawn new fish
            this.fishList.push(new Fish(
                Math.random() * this.width,
                150 + Math.random() * (this.height - 300)
            ));

            audio.playUpgrade();
            this.showToast('New Guppy joined your tank!');
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
            this.showToast(`Max food increased to ${stateManager.state.maxFood}!`);
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
            const qualityName = stateManager.state.foodQuality === 2 ? 'Silver Pellet' : 'Gold Pellet';
            this.showToast(`Food upgraded to ${qualityName}!`);
            this.updateHUD();
            this.updateShopButtons();
        }
    }

    buySnail() {
        const cost = stateManager.getSnailCost();
        if (stateManager.state.coins >= cost && !stateManager.state.hasSnail) {
            stateManager.state.coins -= cost;
            stateManager.state.hasSnail = true;
            stateManager.save();

            this.snail = new Snail(this.width / 2, this.height - 20);

            audio.playUpgrade();
            this.showToast('Snail helper unlocked!');
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
            this.showToast(`Hatched egg part ${stateManager.state.eggProgress}/3!`);
            this.updateHUD();
            this.updateShopButtons();

            // Check Win Condition
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

    // --- UI Update Helpers ---
    updateHUD() {
        document.getElementById('coin-count').textContent = stateManager.state.coins;
        // Count only living fish
        const liveFish = this.fishList.filter(f => !f.isDead).length;
        document.getElementById('fish-count').textContent = liveFish;
        
        // Save current alive fish count
        stateManager.state.fishCount = this.fishList.length;
        stateManager.save();
    }

    updateShopButtons() {
        const state = stateManager.state;

        // 1. Buy Guppy Button
        const fishBtn = document.getElementById('shop-buy-fish');
        const fishCost = stateManager.getFishCost();
        document.getElementById('cost-buy-fish').textContent = `🪙 ${fishCost}`;
        this.toggleBtnState(fishBtn, state.coins >= fishCost);

        // 2. Food Qty Button
        const qtyBtn = document.getElementById('shop-upgrade-food-qty');
        const qtyCost = stateManager.getFoodQtyCost();
        document.getElementById('cost-food-qty').textContent = `🪙 ${qtyCost}`;
        this.toggleBtnState(qtyBtn, state.coins >= qtyCost);

        // 3. Food Qual Button
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

        // 4. Snail Helper Button
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

        // 5. Egg Progress Button
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
            // Allow pointerEvents only if it's maxed/owned so the hover state/text is viewable
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

        // Remove after animation completes (2.5s)
        setTimeout(() => {
            toast.remove();
        }, 2500);
    }

    // --- Main Game Loop ---
    loop(timestamp) {
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Update time tracking
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

        // 1. Update Fish List
        for (let i = this.fishList.length - 1; i >= 0; i--) {
            const fish = this.fishList[i];
            
            // Check if fish ate in its update cycle
            fish.hasEaten = false;
            fish.update(this.foodList, this.width, this.height, (x, y, value) => {
                // Spawning coin callback
                this.coinList.push(new Coin(x, y, value));
            });

            if (fish.hasEaten) {
                audio.playEat();
                this.spawnEatParticles(fish.x + (fish.isFacingRight ? 15 : -15), fish.y, '#55efc4');
            }

            // Remove fish if dead and floated to top long enough
            if (fish.isDead && fish.deathTimer > 300) {
                this.fishList.splice(i, 1);
                this.updateHUD();
            }
        }

        // 2. Update Food List
        for (let i = this.foodList.length - 1; i >= 0; i--) {
            const food = this.foodList[i];
            food.update(this.height);

            // Clean up eaten or dissolved food
            if (food.isEaten) {
                this.foodList.splice(i, 1);
            }
        }

        // 3. Update Snail Helper
        if (this.snail) {
            this.snail.update(this.coinList, this.width, this.height, (coin) => {
                this.collectCoinEntity(coin);
            });
        }

        // 4. Update Coin List
        for (let i = this.coinList.length - 1; i >= 0; i--) {
            const coin = this.coinList[i];
            const finishedCollecting = coin.update(this.height);

            if (finishedCollecting) {
                // Apply coin value to state
                state.coins += coin.value;
                state.stats.totalCoins += coin.value;
                stateManager.save();
                this.updateHUD();
                this.updateShopButtons();

                // Sparkle particles at HUD
                this.spawnRipple(coin.x, coin.y);

                this.coinList.splice(i, 1);
            }
        }

        // 5. Update Ambient Bubbles
        for (const bubble of this.bubbles) {
            bubble.y -= bubble.speed;
            bubble.sway += 0.02;
            bubble.x += Math.sin(bubble.sway) * 0.3;

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

        // 1. Draw Ambient Light Rays
        this.rayAngle += 0.005;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 210, 255, 0.03)';
        for (let i = 0; i < 4; i++) {
            const angleOffset = this.rayAngle + (i * Math.PI / 2);
            const w1 = Math.sin(angleOffset) * 40 + 60;
            const w2 = Math.cos(angleOffset) * 60 + 80;

            this.ctx.beginPath();
            this.ctx.moveTo(this.width / 2, 0);
            this.ctx.lineTo((this.width / 2) - w1, this.height);
            this.ctx.lineTo((this.width / 2) + w2, this.height);
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.restore();

        // 2. Draw Bubbles
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (const bubble of this.bubbles) {
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        this.ctx.restore();

        // 3. Draw Snail Helper
        if (this.snail) {
            this.snail.draw(this.ctx);
        }

        // 4. Draw Food Pellets
        for (const food of this.foodList) {
            food.draw(this.ctx);
        }

        // 5. Draw Coins
        for (const coin of this.coinList) {
            coin.draw(this.ctx);
        }

        // 6. Draw Fish
        for (const fish of this.fishList) {
            fish.draw(this.ctx);
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
