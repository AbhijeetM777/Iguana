// Coin Representation

export class Coin {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value; // 15 (Bronze/Silver), 35 (Gold), etc.
        this.radius = 10;
        this.speed = 1.5;
        this.angle = 0;
        this.spinSpeed = 0.05 + Math.random() * 0.05;
        
        // Define colors based on coin value
        if (this.value <= 15) {
            this.color = '#e0a96d'; // Bronze coin
            this.shadowColor = '#d4af37';
        } else if (this.value <= 35) {
            this.color = '#dcdde1'; // Silver coin
            this.shadowColor = '#00d2ff';
        } else {
            this.color = '#f5cd79'; // Gold coin
            this.shadowColor = '#ffd700';
        }

        this.isCollected = false;
        this.targetX = null;
        this.targetY = null;
        this.collectSpeed = 15;
    }

    update(canvasHeight) {
        if (this.isCollected) {
            // Move towards HUD/Target
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 15) {
                // Arrived at target
                return true; // Return true to signal deletion/completion of collection
            } else {
                this.x += (dx / dist) * this.collectSpeed;
                this.y += (dy / dist) * this.collectSpeed;
                this.collectSpeed += 0.8; // Accelerate
            }
        } else {
            // Normal gravity falling
            if (this.y < canvasHeight - 20) {
                this.y += this.speed;
            } else {
                this.y = canvasHeight - 20;
            }
            this.angle += this.spinSpeed;
        }
        return false;
    }

    collect(targetX, targetY) {
        this.isCollected = true;
        this.targetX = targetX;
        this.targetY = targetY;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Spinning/scaling animation on X axis
        const scaleX = Math.abs(Math.sin(this.angle));
        ctx.scale(scaleX, 1);

        // Draw outer ring
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.shadowColor;
        ctx.fill();

        // Draw inner details
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw '$' sign or simple coin design
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);

        ctx.restore();
    }
}
