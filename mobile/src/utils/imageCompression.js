import * as ImageManipulator from 'expo-image-manipulator';

class ImageCompression {
  constructor() {
    this.maxWidth = 1920;
    this.maxHeight = 1920;
    this.quality = 0.85;
    this.maxFileSize = 2 * 1024 * 1024;
  }

  async compressImage(uri, options = {}) {
    try {
      const {
        maxWidth = this.maxWidth,
        maxHeight = this.maxHeight,
        quality = this.quality,
        compressFormat = ImageManipulator.SaveFormat.JPEG
      } = options;

      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight,
            },
          },
        ],
        {
          compress: quality,
          format: compressFormat,
        }
      );

      return {
        uri: manipResult.uri,
        width: manipResult.width,
        height: manipResult.height,
        success: true
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      return {
        uri,
        success: false,
        error: error.message
      };
    }
  }

  async compressImages(uris, options = {}) {
    const promises = uris.map(uri => this.compressImage(uri, options));
    return Promise.all(promises);
  }

  async getImageDimensions(uri) {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { format: ImageManipulator.SaveFormat.PNG }
      );
      
      return {
        width: manipResult.width,
        height: manipResult.height
      };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return null;
    }
  }
}

const imageCompression = new ImageCompression();
export default imageCompression;

