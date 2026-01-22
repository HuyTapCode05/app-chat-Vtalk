/**
 * Simple Icon Setup Script
 * Copy và rename icon_vtalk.png thành các icon files cần thiết
 * 
 * Usage: node scripts/setup-icons-simple.js
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');
const sourceFile = path.join(assetsDir, 'icon_vtalk.png');

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
  console.error('❌ icon_vtalk.png not found in assets/ folder');
  process.exit(1);
}

console.log('📱 Setting up icons from icon_vtalk.png...');

try {
  // Read source file
  const sourceBuffer = fs.readFileSync(sourceFile);
  
  // 1. Copy to icon.png (main icon)
  const iconPath = path.join(assetsDir, 'icon.png');
  fs.writeFileSync(iconPath, sourceBuffer);
  console.log('✅ Created icon.png');

  // 2. Copy to adaptive-icon.png (Android adaptive icon)
  const adaptiveIconPath = path.join(assetsDir, 'adaptive-icon.png');
  fs.writeFileSync(adaptiveIconPath, sourceBuffer);
  console.log('✅ Created adaptive-icon.png');

  // 3. Copy to splash.png (splash screen - sẽ được resize bởi Expo)
  const splashPath = path.join(assetsDir, 'splash.png');
  fs.writeFileSync(splashPath, sourceBuffer);
  console.log('✅ Created splash.png');

  // 4. Copy to notification-icon.png (notification icon)
  const notificationIconPath = path.join(assetsDir, 'notification-icon.png');
  fs.writeFileSync(notificationIconPath, sourceBuffer);
  console.log('✅ Created notification-icon.png');

  console.log('\n🎉 All icon files created!');
  console.log('📝 Note: Expo sẽ tự động resize các icons khi build');
  console.log('📝 Next steps:');
  console.log('1. Review icons in assets/ folder');
  console.log('2. Run: npx expo prebuild');
  console.log('3. Test: npx expo run:android or npx expo run:ios');

} catch (error) {
  console.error('❌ Error setting up icons:', error);
  process.exit(1);
}

