const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

/**
 * Search music from Zing MP3 API (unofficial)
 * Format: title | artists | source | thumbnailUrl
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || !q.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Vui lòng nhập từ khóa tìm kiếm' 
      });
    }

    console.log('🎵 Searching music:', q);

    try {
      // Try Zing MP3 API (unofficial)
      const zingApiUrl = `https://zingmp3.vn/api/search?q=${encodeURIComponent(q)}&type=song&page=1&count=${limit}`;
      
      const response = await axios.get(zingApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://zingmp3.vn/'
        },
        timeout: 10000
      });

      if (response.data && response.data.data && response.data.data.items) {
        const songs = response.data.data.items.map(item => ({
          id: item.encodeId || item.id,
          title: item.title || 'Unknown Title',
          artists: item.artistsNames || item.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
          source: 'zingmp3',
          thumbnailUrl: item.thumbnail || item.thumbnailM || item.thumbnailR || null,
          duration: item.duration || null,
          listen: item.listen || null,
          viewCount: item.viewCount || null,
          like: item.like || null,
          comment: item.comment || null,
          share: item.share || null,
          publishedTime: item.releaseDate || null,
          rank: item.rank || null,
          userAvatar: null
        }));

        return res.json({
          success: true,
          songs,
          total: songs.length
        });
      }
    } catch (zingError) {
      console.warn('Zing MP3 API failed, trying alternative:', zingError.message);
    }

    // Fallback: Return mock data or use alternative API
    // For now, return a simple response with the search query
    const mockSongs = [
      {
        id: `song_${Date.now()}_1`,
        title: q,
        artists: 'Unknown Artist',
        source: 'local',
        thumbnailUrl: null,
        duration: null,
        listen: null,
        viewCount: null,
        like: null,
        comment: null,
        share: null,
        publishedTime: null,
        rank: null,
        userAvatar: null
      }
    ];

    res.json({
      success: true,
      songs: mockSongs,
      total: mockSongs.length,
      message: 'Using fallback search (API integration needed)'
    });

  } catch (error) {
    console.error('❌ Error searching music:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi tìm kiếm nhạc',
      error: error.message 
    });
  }
});

/**
 * Get music info by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // This would fetch detailed music info
    // For now, return a simple response
    res.json({
      success: true,
      song: {
        id,
        title: 'Unknown Title',
        artists: 'Unknown Artist',
        source: 'zingmp3',
        thumbnailUrl: null
      }
    });
  } catch (error) {
    console.error('❌ Error getting music info:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi server khi lấy thông tin nhạc' 
    });
  }
});

module.exports = router;

