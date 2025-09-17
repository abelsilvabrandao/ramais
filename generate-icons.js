const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Process the icon
async function generateIcons() {
    try {
        const inputFile = path.join(__dirname, 'icone.png');
        
        for (const size of iconSizes) {
            const outputFile = path.join(iconsDir, `icon-${size}x${size}.png`);
            
            await sharp(inputFile)
                .resize(size, size)
                .toFile(outputFile);
                
            console.log(`Generated ${outputFile}`);
        }
        
        console.log('\n✅ All icons generated successfully!');
        console.log('Icons saved in the "icons" directory.');
    } catch (error) {
        console.error('Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
