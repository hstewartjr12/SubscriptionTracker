import * as Haptics from 'expo-haptics';

export const haptics = {
  // Light impact for subtle feedback
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Medium impact for standard interactions
  medium: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Heavy impact for important actions
  heavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // Success notification
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Warning notification
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  // Error notification
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Selection feedback
  selection: () => {
    Haptics.selectionAsync();
  },
};

// Haptic feedback for different interaction types
export const hapticFeedback = {
  // Button press
  buttonPress: () => haptics.light(),
  
  // Card selection
  cardSelect: () => haptics.medium(),
  
  // Navigation
  navigation: () => haptics.light(),
  
  // Form submission
  formSubmit: () => haptics.success(),
  
  // Error state
  error: () => haptics.error(),
  
  // Warning state
  warning: () => haptics.warning(),
  
  // Success state
  success: () => haptics.success(),
  
  // Long press
  longPress: () => haptics.heavy(),
  
  // Swipe action
  swipe: () => haptics.medium(),
  
  // Toggle switch
  toggle: () => haptics.light(),
  
  // Slider interaction
  slider: () => haptics.light(),
  
  // Pull to refresh
  pullToRefresh: () => haptics.medium(),
  
  // Delete action
  delete: () => haptics.heavy(),
  
  // Add action
  add: () => haptics.success(),
  
  // Save action
  save: () => haptics.success(),
  
  // Cancel action
  cancel: () => haptics.light(),
};

export default haptics; 