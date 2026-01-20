import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const VoiceMessage = ({ 
  voiceUrl, 
  duration, 
  isOwn = false, 
  theme,
  baseUrl = 'http://192.168.1.5:5000'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [sound, setSound] = useState(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playSound = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      const fullUrl = voiceUrl.startsWith('http') ? voiceUrl : `${baseUrl}${voiceUrl}`;
      console.log('🎵 Playing voice:', fullUrl);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ Error playing voice:', error);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000);
      setIsPlaying(status.isPlaying);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const progress = duration > 0 ? Math.min(playbackPosition / duration, 1) : 0;

  return (
    <View style={[
      styles.container,
      { backgroundColor: isOwn ? theme.messageOwn : theme.messageOther }
    ]}>
      <TouchableOpacity 
        style={[styles.playButton, { backgroundColor: isOwn ? '#FFFFFF20' : '#00000020' }]}
        onPress={playSound}
      >
        <Ionicons 
          name={isPlaying ? "pause" : "play"} 
          size={20} 
          color={isOwn ? '#FFFFFF' : theme.text} 
        />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <View style={styles.waveformContainer}>
          {Array.from({ length: 20 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: Math.random() * 20 + 8,
                  backgroundColor: i / 20 < progress 
                    ? (isOwn ? '#FFFFFF' : theme.primary)
                    : (isOwn ? '#FFFFFF60' : '#00000040')
                }
              ]}
            />
          ))}
        </View>
        
        <Text style={[styles.duration, { color: isOwn ? '#FFFFFF' : theme.textSecondary }]}>
          {formatTime(isPlaying ? playbackPosition : duration || 0)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 180,
    maxWidth: 250,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    height: 24,
  },
  waveBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1.5,
    backgroundColor: '#ccc',
  },
  duration: {
    fontSize: 12,
    marginLeft: 8,
    minWidth: 30,
  },
});

export default VoiceMessage;