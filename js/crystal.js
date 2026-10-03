/**
 * Light-Wars: Ammo Crystal Pickup
 * Spawns in pairs at orb location upon successful laser + orb conversion.
 * Walk over to collect +1 laser ammunition of the crafted color.
 */

class AmmoCrystal {
  constructor(x, y, colorId, angleOffset = 0) {
    this.x = x + Math.cos(angleOffset) * 24;
    this.y = y + Math.sin(angleOffset) * 15;
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.YELLOW;
    this.radius = 14;
    this.pickupRadius = 36;
    this.floatTime = Math.random() * Math.PI * 2;
    this.pulseTime = 0;
    this.alive = true;
    this.isCollected = false;
  }

  update(dt) {
    if (!this.alive) return;
    this.floatTime += dt * 4.0;
    this.pulseTime += dt * 5.0;
  }

  collect(player, game) {
    if (this.isCollected || !this.alive) return;
    this.isCollected = true;
    this.alive = false;

    // Grant ammo to player
    player.addAmmo(this.colorId, 1);

    // Audio & Visual comic feedback
    if (window.LightWars.sound) {
      window.LightWars.sound.playOrbConvert();
    }
    if (game && game.particles) {
      game.particles.spawnBurst(this.x, this.y, this.colorData.hex, 16);
      game.particles.spawnComicText(this.x, this.y - 20, `+1 ${this.colorId}!`, this.colorData.hex);
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    const bob = Math.sin(this.floatTime) * 4.5;
    const pulse = 1.0 + Math.sin(this.pulseTime) * 0.14;
    const cy = this.y - 16 + bob;

    // 1. Ground contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, cy);

    // 2. Glowing outer aura
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 26 * pulse);
    grad.addColorStop(0, this.colorData.hex);
    grad.addColorStop(0.4, this.colorData.glow);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 3. Chromatic Diamond Crystal
    const r = 11.0;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.35);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r * 1.35);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fillStyle = this.colorData.hex;
    ctx.fill();

    // White outline
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Inner bright white energy core
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(r * 0.5, 0);
    ctx.lineTo(0, r * 0.7);
    ctx.lineTo(-r * 0.5, 0);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Floating "+1 [C]" label
    ctx.font = '900 13px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(`+1 ${this.colorId[0]}`, 0, -r * 1.4);
    ctx.fillStyle = this.colorData.hex;
    ctx.fillText(`+1 ${this.colorId[0]}`, 0, -r * 1.4);

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.AmmoCrystal = AmmoCrystal;
