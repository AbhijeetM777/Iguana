// Tortoise Helper Class (seabed helper re-themed for forest)

export class Tortoise {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 0.85; // slightly slower but steady tortoise
        this.vx = 0;
        this.radius = 14;
        this.isFacingRight = true;
        this.wiggle = 0;
        this.wiggleSpeed = 0.05;
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
            const dist = Math.abs(coin.x - this.x);
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
                onCollectCoin(targetCoin);
                this.vx = 0;
            }
        } else {
            // Idle wander
            if (Math.random() < 0.015) {
                this.vx = (Math.random() > 0.5 ? 1 : -1) * this.speed * 0.4;
            }
            this.x += this.vx;
            
            // Boundary constraints
            if (this.x < 20) {
                this.x = 20;
                this.vx = this.speed * 0.4;
            } else if (this.x > canvasWidth - 20) {
                this.x = canvasWidth - 20;
                this.vx = -this.speed * 0.4;
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

        // Draw Stubby legs wiggling
        ctx.fillStyle = '#26c6da'; // Turquoise-green body/legs
        const legOffset = Math.sin(this.wiggle) * 2;
        
        ctx.beginPath();
        // Back leg
        ctx.roundRect(-8, -4, 4, 6, 2);
        // Front leg
        ctx.roundRect(4, -4, 4, 6 + legOffset, 2);
        ctx.fill();

        // Draw Shell (Green tortoise dome)
        ctx.beginPath();
        ctx.arc(0, -6, 11, Math.PI, 0, false);
        ctx.fillStyle = '#1b5e20'; // Dark forest green shell
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#1b5e20';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Shell plates detail
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -6, 7, Math.PI, 0, false);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, -17);
        ctx.moveTo(-5, -6);
        ctx.lineTo(-7, -13);
        ctx.moveTo(5, -6);
        ctx.lineTo(7, -13);
        ctx.stroke();

        // Draw Head
        ctx.beginPath();
        ctx.ellipse(12, -7, 4.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#26c6da';
        ctx.fill();

        // Tiny eye dot
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(13.5, -8, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
