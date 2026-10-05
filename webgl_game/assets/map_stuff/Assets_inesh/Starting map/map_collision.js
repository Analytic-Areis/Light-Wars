// Usage: const map = await loadMap('map_collision.json'); 
// Works in any JS engine (Phaser, PixiJS, Canvas, etc.)

async function loadMap(url) {
  const d = await (await fetch(url)).json();
  const [p0, p1, p2, p3] = d.corners;
  const [x0, y0] = p0, [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const D = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / D, h = (dx1 * dy3 - dx3 * dy1) / D;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3;
  const d_ = y1 - y0 + g * y1, e = y3 - y0 + h * y3;

  return {
    cols: d.cols, rows: d.rows, spawn: d.spawn,

    // grid coords (can be fractional, e.g. 3.5 = tile centre) -> pixel on the image
    gridToScreen(c, r) {
      const u = c / d.cols, v = r / d.rows, w = g * u + h * v + 1;
      return { x: (a * u + b * v + x0) / w, y: (d_ * u + e * v + y0) / w };
    },

    isBlocked(c, r) {
      return c < 0 || r < 0 || c >= d.cols || r >= d.rows || d.blocked[r][c] === 1;
    },

    // 1x1 player: try to move by (dc, dr) tiles
    tryMove(player, dc, dr) {
      const nc = player.c + dc, nr = player.r + dr;
      if (this.isBlocked(nc, nr)) return false;
      // optional: stop diagonal corner-cutting
      if (dc && dr && (this.isBlocked(player.c + dc, player.r) || this.isBlocked(player.c, player.r + dr))) return false;
      player.c = nc; player.r = nr;
      return true;
    },
  };
}

// Example:
// const map = await loadMap('map_collision.json');
// const player = { c: map.spawn[0], r: map.spawn[1] };
// window.onkeydown = e => {
//   const k = { ArrowRight:[1,0], ArrowLeft:[-1,0], ArrowDown:[0,1], ArrowUp:[0,-1] }[e.key];
//   if (k) map.tryMove(player, ...k);
//   const p = map.gridToScreen(player.c + 0.5, player.r + 0.5); // draw sprite feet here
// };
