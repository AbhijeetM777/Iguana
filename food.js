// Chicken Food Pellet Representation

import { stateManager } from './ui.js';

export class Food {
    constructor(x, y, quality) {
        this.x = x;
        this.y = y;
        this.quality = quality; // 1: Raw Chicken (pinkish-red), 2: Roasted Chicken (golden-brown), 3: Deluxe Golden Glaze (sparkly gold)
        this.radius = 12; // slightly larger for chicken shape
        this.speed = 1.0 + Math.random() * 0.3;
        this.angle = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.04 + Math.random() * 0.04;
        this.swayAmount = 0.4 + Math.random() * 0.4;
        this.isEaten = false;
        
        // Setup colors based on quality
        if (this.quality === 1) {
            this.meatColor = '#ff7675'; // Raw pinkish chicken
            this.nutrition = 25;
        } else if (this.quality === 2) {
            this.meatColor = '#d35400'; // Golden roasted brown
            this.nutrition = 60;
        } else {
            this.meatColor = '#f1c40f'; // Shiny glazed gold
            this.nutrition = 150;
        }
    }

    update(canvasHeight) {
        this.y += this.speed;
        this.angle += this.swaySpeed;
        this.x += Math.sin(this.angle) * this.swayAmount;

        // Ground constraint
        if (this.y > canvasHeight - 22) {
            this.y = canvasHeight - 22;
            this.speed = 0;
            this.swayAmount = 0;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * 0.2); // slight rotation drift

        // Draw Chicken Drumstick
        // 1. Draw Bone (white stick)
        ctx.fillStyle = '#f5f6fa';
        ctx.beginPath();
        ctx.rect(-2, 0, 4, 15);
        ctx.fill();

        // 2. Draw Bone Knuckle (two overlapping circles at end of bone)
        ctx.beginPath();
        ctx.arc(-2, 14, 3, 0, Math.PI * 2);
        ctx.arc(2, 14, 3, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw Meat part (glowing core based on quality)
        ctx.fillStyle = this.meatColor;
        ctx.beginPath();
        ctx.ellipse(0, -2, 9, 11, 0, 0, Math.PI * 2);
        ctx.shadowBlur = this.quality === 3 ? 12 : 5;
        ctx.shadowColor = this.meatColor;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // 4. Highlight detail on meat
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2, -3, 5, Math.PI, Math.PI * 1.5);
        ctx.stroke();

        ctx.restore();

        // 5. Draw Custom Target Name Tag below
        const label = stateManager.state.feedTargetName || 'Chicken';
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.font = 'bold 10px Outfit, sans-serif';
        const textWidth = ctx.measureText(label).width;
        
        // Background badge for legibility
        ctx.beginPath();
        ctx.roundRect(this.x - (textWidth / 2) - 6, this.y + 18, textWidth + 12, 14, 4);
        ctx.fill();

        // Name text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(label, this.x, this.y + 28);
        ctx.restore();
    }
}
