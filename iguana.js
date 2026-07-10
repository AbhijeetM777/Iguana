// Iguana Class with autonomous steering, hunger decay, growth, and procedural lizard rendering

export class Iguana {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        
        // Physics constants
        this.maxSpeed = 1.6;
        this.maxForce = 0.08;
        
        // Growth details
        this.growthPoints = 0;
        this.level = 1; // 1: Baby, 2: Growing, 3: Alpha Dragon
        
        // Hunger details
        this.hunger = 100;
        this.hungerDecay = 0.08 + Math.random() * 0.04;
        
        // Animation states
        this.wiggle = 0;
        this.wiggleSpeed = 0.12;
        this.isFacingRight = this.vx > 0;
        
        // Coin drop timer
        this.coinTimer = 0;
        this.coinInterval = 600 + Math.random() * 400; // frames (~10-15s)

        this.wanderAngle = Math.random() * Math.PI * 2;
        
        this.isDead = false;
        this.deathTimer = 0;
        
        // Tongue dart animation frame count
        this.tongueTimer = 0;
    }

    update(foods, canvasWidth, canvasHeight, onSpawnCoin) {
        if (this.isDead) {
            // Sinks to bottom/floats upside down
            this.vy = 1.0; // Dies and sinks to bottom
            this.vx = Math.sin(this.deathTimer * 0.05) * 0.4;
            this.y += this.vy;
            this.x += this.vx;
            this.deathTimer++;
            
            // Constrain to ground
            if (this.y > canvasHeight - 35) {
                this.y = canvasHeight - 35;
                this.vx = 0;
            }
            return;
        }

        // Hunger updates
        this.hunger -= this.hungerDecay;
        if (this.hunger <= 0) {
            this.hunger = 0;
            this.isDead = true;
            return;
        }

        this.wiggle += this.wiggleSpeed;

        // Steering force calculation
        let steerX = 0;
        let steerY = 0;

        const isHungry = this.hunger < 70;
        let targetFood = null;

        if (isHungry && foods.length > 0) {
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
            const targetX = targetFood.x;
            const targetY = targetFood.y;
            
            const desiredX = targetX - this.x;
            const desiredY = targetY - this.y;
            const d = Math.hypot(desiredX, desiredY);
            
            if (d > 0) {
                const speed = isHungry ? this.maxSpeed * 1.35 : this.maxSpeed;
                const targetVx = (desiredX / d) * speed;
                const targetVy = (desiredY / d) * speed;
                
                steerX = targetVx - this.vx;
                steerY = targetVy - this.vy;
            }

            // Eat detection
            const eatDistance = 20 + this.level * 4;
            if (d < eatDistance) {
                targetFood.isEaten = true;
                this.hunger = Math.min(100, this.hunger + targetFood.nutrition);
                this.growthPoints += targetFood.nutrition;
                this.checkGrowth();
                this.hasEaten = true;
                this.tongueTimer = 15; // Trigger tongue dart animation
            }
        } else {
            // Wander
            this.wanderAngle += (Math.random() - 0.5) * 0.4;
            const wanderVx = Math.cos(this.wanderAngle) * this.maxSpeed;
            const wanderVy = Math.sin(this.wanderAngle) * this.maxSpeed;
            
            steerX = wanderVx - this.vx;
            steerY = wanderVy - this.vy;
        }

        const steerLength = Math.hypot(steerX, steerY);
        if (steerLength > this.maxForce) {
            steerX = (steerX / steerLength) * this.maxForce;
            steerY = (steerY / steerLength) * this.maxForce;
        }

        this.vx += steerX;
        this.vy += steerY;

        this.x += this.vx;
        this.y += this.vy;

        if (Math.abs(this.vx) > 0.1) {
            this.isFacingRight = this.vx > 0;
        }

        // Boundary constraints
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

        if (this.y < buffer + 40) {
            this.y = buffer + 40;
            this.vy *= -1;
        } else if (this.y > canvasHeight - 80) {
            this.y = canvasHeight - 80;
            this.vy *= -1;
        }

        // Coin drop timer
        this.coinTimer++;
        if (this.coinTimer >= this.coinInterval) {
            this.coinTimer = 0;
            let val = 15;
            if (this.level === 2) val = 35;
            if (this.level === 3) val = 75;
            onSpawnCoin(this.x, this.y, val);
        }

        // Tongue animation timer countdown
        if (this.tongueTimer > 0) {
            this.tongueTimer--;
        }
    }

    checkGrowth() {
        if (this.level === 1 && this.growthPoints >= 100) {
            this.level = 2;
            this.maxSpeed = 1.9;
        } else if (this.level === 2 && this.growthPoints >= 300) {
            this.level = 3;
            this.maxSpeed = 2.2;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (!this.isFacingRight) {
            ctx.scale(-1, 1);
        }

        const sizeScale = 0.75 + (this.level * 0.3);
        ctx.scale(sizeScale, sizeScale);

        // Core colors: Forest greens/yellows
        let bodyColor = '#2ecc71'; // Neon Green
        let spikeColor = '#e67e22'; // Orange Spikes

        if (this.level === 2) {
            bodyColor = '#1abc9c'; // Turquoise
            spikeColor = '#f1c40f'; // Gold spikes
        } else if (this.level === 3) {
            bodyColor = '#27ae60'; // Darker green alpha
            spikeColor = '#e74c3c'; // Fire red spikes
        }

        if (this.hunger < 20) {
            bodyColor = '#7f8c8d'; // Starved grey
            spikeColor = '#34495e';
        } else if (this.hunger < 50) {
            bodyColor = '#d35400'; // Rusty warning orange
        }

        if (this.isDead) {
            bodyColor = '#535c68';
            spikeColor = '#30336b';
            ctx.scale(1, -1); // Flip upside down
        }

        // 1. Draw Legs (Wiggling walk cycle)
        ctx.fillStyle = bodyColor;
        const frontLegWiggle = Math.sin(this.wiggle) * 4;
        const backLegWiggle = Math.cos(this.wiggle) * 4;

        // Front leg
        ctx.save();
        ctx.translate(10, 6);
        ctx.rotate(frontLegWiggle * 0.1);
        ctx.beginPath();
        ctx.roundRect(-3, 0, 6, 12, 3);
        ctx.fill();
        ctx.restore();

        // Back leg
        ctx.save();
        ctx.translate(-12, 6);
        ctx.rotate(backLegWiggle * 0.1);
        ctx.beginPath();
        ctx.roundRect(-3, 0, 6, 12, 3);
        ctx.fill();
        ctx.restore();

        // 2. Draw Long Tail (Waving)
        ctx.save();
        ctx.translate(-24, -2);
        const tailWiggle = Math.sin(this.wiggle * 0.8) * 0.3;
        ctx.rotate(tailWiggle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-20, -6, -30, 8, -45, tailWiggle * 10);
        ctx.bezierCurveTo(-30, 2, -15, 6, 0, 4);
        ctx.fillStyle = bodyColor;
        ctx.fill();
        ctx.restore();

        // 3. Draw Back Spikes / Crest
        ctx.fillStyle = spikeColor;
        for (let i = -16; i <= 8; i += 6) {
            const spikeHeight = 4 + Math.sin(i * 0.2) * 2;
            ctx.beginPath();
            ctx.moveTo(i - 3, -7);
            ctx.lineTo(i, -7 - spikeHeight);
            ctx.lineTo(i + 3, -7);
            ctx.closePath();
            ctx.fill();
        }

        // 4. Main Body Ellipse (Elongated lizard body)
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = bodyColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        // 5. Head
        ctx.beginPath();
        ctx.ellipse(22, -4, 9, 7, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // 6. Eye (Beady lizard eye)
        ctx.beginPath();
        ctx.arc(22, -6, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(22, -6, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // 7. Darting Tongue
        if (this.tongueTimer > 0) {
            ctx.strokeStyle = '#ff7675'; // pink tongue
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(29, -2);
            ctx.lineTo(38, -2);
            // Forked tip
            ctx.moveTo(38, -2);
            ctx.lineTo(41, -4);
            ctx.moveTo(38, -2);
            ctx.lineTo(41, 0);
            ctx.stroke();
        }

        ctx.restore();
    }
}
