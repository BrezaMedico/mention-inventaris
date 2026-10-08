const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG with high aesthetic MENTION emblem centered with dark rounded backdrop & gold glow
function generateSvg(size) {
  // Scaling emblem: original viewBox is approx 70x74. We scale it to ~60% of canvas size.
  const emblemSize = size * 0.58;
  const offset = (size - emblemSize) / 2;
  const scale = emblemSize / 70;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14151a" />
      <stop offset="50%" stop-color="#090a0d" />
      <stop offset="100%" stop-color="#050506" />
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FACC15" stop-opacity="0.3" />
      <stop offset="60%" stop-color="#FACC15" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <filter id="neon" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#FACC15" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Background with subtle squircle shape -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bgGrad)" />
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${size * 0.22}" fill="none" stroke="#FACC15" stroke-opacity="0.25" stroke-width="${Math.max(1.5, size * 0.008)}" />
  
  <!-- Ambient Center Glow -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.42}" fill="url(#glowGrad)" />

  <!-- MENTION Brand Emblem -->
  <g transform="translate(${offset}, ${offset}) scale(${scale})" filter="url(#neon)">
    <!-- Outer Hexagon -->
    <path d="M35 5 L65 22 L65 52 L35 69 L5 52 L5 22 Z" fill="#FACC15" stroke="#FACC15" stroke-width="2"/>
    <!-- Inner Dark Hexagon -->
    <path d="M35 16 L53 27 L53 47 L35 58 L17 47 L17 27 Z" fill="#090A0D"/>
    <!-- Central dynamic M line -->
    <path d="M22 47 L22 30 L35 43 L48 30 L48 47" fill="none" stroke="#FACC15" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;
}

async function run() {
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of sizes) {
    const svgContent = Buffer.from(generateSvg(size));
    const targetPath = path.join(iconsDir, name);
    await sharp(svgContent)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(targetPath);
    console.log(`Generated ${name} (${size}x${size})`);
  }

  // Also save master SVG
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), generateSvg(512), 'utf-8');
  console.log('Generated icon.svg');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
