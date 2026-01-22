import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../config/api';
import { timeAgo } from '../utils/timeAgo';
import storage from '../utils/storage';
import { getUserId } from '../utils/helpers';

// Web-compatible button component
const WebButton = ({ style, onPress, children, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[style, { cursor: 'pointer' }]}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onPress) onPress();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onPress) onPress();
          }
        }}
        {...props}
      >
        {children}
      </View>
    );
  }
  return (
    <TouchableOpacity style={style} onPress={onPress} activeOpacity={0.7} {...props}>
      {children}
    </TouchableOpacity>
  );
};

const PersonalPageScreen = ({ route, navigation }) => {
  const { user: currentUser, setUser: setUserContext } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const socket = useSocket();

  // Create dynamic styles based on theme (must be defined before any render helpers use it)
  const dynamicStyles = getStyles(theme, isDarkMode);
  
  // QUAN TRỌNG: Lấy userId từ route.params
  // Có thể là undefined nếu xem trang của mình (không truyền userId)
  const userId = route?.params?.userId;
  const currentUserId = currentUser?.id || currentUser?._id;
  
  // isOwnProfile: không có userId hoặc userId trùng với currentUser.id
  // So sánh bằng string để tránh lỗi type mismatch
  const isOwnProfile = !userId || (currentUserId && String(userId) === String(currentUserId));

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showPostInput, setShowPostInput] = useState(false);
  const [showComments, setShowComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [expandedPost, setExpandedPost] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestStatus, setFriendRequestStatus] = useState(null); // 'sent', 'incoming', null
  const [mutualFriends, setMutualFriends] = useState([]);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'about', 'photos'

  useEffect(() => {
    // Reset user state when userId changes
    setUser(null);
    setLoading(true);
    
    // Debug: log route params
    const routeUserId = route?.params?.userId;
    console.log('🔍 PersonalPageScreen useEffect:');
    console.log('   route:', route);
    console.log('   route.params:', route.params);
    console.log('   route.params?.userId:', routeUserId);
    console.log('   currentUser?.id:', currentUser?.id);
    console.log('   currentUser?._id:', currentUser?._id);
    
    loadUserProfile();
  }, [route?.params?.userId, currentUser?.id, currentUser?._id]);

  // Load posts and friend status after user is loaded
  useEffect(() => {
    if (user && !isOwnProfile) {
      loadPosts();
      checkFriendStatus();
      loadMutualFriends();
    } else if (user && isOwnProfile) {
      loadPosts();
    }
  }, [user?.id, isOwnProfile]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Lấy userId từ route params (có thể là string hoặc number)
      const targetUserId = route?.params?.userId;
      const currentUserId = currentUser?.id || currentUser?._id;
      
      // So sánh bằng cách convert cả hai về string để tránh lỗi type mismatch
      const isOwn = !targetUserId || String(targetUserId) === String(currentUserId);
      
      console.log('📥 Loading profile:');
      console.log('   route.params?.userId:', targetUserId);
      console.log('   currentUser?.id:', currentUserId);
      console.log('   isOwn:', isOwn);
      
      if (isOwn) {
        // Xem trang của mình - dùng /users/me
        console.log('   → Loading OWN profile');
        const res = await api.get('/users/me');
        console.log('✅ Own profile loaded:', res.data?.id, res.data?.fullName);
        setUser(res.data);
      } else if (targetUserId) {
        // Xem trang người khác - dùng userId từ route params
        console.log('   → Loading OTHER user profile with userId:', targetUserId);
        const res = await api.get(`/users/${targetUserId}`);
        console.log('✅ Other user profile loaded:', res.data?.id, res.data?.fullName);
        setUser(res.data);
      } else {
        // Không có userId và không phải own profile => lỗi
        console.error('❌ No userId found and not own profile');
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      console.error('   Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải thông tin người dùng';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendStatus = async () => {
    if (!user || isOwnProfile) return;
    
    try {
      const targetUserId = getUserId(user);
      const currentUserId = getUserId(currentUser);
      
      console.log('🔍 Checking friend status:', { targetUserId, currentUserId });
      
      if (!targetUserId || !currentUserId) {
        console.log('⚠️ Missing user IDs');
        return;
      }
      
      // Check if already friends
      const friendsRes = await api.get('/friends');
      const friends = friendsRes.data || [];
      console.log('📋 Friends list:', friends);
      
      const isAlreadyFriend = friends.some(f => {
        // Handle different friend object formats
        const friendId = f._id || f.id || 
                        (f.userId && (f.userId._id || f.userId.id)) ||
                        (f.friendId && (f.friendId._id || f.friendId.id));
        
        // Compare as strings to avoid type mismatch
        const match = String(friendId) === String(targetUserId);
        console.log('   Comparing:', { friendId, targetUserId, match });
        return match;
      });
      
      console.log('✅ Is already friend:', isAlreadyFriend);
      
      if (isAlreadyFriend) {
        setIsFriend(true);
        setFriendRequestStatus(null);
        return;
      }
      
      // Check friend request status
      const requestsRes = await api.get('/friends/requests');
      const { incoming = [], sent = [] } = requestsRes.data || {};
      console.log('📋 Friend requests:', { incoming, sent });
      
      const sentRequest = sent.find(r => {
        const toUserId = r.toUserId || r.toUser?.id || r.toUser?._id;
        return String(toUserId) === String(targetUserId);
      });
      
      if (sentRequest) {
        console.log('✅ Found sent request');
        setFriendRequestStatus('sent');
        return;
      }
      
      const incomingRequest = incoming.find(r => {
        const fromUserId = r.fromUserId || r.fromUser?.id || r.fromUser?._id;
        return String(fromUserId) === String(targetUserId);
      });
      
      if (incomingRequest) {
        console.log('✅ Found incoming request');
        setFriendRequestStatus('incoming');
        return;
      }
      
      console.log('✅ No friend relationship found');
      setIsFriend(false);
      setFriendRequestStatus(null);
    } catch (error) {
      console.error('❌ Error checking friend status:', error);
      console.error('   Error response:', error.response?.data);
    }
  };

  const loadMutualFriends = async () => {
    if (!user || isOwnProfile) return;
    
    try {
      const targetUserId = getUserId(user);
      const res = await api.get(`/friends/mutual/${targetUserId}`);
      setMutualFriends(res.data || []);
      setMutualFriendsCount(res.data?.length || 0);
    } catch (error) {
      console.error('Error loading mutual friends:', error);
      setMutualFriends([]);
      setMutualFriendsCount(0);
    }
  };

  const handleSendFriendRequest = async () => {
    console.log('📱 handleSendFriendRequest called');
    try {
      const targetUserId = getUserId(user);
      console.log('📱 User object:', user);
      console.log('📱 Sending friend request to:', targetUserId);
      
      if (!targetUserId) {
        console.error('❌ targetUserId is null/undefined');
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        return;
      }
      
      console.log('📱 Request body:', { toUserId: targetUserId });
      const res = await api.post('/friends/request', { toUserId: targetUserId });
      console.log('✅ Friend request sent successfully:', res.data);
      setFriendRequestStatus('sent');
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
    } catch (error) {
      console.error('❌ Error sending friend request:', error);
      console.error('❌ Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Không thể gửi lời mời kết bạn';
      
      // If already friends, update UI
      if (errorMessage === 'Đã là bạn bè') {
        setIsFriend(true);
        setFriendRequestStatus(null);
        Alert.alert('Thông báo', 'Đã là bạn bè');
      } else if (errorMessage === 'Đã gửi lời mời kết bạn') {
        setFriendRequestStatus('sent');
        Alert.alert('Thông báo', 'Đã gửi lời mời kết bạn');
      } else {
        Alert.alert('Lỗi', errorMessage);
      }
    }
  };

  const handleAcceptFriendRequest = async () => {
    console.log('📱 handleAcceptFriendRequest called');
    try {
      const requestsRes = await api.get('/friends/requests');
      const { incoming = [] } = requestsRes.data || {};
      const targetUserId = getUserId(user);
      
      console.log('📱 Accepting friend request from:', targetUserId);
      
      const request = incoming.find(r => {
        const fromUserId = r.fromUserId || r.fromUser?.id || r.fromUser?._id;
        return fromUserId === targetUserId;
      });
      
      if (request) {
        const requestId = request.id || request._id;
        await api.put(`/friends/request/${requestId}/accept`);
        setIsFriend(true);
        setFriendRequestStatus(null);
        Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy lời mời kết bạn');
      }
    } catch (error) {
      console.error('❌ Error accepting friend request:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể chấp nhận lời mời kết bạn');
    }
  };

  const loadPosts = async () => {
    try {
      // Lấy userId từ user state (đã được load trong loadUserProfile)
      // Nếu chưa có user, dùng route params hoặc currentUser
      const targetUserId = user?.id || user?._id || route?.params?.userId || currentUser?.id || currentUser?._id;
      
      if (!targetUserId) {
        console.log('⚠️ No targetUserId for loading posts');
        setPosts([]);
        setRefreshing(false);
        return;
      }

      console.log('📥 Loading posts for userId:', targetUserId);
      const res = await api.get(`/posts/user/${targetUserId}`);
      
      // Load comments for each post
      const postsWithComments = await Promise.all(
        (res.data || []).map(async (post) => {
          try {
            const postId = post.id || post._id;
            if (!postId) return post;
            
            const commentsRes = await api.get(`/posts/${postId}/comments`);
            return {
              ...post,
              _id: post.id || post._id, // Ensure _id exists for frontend
              comments: commentsRes.data || []
            };
          } catch (error) {
            console.error('Error loading comments for post:', error);
            return { 
              ...post, 
              _id: post.id || post._id,
              comments: [] 
            };
          }
        })
      );
      
      console.log('✅ Loaded posts:', postsWithComments.length);
      setPosts(postsWithComments);
    } catch (error) {
      console.error('❌ Load posts error:', error);
      console.error('   Error response:', error.response?.data);
      setPosts([]);
    } finally {
      setRefreshing(false);
    }
  };

  const pickImage = async (type = 'post') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: type === 'cover' || type === 'avatar',
      aspect: type === 'cover' ? [16, 9] : type === 'avatar' ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'cover') {
        await uploadCoverPhoto(result.assets[0].uri);
      } else if (type === 'avatar') {
        await uploadAvatar(result.assets[0].uri);
      } else {
        setPostImage(result.assets[0].uri);
      }
    }
  };

  const uploadAvatar = async (imageUri) => {
    if (!imageUri) {
      Alert.alert('Lỗi', 'Không có ảnh được chọn');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      // React Native FormData format
      const fileUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
      
      formData.append('avatar', {
        uri: fileUri,
        name: filename,
        type: type,
      });

      const token = await storage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Chưa đăng nhập');
        setUploadingAvatar(false);
        return;
      }

      console.log('📤 Uploading avatar...');
      console.log('   URI:', fileUri);
      console.log('   URL:', `${BASE_URL}/api/users/me/avatar`);
      
      const res = await fetch(`${BASE_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let fetch set it automatically with boundary
        },
        body: formData,
      });

      const responseText = await res.text();
      console.log('📥 Response status:', res.status);
      console.log('📥 Response text:', responseText);

      if (res.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ Avatar uploaded successfully:', data);
        setUser(data);
        if (isOwnProfile && setUserContext) {
          setUserContext(data);
          await storage.setItem('user', JSON.stringify(data));
        }
        Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện');
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || 'Upload failed' };
        }
        console.error('❌ Upload failed:', res.status, errorData);
        Alert.alert('Lỗi', errorData.message || 'Không thể tải ảnh đại diện');
      }
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải ảnh đại diện');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadCoverPhoto = async (imageUri) => {
    if (!imageUri) {
      Alert.alert('Lỗi', 'Không có ảnh được chọn');
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'cover.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      // React Native FormData format
      const fileUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
      
      formData.append('coverPhoto', {
        uri: fileUri,
        name: filename,
        type: type,
      });

      const token = await storage.getItem('token');
      if (!token) {
        Alert.alert('Lỗi', 'Chưa đăng nhập');
        setUploadingCover(false);
        return;
      }

      console.log('📤 Uploading cover photo...');
      console.log('   URI:', fileUri);
      console.log('   URL:', `${BASE_URL}/api/users/me/cover`);
      
      const res = await fetch(`${BASE_URL}/api/users/me/cover`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type, let fetch set it automatically with boundary
        },
        body: formData,
      });

      const responseText = await res.text();
      console.log('📥 Response status:', res.status);
      console.log('📥 Response text:', responseText);

      if (res.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ Cover photo uploaded successfully:', data);
        setUser(data);
        if (isOwnProfile && setUserContext) {
          setUserContext(data);
          await storage.setItem('user', JSON.stringify(data));
        }
        Alert.alert('Thành công', 'Đã cập nhật ảnh bìa');
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText || 'Upload failed' };
        }
        console.error('❌ Upload failed:', res.status, errorData);
        Alert.alert('Lỗi', errorData.message || 'Không thể tải ảnh bìa');
      }
    } catch (error) {
      console.error('❌ Error uploading cover photo:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải ảnh bìa');
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePost = async () => {
    if (!postText.trim() && !postImage) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung hoặc chọn ảnh');
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', postText.trim());
      
      if (postImage) {
        const filename = postImage.split('/').pop() || 'post.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        const fileUri = Platform.OS === 'ios' ? postImage.replace('file://', '') : postImage;
        
        formData.append('image', {
          uri: fileUri,
          name: filename,
          type: type,
        });
      }

      console.log('📤 Creating post...');
      const token = await storage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        console.log('✅ Post created:', data);
        Alert.alert('Thành công', 'Đã đăng bài viết');
        
        // Reset form
        setPostText('');
        setPostImage(null);
        setShowPostInput(false);
        
        // Reload posts
        await loadPosts();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Không thể đăng bài viết');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Lỗi', error.message || 'Không thể đăng bài viết');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.put(`/posts/${postId}/like`);
      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId || post._id === postId) {
          return { ...post, likes: res.data.likes || [] };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Lỗi', 'Không thể like bài viết');
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId] || '';
    if (!text.trim()) return;

    try {
      const res = await api.post(`/posts/${postId}/comments`, {
        content: text.trim()
      });

      // Update local state
      setPosts(posts.map(post => {
        const postIdToCheck = post.id || post._id;
        if (postIdToCheck === postId) {
          return {
            ...post,
            _id: post.id || post._id, // Ensure _id exists
            comments: [...(post.comments || []), res.data]
          };
        }
        return post;
      }));

      setCommentText({ ...commentText, [postId]: '' });
    } catch (error) {
      console.error('Error creating comment:', error);
      Alert.alert('Lỗi', 'Không thể thêm bình luận');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      Alert.alert('Thành công', 'Đã xóa bài viết');
      // Remove post from local state
      setPosts(posts.filter(post => {
        const postIdToCheck = post.id || post._id;
        return postIdToCheck !== postId;
      }));
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa bài viết');
    }
  };

  const toggleComments = (postId) => {
    setShowComments({
      ...showComments,
      [postId]: !showComments[postId]
    });
  };

  const renderComment = (comment) => (
    <View style={dynamicStyles.comment}>
      <View style={dynamicStyles.commentAvatar}>
        <Text style={dynamicStyles.commentAvatarText}>
          {comment.author?.fullName?.charAt(0).toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={dynamicStyles.commentContent}>
        <View style={dynamicStyles.commentBubble}>
          <Text style={dynamicStyles.commentAuthorName}>{comment.author?.fullName || 'User'}</Text>
          <Text style={dynamicStyles.commentText}>{comment.content}</Text>
        </View>
        <Text style={dynamicStyles.commentTime}>{timeAgo(comment.createdAt)}</Text>
      </View>
    </View>
  );

  const renderPost = ({ item }) => {
    const postId = item.id || item._id;
    const isLiked = item.likes?.includes(currentUser?.id);
    const showCommentSection = showComments[postId];
    const isOwnPost = item.authorId === currentUser?.id || item.author?._id === currentUser?.id;
    
    return (
      <View style={dynamicStyles.post}>
        <View style={dynamicStyles.postHeader}>
          <View style={dynamicStyles.postAvatar}>
            <Text style={dynamicStyles.postAvatarText}>
              {item.author?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={dynamicStyles.postAuthorInfo}>
            <Text style={dynamicStyles.postAuthorName}>{item.author?.fullName || 'User'}</Text>
            <Text style={dynamicStyles.postTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          {isOwnPost && (
            <TouchableOpacity
              style={dynamicStyles.postDeleteButton}
              onPress={() => {
                Alert.alert(
                  'Xóa bài viết',
                  'Bạn có chắc chắn muốn xóa bài viết này?',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    {
                      text: 'Xóa',
                      style: 'destructive',
                      onPress: () => handleDeletePost(postId),
                    },
                  ]
                );
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ff3040" />
            </TouchableOpacity>
          )}
        </View>
        
        {item.content && (
          <Text style={dynamicStyles.postContent}>{item.content}</Text>
        )}
        
        {item.image && (
          <Image 
            source={{ 
              uri: item.image.startsWith('http') 
                ? item.image 
                : `${BASE_URL}${item.image.startsWith('/') ? item.image : '/' + item.image}`
            }} 
            style={dynamicStyles.postImage}
            resizeMode="cover"
            onError={(error) => {
              console.error('❌ Error loading post image:', error);
              console.error('   Image URI:', item.image);
              console.error('   Full URI:', item.image.startsWith('http') 
                ? item.image 
                : `${BASE_URL}${item.image.startsWith('/') ? item.image : '/' + item.image}`);
            }}
            onLoad={() => {
              console.log('✅ Post image loaded:', item.image);
            }}
          />
        )}
        
        <View style={dynamicStyles.postStats}>
          {item.likes?.length > 0 && (
            <View style={dynamicStyles.statItem}>
              <Ionicons name="heart" size={16} color={theme?.error || "#ff3040"} />
              <Text style={dynamicStyles.statText}>{item.likes.length}</Text>
            </View>
          )}
          {item.comments?.length > 0 && (
            <View style={dynamicStyles.statItem}>
              <Text style={dynamicStyles.statText}>{item.comments.length} bình luận</Text>
            </View>
          )}
        </View>
        
        <View style={dynamicStyles.postActions}>
          <TouchableOpacity 
            style={[dynamicStyles.postAction, isLiked && dynamicStyles.postActionActive]}
            onPress={() => handleLike(postId)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={22} 
              color={isLiked ? (theme?.error || "#ff3040") : (theme?.textSecondary || "#666")} 
            />
            <Text style={[dynamicStyles.postActionText, isLiked && dynamicStyles.postActionTextActive]}>
              Thích
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={dynamicStyles.postAction}
            onPress={() => toggleComments(postId)}
          >
            <Ionicons name="chatbubble-outline" size={22} color={theme?.textSecondary || "#666"} />
            <Text style={dynamicStyles.postActionText}>Bình luận</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={dynamicStyles.postAction}>
            <Ionicons name="share-outline" size={22} color={theme?.textSecondary || "#666"} />
            <Text style={dynamicStyles.postActionText}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        {showCommentSection && (
          <View style={dynamicStyles.commentsSection}>
            {item.comments && item.comments.length > 0 && (
              <View style={dynamicStyles.commentsList}>
                {item.comments.map(comment => (
                  <View key={comment._id}>
                    {renderComment(comment)}
                  </View>
                ))}
              </View>
            )}
            
            <View style={dynamicStyles.commentInputContainer}>
              <View style={dynamicStyles.commentInputAvatar}>
                <Text style={dynamicStyles.commentInputAvatarText}>
                  {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <TextInput
                style={dynamicStyles.commentInput}
                placeholder="Viết bình luận..."
                value={commentText[postId] || ''}
                onChangeText={(text) => setCommentText({ ...commentText, [postId]: text })}
                multiline
                placeholderTextColor={theme?.placeholder || "#999"}
              />
              {commentText[postId] && (
                <TouchableOpacity
                  style={dynamicStyles.commentSendButton}
                  onPress={() => handleComment(postId)}
                >
                  <Ionicons name="send" size={20} color={theme?.primary || "#00B14F"} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && !user) {
    return (
      <View style={[dynamicStyles.center, { backgroundColor: theme?.background }]}>
        <ActivityIndicator size="large" color={theme?.primary || "#00B14F"} />
        <Text style={[dynamicStyles.loadingText, { color: theme?.textSecondary }]}>Đang tải...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[dynamicStyles.center, { backgroundColor: theme?.background }]}>
        <Ionicons name="person-outline" size={64} color={theme?.textMuted || "#ccc"} />
        <Text style={[dynamicStyles.emptyText, { color: theme?.textSecondary }]}>Không tìm thấy người dùng</Text>
        <TouchableOpacity
          style={[dynamicStyles.retryButton, { backgroundColor: theme?.primary }]}
          onPress={loadUserProfile}
        >
          <Text style={dynamicStyles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[dynamicStyles.container, { backgroundColor: theme?.background }]}>
      <ScrollView 
        style={dynamicStyles.scrollView}
        contentContainerStyle={dynamicStyles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              loadUserProfile();
              loadPosts();
            }} 
          />
        }
      >
        <View style={dynamicStyles.pageContainer}>
        {/* Cover Photo & Profile Header */}
        <View style={[dynamicStyles.card, dynamicStyles.profileHeader]}>
          <View style={dynamicStyles.coverPhotoContainer}>
            {user?.coverPhoto ? (
              <Image 
                source={{ uri: `${BASE_URL}${user.coverPhoto}` }} 
                style={dynamicStyles.coverPhoto} 
              />
            ) : (
              <View style={dynamicStyles.coverPhotoPlaceholder}>
                <Ionicons name="image-outline" size={48} color={theme.textMuted} />
              </View>
            )}
            {isOwnProfile && (
              <TouchableOpacity
                style={dynamicStyles.editCoverButton}
                onPress={() => pickImage('cover')}
                disabled={uploadingCover}
              >
                {uploadingCover ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={dynamicStyles.editCoverText}>Thêm ảnh bìa</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={dynamicStyles.profileInfo}>
            <View style={dynamicStyles.avatarContainer}>
              {user?.avatar ? (
                <Image 
                  source={{ uri: `${BASE_URL}${user.avatar}` }} 
                  style={dynamicStyles.avatarImage}
                />
              ) : (
                <View style={[dynamicStyles.avatar, { backgroundColor: theme.primary }]}>
                  <Text style={dynamicStyles.avatarText}>
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              {isOwnProfile && (
                <TouchableOpacity
                  style={[dynamicStyles.editAvatarButton, { backgroundColor: theme.primary }]}
                  onPress={() => pickImage('avatar')}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Text style={[dynamicStyles.name, { color: theme.text }]}>{user?.fullName || 'User'}</Text>
            <Text style={[dynamicStyles.username, { color: theme.textSecondary }]}>@{user?.username || 'username'}</Text>
          </View>
        </View>
        
        {/* Action Buttons Container - Only show when viewing other user's profile */}
        {!isOwnProfile && user && (
          <View style={[dynamicStyles.card, dynamicStyles.actionButtonsContainer]}>
            {/* Mutual Friends */}
            {mutualFriendsCount > 0 && (
              <TouchableOpacity
                style={dynamicStyles.mutualFriendsButton}
                onPress={() => {
                  Alert.alert(
                    'Bạn chung',
                    `${mutualFriendsCount} bạn chung`,
                    [
                      { text: 'OK' },
                      {
                        text: 'Xem chi tiết',
                        onPress: () => {
                          Alert.alert('Bạn chung', mutualFriends.map(f => f.fullName || 'User').join('\n'));
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="people" size={16} color={theme?.primary || "#00B14F"} />
                <Text style={dynamicStyles.mutualFriendsText}>
                  {mutualFriendsCount} bạn chung
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Main Action Buttons Row */}
            <View style={dynamicStyles.actionButtonsRow}>
              {/* Nhắn tin button - Large primary button */}
              <WebButton
                style={dynamicStyles.messageButton}
                onPress={async () => {
                  console.log('📱 Nhắn tin button pressed');
                  try {
                    const otherUserId = getUserId(user);
                    const currentUserId = getUserId(currentUser);
                    
                    console.log('📱 User IDs:', { otherUserId, currentUserId });
                    
                    if (!otherUserId || !currentUserId) {
                      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
                      return;
                    }
                    
                    // Create or get existing conversation
                    console.log('📱 Creating conversation...');
                    const res = await api.post('/conversations', {
                      participantIds: [currentUserId, otherUserId],
                      type: 'private',
                    });
                    
                    const conversation = res.data;
                    console.log('📱 Conversation created:', conversation);
                    navigation.navigate('Chat', {
                      conversation: conversation,
                      conversationName: user?.fullName || 'User',
                    });
                  } catch (error) {
                    console.error('❌ Error starting conversation:', error);
                    Alert.alert('Lỗi', error.response?.data?.message || 'Không thể bắt đầu cuộc trò chuyện');
                  }
                }}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                <Text style={dynamicStyles.messageButtonText}>Nhắn tin</Text>
              </WebButton>
              
              {/* Friend Status Button */}
              {friendRequestStatus === 'sent' && (
                <View style={dynamicStyles.friendStatusButton}>
                  <Ionicons name="time-outline" size={18} color={theme?.textSecondary || "#999"} />
                  <Text style={[dynamicStyles.friendStatusButtonText, { color: theme?.textSecondary }]}>Đã gửi</Text>
                </View>
              )}
              
              {friendRequestStatus === 'incoming' && (
                <TouchableOpacity
                  style={[dynamicStyles.acceptFriendButton, { backgroundColor: theme?.primary }]}
                  onPress={() => {
                    console.log('📱 Chấp nhận lời mời button pressed');
                    handleAcceptFriendRequest();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={dynamicStyles.acceptFriendText}>Chấp nhận</Text>
                </TouchableOpacity>
              )}
              
              {!isFriend && !friendRequestStatus && (
                <WebButton
                  style={dynamicStyles.addFriendButton}
                  onPress={() => {
                    console.log('📱 Kết bạn button pressed');
                    handleSendFriendRequest();
                  }}
                >
                  <Ionicons name="person-add" size={18} color={theme?.primary || "#00B14F"} />
                  <Text style={dynamicStyles.addFriendText}>Kết bạn</Text>
                </WebButton>
              )}
              
              {isFriend && (
                <View style={dynamicStyles.friendStatusButton}>
                  <Ionicons name="checkmark-circle" size={18} color={theme?.primary || "#00B14F"} />
                  <Text style={[dynamicStyles.friendStatusButtonText, { color: theme?.primary || '#00B14F' }]}>Bạn bè</Text>
                </View>
              )}
            </View>
            
            {/* Call Buttons Row */}
            <View style={dynamicStyles.callButtonsRow}>
              <TouchableOpacity
                style={dynamicStyles.callButton}
                onPress={() => {
                  console.log('📱 Gọi button pressed');
                  const otherUserId = getUserId(user);
                  const currentUserId = getUserId(currentUser);
                  
                  console.log('📱 Call - User IDs:', { otherUserId, currentUserId, hasSocket: !!socket });
                  
                  if (!otherUserId || !currentUserId || !socket) {
                    Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
                    return;
                  }
                  
                  const callId = `call_${Date.now()}_${currentUserId}_${otherUserId}`;
                  console.log('📱 Navigating to Call screen:', { callId, callType: 'voice' });
                  
                  navigation.navigate('Call', {
                    callType: 'voice',
                    userId: otherUserId,
                    userName: user?.fullName || 'User',
                    userAvatar: user?.avatar ? `${BASE_URL}${user.avatar}` : null,
                    callId,
                    isIncoming: false,
                  });
                  
                  socket.emit('call-request', {
                    callId,
                    fromUserId: currentUserId,
                    toUserId: otherUserId,
                    callType: 'voice'
                  });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={22} color={theme?.primary || "#00B14F"} />
                <Text style={dynamicStyles.callButtonText}>Gọi</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={dynamicStyles.videoCallButton}
                onPress={() => {
                  console.log('📱 Video call button pressed');
                  const otherUserId = getUserId(user);
                  const currentUserId = getUserId(currentUser);
                  
                  console.log('📱 Video Call - User IDs:', { otherUserId, currentUserId, hasSocket: !!socket });
                  
                  if (!otherUserId || !currentUserId || !socket) {
                    Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi');
                    return;
                  }
                  
                  const callId = `call_${Date.now()}_${currentUserId}_${otherUserId}`;
                  console.log('📱 Navigating to Call screen:', { callId, callType: 'video' });
                  
                  navigation.navigate('Call', {
                    callType: 'video',
                    userId: otherUserId,
                    userName: user?.fullName || 'User',
                    userAvatar: user?.avatar ? `${BASE_URL}${user.avatar}` : null,
                    callId,
                    isIncoming: false,
                  });
                  
                  socket.emit('call-request', {
                    callId,
                    fromUserId: currentUserId,
                    toUserId: otherUserId,
                    callType: 'video'
                  });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="videocam" size={22} color={theme?.primary || "#00B14F"} />
                <Text style={dynamicStyles.callButtonText}>Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Tabs - Posts, About, Photos */}
        {!isOwnProfile && (
          <View style={dynamicStyles.tabsContainer}>
            <TouchableOpacity
              style={[dynamicStyles.tab, activeTab === 'posts' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('posts')}
            >
              <Text style={[dynamicStyles.tabText, activeTab === 'posts' && dynamicStyles.activeTabText]}>
                Bài viết
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.tab, activeTab === 'about' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[dynamicStyles.tabText, activeTab === 'about' && dynamicStyles.activeTabText]}>
                Giới thiệu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.tab, activeTab === 'photos' && dynamicStyles.activeTab]}
              onPress={() => setActiveTab('photos')}
            >
              <Text style={[dynamicStyles.tabText, activeTab === 'photos' && dynamicStyles.activeTabText]}>
                Ảnh
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Post Input (only for own profile) */}
        {isOwnProfile && (
          <View style={[dynamicStyles.card, dynamicStyles.postInputContainer]}>
            {showPostInput ? (
              <View style={dynamicStyles.postInputBox}>
                <TextInput
                  style={dynamicStyles.postInput}
                  placeholder="Bạn đang nghĩ gì?"
                  value={postText}
                  onChangeText={setPostText}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={theme?.placeholder || "#999"}
                />
                {postImage && (
                  <View style={dynamicStyles.postImagePreview}>
                    <Image source={{ uri: postImage }} style={dynamicStyles.previewImage} />
                    <TouchableOpacity
                      style={dynamicStyles.removeImageBtn}
                      onPress={() => setPostImage(null)}
                    >
                      <Ionicons name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={dynamicStyles.postInputActions}>
                  <TouchableOpacity
                    style={dynamicStyles.postInputAction}
                    onPress={() => pickImage('post')}
                  >
                    <Ionicons name="image-outline" size={24} color={theme?.primary || "#00B14F"} />
                  </TouchableOpacity>
                  <View style={dynamicStyles.postInputButtons}>
                    <TouchableOpacity
                      style={dynamicStyles.cancelButton}
                      onPress={() => {
                        setShowPostInput(false);
                        setPostText('');
                        setPostImage(null);
                      }}
                    >
                      <Text style={dynamicStyles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[dynamicStyles.postButton, { backgroundColor: theme?.primary }, posting && dynamicStyles.postButtonDisabled]}
                      onPress={handlePost}
                      disabled={posting}
                    >
                      {posting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={dynamicStyles.postButtonText}>Đăng</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={dynamicStyles.createPostButton}
                onPress={() => setShowPostInput(true)}
              >
                <View style={[dynamicStyles.createPostAvatar, { backgroundColor: theme?.primary }]}>
                  <Text style={dynamicStyles.createPostAvatarText}>
                    {currentUser?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <Text style={dynamicStyles.createPostText}>Bạn đang nghĩ gì?</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content based on active tab */}
        {!isOwnProfile && activeTab === 'about' ? (
          <View style={[dynamicStyles.card, dynamicStyles.aboutContainer]}>
            <View style={dynamicStyles.aboutSection}>
              <Text style={dynamicStyles.aboutTitle}>Thông tin</Text>
              <View style={dynamicStyles.aboutItem}>
                <Ionicons name="person-outline" size={20} color={theme?.textSecondary || "#666"} />
                <Text style={dynamicStyles.aboutLabel}>Tên:</Text>
                <Text style={dynamicStyles.aboutValue}>{user?.fullName || 'Chưa cập nhật'}</Text>
              </View>
              <View style={dynamicStyles.aboutItem}>
                <Ionicons name="at-outline" size={20} color={theme?.textSecondary || "#666"} />
                <Text style={dynamicStyles.aboutLabel}>Username:</Text>
                <Text style={dynamicStyles.aboutValue}>@{user?.username || 'N/A'}</Text>
              </View>
              {mutualFriendsCount > 0 && (
                <View style={dynamicStyles.aboutItem}>
                  <Ionicons name="people-outline" size={20} color={theme?.textSecondary || "#666"} />
                  <Text style={dynamicStyles.aboutLabel}>Bạn chung:</Text>
                  <Text style={dynamicStyles.aboutValue}>{mutualFriendsCount} người</Text>
                </View>
              )}
            </View>
          </View>
        ) : !isOwnProfile && activeTab === 'photos' ? (
          <View style={[dynamicStyles.card, dynamicStyles.photosContainer]}>
            {posts.filter(p => p.image).length === 0 ? (
              <View style={dynamicStyles.emptyContainer}>
                <Ionicons name="images-outline" size={64} color={theme?.textMuted || "#ccc"} />
                <Text style={dynamicStyles.emptyText}>Chưa có ảnh nào</Text>
              </View>
            ) : (
              <View style={dynamicStyles.photosGrid}>
                {posts
                  .filter(p => p.image)
                  .map((post, index) => (
                    <TouchableOpacity
                      key={post.id || post._id || index}
                      style={dynamicStyles.photoItem}
                      onPress={() => {
                        Alert.alert('Ảnh', 'Xem ảnh chi tiết');
                      }}
                    >
                      <Image
                        source={{
                          uri: post.image.startsWith('http')
                            ? post.image
                            : `${BASE_URL}${post.image.startsWith('/') ? post.image : '/' + post.image}`
                        }}
                        style={dynamicStyles.photoThumbnail}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        ) : (
          /* Posts List */
          loading ? (
            <View style={[dynamicStyles.card, dynamicStyles.loadingContainer]}>
              <ActivityIndicator size="large" color={theme?.primary || "#00B14F"} />
            </View>
          ) : posts.length === 0 ? (
            <View style={[dynamicStyles.card, dynamicStyles.emptyContainer]}>
              <Ionicons name="document-text-outline" size={64} color={theme?.textMuted || "#ccc"} />
              <Text style={dynamicStyles.emptyText}>
                {isOwnProfile ? 'Chưa có bài viết nào' : 'Người dùng này chưa có bài viết'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id || item._id || Math.random().toString()}
              scrollEnabled={false}
            />
          )
        )}
        </View>
      </ScrollView>
    </View>
  );
};

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 28,
  },
  pageContainer: {
    width: '100%',
    paddingHorizontal: 12,
    alignSelf: 'center',
    ...(Platform.OS === 'web' ? { maxWidth: 900 } : null),
  },
  card: {
    backgroundColor: theme?.card || theme?.surface || '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: theme?.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  profileHeader: {
    marginBottom: 12,
  },
  coverPhotoContainer: {
    height: 200,
    position: 'relative',
    backgroundColor: theme?.border || '#e0e0e0',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme?.border || '#e0e0e0',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editCoverText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  profileInfo: {
    alignItems: 'center',
    paddingBottom: 20,
    marginTop: -50,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme?.primary || '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme?.card || theme?.surface || '#fff',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: theme?.card || theme?.surface || '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme?.primary || '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme?.card || theme?.surface || '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: theme?.textSecondary || '#666',
    marginBottom: 16,
  },
  actionButtonsContainer: {
    backgroundColor: theme?.card || theme?.surface || '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
    zIndex: 10,
    elevation: 5,
    shadowColor: theme?.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.06,
    shadowRadius: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    ...(Platform.OS === 'web' && {
      pointerEvents: 'auto',
    }),
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme?.primary || '#00B14F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: theme?.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    cursor: 'pointer',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      pointerEvents: 'auto',
      touchAction: 'manipulation',
    }),
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  callButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme?.primaryLight || '#E6F9EE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme?.primary || '#00B14F',
    gap: 6,
    cursor: 'pointer',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },
  callButtonText: {
    color: theme?.primary || '#00B14F',
    fontSize: 14,
    fontWeight: '600',
  },
  videoCallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme?.primaryLight || '#E6F9EE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme?.primary || '#00B14F',
    gap: 6,
    cursor: 'pointer',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },
  postInputContainer: {
    padding: 16,
    marginBottom: 12,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: theme?.border || '#e0e0e0',
    borderRadius: 24,
    backgroundColor: theme?.inputBackground || '#f5f5f5',
  },
  createPostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme?.primary || '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createPostAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createPostText: {
    flex: 1,
    fontSize: 16,
    color: theme?.placeholder || '#999',
  },
  postInputBox: {
    backgroundColor: theme?.inputBackground || '#f9f9f9',
    borderRadius: 12,
    padding: 12,
  },
  postInput: {
    borderWidth: 1,
    borderColor: theme?.border || '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: theme?.card || theme?.surface || '#fff',
    color: theme?.text || '#000',
  },
  postImagePreview: {
    marginTop: 12,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
  },
  postInputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  postInputAction: {
    padding: 8,
  },
  postInputButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme?.border || '#ccc',
  },
  cancelButtonText: {
    color: theme?.textSecondary || '#666',
    fontSize: 14,
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: theme?.textSecondary || '#999',
  },
  mutualFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme?.primaryLight || '#E6F9EE',
    marginBottom: 10,
    gap: 6,
    cursor: 'pointer',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },
  mutualFriendsText: {
    fontSize: 14,
    color: theme?.primary || '#00B14F',
    fontWeight: '500',
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: theme?.primaryLight || '#E6F9EE',
    borderWidth: 1,
    borderColor: theme?.primary || '#00B14F',
    gap: 6,
    minWidth: 100,
    cursor: 'pointer',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
      pointerEvents: 'auto',
      touchAction: 'manipulation',
    }),
  },
  addFriendText: {
    fontSize: 15,
    color: theme?.primary || '#00B14F',
    fontWeight: '600',
  },
  acceptFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
    minWidth: 100,
    cursor: 'pointer',
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },
  acceptFriendText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  friendStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: theme?.inputBackground || '#f5f5f5',
    gap: 6,
    minWidth: 100,
  },
  friendStatusButtonText: {
    fontSize: 15,
    color: theme?.textSecondary || '#666',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme?.card || theme?.surface || '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#e0e0e0',
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme?.primary || '#00B14F',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme?.textSecondary || '#666',
  },
  activeTabText: {
    color: theme?.primary || '#00B14F',
    fontWeight: '600',
  },
  aboutContainer: {
    padding: 16,
  },
  aboutSection: {
    marginBottom: 16,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  aboutLabel: {
    fontSize: 14,
    color: '#666',
    minWidth: 100,
  },
  aboutValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  photosContainer: {
    padding: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photoItem: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  post: {
    backgroundColor: theme?.card || theme?.surface || '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme?.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.3 : 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  postDeleteButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme?.primary || '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme?.text || '#000',
  },
  postTime: {
    fontSize: 12,
    color: theme?.textSecondary || '#999',
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    color: theme?.text || '#000',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#f0f0f0',
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme?.divider || '#f0f0f0',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: theme?.textSecondary || '#666',
    marginLeft: 4,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  postActionActive: {
    backgroundColor: theme?.primaryLight || '#fff5f5',
  },
  postActionText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme?.textSecondary || '#666',
  },
  postActionTextActive: {
    color: theme?.error || '#ff3040',
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme?.divider || '#f0f0f0',
  },
  commentsList: {
    marginBottom: 12,
  },
  comment: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme?.primary || '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: theme?.messageOther || '#f0f2f5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 4,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: theme?.text || '#000',
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: theme?.textSecondary || '#999',
    marginLeft: 10,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme?.inputBackground || '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme?.primary || '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentInputAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: theme?.text || '#000',
    maxHeight: 100,
  },
  commentSendButton: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme?.textSecondary || '#666',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme?.primary || '#00B14F',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PersonalPageScreen;
