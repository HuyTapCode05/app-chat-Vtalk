const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const storage = require('../storage/dbStorage');
const path = require('path');

// @route   POST /api/stories
// @desc    Tạo story mới
// @access  Private
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { type, content, backgroundColor, textColor } = req.body;
    
    console.log('📱 Creating story:', {
      userId: req.user.id,
      type,
      content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
      hasMedia: !!req.file,
      backgroundColor,
      textColor
    });

    // Validate story type
    if (!['text', 'image', 'video'].includes(type)) {
      return res.status(400).json({ message: 'Loại story không hợp lệ' });
    }

    // Validate content based on type
    if (type === 'text' && !content?.trim()) {
      return res.status(400).json({ message: 'Nội dung story text không được trống' });
    }

    if ((type === 'image' || type === 'video') && !req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file media cho story' });
    }

    // Prepare story data
    const storyData = {
      userId: req.user.id,
      type,
      content: content?.trim() || null,
      backgroundColor: backgroundColor || null,
      textColor: textColor || null
    };

    // Add media URL if file uploaded
    if (req.file) {
      storyData.mediaUrl = `/uploads/${req.file.filename}`;
    }

    // Create story
    const story = await storage.stories.create(storyData);

    console.log('✅ Story created successfully:', story.id);

    res.status(201).json({
      success: true,
      story: {
        ...story,
        author: {
          id: req.user.id,
          fullName: req.user.fullName,
          username: req.user.username,
          avatar: req.user.avatar
        }
      }
    });
  } catch (error) {
    console.error('❌ Error creating story:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo story' });
  }
});

// @route   GET /api/stories
// @desc    Lấy danh sách stories của friends
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('📱 Getting friends stories for user:', req.user.id);

    // Get friends' stories
    const friendsStories = await storage.stories.getFriendsStories(req.user.id);
    
    // Get user's own stories
    const myStories = await storage.stories.getUserStoriesWithViews(req.user.id);

    // Group stories by user
    const storiesGrouped = {};
    
    // Add user's own stories first
    if (myStories.length > 0) {
      storiesGrouped[req.user.id] = {
        user: {
          id: req.user.id,
          fullName: req.user.fullName,
          username: req.user.username,
          avatar: req.user.avatar
        },
        stories: myStories,
        isOwn: true
      };
    }

    // Group friends' stories by user
    friendsStories.forEach(story => {
      if (!storiesGrouped[story.userId]) {
        storiesGrouped[story.userId] = {
          user: story.author,
          stories: [],
          isOwn: false
        };
      }
      storiesGrouped[story.userId].stories.push(story);
    });

    // Convert to array and sort by latest story
    const storiesArray = Object.values(storiesGrouped).map(group => ({
      ...group,
      latestStoryTime: Math.max(...group.stories.map(s => new Date(s.createdAt).getTime())),
      hasUnviewedStories: group.isOwn ? false : group.stories.some(s => !s.viewedByMe)
    })).sort((a, b) => {
      // Own stories first, then by latest story time
      if (a.isOwn && !b.isOwn) return -1;
      if (!a.isOwn && b.isOwn) return 1;
      return b.latestStoryTime - a.latestStoryTime;
    });

    console.log(`✅ Retrieved ${storiesArray.length} users with stories`);

    res.json({
      success: true,
      stories: storiesArray
    });
  } catch (error) {
    console.error('❌ Error getting stories:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy stories' });
  }
});

// @route   GET /api/stories/user/:userId
// @desc    Lấy stories của một user cụ thể
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📱 Getting stories for user:', userId, 'by:', req.user.id);

    // Check if requesting own stories or friend's stories
    const isOwn = userId === req.user.id;
    let stories = [];

    if (isOwn) {
      stories = await storage.stories.getUserStoriesWithViews(userId);
    } else {
      // Check if users are friends
      const areFriends = await storage.friends.areFriends(req.user.id, userId);
      if (!areFriends) {
        return res.status(403).json({ message: 'Chỉ có thể xem stories của bạn bè' });
      }

      stories = await storage.stories.getStoriesByUserId(userId);
    }

    // Get user info
    const user = await storage.users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    console.log(`✅ Retrieved ${stories.length} stories for user ${userId}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatar: user.avatar
      },
      stories,
      isOwn
    });
  } catch (error) {
    console.error('❌ Error getting user stories:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy stories của người dùng' });
  }
});

// @route   POST /api/stories/:id/view
// @desc    Đánh dấu đã xem story
// @access  Private
router.post('/:id/view', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('👀 Viewing story:', id, 'by user:', req.user.id);

    // Check if story exists
    const story = await storage.stories.findById(id);
    if (!story) {
      return res.status(404).json({ message: 'Story không tồn tại hoặc đã hết hạn' });
    }

    // Don't track view if it's user's own story
    if (story.userId === req.user.id) {
      return res.json({ success: true, message: 'Own story viewed' });
    }

    // Add view
    await storage.storyViews.addView(id, req.user.id);

    console.log('✅ Story view recorded');

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error viewing story:', error);
    res.status(500).json({ message: 'Lỗi server khi đánh dấu xem story' });
  }
});

// @route   GET /api/stories/:id/viewers
// @desc    Lấy danh sách người đã xem story
// @access  Private
router.get('/:id/viewers', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('👥 Getting story viewers for:', id);

    // Check if story exists and belongs to user
    const story = await storage.stories.findById(id);
    if (!story) {
      return res.status(404).json({ message: 'Story không tồn tại hoặc đã hết hạn' });
    }

    if (story.userId !== req.user.id) {
      return res.status(403).json({ message: 'Chỉ có thể xem viewers của story của bạn' });
    }

    // Get viewers
    const viewers = await storage.storyViews.getStoryViewers(id);

    console.log(`✅ Retrieved ${viewers.length} viewers for story ${id}`);

    res.json({
      success: true,
      viewers
    });
  } catch (error) {
    console.error('❌ Error getting story viewers:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách người xem' });
  }
});

// @route   DELETE /api/stories/:id
// @desc    Xóa story
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting story:', id, 'by user:', req.user.id);

    // Check if story exists and belongs to user
    const story = await storage.stories.findById(id);
    if (!story) {
      return res.status(404).json({ message: 'Story không tồn tại hoặc đã hết hạn' });
    }

    if (story.userId !== req.user.id) {
      return res.status(403).json({ message: 'Chỉ có thể xóa story của bạn' });
    }

    // Delete story
    await storage.stories.delete(id);

    console.log('✅ Story deleted successfully');

    res.json({ success: true, message: 'Đã xóa story' });
  } catch (error) {
    console.error('❌ Error deleting story:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa story' });
  }
});

// @route   POST /api/stories/cleanup
// @desc    Xóa stories đã hết hạn (cron job endpoint)
// @access  Private (admin only)
router.post('/cleanup', auth, async (req, res) => {
  try {
    console.log('🧹 Cleaning up expired stories...');

    const deletedCount = await storage.stories.deleteExpiredStories();

    console.log(`✅ Deleted ${deletedCount} expired stories`);

    res.json({
      success: true,
      message: `Đã xóa ${deletedCount} stories hết hạn`
    });
  } catch (error) {
    console.error('❌ Error cleaning up stories:', error);
    res.status(500).json({ message: 'Lỗi server khi dọn dẹp stories' });
  }
});

module.exports = router;