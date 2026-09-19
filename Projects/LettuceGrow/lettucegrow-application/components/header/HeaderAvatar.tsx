import { useAppearance } from '@/contexts/AppearanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, TouchableOpacity, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function HeaderAvatar() {
  const { user } = useAuth();
  const { theme, colorScheme } = useAppearance();

  // Get profile image URI
  const getProfileImageUri = () => {
    if (user?.profile_img) {
      let imagePath = user.profile_img.trim();

      // Already a full URL
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
      }

      // Ensure leading slash
      if (!imagePath.startsWith("/")) {
        imagePath = `/${imagePath}`;
      }

      // New scheme: public/uploads/...
      if (imagePath.startsWith("/uploads/")) {
        return `${API_BASE_URL}${imagePath}`;
      }

      // Storage scheme: /storage/...
      if (imagePath.startsWith("/storage/")) {
        return `${API_BASE_URL}${imagePath}`;
      }

      // Legacy storage path: profiles/... -> /storage/profiles/...
      if (imagePath.startsWith("/profiles/")) {
        return `${API_BASE_URL}/storage${imagePath}`;
      }

      // Fallback: treat as uploads path
      return `${API_BASE_URL}/uploads${imagePath}`;
    }
    return null;
  };

  const handlePress = () => {
    router.push('/(app)/(drawer)/profile');
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      activeOpacity={0.7}
    >
      {getProfileImageUri() ? (
        <Image
          source={{ uri: getProfileImageUri()! }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: colorScheme === 'dark' ? theme.border : '#ffffff',
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colorScheme === 'dark' ? theme.backgroundTertiary : 'rgba(255, 255, 255, 0.2)',
            borderWidth: 2,
            borderColor: colorScheme === 'dark' ? theme.border : '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons 
            name="person" 
            size={20} 
            color={colorScheme === 'dark' ? theme.text : "#ffffff"} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

