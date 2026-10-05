/**
 * Light-Wars: Comic Strip Menu, Brawl Stars HUD, and Dynamic Objectives
 */

class UIManager {
  constructor() {
    this.objectiveText = "Welcome to Light-Wars!";
    this.objectiveSubtext = "Defeat the enemies using chromatic interactions";
    this.bannerTimer = 0;
  }

  setObjective(text, subtext = '') {
    this.objectiveText = text;
    this.objectiveSubtext = subtext;
    this.bannerTimer = 4.0;
  }

  update(dt) {
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
  }

  // Draw in-game HUD directly to screen overlay canvas / context
  drawHUD(ctx, width, height, player, waveManager) {
    if (!player) return;

    // 1. Health Bar (Brawl Stars Hearts)
    ctx.save();
    const heartX = 30;
    const heartY = 30;
    for (let i = 0; i < player.maxHealth; i++) {
      const isFilled = i < player.health;
      this.drawHeart(ctx, heartX + i * 36, heartY, isFilled);
    }

    // Health label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${player.health} / ${player.maxHealth}`, heartX, heartY + 34);
    ctx.restore();

    // 2. Ammo Bar (Bottom Center - Brawl Stars Style Selector)
    ctx.save();
    const ammoBarWidth = 520;
    const ammoBarHeight = 64;
    const startX = (width - ammoBarWidth) / 2;
    const startY = height - ammoBarHeight - 20;

    // Panel background
    ctx.fillStyle = 'rgba(15, 18, 30, 0.88)';
    ctx.strokeStyle = '#2F3858';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(startX - 10, startY - 8, ammoBarWidth + 20, ammoBarHeight + 16, 12);
    ctx.fill();
    ctx.stroke();

    const slotWidth = ammoBarWidth / player.colorOrder.length;
    for (let i = 0; i < player.colorOrder.length; i++) {
      const colorId = player.colorOrder[i];
      const colorData = window.LightWars.COLORS[colorId];
      const count = player.ammo[colorId] || 0;
      const isSelected = i === player.activeColorIndex;

      const slotX = startX + i * slotWidth;
      const slotY = startY;

      // Slot box
      if (isSelected) {
        // Highlighting active slot
        ctx.fillStyle = colorData.hex;
        ctx.shadowColor = colorData.hex;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(slotX + 3, slotY - 4, slotWidth - 6, ammoBarHeight + 8, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#11131E';
        ctx.beginPath();
        ctx.roundRect(slotX + 5, slotY - 2, slotWidth - 10, ammoBarHeight + 4, 6);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1D2235';
        ctx.beginPath();
        ctx.roundRect(slotX + 4, slotY, slotWidth - 8, ammoBarHeight, 6);
        ctx.fill();
      }

      // Color Pip Indicator
      ctx.fillStyle = colorData.hex;
      ctx.beginPath();
      ctx.arc(slotX + slotWidth / 2, slotY + 18, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Number Hotkey (1, 2, 3...)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`[${i + 1}]`, slotX + slotWidth / 2, slotY + 36);

      // Ammo count text
      ctx.fillStyle = (count > 0) ? '#FFFFFF' : '#FF4455';
      ctx.font = '900 14px sans-serif';
      ctx.fillText(`${count}`, slotX + slotWidth / 2, slotY + 54);
    }
    ctx.restore();

    // 3. Current Objective & Wave Banner (Top Center)
    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 25, 0.9)';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    const bannerW = 540;
    const bannerH = 55;
    const bx = (width - bannerW) / 2;
    const by = 18;
    ctx.beginPath();
    ctx.roundRect(bx, by, bannerW, bannerH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFE600';
    ctx.font = '900 15px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.objectiveText.toUpperCase(), width / 2, by + 23);

    ctx.fillStyle = '#E0F0FF';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(this.objectiveSubtext, width / 2, by + 44);
    ctx.restore();

    // 4. White Light Refill Hint when standing in spawn or out of ammo
    if (player.isRefilling) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.95)';
      ctx.font = '900 18px "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("⚡ RECHARGING RGB LASER AMMO... ⚡", width / 2, height - 110);
      ctx.restore();
    } else if (player.ammo[player.getActiveColorId()] === 0) {
      ctx.save();
      ctx.fillStyle = '#FF3355';
      ctx.font = '900 16px "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("⚠️ NO AMMO IN THIS COLOR! RETURN TO RECHARGE STATION!", width / 2, height - 110);
      ctx.restore();
    }
  }

  drawHeart(ctx, x, y, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.2, 1.2);
    ctx.fillStyle = filled ? '#FF2A4D' : '#33384D';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(0, 0, -6, -4, -10, -4);
    ctx.bezierCurveTo(-16, -4, -16, 4, -16, 4);
    ctx.bezierCurveTo(-16, 10, -8, 16, 0, 22);
    ctx.bezierCurveTo(8, 16, 16, 10, 16, 4);
    ctx.bezierCurveTo(16, 4, 16, -4, 10, -4);
    ctx.bezierCurveTo(6, -4, 0, 0, 0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawColorMatrixWidget(ctx, x, y) {
    ctx.save();
    const w = 210;
    const h = 138;
    ctx.fillStyle = 'rgba(16, 20, 34, 0.88)';
    ctx.strokeStyle = '#323E62';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 30, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00F0FF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLOR COUNTER MATRIX', x - 30 + w / 2, y + 16);

    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';

    const rules = [
      { text: '• Red ➔ Dies to Cyan', color: '#FF4D66' },
      { text: '• Blue ➔ Dies to Yellow', color: '#4D88FF' },
      { text: '• Green ➔ Dies to Magenta', color: '#2CE070' },
      { text: '• Cyan ➔ Dies to Red', color: '#00F0FF' },
      { text: '• Yellow ➔ Dies to Blue', color: '#FFE600' },
      { text: '• Magenta ➔ Dies to Green', color: '#FF33DD' }
    ];

    rules.forEach((r, idx) => {
      ctx.fillStyle = r.color;
      ctx.fillText(r.text, x - 20, y + 33 + idx * 15);
    });

    ctx.fillStyle = '#8B9BB4';
    ctx.font = '9px sans-serif';
    ctx.fillText('Other hits: Transform / No effect', x - 20, y + 128);

    ctx.restore();
  }
}

window.LightWars = window.LightWars || {};
window.LightWars.UIManager = UIManager;
