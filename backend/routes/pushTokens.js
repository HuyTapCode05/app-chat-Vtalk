/**
 * Push Token API Routes
 * Quản lý Expo push tokens
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pushTokenStorage = require('../storage/pushTokenStorage');

// @route   POST /api/push-tokens
// @desc    Save push token
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { expoPushToken, platform, deviceId } = req.body;
    
    if (!expoPushToken) {
      return res.status(400).json({ message: 'expoPushToken is required' });
    }

    await pushTokenStorage.saveToken(req.user.id, expoPushToken, platform, deviceId);
    
    res.json({ message: 'Push token saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/push-tokens
// @desc    Remove push token
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const { deviceId } = req.body;
    await pushTokenStorage.removeToken(req.user.id, deviceId);
    res.json({ message: 'Push token removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

