const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const SIZE = 512;
const BG = '#0f0f1e';

// Block grid
const cols = 5, rows = 4;
const pad = 30, gap = 8;
const bw = (SIZE - pad * 2 - gap * (cols - 1)) / cols;
const bh = bw;
const startY = 50;
const colors = ['#0fff95', '#1a8fff', '#6c3ce0', '#ff6b35', '#ffaa00'];

let blocks = '';
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    // Pseudo-random gaps using a deterministic pattern
    if ((r * 7 + c * 3) % 5 === 0) continue;
    const x = pad + c * (bw + gap);
    const y = startY + r * (bh + gap);
    const color = colors[(r * 3 + c * 2) % colors.length];
    const hp = 10 + ((r * cols + c) * 7) % 80;
    blocks += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="${color}"/>`;
    blocks += `<text x="${x + bw/2}" y="${y + bh/2 + 2}" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="bold" font-size="26" fill="white">${hp}</text>`;
  }
}

// Balls
let balls = '';
const ballPositions = [[100,340],[180,360],[260,335],[340,355],[420,345],[150,380],[300,375],[400,365]];
for (const [bx, by] of ballPositions) {
  balls += `<circle cx="${bx}" cy="${by}" r="8" fill="#0fff95"/>`;
}

// Title
const title = `
<text x="${SIZE/2}" y="${SIZE - 100}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="54" fill="#0fff95">NEON</text>
<text x="${SIZE/2}" y="${SIZE - 45}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="54" fill="#0fff95">BARRAGE</text>
`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
  ${blocks}
  ${balls}
  ${title}
</svg>`;

const svgPath = path.join(__dirname, 'thumbnail.svg');
const pngPath = path.join(__dirname, 'thumbnail.png');

fs.writeFileSync(svgPath, svg);
execSync(`convert "${svgPath}" "${pngPath}"`);
fs.unlinkSync(svgPath);
console.log('thumbnail.png generated');
