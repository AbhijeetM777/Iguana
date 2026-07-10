// Food Pellet Representation

export class Food {
    constructor(x, y, quality) {
        this.x = x;
        this.y = y;
        this.quality = quality; // 1: Bronze (Red), 2: Silver (Blue), 3: Gold (Yellow)
        this.radius = 6;
        this.speed = 1.2 + Math.random() * 0.4;
        this.angle = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.05 + Math.random() * 0.05;
        this.swayAmount = 0.5 + Math.random() * 0.5;
        this.isEaten = false;
        
        // Setup colors/nutrients based on food quality
        if (this.quality === 1) {
            this.color = '#ff4757'; // red
            this.nutrition = 25; // growth points
        } else if (this.quality === 2) {
            this.color = '#1e90ff'; // blue
            this.nutrition = 60;
        } else {
            this.color = '#ffa502'; // gold/yellow
            this.nutrition = 150;
        }
    }

    update(canvasHeight) {
        this.y += this.speed;
        this.angle += this.swaySpeed;
        this.x += Math.sin(this.angle) * this.swayAmount;

        // If hits the bottom, it stays there or slowly dissolves
        if (this.y > canvasHeight - 20) {
            this.y = canvasHeight - 20;
            // Slowly dissolve food at the bottom (could disappear after a while)
            this.speed = 0;
            this.swayAmount = 0;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        // Inner glowing core
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();

        // Outer wrapper
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
}
