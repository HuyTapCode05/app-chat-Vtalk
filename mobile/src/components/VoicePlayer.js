import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const VoicePlayer = ({ audioUri, duration, isOwn, onError }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const positionInterval = useRef(null);

  useEffect(() => {
    return sound
      ? () => {
          console.log('🔊 Unloading Sound');
          sound.unloadAsync();
          if (positionInterval.current) {
            clearInterval(positionInterval.current);
          }
        }
      : undefined;
  }, [sound]);

  const loadSound = async () => {
    try {
      setIsLoading(true);
      console.log('🔊 Loading Sound from:', audioUri);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }
      );
      
      setSound(newSound);
      
      // Get duration if not provided
      if (!duration) {
        const status = await newSound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setTotalDuration(Math.round(status.durationMillis / 1000));
        }
      }
      
      return newSound;
    } catch (error) {
      console.error('Error loading sound:', error);
      onError?.('Không thể phát file âm thanh');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const playSound = async () => {
    try {
      let currentSound = sound;
      
      if (!currentSound) {
        currentSound = await loadSound();
        if (!currentSound) return;
      }

      console.log('▶️ Playing sound');
      await currentSound.playAsync();
      setIsPlaying(true);

      // Start position tracking
      positionInterval.current = setInterval(async () => {
        try {
          const status = await currentSound.getStatusAsync();
          if (status.isLoaded && status.positionMillis) {
            setCurrentPosition(Math.round(status.positionMillis / 1000));
            
            // Check if finished
            if (status.didJustFinish) {
              setIsPlaying(false);
              setCurrentPosition(0);
              if (positionInterval.current) {
                clearInterval(positionInterval.current);
              }
            }
          }
        } catch (error) {
          console.error('Error tracking position:', error);
        }
      }, 100);

    } catch (error) {
      console.error('Error playing sound:', error);
      onError?.('Không thể phát file âm thanh');
      setIsPlaying(false);
    }
  };

  const pauseSound = async () => {
    try {
      if (sound) {
        console.log('⏸️ Pausing sound');
        await sound.pauseAsync();
        setIsPlaying(false);
        if (positionInterval.current) {
          clearInterval(positionInterval.current);
        }
      }
    } catch (error) {
      console.error('Error pausing sound:', error);
    }
  };

  const stopSound = async () => {
    try {
      if (sound) {
        console.log('⏹️ Stopping sound');
        await sound.stopAsync();
        setIsPlaying(false);
        setCurrentPosition(0);
        if (positionInterval.current) {
          clearInterval(positionInterval.current);
        }
      }
    } catch (error) {
      console.error('Error stopping sound:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (totalDuration === 0) return 0;
    return (currentPosition / totalDuration) * 100;
  };

  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownMessage : styles.otherMessage
    ]}>
      <TouchableOpacity
        onPress={isPlaying ? pauseSound : playSound}
        disabled={isLoading}
        style={[
          styles.playButton,
          isOwn ? styles.ownPlayButton : styles.otherPlayButton
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isOwn ? COLORS.WHITE : COLORS.PRIMARY} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={isOwn ? COLORS.WHITE : COLORS.PRIMARY}
          />
        )}
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        <View style={styles.waveformBackground}>
          <View 
            style={[
              styles.waveformProgress,
              { 
                width: `${getProgress()}%`,
                backgroundColor: isOwn ? COLORS.WHITE : COLORS.PRIMARY
              }
            ]}
          />
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={[
            styles.timeText,
            isOwn ? styles.ownTimeText : styles.otherTimeText
          ]}>
            {formatTime(currentPosition)} / {formatTime(totalDuration)}
          </Text>
        </View>
      </View>

      {isPlaying && (
        <TouchableOpacity onPress={stopSound} style={styles.stopButton}>
          <Ionicons
            name="stop"
            size={16}
            color={isOwn ? COLORS.WHITE : COLORS.PRIMARY}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 200,
    maxWidth: 250,
  },
  ownMessage: {
    backgroundColor: COLORS.PRIMARY,
  },
  otherMessage: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ownPlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  otherPlayButton: {
    backgroundColor: 'rgba(0, 177, 79, 0.1)',
  },
  waveformContainer: {
    flex: 1,
  },
  waveformBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  waveformProgress: {
    height: '100%',
    borderRadius: 2,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ownTimeText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimeText: {
    color: COLORS.TEXT_SECONDARY,
  },
  stopButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default VoicePlayer;