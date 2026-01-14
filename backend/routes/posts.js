const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const storage = require('../storage/dbStorage');
const upload = require('../middleware/upload');

// @route   POST /api/posts
// @desc    Tạo bài viết mới
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Nội dung hoặc ảnh không được để trống' });
    }

    const post = await storage.posts.create({
      authorId: req.user.id,
      content: content || null,
      image: imageUrl || null,
      likes: []
    });

    const postWithAuthor = await storage.posts.findById(post.id);
    res.status(201).json(postWithAuthor);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/posts/user/:userId
// @desc    Lấy danh sách bài viết của một user
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await storage.posts.getPostsByUserId(userId);
    res.json(posts);
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/posts/:id
// @desc    Lấy một bài viết
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await storage.posts.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    res.json(post);
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   PUT /api/posts/:id/like
// @desc    Like/Unlike bài viết
// @access  Private
router.put('/:id/like', auth, async (req, res) => {
  try {
    const post = await storage.posts.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    const likes = post.likes || [];
    const userId = req.user.id;
    const likeIndex = likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      likes.splice(likeIndex, 1);
    } else {
      // Like
      likes.push(userId);
    }

    const updatedPost = await storage.posts.update(req.params.id, { likes });
    res.json(updatedPost);
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   GET /api/posts/:id/comments
// @desc    Lấy danh sách bình luận của bài viết
// @access  Private
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const comments = await storage.comments.getCommentsByPostId(req.params.id);
    res.json(comments);
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   POST /api/posts/:id/comments
// @desc    Thêm bình luận vào bài viết
// @access  Private
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung bình luận không được để trống' });
    }

    const comment = await storage.comments.create({
      postId: req.params.id,
      authorId: req.user.id,
      content: content.trim()
    });

    const commentWithAuthor = await storage.comments.findById(comment.id);
    res.status(201).json(commentWithAuthor);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Xóa bài viết
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await storage.posts.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa bài viết này' });
    }

    await storage.posts.delete(req.params.id);
    res.json({ message: 'Đã xóa bài viết' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;

