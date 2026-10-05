/**
 * Light-Wars: 2.5D Isometric Occlusion, Wall Masking & Depth Sorting System
 * Supports full occlusion behind solid walls, partial visibility through windows & archways,
 * and optional Comic X-Ray Silhouettes across all levels.
 */

(function() {
  'use strict';

  class WallObstacle {
    /**
     * @param {Object} options
     * @param {string} options.type - 'WALL' | 'WINDOW' | 'ARCHWAY' | 'PROP'
     * @param {string} options.spriteId - Sprite asset key or image path
     * @param {number} options.x - World screen center X
     * @param {number} options.y - World screen base anchor Y (feet/ground line)
     * @param {number} options.width - Tile render width
     * @param {number} options.height - Tile render height
     * @param {number} options.feetOffset - Distance from top of sprite to ground anchor line
     * @param {boolean} options.blocksWalking - True if characters cannot walk through
     */
    constructor(options = {}) {
      this.type = options.type || 'WALL';
      this.spriteId = options.spriteId || '';
      this.x = options.x || 0;
      this.y = options.y || 0; // Ground line (used for exact Y-depth sorting)
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
      this.tileCache = {};
      this.enableXRaySilhouette = true;
    }

    clear() {
      this.walls = [];
    }

    /**
     * Add a wall, window, archway, or obstacle to the scene
     */
    addWall(options) {
      const wall = new WallObstacle(options);
      this.walls.push(wall);
      return wall;
    }

    /**
     * Load walls for a specific level layout
     */
    loadLevelWalls(levelNum, arena) {
      this.clear();
      const config = window.LightWars.MAP_CONFIG || {};
      if (config.silhouetteAlpha !== undefined) {
        this.silhouetteAlpha = config.silhouetteAlpha;
      }
      const levelWallsConfig = config.walls || [];
      
      for (const w of levelWallsConfig) {
        let worldX = w.x;
        let worldY = w.y;
        
        // If grid coordinates (c, r) were specified instead of pixel (x, y)
        if (w.col !== undefined && w.row !== undefined && arena) {
          const screenPos = arena.toScreen(w.col, w.row);
          worldX = screenPos.x;
          worldY = screenPos.y;
        }

        this.addWall({
          type: w.type || 'WALL',
          spriteId: w.sprite || 'assets/tileset/04_sci_fi_wall_straight.png',
          x: worldX,
          y: worldY,
          width: w.width || 217,
          height: w.height || 218,
          feetOffset: w.feetOffset,
          blocksWalking: w.blocksWalking !== undefined ? w.blocksWalking : true
        });
      }
    }

    /**
     * Render entities and foreground walls with exact 2.5D Isometric Depth Sorting (Painter's Algorithm)
     * If an entity is behind a wall (entity.y < wall.y), the wall naturally renders in front of it!
     * Because window tiles have semi-transparent glass and archways have transparent openings,
     * the player's body is partially or fully masked cleanly.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} entities - [player, ...enemies, ...barrels, ...orbs, ...crystals]
     * @param {Object} spriteManager
     */
    renderDepthSortedScene(ctx, entities, spriteManager) {
      // 1. Gather all drawable depth items: entities + walls
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

      // 2. Sort by ground-level Y position (ascending: farthest from camera first)
      renderList.sort((a, b) => a.y - b.y);

      // 3. Keep track of walls rendered for potential X-Ray silhouette
      const wallsInFrontOfPlayer = [];
      let playerDrawn = false;
      let playerRef = null;

      // 4. Render back-to-front
      for (const item of renderList) {
        if (item.type === 'WALL') {
          item.wall.draw(ctx);
          if (playerDrawn && playerRef) {
            // This wall is in front of the player (higher Y)
            wallsInFrontOfPlayer.push(item.wall);
          }
        } else if (item.type === 'ENTITY') {
          const ent = item.entity;
          if (ent instanceof window.LightWars.Player) {
            playerDrawn = true;
            playerRef = ent;
            ent.draw(ctx, spriteManager);
          } else if (ent instanceof window.LightWars.Enemy) {
            ent.draw(ctx, spriteManager);
          } else if (ent.draw) {
            ent.draw(ctx);
          }
        }
      }

      // 5. Optional Comic-Book X-Ray Silhouette:
      // If the player is occluded behind a solid wall, draw a glowing cyan outline
      // so the player never loses their location in the room.
      if (this.enableXRaySilhouette && playerRef && playerRef.alive && wallsInFrontOfPlayer.length > 0) {
        this.renderPlayerXRaySilhouette(ctx, playerRef, wallsInFrontOfPlayer, spriteManager);
      }
    }

    /**
     * Draw glowing silhouette when player is occluded behind solid walls
     */
    renderPlayerXRaySilhouette(ctx, player, foregroundWalls, spriteManager) {
      let isBehindSolidWall = false;
      const playerBounds = {
        left: player.x - 30,
        right: player.x + 30,
        top: player.y - 120,
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
            isBehindSolidWall = true;
            break;
          }
        }
      }

      if (!isBehindSolidWall) return;

      // Draw faint comic-tech hologram outline (decreased opacity)
      ctx.save();
      ctx.globalAlpha = this.silhouetteAlpha !== undefined ? this.silhouetteAlpha : 0.18;
      ctx.filter = 'drop-shadow(0 0 3px #00F0FF) hue-rotate(180deg)';
      player.draw(ctx, spriteManager);
      ctx.restore();
    }
  }

  window.LightWars = window.LightWars || {};
  window.LightWars.WallObstacle = WallObstacle;
  window.LightWars.OcclusionManager = OcclusionManager;
  window.LightWars.occlusion = new OcclusionManager();
})();
