const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const SIZE = 512;
const BG = '#0f0f1e';
const colors = ['#0fff95', '#1a8fff', '#6c3ce0', '#ff6b35', '#ffaa00'];

function block(x, y, w, h, color, hp) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${color}"/>`;
  if (hp !== undefined) {
    s += `<text x="${x+w/2}" y="${y+h/2+2}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="bold" font-size="${w > 55 ? 22 : 17}" fill="white">${hp}</text>`;
  }
  return s;
}

// Ball trail: small at start (tail), big at end (head)
// Points is an array of [x,y] waypoints, balls are placed along them
function ballTrail(points, count) {
  let s = '';
  // Distribute balls evenly along the path
  const totalLen = [];
  let cumLen = 0;
  totalLen.push(0);
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i-1][0];
    const dy = points[i][1] - points[i-1][1];
    cumLen += Math.sqrt(dx*dx + dy*dy);
    totalLen.push(cumLen);
  }

  for (let b = 0; b < count; b++) {
    const t = b / (count - 1); // 0 = tail (small), 1 = head (big)
    const targetLen = t * cumLen;

    // Find segment
    let seg = 0;
    for (let i = 1; i < totalLen.length; i++) {
      if (totalLen[i] >= targetLen) { seg = i - 1; break; }
    }
    const segLen = totalLen[seg+1] - totalLen[seg];
    const segT = segLen > 0 ? (targetLen - totalLen[seg]) / segLen : 0;
    const bx = points[seg][0] + (points[seg+1][0] - points[seg][0]) * segT;
    const by = points[seg][1] + (points[seg+1][1] - points[seg][1]) * segT;

    const radius = 3 + t * 6; // 3px tail → 9px head
    const alpha = 0.3 + t * 0.7; // dim tail → bright head
    s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${radius.toFixed(1)}" fill="#0fff95" opacity="${alpha.toFixed(2)}"/>`;
    // Glow on head balls
    if (t > 0.8) {
      s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${(radius*2).toFixed(1)}" fill="#0fff95" opacity="0.1"/>`;
    }
  }
  return s;
}

function genA() {
  // 7 cols, 7 rows grid with a diagonal channel from bottom-left to top-right
  // Channel goes through cells that are left empty
  const cols = 7, rows = 7, pad = 16, gap = 8;
  const bw = (SIZE - pad * 2 - gap * (cols - 1)) / cols;
  const bh = bw;
  const startY = 16;

  // Define which cells to skip for the diagonal channel
  // Channel goes roughly from (col=0,row=6) to (col=6,row=0)
  const skipSet = new Set();
  // Main diagonal + one adjacent cell for width
  const channelCells = [
    [0,6],[1,6], [1,5],[2,5], [2,4],[3,4], [3,3],[4,3], [4,2],[5,2], [5,1],[6,1], [6,0]
  ];
  for (const [c,r] of channelCells) {
    skipSet.add(r * cols + c);
  }

  let blocks = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (skipSet.has(idx)) continue;
      const x = pad + c * (bw + gap);
      const y = startY + r * (bh + gap);
      const color = colors[(r * 3 + c * 2) % colors.length];
      const hp = 10 + ((r * cols + c) * 7) % 90;
      blocks += block(x, y, bw, bh, color, hp);
    }
  }

  // Ball trail waypoints through the channel (in gap centers)
  function cellCenter(c, r) {
    return [pad + c * (bw + gap) + bw/2, startY + r * (bh + gap) + bh/2];
  }
  const trailPoints = [
    cellCenter(0.5, 6.5),
    cellCenter(1.5, 5.5),
    cellCenter(2.5, 4.5),
    cellCenter(3.5, 3.5),
    cellCenter(4.5, 2.5),
    cellCenter(5.5, 1.5),
    cellCenter(6.5, 0.5),
  ];

  const balls = ballTrail(trailPoints, 18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
    ${blocks}${balls}
  </svg>`;
}

// Generate only A for now
const svgPath = path.join(__dirname, 'thumb_A.svg');
const pngPath = path.join(__dirname, 'thumb_A.png');
fs.writeFileSync(svgPath, genA());
execSync(`convert "${svgPath}" "${pngPath}"`);
fs.unlinkSync(svgPath);
console.log('Generated thumb_A.png');
