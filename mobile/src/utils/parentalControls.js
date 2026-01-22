import AsyncStorage from '@react-native-async-storage/async-storage';

const PARENTAL_KEY = '@vtalk:parental_controls';
const CONTENT_FILTER_KEY = '@vtalk:content_filter';
const SCREEN_TIME_KEY = '@vtalk:screen_time';

const SENSITIVE_KEYWORDS = [
  'địt', 'đụ', 'lồn', 'buồi', 'cặc', 'đéo', 'mẹ', 'bố', 'chết', 'giết',
];

class ParentalControls {
  constructor() {
    this.settings = {
      requireApproval: true,
      contentFilter: true,
      screenTimeLimit: null,
      blockedKeywords: SENSITIVE_KEYWORDS
    };
  }

  async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(PARENTAL_KEY);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading parental settings:', error);
    }
  }

  async saveSettings(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      await AsyncStorage.setItem(PARENTAL_KEY, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Error saving parental settings:', error);
      return false;
    }
  }

  requiresApproval() {
    return this.settings.requireApproval === true;
  }

  isContentFilterEnabled() {
    return this.settings.contentFilter === true;
  }

  filterContent(text) {
    if (!this.isContentFilterEnabled() || !text) {
      return { filtered: text, hasSensitive: false };
    }

    let filtered = text;
    let hasSensitive = false;

    this.settings.blockedKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        hasSensitive = true;
        const regex = new RegExp(keyword, 'gi');
        filtered = filtered.replace(regex, '***');
      }
    });

    return { filtered, hasSensitive };
  }

  isWithinScreenTimeLimit() {
    if (!this.settings.screenTimeLimit) {
      return true;
    }

    const { start, end } = this.settings.screenTimeLimit;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    } else {
      return currentTime >= startTime && currentTime < endTime;
    }
  }

  getScreenTimeStatus() {
    const isAllowed = this.isWithinScreenTimeLimit();
    const { start, end } = this.settings.screenTimeLimit || {};

    return {
      isAllowed,
      limit: this.settings.screenTimeLimit,
      message: isAllowed 
        ? null 
        : `Thời gian sử dụng bị giới hạn từ ${start} đến ${end}. Vui lòng thử lại sau.`
    };
  }
}

const parentalControls = new ParentalControls();
export default parentalControls;

