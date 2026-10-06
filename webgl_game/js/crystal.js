/**
 * Light-Wars: Ammo Crystal Pickup
 * Spawns in pairs at orb location upon successful laser + orb conversion.
 * Walk over to collect +1 laser ammunition of the crafted color.
 */

class AmmoCrystal {
  constructor(x, y, colorId, angleOffset = 0) {
    this.x = x + Math.cos(angleOffset) * 10;
    this.y = y + Math.sin(angleOffset) * 6;
    this.colorId = colorId;
    this.colorData = window.LightWars.COLORS[colorId] || window.LightWars.COLORS.YELLOW;
    // Sized to 75% of previous size (~19px visual diameter)
    this.radius = 5.25;
    this.pickupRadius = 15;
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
    if (this.isCollected || !this.alive) return false;

    // Cap check: player cannot collect crystal if inventory of this color is already full
    if (player && player.canAddAmmo && !player.canAddAmmo(this.colorId)) {
      return false;
    }

    this.isCollected = true;
    this.alive = false;

    // Grant ammo to player
    player.addAmmo(this.colorId, 1);

    // Audio & Visual comic feedback
    if (window.LightWars.sound) {
      window.LightWars.sound.playOrbConvert();
    }
    if (game && game.particles) {
      game.particles.spawnBurst(this.x, this.y, this.colorData.hex, 8);
      game.particles.spawnComicText(this.x, this.y - 12, `+1 ${this.colorId}!`, this.colorData.hex);
    }
    return true;
  }

  draw(ctx) {
    if (!this.alive) return;

    const bob = Math.sin(this.floatTime) * 2.0;
    const pulse = 1.0 + Math.sin(this.pulseTime) * 0.14;
    const cy = this.y - 8 + bob;

    // 1. Ground contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 2, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, cy);

    // 2. Glowing outer aura (75% size: ~9.8px radius -> ~19px diameter)
    const auraR = 9.8 * pulse;
    const grad = ctx.createRadialGradient(0, 0, 1.5, 0, 0, auraR);
    grad.addColorStop(0, this.colorData.hex);
    grad.addColorStop(0.4, this.colorData.glow);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Chromatic Diamond Crystal (compact)
    const r = 4.1;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.35);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r * 1.35);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fillStyle = this.colorData.hex;
    ctx.fill();

    // White outline
    ctx.lineWidth = 0.9;
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
    ctx.font = '900 8px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(`+1 ${this.colorId[0]}`, 0, -r * 1.4);
    ctx.fillStyle = this.colorData.hex;
    ctx.fillText(`+1 ${this.colorId[0]}`, 0, -r * 1.4);

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.AmmoCrystal = AmmoCrystal;
