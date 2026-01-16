const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, 'public', 'icons');

const sizes = [32, 192, 512];

async function generateIcons() {
  console.log('🎨 Génération des icônes PWA...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Icône ${size}x${size} créée`);
    } catch (error) {
      console.error(`❌ Erreur pour ${size}x${size}:`, error);
    }
  }
  
  console.log('🎉 Toutes les icônes ont été générées !');
}

generateIcons();
