// WebRTC utility for handling peer connections
// Note: This requires react-native-webrtc which needs expo-dev-client
// For web, uses browser WebRTC API

// Helper to check if running on web
const isWeb = () => {
  return typeof window !== 'undefined' && 
         typeof navigator !== 'undefined' && 
         navigator.product !== 'ReactNative' &&
         !(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('ReactNative'));
};

// Helper to check if we can use native WebRTC
const canUseNativeWebRTC = () => {
  // Don't use native WebRTC on web
  if (isWeb()) {
    return false;
  }
  
  // Check if we're in Expo Go (no native modules)
  try {
    const Constants = require('expo-constants').default;
    if (Constants && Constants.executionEnvironment === 'storeClient') {
      return false; // Expo Go
    }
  } catch (e) {
    // expo-constants not available, might be dev client
  }
  
  // Try to check if react-native-webrtc is available
  try {
    require.resolve('react-native-webrtc');
    return true;
  } catch (e) {
    return false;
  }
};

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// TURN servers (optional, for NAT traversal)
// You can use free TURN servers or set up your own
const TURN_SERVERS = [
  // Add your TURN server here if needed
  // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
];

const ICE_SERVERS = {
  iceServers: [...STUN_SERVERS, ...TURN_SERVERS]
};

export class WebRTCHandler {
  constructor(socket, callId, localUserId, remoteUserId, callType = 'voice') {
    this.socket = socket;
    this.callId = callId;
    this.localUserId = localUserId;
    this.remoteUserId = remoteUserId;
    this.callType = callType;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isCaller = false;
  }

  // Initialize peer connection
  async initialize(isCaller = false) {
    try {
      this.isCaller = isCaller;
      
      let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate;
      
      // On web/browser, use native WebRTC (avoid require react-native-webrtc)
      if (isWeb() && typeof window !== 'undefined' && window.RTCPeerConnection) {
        RTCPeerConnection = window.RTCPeerConnection;
        RTCSessionDescription = window.RTCSessionDescription;
        RTCIceCandidate = window.RTCIceCandidate;
        console.log('✅ Using browser WebRTC');
      } else if (canUseNativeWebRTC()) {
        // Only try to require if we can use native WebRTC
        try {
          const webrtc = require('react-native-webrtc');
          RTCPeerConnection = webrtc.RTCPeerConnection;
          RTCSessionDescription = webrtc.RTCSessionDescription;
          RTCIceCandidate = webrtc.RTCIceCandidate;
          console.log('✅ Using react-native-webrtc');
        } catch (e) {
          // Should not happen if canUseNativeWebRTC returned true, but handle anyway
          return false;
        }
      } else {
        // No WebRTC available - app will work with signaling only
        // This is expected behavior in Expo Go or if not rebuilt
        return false;
      }
      
      // Store constructors for later use
      this.RTCPeerConnection = RTCPeerConnection;
      this.RTCSessionDescription = RTCSessionDescription;
      this.RTCIceCandidate = RTCIceCandidate;

      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('webrtc-ice-candidate', {
            callId: this.callId,
            candidate: event.candidate,
            fromUserId: this.localUserId,
            toUserId: this.remoteUserId
          });
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('📹 Remote stream received');
        this.remoteStream = event.streams[0];
        // Emit event to update UI
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Also handle addstream for older implementations
      this.peerConnection.onaddstream = (event) => {
        if (event.stream) {
          console.log('📹 Remote stream received (addstream)');
          this.remoteStream = event.stream;
          if (this.onRemoteStream) {
            this.onRemoteStream(this.remoteStream);
          }
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', this.peerConnection.connectionState);
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(this.peerConnection.connectionState);
        }
      };

      return true;
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      return false;
    }
  }

  // Get user media (audio/video)
  async getUserMedia() {
    try {
      const constraints = {
        audio: true,
        video: this.callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      let mediaDevices;
      
      // On web/browser, use native mediaDevices (avoid require react-native-webrtc)
      if (isWeb() && typeof navigator !== 'undefined' && navigator.mediaDevices) {
        mediaDevices = navigator.mediaDevices;
        console.log('✅ Using browser mediaDevices');
      } else if (canUseNativeWebRTC()) {
        // Only try to require if we can use native WebRTC
        try {
          const webrtc = require('react-native-webrtc');
          mediaDevices = webrtc.mediaDevices;
          console.log('✅ Using react-native-webrtc mediaDevices');
        } catch (e) {
          // Should not happen, but handle anyway
          return null;
        }
      } else {
        // No mediaDevices available - this is expected in Expo Go
        return null;
      }

      if (mediaDevices && mediaDevices.getUserMedia) {
        this.localStream = await mediaDevices.getUserMedia(constraints);
        
        // Add tracks to peer connection
        if (this.peerConnection) {
          this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
          });
        }

        // Notify UI about local stream
        if (this.onLocalStream) {
          this.onLocalStream(this.localStream);
        }

        return this.localStream;
      } else {
        console.warn('⚠️ getUserMedia not available');
        return null;
      }
    } catch (error) {
      console.error('Error getting user media:', error);
      return null;
    }
  }

  // Create and send offer (caller)
  async createOffer() {
    try {
      if (!this.peerConnection) {
        // Silently return if not initialized (normal in Expo Go or if WebRTC not available)
        return null;
      }
      
      await this.getUserMedia();
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'video'
      });

      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('webrtc-offer', {
        callId: this.callId,
        offer: offer,
        fromUserId: this.localUserId,
        toUserId: this.remoteUserId
      });

      return offer;
    } catch (error) {
      // Silently handle - WebRTC is optional
      return null;
    }
  }

  // Create and send answer (receiver)
  async createAnswer(offer) {
    try {
      if (!this.peerConnection || !this.RTCSessionDescription) {
        // Silently return if not initialized (normal in Expo Go or if WebRTC not available)
        return null;
      }
      
      await this.getUserMedia();
      
      await this.peerConnection.setRemoteDescription(new this.RTCSessionDescription(offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('webrtc-answer', {
        callId: this.callId,
        answer: answer,
        fromUserId: this.localUserId,
        toUserId: this.remoteUserId
      });

      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      return null;
    }
  }

  // Handle received answer
  async handleAnswer(answer) {
    try {
      if (!this.peerConnection || !this.RTCSessionDescription) {
        // Silently return if not initialized (normal in Expo Go)
        return;
      }
      await this.peerConnection.setRemoteDescription(new this.RTCSessionDescription(answer));
    } catch (error) {
      // Silently handle - WebRTC is optional
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      if (!this.peerConnection || !this.RTCIceCandidate) {
        // Silently return if not initialized (normal in Expo Go)
        return;
      }
      await this.peerConnection.addIceCandidate(new this.RTCIceCandidate(candidate));
    } catch (error) {
      // Silently handle - WebRTC is optional
    }
  }

  // Toggle mute
  toggleMute(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Close connection
  close() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

export default WebRTCHandler;

