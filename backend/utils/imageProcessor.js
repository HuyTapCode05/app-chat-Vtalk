const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessor {
  constructor() {
    this.maxWidth = 1920;
    this.maxHeight = 1920;
    this.quality = 85;
    this.maxFileSize = 2 * 1024 * 1024;
  }

  async processImage(inputPath, outputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      const needsResize = metadata.width > this.maxWidth || metadata.height > this.maxHeight;
      let pipeline = sharp(inputPath);
      
      if (needsResize) {
        pipeline = pipeline.resize(this.maxWidth, this.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      await pipeline
        .jpeg({ quality: this.quality, mozjpeg: true })
        .toFile(outputPath);

      const stats = await fs.stat(outputPath);
      if (stats.size > this.maxFileSize) {
        await this.compressFurther(outputPath);
      }

      return {
        success: true,
        originalSize: metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : 'unknown',
        processed: true
      };
    } catch (error) {
      console.error('Error processing image:', error);
      await fs.copyFile(inputPath, outputPath);
      return {
        success: false,
        error: error.message,
        processed: false
      };
    }
  }

  async compressFurther(filePath) {
    let quality = this.quality;
    
    while (quality > 50) {
      quality -= 10;
      const tempPath = filePath + '.temp';
      await sharp(filePath)
        .jpeg({ quality, mozjpeg: true })
        .toFile(tempPath);
      
      const stats = await fs.stat(tempPath);
      if (stats.size <= this.maxFileSize) {
        await fs.rename(tempPath, filePath);
        return;
      }
      await fs.unlink(tempPath);
    }
  }

  async generateThumbnail(inputPath, outputPath, size = 200) {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toFile(outputPath);
      return true;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return false;
    }
  }
}

const imageProcessor = new ImageProcessor();
module.exports = imageProcessor;

