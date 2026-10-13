import sharp from "sharp";
import fs from "fs";
import path from "path";

const sourceLogo = path.resolve("public/brand/building_logo.png");
const outputDir = path.resolve("public/icons");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log("Generating PWA icons from", sourceLogo);

  // Standard square with padded logo on navy background (#123B6D)
  const sizes = [
    { name: "icon-192x192.png", size: 192, padRatio: 0.75, bg: { r: 18, g: 59, b: 109, alpha: 1 } },
    { name: "icon-512x512.png", size: 512, padRatio: 0.75, bg: { r: 18, g: 59, b: 109, alpha: 1 } },
    { name: "icon-maskable-192x192.png", size: 192, padRatio: 0.65, bg: { r: 18, g: 59, b: 109, alpha: 1 } },
    { name: "icon-maskable-512x512.png", size: 512, padRatio: 0.65, bg: { r: 18, g: 59, b: 109, alpha: 1 } },
    { name: "apple-touch-icon.png", size: 180, padRatio: 0.75, bg: { r: 18, g: 59, b: 109, alpha: 1 } },
    { name: "favicon-32x32.png", size: 32, padRatio: 0.85, bg: { r: 18, g: 59, b: 109, alpha: 1 } },
    { name: "favicon-16x16.png", size: 16, padRatio: 0.85, bg: { r: 18, g: 59, b: 109, alpha: 1 } },
  ];

  for (const item of sizes) {
    const targetSize = item.size;
    const logoSize = Math.round(targetSize * item.padRatio);

    // Resize the logo preserving aspect ratio
    const resizedLogoBuffer = await sharp(sourceLogo)
      .resize(logoSize, logoSize, { fit: "inside" })
      .toBuffer();

    // Composite onto background square
    const finalIcon = await sharp({
      create: {
        width: targetSize,
        height: targetSize,
        channels: 4,
        background: item.bg,
      },
    })
      .composite([{ input: resizedLogoBuffer, gravity: "center" }])
      .png()
      .toFile(path.join(outputDir, item.name));

    console.log(`Generated ${item.name} (${targetSize}x${targetSize})`);
  }

  console.log("All PWA icons generated successfully.");
}

generateIcons().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
