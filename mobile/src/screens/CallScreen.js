import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Dynamically import RTCView for video rendering
let RTCView = null;
try {
  if (Platform.OS === 'web') {
    // On web, use HTML video elements (handled separately)
    RTCView = null;
  } else {
    // On native, try to use RTCView from react-native-webrtc
    // const webrtc = require('react-native-webrtc'); // Temporarily disabled
    const webrtc = null; // Disable WebRTC to avoid warnings
    RTCView = webrtc.RTCView;
  }
} catch (e) {
  // RTCView not available (Expo Go or not rebuilt)
  RTCView = null;
}

const CallScreen = ({ route, navigation }) => {
  const { callType, userId, userName, userAvatar, callId, isIncoming } = route.params || {};
  const { user: currentUser } = useAuth();
  const socket = useSocket();

  // Validate params
  if (!userId || !callId) {
    console.error('❌ Missing required call params:', { userId, callId });
    navigation.goBack();
    return null;
  }

  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef(null);
  const audioMode = useRef(null);
  const sound = useRef(null);
  const webrtcHandler = useRef(null);

  useEffect(() => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Configure audio for call
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
        console.log('✅ Audio mode configured for call');
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };

    setupAudio();

    // Handle incoming call
    if (isIncoming) {
      // Vibrate on incoming call
      if (Platform.OS !== 'web') {
        Vibration.vibrate([500, 500, 500], true);
      }
    } else {
      // Outgoing call - emit call-request
      const currentUserId = currentUser?.id || currentUser?._id;
      if (socket && currentUserId && userId) {
        console.log('📞 Starting outgoing call:', { callId, fromUserId: currentUserId, toUserId: userId, callType });
        socket.emit('call-request', {
          callId,
          fromUserId: currentUserId,
          toUserId: userId,
          callType: callType || 'voice'
        });
      } else {
        console.error('❌ Cannot start call:', { socket: !!socket, currentUserId, userId });
        Alert.alert('Lỗi', 'Không thể thực hiện cuộc gọi. Vui lòng thử lại.');
        navigation.goBack();
      }
    }

    // Socket listeners
    if (socket) {
      const handleCallAccepted = async (data) => {
        console.log('✅ Call accepted event received:', data);
        if (data.callId === callId) {
          setCallStatus('connected');
          startTimer();
          if (Platform.OS !== 'web') {
            Vibration.cancel();
          }
          
          // Initialize WebRTC if available (only if native module is available)
          try {
            const WebRTCHandler = (await import('../utils/webrtc')).default;
            const currentUserId = currentUser?.id || currentUser?._id;
            if (WebRTCHandler && currentUserId && userId) {
              const handler = new WebRTCHandler(
                socket,
                callId,
                currentUserId,
                userId,
                callType || 'voice'
              );
              
              // Set up stream callbacks
              handler.onLocalStream = (stream) => {
                setLocalStream(stream);
                console.log('📹 Local stream ready');
              };
              handler.onRemoteStream = (stream) => {
                setRemoteStream(stream);
                console.log('📹 Remote stream ready');
              };
              
              // Initialize as caller (outgoing) or receiver (incoming)
              const isCaller = !isIncoming;
              const initialized = await handler.initialize(isCaller);
              
              if (initialized) {
                // Get user media first
                await handler.getUserMedia();
                if (isCaller) {
                  // Create offer after getting media
                  await handler.createOffer();
                }
                webrtcHandler.current = handler; // Only set if successfully initialized
                console.log('✅ WebRTC initialized for call');
              }
              // If not initialized, webrtcHandler.current remains null/undefined
            }
          } catch (error) {
            // Silently handle - WebRTC is optional (normal in Expo Go)
            // App will work with signaling only
          }
        }
      };

      // WebRTC signaling handlers
      const handleWebRTCOffer = async (data) => {
        if (data.callId === callId && webrtcHandler.current) {
          console.log('📡 Received WebRTC offer');
          await webrtcHandler.current.createAnswer(data.offer);
        }
      };

      const handleWebRTCAnswer = async (data) => {
        if (data.callId === callId && webrtcHandler.current) {
          console.log('📡 Received WebRTC answer');
          await webrtcHandler.current.handleAnswer(data.answer);
        }
      };

      const handleWebRTCIceCandidate = async (data) => {
        if (data.callId === callId && webrtcHandler.current) {
          await webrtcHandler.current.handleIceCandidate(data.candidate);
        }
      };

      const handleCallRejected = (data) => {
        console.log('❌ Call rejected event received:', data);
        if (data.callId === callId) {
          if (Platform.OS !== 'web') {
            Vibration.cancel();
          }
          navigation.goBack();
        }
      };

      const handleCallEnded = (data) => {
        console.log('📴 Call ended event received:', data);
        if (data.callId === callId) {
          if (durationInterval.current) {
            clearInterval(durationInterval.current);
          }
          if (Platform.OS !== 'web') {
            Vibration.cancel();
          }
          navigation.goBack();
        }
      };

      socket.on('call-accepted', handleCallAccepted);
      socket.on('call-rejected', handleCallRejected);
      socket.on('call-ended', handleCallEnded);
      socket.on('webrtc-offer', handleWebRTCOffer);
      socket.on('webrtc-answer', handleWebRTCAnswer);
      socket.on('webrtc-ice-candidate', handleWebRTCIceCandidate);

      return () => {
        if (socket) {
          socket.off('call-accepted', handleCallAccepted);
          socket.off('call-rejected', handleCallRejected);
          socket.off('call-ended', handleCallEnded);
          socket.off('webrtc-offer', handleWebRTCOffer);
          socket.off('webrtc-answer', handleWebRTCAnswer);
          socket.off('webrtc-ice-candidate', handleWebRTCIceCandidate);
        }
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
        }
        // Stop local stream
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (webrtcHandler.current) {
          webrtcHandler.current.close();
          webrtcHandler.current = null;
        }
        if (Platform.OS !== 'web') {
          Vibration.cancel();
        }
      };
    }
  }, [socket, isIncoming, callId, userId, callType, currentUser, navigation]);

  // Start call timer
  const startTimer = () => {
    durationInterval.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const acceptCall = async () => {
    const currentUserId = currentUser?.id || currentUser?._id;
    if (socket && currentUserId && userId) {
      console.log('📞 Accepting call:', { callId, fromUserId: userId, currentUserId });
      
      // Stop vibration
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      
      // Configure audio for active call
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }
      
      // Emit accept
      socket.emit('call-accept', { 
        callId, 
        userId: currentUserId,
        fromUserId: userId // The person who called
      });
      
      setCallStatus('connected');
      startTimer();
      
      // Initialize WebRTC as receiver (only if native module is available)
      try {
        const WebRTCHandler = (await import('../utils/webrtc')).default;
        if (WebRTCHandler) {
          const handler = new WebRTCHandler(
            socket,
            callId,
            currentUserId,
            userId,
            callType || 'voice'
          );
          
          // Set up stream callbacks
          handler.onLocalStream = (stream) => {
            setLocalStream(stream);
            console.log('📹 Local stream ready');
          };
          handler.onRemoteStream = (stream) => {
            setRemoteStream(stream);
            console.log('📹 Remote stream ready');
          };
          
          const initialized = await handler.initialize(false); // false = receiver
          if (initialized) {
            await handler.getUserMedia();
            webrtcHandler.current = handler; // Only set if successfully initialized
            console.log('✅ WebRTC initialized for incoming call');
          }
          // If not initialized, webrtcHandler.current remains null/undefined
        }
      } catch (error) {
        // Silently handle - WebRTC is optional (normal in Expo Go)
        // App will work with signaling only
      }
    } else {
      console.error('❌ Cannot accept call:', { socket: !!socket, currentUserId, userId });
      Alert.alert('Lỗi', 'Không thể chấp nhận cuộc gọi. Vui lòng thử lại.');
    }
  };

  const rejectCall = () => {
    const currentUserId = currentUser?.id || currentUser?._id;
    if (socket && currentUserId && userId) {
      console.log('📞 Rejecting call:', { callId, fromUserId: userId, currentUserId });
      socket.emit('call-reject', { 
        callId, 
        userId: currentUserId,
        fromUserId: userId // The person who called
      });
    }
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
    navigation.goBack();
  };

  const endCall = async () => {
    const currentUserId = currentUser?.id || currentUser?._id;
    if (socket && currentUserId && userId) {
      console.log('📞 Ending call:', { callId, otherUserId: userId, currentUserId });
      socket.emit('call-end', { 
        callId, 
        userId: currentUserId,
        otherUserId: userId // The other party
      });
    }
    
    // Cleanup WebRTC
    if (webrtcHandler.current) {
      webrtcHandler.current.close();
      webrtcHandler.current = null;
    }
    
    // Cleanup
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    if (Platform.OS !== 'web') {
      Vibration.cancel();
    }
    
    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error resetting audio mode:', error);
    }
    
    navigation.goBack();
  };

  const toggleMute = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Toggle WebRTC mute if available
    if (webrtcHandler.current) {
      webrtcHandler.current.toggleMute(newMutedState);
    }
    
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: !newMutedState,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
      console.log('🎤 Mute toggled:', newMutedState);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleSpeaker = async () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
      console.log('🔊 Speaker toggled:', newSpeakerState);
    } catch (error) {
      console.error('Error toggling speaker:', error);
    }
  };

  const toggleVideo = () => {
    if (callType === 'video') {
      const newVideoState = !isVideoOn;
      setIsVideoOn(newVideoState);
      
      // Toggle WebRTC video if available
      if (webrtcHandler.current) {
        webrtcHandler.current.toggleVideo(newVideoState);
      }
      
      console.log('📹 Video toggled:', newVideoState);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Đang gọi...';
      case 'ringing':
        return 'Cuộc gọi đến';
      case 'connected':
        return formatDuration(duration);
      case 'ended':
        return 'Cuộc gọi đã kết thúc';
      default:
        return '';
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </Animated.View>
          <Text style={styles.userName}>{userName || 'User'}</Text>
          <Text style={styles.callType}>
            {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
          </Text>
          <Text style={styles.status}>{getStatusText()}</Text>
        </View>

        {/* Video Preview (if video call) */}
        {callType === 'video' && callStatus === 'connected' && (
          <View style={styles.videoContainer}>
            {/* Remote Video */}
            <View style={styles.remoteVideo}>
              {remoteStream && RTCView ? (
                <RTCView
                  streamURL={remoteStream.toURL()}
                  style={styles.rtcVideo}
                  objectFit="cover"
                  mirror={false}
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  {userAvatar ? (
                    <Image
                      source={{ uri: userAvatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {userName?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.videoPlaceholderText}>{userName}</Text>
                </View>
              )}
            </View>
            {/* Local Video */}
            {isVideoOn && (
              <View style={styles.localVideo}>
                {localStream && RTCView ? (
                  <RTCView
                    streamURL={localStream.toURL()}
                    style={styles.rtcVideo}
                    objectFit="cover"
                    mirror={true}
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoPlaceholderText}>Bạn</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {callStatus === 'ringing' && isIncoming ? (
            <>
              <TouchableOpacity
                style={[styles.controlButton, styles.rejectButton]}
                onPress={rejectCall}
              >
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.acceptButton]}
                onPress={acceptCall}
              >
                <Ionicons name="call" size={32} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonSmall]}
                onPress={toggleMute}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={24}
                  color={isMuted ? '#fff' : '#00B14F'}
                />
              </TouchableOpacity>

              {callType === 'video' && (
                <TouchableOpacity
                  style={[styles.controlButton, styles.controlButtonSmall]}
                  onPress={toggleVideo}
                >
                  <Ionicons
                    name={isVideoOn ? 'videocam' : 'videocam-off'}
                    size={24}
                    color={isVideoOn ? '#00B14F' : '#fff'}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonSmall]}
                onPress={toggleSpeaker}
              >
                <Ionicons
                  name={isSpeakerOn ? 'volume-high' : 'volume-low'}
                  size={24}
                  color={isSpeakerOn ? '#00B14F' : '#fff'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.endButton]}
                onPress={endCall}
              >
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  userInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#00B14F',
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 60,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  callType: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#00B14F',
    marginTop: 8,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rtcVideo: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00B14F',
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  controlButtonSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  acceptButton: {
    backgroundColor: '#00B14F',
  },
  rejectButton: {
    backgroundColor: '#ff3040',
  },
  endButton: {
    backgroundColor: '#ff3040',
  },
});

export default CallScreen;

