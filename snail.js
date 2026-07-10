// Snail Helper Class

export class Snail {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 1.0;
        this.vx = 0;
        this.radius = 12;
        this.isFacingRight = true;
        this.wiggle = 0;
        this.wiggleSpeed = 0.08;
    }

    update(coins, canvasWidth, canvasHeight, onCollectCoin) {
        this.wiggle += this.wiggleSpeed;

        // Ground constraint
        this.y = canvasHeight - 20;

        let targetCoin = null;
        let closestDist = Infinity;

        // Find closest coin resting on the bottom
        for (const coin of coins) {
            if (coin.isCollected) continue;
            // Only care about X-distance because snail is bound to bottom
            const dist = Math.abs(coin.x - this.x);
            // Snail only collects if the coin is reasonably low (near the bottom)
            if (coin.y >= canvasHeight - 35 && dist < closestDist) {
                closestDist = dist;
                targetCoin = coin;
            }
        }

        if (targetCoin) {
            const dx = targetCoin.x - this.x;
            if (Math.abs(dx) > 5) {
                this.vx = Math.sign(dx) * this.speed;
                this.x += this.vx;
                this.isFacingRight = this.vx > 0;
            } else {
                // Collect coin!
                onCollectCoin(targetCoin);
                this.vx = 0;
            }
        } else {
            // Idle wander on the bottom
            if (Math.random() < 0.02) {
                this.vx = (Math.random() > 0.5 ? 1 : -1) * this.speed * 0.5;
            }
            this.x += this.vx;
            
            // Boundary constraints
            if (this.x < 20) {
                this.x = 20;
                this.vx = this.speed * 0.5;
            } else if (this.x > canvasWidth - 20) {
                this.x = canvasWidth - 20;
                this.vx = -this.speed * 0.5;
            }

            if (Math.abs(this.vx) > 0.05) {
                this.isFacingRight = this.vx > 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (!this.isFacingRight) {
            ctx.scale(-1, 1);
        }

        // Draw Shell
        ctx.beginPath();
        ctx.arc(-2, -6, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#d27d2d'; // Golden brown shell
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#d27d2d';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Shell spiral line
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2, -6, 5, 0, Math.PI, false);
        ctx.stroke();

        // Draw Snail Body (Procedural crawl wiggle)
        const stretch = Math.sin(this.wiggle) * 1.5;
        ctx.fillStyle = '#ffeaa7'; // Light cream body
        ctx.beginPath();
        ctx.ellipse(3, -2, 10 + stretch, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Snail Head / Eyestalks
        ctx.beginPath();
        ctx.ellipse(9 + stretch, -5, 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye stems
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8 + stretch, -6);
        ctx.lineTo(9 + stretch, -11);
        ctx.moveTo(10 + stretch, -6);
        ctx.lineTo(11 + stretch, -11);
        ctx.stroke();

        // Tiny eye dots
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(9 + stretch, -11, 0.8, 0, Math.PI * 2);
        ctx.arc(11 + stretch, -11, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
