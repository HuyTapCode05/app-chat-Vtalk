import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const { width } = Dimensions.get('window');

const VoiceRecorder = ({ onSendVoice, onCancel, disabled }) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformData, setWaveformData] = useState(Array(8).fill(0.2));
  
  // Animation values
  const micScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const durationInterval = useRef(null);
  const waveInterval = useRef(null);

  // Auto-start recording when component mounts
  useEffect(() => {
    startRecording();
  }, []);

  // Animation effect when recording starts
  useEffect(() => {
    if (isRecording) {
      // Slide up animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse animation for microphone
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Waveform animation
      const waveAnimation = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        })
      );
      waveAnimation.start();

      return () => {
        pulseAnimation.stop();
        waveAnimation.stop();
      };
    } else {
      // Reset animations
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isRecording]);

  // Generate waveform data
  useEffect(() => {
    if (isRecording) {
      waveInterval.current = setInterval(() => {
        const newWaveform = Array(8).fill(0).map(() => Math.random() * 0.8 + 0.2);
        setWaveformData(newWaveform);
      }, 200);
    } else {
      if (waveInterval.current) {
        clearInterval(waveInterval.current);
      }
      setWaveformData(Array(8).fill(0.2));
    }
    
    return () => {
      if (waveInterval.current) {
        clearInterval(waveInterval.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      console.log('🎤 Requesting recording permissions...');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập microphone để ghi âm');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('🎤 Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm');
    }
  };

  const stopRecording = async () => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (!recording) return;

      setIsRecording(false);
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingDuration(0);

      if (uri && recordingDuration >= 1) {
        console.log('🎤 Recording saved to', uri);
        onSendVoice?.(uri, recordingDuration);
      } else {
        Alert.alert('Lỗi', 'Ghi âm quá ngắn, vui lòng thử lại');
      }

    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Lỗi', 'Không thể dừng ghi âm');
    }
  };

  const cancelRecording = async () => {
    try {
      if (!recording) {
        // If not recording, just close the UI
        onCancel?.();
        return;
      }

      setIsRecording(false);
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
      console.log('❌ Recording cancelled');
      
      // Close the voice recorder UI
      onCancel?.();
    } catch (error) {
      console.error('Failed to cancel recording', error);
      onCancel?.();
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <Animated.View 
        style={[
          styles.recordingFullContainer,
          {
            opacity: opacityAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              })
            }]
          }
        ]}
      >
        {/* Background overlay */}
        <View style={styles.recordingOverlay} />
        
        {/* Recording UI */}
        <View style={styles.recordingContent}>
          {/* Header with cancel and timer */}
          <View style={styles.recordingHeader}>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
              <Ionicons name="close" size={28} color={COLORS.DANGER} />
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            
            <View style={styles.timerContainer}>
              <View style={styles.recordingDot} />
              <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
            </View>

            <TouchableOpacity onPress={stopRecording} style={styles.sendButton}>
              <Text style={styles.sendText}>Gửi</Text>
              <Ionicons name="send" size={28} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>

          {/* Waveform visualization */}
          <View style={styles.waveformContainer}>
            {waveformData.map((height, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, height * 40 + 4],
                    }),
                    opacity: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ]}
              />
            ))}
          </View>

          {/* Animated microphone */}
          <Animated.View 
            style={[
              styles.micContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.micButton}>
              <Ionicons name="mic" size={32} color={COLORS.WHITE} />
            </View>
          </Animated.View>

          {/* Instructions */}
          <Text style={styles.instructionText}>Đang ghi âm...</Text>
          <Text style={styles.subInstructionText}>
            Nhấn "Gửi" để gửi hoặc "Hủy" để dừng
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <TouchableOpacity
      onPress={startRecording}
      disabled={disabled}
      style={[styles.micButton, disabled && styles.micButtonDisabled]}
    >
      <Ionicons 
        name="mic" 
        size={24} 
        color={disabled ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  micButtonDisabled: {
    backgroundColor: COLORS.BACKGROUND,
  },
  
  // Full-screen recording UI
  recordingFullContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  recordingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  recordingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 60,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    color: COLORS.DANGER,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.DANGER,
    marginRight: 8,
  },
  timerText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  sendText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  
  // Waveform visualization
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 40,
  },
  waveformBar: {
    width: 4,
    backgroundColor: COLORS.PRIMARY,
    marginHorizontal: 2,
    borderRadius: 2,
    minHeight: 4,
  },
  
  // Animated microphone
  micContainer: {
    marginBottom: 40,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.DANGER,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Instructions
  instructionText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subInstructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Original small recording container (unused now)
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
    shadowColor: COLORS.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default VoiceRecorder;