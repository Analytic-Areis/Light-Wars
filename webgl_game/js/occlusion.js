/**
 * Light-Wars: 2.5D Isometric Occlusion, Wall Masking & Depth Sorting System
 * Supports full occlusion behind solid structures, dynamic occluder translucency
 * when characters walk behind (Level 3 Black Boss Map occluder), and depth sorting.
 */

(function() {
  'use strict';

  class WallObstacle {
    constructor(options = {}) {
      this.type = options.type || 'WALL';
      this.spriteId = options.spriteId || '';
      this.x = options.x || 0;
      this.y = options.y || 0;
      this.width = options.width || 217;
      this.height = options.height || 218;
      this.feetOffset = options.feetOffset !== undefined ? options.feetOffset : this.height * 0.85;
      this.blocksWalking = options.blocksWalking !== undefined ? options.blocksWalking : true;
      this.image = null;
      this.loaded = false;

      if (this.spriteId) {
        this.loadImage(this.spriteId);
      }
    }

    loadImage(src) {
      this.image = new Image();
      this.image.onload = () => {
        this.loaded = true;
      };
      this.image.src = src;
    }

    draw(ctx) {
      if (!this.image || !this.loaded) return;
      const drawX = Math.round(this.x - this.width / 2);
      const drawY = Math.round(this.y - this.feetOffset);
      ctx.drawImage(this.image, drawX, drawY, this.width, this.height);
    }
  }

  class OcclusionManager {
    constructor() {
      this.walls = [];
      this.occluders = [];
      this.enableXRaySilhouette = true;
      this.silhouetteAlpha = 0.25;
    }

    clear() {
      this.walls = [];
      this.occluders = [];
    }

    addWall(options) {
      const wall = new WallObstacle(options);
      this.walls.push(wall);
      return wall;
    }

    static isPointInPolygon(x, y, poly) {
      if (!poly || poly.length < 3) return false;
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    /**
     * Checks if a character's body/silhouette is behind the occluder.
     * Does NOT rely on foot details; verifies exact geometric accordance with the occluder silhouette.
     */
    isEntityBehindOccluder(entity, occ) {
      if (!entity || entity.alive === false) return false;

      // Depth check: ground contact Y must be behind (less than or equal to) the occluder's front anchor baseY
      if (entity.y > (occ.baseY || 470.4) + 8) return false;

      const poly = occ.silhouette;
      if (!poly || poly.length < 3) return false;

      const ex = entity.x;
      const ey = entity.y;
      const h = entity.spriteHeight || 50;
      const w = entity.spriteWidth || 50;

      // Sample key body points of the 1x1 character: head, chest, hips, shoulders, and feet
      const testPoints = [
        [ex, ey - h * 0.85], // Head
        [ex, ey - h * 0.50], // Chest
        [ex, ey - h * 0.25], // Hips
        [ex - w * 0.35, ey - h * 0.50], // Left shoulder
        [ex + w * 0.35, ey - h * 0.50], // Right shoulder
        [ex, ey]             // Feet
      ];

      for (const [tx, ty] of testPoints) {
        if (OcclusionManager.isPointInPolygon(tx, ty, poly)) {
          return true;
        }
      }

      // Check bounding box intersection with silhouette polygon
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of poly) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }

      const eLeft = ex - w * 0.45;
      const eRight = ex + w * 0.45;
      const eTop = ey - h;
      const eBottom = ey;

      if (eLeft < maxX && eRight > minX && eTop < maxY && eBottom > minY) {
        const cx = (eLeft + eRight) / 2;
        const cy = (eTop + eBottom) / 2;
        if (OcclusionManager.isPointInPolygon(cx, cy, poly)) return true;
      }

      return false;
    }

    loadLevelWalls(levelNum, arena) {
      this.clear();
      let config = null;
      if (levelNum === 1) {
        config = window.LightWars.LEVEL1_MAP_CONFIG || window.LightWars.MAP_CONFIG || {};
      } else if (levelNum === 2) {
        config = window.LightWars.LEVEL2_MAP_CONFIG || window.LightWars.MAP_CONFIG || {};
      } else if (levelNum === 3) {
        config = window.LightWars.LEVEL3_MAP_CONFIG || window.LightWars.MAP_CONFIG || {};
      } else {
        config = window.LightWars.MAP_CONFIG || {};
      }

      if (config.silhouetteAlpha !== undefined) {
        this.silhouetteAlpha = config.silhouetteAlpha;
      }

      // 1. Load legacy walls if any
      const levelWallsConfig = config.walls || [];
      for (const w of levelWallsConfig) {
        let worldX = w.x;
        let worldY = w.y;
        const col = w.col !== undefined ? w.col : w.c;
        const row = w.row !== undefined ? w.row : w.r;
        if (col !== undefined && row !== undefined && arena) {
          const screenPos = arena.toScreen(col, row);
          worldX = screenPos.x;
          worldY = screenPos.y;
        }

        this.addWall({
          type: w.type || 'WALL',
          spriteId: w.sprite || '',
          x: worldX,
          y: worldY,
          width: w.width || 256,
          height: w.height || 512,
          feetOffset: w.feetOffset !== undefined ? w.feetOffset : 384,
          blocksWalking: w.blocksWalking !== undefined ? w.blocksWalking : true
        });
      }

      // 2. Load Occluders (e.g. occluder8 in Level 3 Black Boss Map)
      const occList = config.occluders || (arena && arena.occluders) || [];
      for (const occ of occList) {
        const occObj = {
          name: occ.name || 'occluder',
          image: occ.image,
          fade: occ.fade !== undefined ? occ.fade : 0.6,
          baseY: occ.baseY || 470.4,
          silhouette: occ.silhouette || [],
          img: new Image(),
          currentAlpha: 1.0,
          loaded: false
        };
        occObj.img.onload = () => { occObj.loaded = true; };
        occObj.img.src = occ.image;
        this.occluders.push(occObj);
      }
    }

    /**
     * Render entities, foreground structures, and occluders with exact depth sorting.
     */
    renderDepthSortedScene(ctx, entities, spriteManager) {
      // 1. Gather all drawable depth items: entities + walls + occluders
      const renderList = [];

      for (const ent of entities) {
        if (!ent || ent.alive === false) continue;
        renderList.push({
          type: 'ENTITY',
          y: ent.y,
          entity: ent
        });
      }

      for (const wall of this.walls) {
        renderList.push({
          type: 'WALL',
          y: wall.y,
          wall: wall
        });
      }

      for (const occ of this.occluders) {
        renderList.push({
          type: 'OCCLUDER',
          y: occ.baseY,
          occluder: occ
        });
      }

      // 2. Sort by ground-level Y position (ascending: farthest from camera first)
      renderList.sort((a, b) => a.y - b.y);

      // Track walls and occluders for X-Ray holograms
      const wallsInFrontOfPlayer = [];
      const occludersInFrontOfPlayer = [];
      let playerDrawn = false;
      let playerRef = null;
      const drawnEnemies = [];

      // 3. Render back-to-front
      for (const item of renderList) {
        if (item.type === 'WALL') {
          item.wall.draw(ctx);
          if (playerDrawn && playerRef) {
            wallsInFrontOfPlayer.push(item.wall);
          }
          for (const de of drawnEnemies) {
            de.walls.push(item.wall);
          }
        } else if (item.type === 'OCCLUDER') {
          const occ = item.occluder;
          if (playerDrawn && playerRef && this.isEntityBehindOccluder(playerRef, occ)) {
            occludersInFrontOfPlayer.push(occ);
          }

          if (occ.img && (occ.loaded || (occ.img.complete && occ.img.naturalWidth > 0))) {
            // Check if ANY living character (player or enemies) is behind this occluder
            let someoneBehind = false;
            for (const ent of entities) {
              if (this.isEntityBehindOccluder(ent, occ)) {
                someoneBehind = true;
                break;
              }
            }

            const targetAlpha = someoneBehind ? occ.fade : 1.0;
            // Smoothly ease alpha transition
            occ.currentAlpha += (targetAlpha - occ.currentAlpha) * 0.22;

            ctx.save();
            ctx.globalAlpha = occ.currentAlpha;
            const w = occ.img.naturalWidth || 1536;
            const h = occ.img.naturalHeight || 1024;
            ctx.drawImage(occ.img, 0, 0, w, h);
            ctx.restore();
          }
        } else if (item.type === 'ENTITY') {
          const ent = item.entity;
          if (ent instanceof window.LightWars.Player) {
            playerDrawn = true;
            playerRef = ent;
            ent.draw(ctx, spriteManager);
          } else if (ent instanceof window.LightWars.Enemy) {
            drawnEnemies.push({ enemy: ent, walls: [] });
            ent.draw(ctx, spriteManager);
          } else if (ent.draw) {
            ent.draw(ctx);
          }
        }
      }

      // 4. Comic X-Ray Hologram if behind opaque wall or occluder
      if (this.enableXRaySilhouette && playerRef && playerRef.alive && (wallsInFrontOfPlayer.length > 0 || occludersInFrontOfPlayer.length > 0)) {
        this.renderPlayerXRaySilhouette(ctx, playerRef, wallsInFrontOfPlayer, occludersInFrontOfPlayer, spriteManager);
      }
    }

    renderPlayerXRaySilhouette(ctx, player, foregroundWalls, foregroundOccluders, spriteManager) {
      let isBehindStructure = false;

      // 1. Check if behind an occluder
      if (foregroundOccluders && foregroundOccluders.length > 0) {
        for (const occ of foregroundOccluders) {
          if (this.isEntityBehindOccluder(player, occ)) {
            isBehindStructure = true;
            break;
          }
        }
      }

      // 2. Check if behind a solid wall
      if (!isBehindStructure && foregroundWalls && foregroundWalls.length > 0) {
        const playerBounds = {
          left: player.x - 20,
          right: player.x + 20,
          top: player.y - 50,
          bottom: player.y
        };

        for (const wall of foregroundWalls) {
          if (wall.type === 'WALL') {
            const wallBounds = {
              left: wall.x - wall.width / 2,
              right: wall.x + wall.width / 2,
              top: wall.y - wall.height,
              bottom: wall.y
            };
            if (
              playerBounds.left < wallBounds.right &&
              playerBounds.right > wallBounds.left &&
              playerBounds.top < wallBounds.bottom &&
              playerBounds.bottom > wallBounds.top
            ) {
              isBehindStructure = true;
              break;
            }
          }
        }
      }

      if (!isBehindStructure) return;

      ctx.save();
      ctx.globalAlpha = this.silhouetteAlpha !== undefined ? this.silhouetteAlpha : 0.40;
      ctx.filter = 'drop-shadow(0 0 4px #00F0FF) hue-rotate(180deg)';
      player.draw(ctx, spriteManager);
      ctx.restore();
    }
  }

  window.LightWars = window.LightWars || {};
  window.LightWars.WallObstacle = WallObstacle;
  window.LightWars.OcclusionManager = OcclusionManager;
  window.LightWars.occlusion = new OcclusionManager();
})();
