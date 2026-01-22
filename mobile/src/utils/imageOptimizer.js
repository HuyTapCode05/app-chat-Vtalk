import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IMAGE_CACHE_KEY = '@vtalk:image_cache';
const MAX_CACHE_SIZE = 50 * 1024 * 1024;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

class ImageOptimizer {
  constructor() {
    this.cache = new Map();
    this.loadingImages = new Set();
    this.cacheSize = 0;
  }

  async loadImage(uri, options = {}) {
    if (!uri) return null;

    const cached = this.cache.get(uri);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.uri;
    }

    if (this.loadingImages.has(uri)) {
      return uri;
    }

    this.loadingImages.add(uri);
    
    try {
      await Image.prefetch(uri);
      
      this.cache.set(uri, {
        uri,
        expiresAt: Date.now() + CACHE_EXPIRY,
        cachedAt: Date.now()
      });

      return uri;
    } catch (error) {
      console.warn('Error loading image:', uri, error);
      return uri;
    } finally {
      this.loadingImages.delete(uri);
    }
  }

  async preloadImages(uris) {
    const promises = uris.map(uri => this.loadImage(uri));
    await Promise.all(promises);
  }

  clearCache() {
    this.cache.clear();
    this.cacheSize = 0;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      loading: this.loadingImages.size
    };
  }
}

const imageOptimizer = new ImageOptimizer();
export default imageOptimizer;

