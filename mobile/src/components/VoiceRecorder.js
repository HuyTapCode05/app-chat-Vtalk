import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const VoiceRecorder = ({ onSendVoice, disabled }) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const animatedValue = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef(null);

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

      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

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
      animatedValue.stopAnimation();
      animatedValue.setValue(1);
      
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
      if (!recording) return;

      setIsRecording(false);
      animatedValue.stopAnimation();
      animatedValue.setValue(1);
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
      console.log('❌ Recording cancelled');
    } catch (error) {
      console.error('Failed to cancel recording', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color={COLORS.DANGER} />
        </TouchableOpacity>
        
        <View style={styles.recordingInfo}>
          <Animated.View 
            style={[
              styles.recordingIndicator,
              { transform: [{ scale: animatedValue }] }
            ]}
          >
            <Ionicons name="mic" size={20} color={COLORS.WHITE} />
          </Animated.View>
          <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
        </View>

        <TouchableOpacity onPress={stopRecording} style={styles.sendButton}>
          <Ionicons name="send" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>
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
  cancelButton: {
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.DANGER,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  sendButton: {
    marginLeft: 12,
  },
});

export default VoiceRecorder;