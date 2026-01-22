/**
 * Icon Generation Script
 * Helper script để generate icons từ logo source với resize đúng kích thước
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Note: Tự động tìm icon_vtalk.png, logo-source.png, hoặc logo.png trong assets/
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Sharp not installed. Install with: npm install sharp');
  console.log('📝 Manual steps:');
  console.log('1. Open logo in image editor');
  console.log('2. Export icon.png (1024x1024)');
  console.log('3. Export adaptive-icon.png (1024x1024, safe area 832x832)');
  console.log('4. Export splash.png (2048x2048)');
  console.log('5. Export notification-icon.png (96x96 white icon)');
  process.exit(1);
}

const assetsDir = path.join(__dirname, '../assets');
// Try multiple possible source file names
const possibleSources = [
  'icon_vtalk.png',
  'logo-source.png',
  'logo.png',
  'icon.png'
];

let sourceFile = null;
for (const filename of possibleSources) {
  const filePath = path.join(assetsDir, filename);
  if (fs.existsSync(filePath)) {
    sourceFile = filePath;
    console.log(`✅ Found source file: ${filename}`);
    break;
  }
}

// Check if source file exists
if (!sourceFile) {
  console.error('❌ Logo source file not found. Tried:', possibleSources.join(', '));
  console.log('📝 Please add your logo as one of these files in assets/ folder');
  process.exit(1);
}

async function generateIcons() {
  console.log('🎨 Generating app icons from logo...');

  try {
    // Read source image
    const source = sharp(sourceFile);
    const metadata = await source.metadata();
    console.log(`✅ Source image: ${metadata.width}x${metadata.height}`);

    // 1. Generate icon.png (1024x1024)
    console.log('📱 Generating icon.png (1024x1024)...');
    await source
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 177, b: 79, alpha: 1 } // #00B14F
      })
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    console.log('✅ icon.png created');

    // 2. Generate adaptive-icon.png (1024x1024 with safe area)
    console.log('📱 Generating adaptive-icon.png (1024x1024)...');
    await source
      .resize(832, 832, { fit: 'contain' })
      .extend({
        top: 96,
        bottom: 96,
        left: 96,
        right: 96,
        background: { r: 0, g: 177, b: 79, alpha: 1 } // #00B14F
      })
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));
    console.log('✅ adaptive-icon.png created');

    // 3. Generate splash.png (2048x2048)
    console.log('📱 Generating splash.png (2048x2048)...');
    await source
      .resize(1536, 1536, { fit: 'contain' })
      .extend({
        top: 256,
        bottom: 256,
        left: 256,
        right: 256,
        background: { r: 0, g: 177, b: 79, alpha: 1 } // #00B14F
      })
      .png()
      .toFile(path.join(assetsDir, 'splash.png'));
    console.log('✅ splash.png created');

    // 4. Generate notification-icon.png (192x192 white icon for better quality)
    console.log('📱 Generating notification-icon.png (192x192)...');
    // Create white version for notification (larger size for better quality)
    await source
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .greyscale()
      .png()
      .toFile(path.join(assetsDir, 'notification-icon.png'));
    console.log('✅ notification-icon.png created');

    console.log('\n🎉 All icons generated successfully!');
    console.log('📝 Next steps:');
    console.log('1. Review generated icons in assets/ folder');
    console.log('2. Adjust if needed (especially notification-icon.png)');
    console.log('3. Run: npx expo prebuild');
    console.log('4. Test: npx expo run:android or npx expo run:ios');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

