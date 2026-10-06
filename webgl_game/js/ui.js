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
  drawHUD(ctx, width, height, player, waveManager, enemies = null) {
    if (!player) return;

    // 1. Health Bar (100 HP – positioned above the ammo tray)
    ctx.save();
    const hpBarW  = 220;
    const hpBarH  = 18;
    const hpBarX  = 30;
    const hpBarY  = 30;
    const hpPct   = Math.max(0, Math.min(1, player.health / player.maxHealth));

    // Colour: green (full) → yellow → red (low) via HSL hue 120→0
    const hpColor = `hsl(${Math.round(hpPct * 120)}, 90%, 48%)`;

    // Track (dark background)
    ctx.fillStyle = 'rgba(10, 14, 25, 0.85)';
    ctx.strokeStyle = '#2F3858';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(hpBarX - 2, hpBarY - 2, hpBarW + 4, hpBarH + 4, 6);
    ctx.fill();
    ctx.stroke();

    // Fill
    if (hpPct > 0) {
      ctx.shadowColor = hpColor;
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = hpColor;
      ctx.beginPath();
      ctx.roundRect(hpBarX, hpBarY, Math.max(4, hpBarW * hpPct), hpBarH, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ❤ icon
    ctx.fillStyle = '#FF2A4D';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('❤', hpBarX, hpBarY + hpBarH + 16);

    // HP label below the bar
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${player.health} / ${player.maxHealth} HP`, hpBarX + 20, hpBarY + hpBarH + 16);
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

    // 2b. Ability Indicators (Dash [SPACE], Invert Frame [RMB])
    if (player.dashUnlocked || player.invertUnlocked) {
      ctx.save();
      // Dash badge to left of ammo bar
      if (player.dashUnlocked) {
        const dashBoxW = 90;
        const dashBoxH = 48;
        const dashX = startX - dashBoxW - 14;
        const dashY = startY + (ammoBarHeight - dashBoxH) / 2;

        ctx.fillStyle = 'rgba(15, 18, 30, 0.9)';
        ctx.strokeStyle = player.dashCooldown > 0 ? '#444C65' : '#00F0FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(dashX, dashY, dashBoxW, dashBoxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#A0B2DE';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('[SPACE] DASH', dashX + dashBoxW / 2, dashY + 16);

        ctx.fillStyle = player.dashCooldown > 0 ? '#FF4D66' : '#00F0FF';
        ctx.font = '900 13px sans-serif';
        ctx.fillText(player.dashCooldown > 0 ? `${player.dashCooldown.toFixed(1)}s` : 'READY', dashX + dashBoxW / 2, dashY + 36);
      }

      // Invert Frame badge to right of ammo bar
      if (player.invertUnlocked) {
        const invBoxW = 100;
        const invBoxH = 48;
        const invX = startX + ammoBarWidth + 14;
        const invY = startY + (ammoBarHeight - invBoxH) / 2;

        const isCooldown = player.invertCooldown > 0;
        const isActive = player.invertActiveTimer > 0;

        ctx.fillStyle = 'rgba(15, 18, 30, 0.9)';
        ctx.strokeStyle = isActive ? '#FF2AD4' : (isCooldown ? '#444C65' : '#A020F0');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(invX, invY, invBoxW, invBoxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#A0B2DE';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('[RMB] INVERT FRAME', invX + invBoxW / 2, invY + 16);

        let statusText = 'READY';
        let statusColor = '#00F0FF';
        if (isActive) {
          statusText = `ACTIVE ${Math.ceil(player.invertActiveTimer)}s`;
          statusColor = '#FF2AD4';
        } else if (isCooldown) {
          statusText = `${Math.ceil(player.invertCooldown)}s`;
          statusColor = '#FF4D66';
        }

        ctx.fillStyle = statusColor;
        ctx.font = '900 12px sans-serif';
        ctx.fillText(statusText, invX + invBoxW / 2, invY + 36);
      }
      ctx.restore();
    }

    // 3. Current Objective & Wave Banner OR Boss HUD (Top Center)
    let activeBoss = null;
    if (enemies && Array.isArray(enemies)) {
      activeBoss = enemies.find(e => e && e.isBoss && e.alive);
    }
    if (!activeBoss && waveManager && waveManager.bossRef && waveManager.bossRef.alive) {
      activeBoss = waveManager.bossRef;
    }
    if (!activeBoss && window.game && window.game.enemies) {
      activeBoss = window.game.enemies.find(e => e && e.isBoss && e.alive);
    }

    ctx.save();
    if (activeBoss) {
      const isInvulnerable = typeof activeBoss.isInvulnerable === 'function' && activeBoss.isInvulnerable();
      ctx.fillStyle = 'rgba(10, 14, 25, 0.92)';
      ctx.strokeStyle = isInvulnerable ? '#A020F0' : '#00F0FF';
      ctx.lineWidth = 2;
      if (isInvulnerable) {
        ctx.shadowColor = '#A020F0';
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 6;
      }

      const bannerW = 540;
      const bannerH = 68;
      const bx = (width - bannerW) / 2;
      const by = 16;
      ctx.beginPath();
      ctx.roundRect(bx, by, bannerW, bannerH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Boss Name Label (Top in the banner box)
      const bossName = (activeBoss.name || "THE BLACK BOSS").toUpperCase();
      ctx.font = '900 16px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFE600';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.strokeText(bossName, width / 2, by + 23);
      ctx.fillText(bossName, width / 2, by + 23);

      const maxHp = activeBoss.maxHealth || 3;
      const currentHp = Math.max(0, activeBoss.health || 0);

      // Boss Health Bar for all bosses
      const barW = 300;
      const barH = 14;
      const barX = (width / 2) - (barW / 2);
      const barY = by + 40;
      
      ctx.fillStyle = '#101018';
      ctx.fillRect(barX, barY, barW, barH);
      
      const pct = currentHp / maxHp;
      // Use different colors for different bosses
      if (activeBoss.colorId === "WHITE") {
        ctx.fillStyle = '#FFFFFF';
      } else if (activeBoss.colorId === "BLACK") {
        ctx.fillStyle = '#A020F0'; // Purple-ish to stand out on dark background
      } else {
        ctx.fillStyle = '#FF0044'; // Fallback
      }
      ctx.fillRect(barX, barY, barW * pct, barH);
      
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      
      // Draw segment dividers
      ctx.beginPath();
      for (let i = 1; i < maxHp; i++) {
        const segX = barX + (barW / maxHp) * i;
        ctx.moveTo(segX, barY);
        ctx.lineTo(segX, barY + barH);
      }
      ctx.stroke();
    } else {
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
    }
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

    // 5. Invert Frame – Comic speed-line vignette overlay
    if (player.invertActiveTimer > 0) {
      this._drawInvertVignette(ctx, width, height, player.invertActiveTimer, player.invertDuration);
    }
  }

  /**
   * Draws a blackish-purple comic-book radial speed-lines vignette around the
   * screen edges while the Invert Frame ability is active.
   */
  _drawInvertVignette(ctx, width, height, activeTimer, totalDuration) {
    ctx.save();

    const cx = width  / 2;
    const cy = height / 2;
    // Pulse opacity: 0.55 base + gentle sine throb
    const pulse = 0.55 + 0.15 * Math.sin(Date.now() * 0.004);

    // ── 1. Dark edge vignette (radial gradient) ──────────────────────────────
    const vigRadius = Math.max(width, height) * 0.85;
    const vig = ctx.createRadialGradient(cx, cy, vigRadius * 0.22, cx, cy, vigRadius);
    vig.addColorStop(0,   'rgba(0,0,0,0)');
    vig.addColorStop(0.6, 'rgba(15,0,30,0)');
    vig.addColorStop(1,   `rgba(8,0,20,${(pulse * 0.82).toFixed(2)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    // ── 2. Radial speed lines ─────────────────────────────────────────────────
    // Use a seeded deterministic set of rays so they don't flicker every frame.
    // We build the angles once based on a fixed seed array stored on the instance.
    if (!this._invertRays) {
      // Generate 48 rays with random angle offsets and widths (stable across frames)
      this._invertRays = [];
      const RAY_COUNT = 48;
      for (let i = 0; i < RAY_COUNT; i++) {
        const base = (i / RAY_COUNT) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * (Math.PI * 2 / RAY_COUNT) * 0.9;
        this._invertRays.push({
          angle: base + jitter,
          width: 0.4 + Math.random() * 2.2,      // line half-width at edge
          inner: 0.30 + Math.random() * 0.25,     // fade-in start (fraction of max radius)
          alpha: 0.25 + Math.random() * 0.55,     // max alpha for this ray
          dark:  Math.random() < 0.3              // ~30% are darker "thick" rays
        });
      }
    }

    const maxR = Math.hypot(cx, cy) * 1.15; // reach past corners

    for (const ray of this._invertRays) {
      const innerR = maxR * ray.inner;
      const outerR = maxR;

      const ix = cx + Math.cos(ray.angle) * innerR;
      const iy = cy + Math.sin(ray.angle) * innerR;
      const ox = cx + Math.cos(ray.angle) * outerR;
      const oy = cy + Math.sin(ray.angle) * outerR;

      // Perpendicular spread at the outer tip
      const perp  = ray.angle + Math.PI / 2;
      const spread = ray.width * (outerR / maxR) * 6;
      const ox1 = ox + Math.cos(perp) * spread;
      const oy1 = oy + Math.sin(perp) * spread;
      const ox2 = ox - Math.cos(perp) * spread;
      const oy2 = oy - Math.sin(perp) * spread;

      const rayAlpha = (ray.alpha * pulse).toFixed(2);
      // Colour: dark obsidian → purple corona (matches BLACK bullet palette)
      const rayColor = ray.dark ? `rgba(40,0,70,${rayAlpha})` : `rgba(100,20,180,${rayAlpha})`;

      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox1, oy1);
      ctx.lineTo(ox2, oy2);
      ctx.closePath();
      ctx.fillStyle = rayColor;
      ctx.fill();
    }

    // ── 3. Thin purple border glow around entire screen edge ─────────────────
    const borderAlpha = (pulse * 0.9).toFixed(2);
    ctx.strokeStyle = `rgba(176, 64, 255, ${borderAlpha})`; // #B040FF
    ctx.lineWidth   = 6;
    ctx.shadowColor = '#B040FF';
    ctx.shadowBlur  = 18;
    ctx.strokeRect(3, 3, width - 6, height - 6);
    ctx.shadowBlur  = 0;

    ctx.restore();
  }

  drawHeart(ctx, x, y, filled, scale = 1.2) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
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
