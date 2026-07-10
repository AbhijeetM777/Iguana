// Fish Class with autonomous steering behaviors, hunger states, growth, and procedural drawing

export class Fish {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        
        // Physics constants
        this.maxSpeed = 1.8;
        this.maxForce = 0.08;
        
        // Growth details
        this.growthPoints = 0;
        this.level = 1; // 1: Baby, 2: Medium, 3: Adult
        
        // Hunger details
        this.hunger = 100; // 0 to 100
        this.hungerDecay = 0.08 + Math.random() * 0.04;
        
        // Animation states
        this.wiggle = 0;
        this.wiggleSpeed = 0.15;
        this.isFacingRight = this.vx > 0;
        
        // Coin drop timer
        this.coinTimer = 0;
        this.coinInterval = 600 + Math.random() * 400; // frames (~10-15s)

        // Random offset for wander logic
        this.wanderAngle = Math.random() * Math.PI * 2;
        
        this.isDead = false;
        this.deathTimer = 0;
    }

    update(foods, canvasWidth, canvasHeight, onSpawnCoin) {
        if (this.isDead) {
            // Sinks or floats belly up
            this.vy = -1.0; // Floats slowly to top
            this.vx = Math.sin(this.deathTimer * 0.05) * 0.5; // Sway back and forth
            this.y += this.vy;
            this.x += this.vx;
            this.deathTimer++;
            
            // Constrain to top
            if (this.y < 30) {
                this.y = 30;
            }
            return;
        }

        // 1. Hunger updates
        this.hunger -= this.hungerDecay;
        if (this.hunger <= 0) {
            this.hunger = 0;
            this.isDead = true;
            return;
        }

        // Wiggle animation
        this.wiggle += this.wiggleSpeed;

        // 2. Behavioral steering: Wandering or Seeking food
        let steerX = 0;
        let steerY = 0;

        const isHungry = this.hunger < 60;
        let targetFood = null;

        if (isHungry && foods.length > 0) {
            // Find closest food
            let closestDist = Infinity;
            for (const food of foods) {
                if (food.isEaten) continue;
                const d = Math.hypot(food.x - this.x, food.y - this.y);
                if (d < closestDist) {
                    closestDist = d;
                    targetFood = food;
                }
            }
        }

        if (targetFood) {
            // Seek food
            const targetX = targetFood.x;
            const targetY = targetFood.y;
            
            const desiredX = targetX - this.x;
            const desiredY = targetY - this.y;
            const d = Math.hypot(desiredX, desiredY);
            
            if (d > 0) {
                const speed = isHungry ? this.maxSpeed * 1.3 : this.maxSpeed;
                const targetVx = (desiredX / d) * speed;
                const targetVy = (desiredY / d) * speed;
                
                steerX = targetVx - this.vx;
                steerY = targetVy - this.vy;
            }

            // Check collision with food (Eat)
            const eatDistance = 15 + this.level * 4;
            if (d < eatDistance) {
                targetFood.isEaten = true;
                this.hunger = Math.min(100, this.hunger + targetFood.nutrition);
                this.growthPoints += targetFood.nutrition;
                this.checkGrowth();
                // Return eat trigger
                this.hasEaten = true;
            }
        } else {
            // Wander behavior (Steer towards a changing angle)
            this.wanderAngle += (Math.random() - 0.5) * 0.5;
            const wanderVx = Math.cos(this.wanderAngle) * this.maxSpeed;
            const wanderVy = Math.sin(this.wanderAngle) * this.maxSpeed;
            
            steerX = wanderVx - this.vx;
            steerY = wanderVy - this.vy;
        }

        // Apply steering force
        const steerLength = Math.hypot(steerX, steerY);
        if (steerLength > this.maxForce) {
            steerX = (steerX / steerLength) * this.maxForce;
            steerY = (steerY / steerLength) * this.maxForce;
        }

        this.vx += steerX;
        this.vy += steerY;

        // Apply velocities
        this.x += this.vx;
        this.y += this.vy;

        // Orientation
        if (Math.abs(this.vx) > 0.1) {
            this.isFacingRight = this.vx > 0;
        }

        // Boundary collision / wrapping safely
        const buffer = 40;
        if (this.x < buffer) {
            this.x = buffer;
            this.vx *= -1;
            this.wanderAngle = Math.PI - this.wanderAngle;
        } else if (this.x > canvasWidth - buffer) {
            this.x = canvasWidth - buffer;
            this.vx *= -1;
            this.wanderAngle = Math.PI - this.wanderAngle;
        }

        if (this.y < buffer + 40) { // Keep space for HUD
            this.y = buffer + 40;
            this.vy *= -1;
        } else if (this.y > canvasHeight - 70) { // Keep space for Shop
            this.y = canvasHeight - 70;
            this.vy *= -1;
        }

        // 3. Coin Spawning Logic
        this.coinTimer++;
        if (this.coinTimer >= this.coinInterval) {
            this.coinTimer = 0;
            let val = 15;
            if (this.level === 2) val = 35;
            if (this.level === 3) val = 75;
            onSpawnCoin(this.x, this.y, val);
        }
    }

    checkGrowth() {
        if (this.level === 1 && this.growthPoints >= 100) {
            this.level = 2;
            this.maxSpeed = 2.1;
        } else if (this.level === 2 && this.growthPoints >= 300) {
            this.level = 3;
            this.maxSpeed = 2.4;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip fish orientation based on moving direction
        if (!this.isFacingRight) {
            ctx.scale(-1, 1);
        }

        // Size scalars based on growth level
        const sizeScale = 0.8 + (this.level * 0.25);
        ctx.scale(sizeScale, sizeScale);

        // Compute colors based on level & hunger
        let bodyColor = '#ff7f50'; // Baby Coral
        let stripeColor = '#ffffff';

        if (this.level === 2) {
            bodyColor = '#ff9f43'; // Medium Amber
            stripeColor = '#00d2ff';
        } else if (this.level === 3) {
            bodyColor = '#ff6b6b'; // Adult Neon Pink-Red
            stripeColor = '#ffd700';
        }

        // If starving (hunger < 20)
        if (this.hunger < 20) {
            bodyColor = '#808e9b'; // Greyish/sick
            stripeColor = '#485460';
        } else if (this.hunger < 50) {
            // Sickish green tint overlay/blend
            bodyColor = '#10ac84';
        }

        if (this.isDead) {
            bodyColor = '#57606f';
            stripeColor = '#2f3542';
            ctx.scale(1, -1); // Float belly up
        }

        // Draw Back Tail Fin with waving motion
        ctx.save();
        ctx.translate(-24, 0);
        const tailWiggle = Math.sin(this.wiggle) * 0.25;
        ctx.rotate(tailWiggle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-15, -18, -25, -15, -28, -20);
        ctx.bezierCurveTo(-24, -5, -20, 0, -28, 0);
        ctx.bezierCurveTo(-20, 0, -24, 5, -28, 20);
        ctx.bezierCurveTo(-25, 15, -15, 18, 0, 0);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        // Inner tail highlights
        ctx.fillStyle = stripeColor;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-20, -10);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-20, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Main Body Ellipse
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = bodyColor;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Colored Stripes
        ctx.strokeStyle = stripeColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-4, 0, 12, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(4, 0, 10, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();

        // Draw Fin
        ctx.save();
        ctx.translate(-5, 6);
        ctx.rotate(Math.sin(this.wiggle * 1.5) * 0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 10, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = stripeColor;
        ctx.fill();
        ctx.restore();

        // Draw Eye
        ctx.beginPath();
        ctx.arc(12, -4, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        // Pupil
        ctx.beginPath();
        ctx.arc(this.hunger < 50 && !this.isDead ? 14 : 13, -4, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Mouth (open if hungry/dead)
        ctx.beginPath();
        if (this.isDead) {
            // X's for eyes instead of normal pupil (optional, let's keep pupil black but float upside down)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(18, 2);
            ctx.lineTo(22, 5);
            ctx.stroke();
        } else if (this.hunger < 50) {
            // Open hungry mouth
            ctx.arc(20, 2, 3, 0, Math.PI, false);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Happy closed mouth
            ctx.arc(20, 1, 3, 0, Math.PI * 0.5, false);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }
}
