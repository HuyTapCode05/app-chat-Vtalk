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
      
      console.log('🎵 Calling Zing MP3 API:', zingApiUrl);
      
      const response = await axios.get(zingApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://zingmp3.vn/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000
      });

      console.log('🎵 Zing MP3 API response status:', response.status);
      console.log('🎵 Zing MP3 API response data keys:', Object.keys(response.data || {}));

      if (response.data && response.data.data && response.data.data.items) {
        console.log('✅ Found', response.data.data.items.length, 'songs from Zing MP3');
        const songs = await Promise.all(response.data.data.items.map(async (item) => {
          // Try to get audio URL from Zing MP3
          let audioUrl = null;
          const songId = item.encodeId || item.id;
          
          if (songId) {
            try {
              // Get song detail to get audio URL
              const detailUrl = `https://zingmp3.vn/api/song/info?id=${songId}`;
              const detailResponse = await axios.get(detailUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Referer': 'https://zingmp3.vn/'
                },
                timeout: 5000
              });
              
              if (detailResponse.data && detailResponse.data.data) {
                // Zing MP3 audio URL format - try different paths
                const streaming = detailResponse.data.data.streaming;
                audioUrl = streaming?.mp3?.['128'] || 
                          streaming?.mp3?.['320'] ||
                          streaming?.mp3?.['lossless'] ||
                          streaming?.mp3?.['m4a']?.['128'] ||
                          streaming?.mp3?.['m4a']?.['320'] ||
                          streaming?.mp4?.['128'] ||
                          streaming?.mp4?.['320'] ||
                          null;
                
                // Alternative: try to construct URL from encodeId
                if (!audioUrl && songId) {
                  // Zing MP3 streaming URL format: https://zingmp3.vn/api/v2/song/get/streaming?id={encodeId}
                  audioUrl = `https://zingmp3.vn/api/v2/song/get/streaming?id=${songId}`;
                }
                
                console.log('🎵 Audio URL for song', songId, ':', audioUrl ? 'Found' : 'Not found');
              }
            } catch (detailError) {
              console.warn('Could not get audio URL for song:', songId, detailError.message);
            }
          }
          
          return {
            id: songId,
            title: item.title || 'Unknown Title',
            artists: item.artistsNames || item.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
            source: 'zingmp3',
            thumbnailUrl: item.thumbnail || item.thumbnailM || item.thumbnailR || null,
            audioUrl: audioUrl, // Add audio URL for playback
            duration: item.duration || null,
            listen: item.listen || null,
            viewCount: item.viewCount || null,
            like: item.like || null,
            comment: item.comment || null,
            share: item.share || null,
            publishedTime: item.releaseDate || null,
            rank: item.rank || null,
            userAvatar: null
          };
        }));

        return res.json({
          success: true,
          songs,
          total: songs.length
        });
      }
    } catch (zingError) {
      console.error('❌ Zing MP3 API failed:', {
        message: zingError.message,
        code: zingError.code,
        status: zingError.response?.status,
        statusText: zingError.response?.statusText,
        data: zingError.response?.data
      });
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
 * Get music info and audio URL by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'search') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid music ID' 
      });
    }
    
    try {
      // Get song detail from Zing MP3
      const detailUrl = `https://zingmp3.vn/api/song/info?id=${id}`;
      const detailResponse = await axios.get(detailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://zingmp3.vn/'
        },
        timeout: 10000
      });
      
      if (detailResponse.data && detailResponse.data.data) {
        const songData = detailResponse.data.data;
        const audioUrl = songData.streaming?.mp3?.['128'] || 
                        songData.streaming?.mp3?.['320'] ||
                        songData.streaming?.mp3?.['lossless'] ||
                        null;
        
        return res.json({
          success: true,
          song: {
            id: songData.encodeId || id,
            title: songData.title || 'Unknown Title',
            artists: songData.artistsNames || songData.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
            source: 'zingmp3',
            thumbnailUrl: songData.thumbnail || songData.thumbnailM || songData.thumbnailR || null,
            audioUrl: audioUrl,
            duration: songData.duration || null
          }
        });
      }
    } catch (apiError) {
      console.warn('Zing MP3 API failed for song ID:', id, apiError.message);
    }
    
    // Fallback
    res.json({
      success: true,
      song: {
        id,
        title: 'Unknown Title',
        artists: 'Unknown Artist',
        source: 'zingmp3',
        thumbnailUrl: null,
        audioUrl: null
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

