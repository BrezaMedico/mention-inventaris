const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourcePath = 'C:/Users/USER/.gemini/antigravity-ide/brain/cabf7b7b-eaad-4dbc-b6ed-ece30f7d6cc8/.user_uploaded/media_1791426518517.png';
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
const appDir = path.join(__dirname, '..', 'app');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function run() {
  console.log('Processing new MENTION icon from uploaded image...');

  // 1. Copy raw high-res icon to public/icon.png (transparent)
  await sharp(sourcePath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon.png'));
  console.log('Created public/icon.png (512x512)');

  // 2. Next.js App Router favicon / tab icons:
  // app/icon.png is automatically used by Next.js as the favicon!
  await sharp(sourcePath)
    .resize(64, 64)
    .png()
    .toFile(path.join(appDir, 'icon.png'));
  console.log('Created app/icon.png (64x64 favicon)');

  // 3. Apple Touch Icon for iOS (180x180):
  // iOS Safari requires a solid background. Center the yellow emblem on #070708 with safe padding.
  const emblemForApple = await sharp(sourcePath)
    .resize(130, 130)
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 7, g: 7, b: 8, alpha: 1 },
    },
  })
    .composite([{ input: emblemForApple, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Created public/icons/apple-touch-icon.png');

  // Also copy to app/apple-icon.png for Next.js metadata
  fs.copyFileSync(
    path.join(iconsDir, 'apple-touch-icon.png'),
    path.join(appDir, 'apple-icon.png')
  );

  // 4. PWA Standard Icons: 192x192 & 512x512
  // We create both transparent and padded versions on dark background for best home screen look.
  const emblem192 = await sharp(sourcePath).resize(144, 144).toBuffer();
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 7, g: 7, b: 8, alpha: 1 },
    },
  })
    .composite([{ input: emblem192, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('Created public/icons/icon-192.png');

  const emblem512 = await sharp(sourcePath).resize(390, 390).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 7, g: 7, b: 8, alpha: 1 },
    },
  })
    .composite([{ input: emblem512, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('Created public/icons/icon-512.png');

  // Transparent standalone 192 & 512
  await sharp(sourcePath)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-transparent-192.png'));

  await sharp(sourcePath)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-transparent-512.png'));

  console.log('All icons successfully generated!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
