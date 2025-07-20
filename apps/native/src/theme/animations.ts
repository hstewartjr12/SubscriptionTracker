import { Animated, Easing } from 'react-native';
import { animation } from './theme';

// Animation Presets
export const animationPresets = {
  // Fade animations
  fadeIn: {
    toValue: 1,
    duration: animation.duration.normal,
    easing: Easing.out(Easing.cubic),
  },
  fadeOut: {
    toValue: 0,
    duration: animation.duration.fast,
    easing: Easing.in(Easing.cubic),
  },
  
  // Slide animations
  slideInRight: {
    toValue: 0,
    duration: animation.duration.normal,
    easing: Easing.out(Easing.cubic),
  },
  slideOutRight: {
    toValue: 100,
    duration: animation.duration.fast,
    easing: Easing.in(Easing.cubic),
  },
  slideInLeft: {
    toValue: 0,
    duration: animation.duration.normal,
    easing: Easing.out(Easing.cubic),
  },
  slideOutLeft: {
    toValue: -100,
    duration: animation.duration.fast,
    easing: Easing.in(Easing.cubic),
  },
  slideInUp: {
    toValue: 0,
    duration: animation.duration.normal,
    easing: Easing.out(Easing.cubic),
  },
  slideOutDown: {
    toValue: 100,
    duration: animation.duration.fast,
    easing: Easing.in(Easing.cubic),
  },
  
  // Scale animations
  scaleIn: {
    toValue: 1,
    duration: animation.duration.normal,
    easing: Easing.out(Easing.back(1.2)),
  },
  scaleOut: {
    toValue: 0.8,
    duration: animation.duration.fast,
    easing: Easing.in(Easing.cubic),
  },
  
  // Bounce animations
  bounceIn: {
    toValue: 1,
    duration: animation.duration.slow,
    easing: Easing.out(Easing.bounce),
  },
  
  // Pulse animations
  pulse: {
    toValue: 1.05,
    duration: animation.duration.fast,
    easing: Easing.inOut(Easing.cubic),
  },
};

// Animation Hooks
export const useFadeAnimation = (initialValue = 0) => {
  const fadeAnim = new Animated.Value(initialValue);
  
  const fadeIn = (callback?: () => void) => {
    Animated.timing(fadeAnim, {
      ...animationPresets.fadeIn,
      useNativeDriver: true,
    }).start(callback);
  };
  
  const fadeOut = (callback?: () => void) => {
    Animated.timing(fadeAnim, {
      ...animationPresets.fadeOut,
      useNativeDriver: true,
    }).start(callback);
  };
  
  return { fadeAnim, fadeIn, fadeOut };
};

export const useSlideAnimation = (initialValue = 100) => {
  const slideAnim = new Animated.Value(initialValue);
  
  const slideIn = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      ...animationPresets.slideInUp,
      useNativeDriver: true,
    }).start(callback);
  };
  
  const slideOut = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      ...animationPresets.slideOutDown,
      useNativeDriver: true,
    }).start(callback);
  };
  
  return { slideAnim, slideIn, slideOut };
};

export const useScaleAnimation = (initialValue = 0.8) => {
  const scaleAnim = new Animated.Value(initialValue);
  
  const scaleIn = (callback?: () => void) => {
    Animated.timing(scaleAnim, {
      ...animationPresets.scaleIn,
      useNativeDriver: true,
    }).start(callback);
  };
  
  const scaleOut = (callback?: () => void) => {
    Animated.timing(scaleAnim, {
      ...animationPresets.scaleOut,
      useNativeDriver: true,
    }).start(callback);
  };
  
  const pulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        ...animationPresets.pulse,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: animation.duration.fast,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  return { scaleAnim, scaleIn, scaleOut, pulse };
};

export const useBounceAnimation = () => {
  const bounceAnim = new Animated.Value(0);
  
  const bounceIn = (callback?: () => void) => {
    Animated.timing(bounceAnim, {
      ...animationPresets.bounceIn,
      useNativeDriver: true,
    }).start(callback);
  };
  
  return { bounceAnim, bounceIn };
};

// Loading Animation
export const useLoadingAnimation = () => {
  const spinValue = new Animated.Value(0);
  
  const startSpinning = () => {
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };
  
  const stopSpinning = () => {
    spinValue.stopAnimation();
  };
  
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return { spin, startSpinning, stopSpinning };
};

// Shake Animation
export const useShakeAnimation = () => {
  const shakeAnim = new Animated.Value(0);
  
  const shake = (callback?: () => void) => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };
  
  return { shakeAnim, shake };
};

// Stagger Animation
export const useStaggerAnimation = (count: number, delay = 50) => {
  const animations = Array.from({ length: count }, () => new Animated.Value(0));
  
  const startStagger = (callback?: () => void) => {
    const anims = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: animation.duration.normal,
        delay: index * delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    
    Animated.parallel(anims).start(callback);
  };
  
  const resetStagger = () => {
    animations.forEach(anim => anim.setValue(0));
  };
  
  return { animations, startStagger, resetStagger };
};

// Screen Transition Animations
export const screenTransitions = {
  // Slide from right (push)
  slideFromRight: {
    transform: [
      {
        translateX: new Animated.Value(0),
      },
    ],
  },
  
  // Slide from left (pop)
  slideFromLeft: {
    transform: [
      {
        translateX: new Animated.Value(0),
      },
    ],
  },
  
  // Fade transition
  fade: {
    opacity: new Animated.Value(1),
  },
  
  // Scale transition
  scale: {
    transform: [
      {
        scale: new Animated.Value(1),
      },
    ],
  },
};

// Micro-interaction Animations
export const microInteractions = {
  // Button press animation
  buttonPress: (scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  },
  
  // Card hover animation
  cardHover: (scale: Animated.Value, elevation: Animated.Value) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.02,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(elevation, {
        toValue: 8,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  },
  
  // Card leave animation
  cardLeave: (scale: Animated.Value, elevation: Animated.Value) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(elevation, {
        toValue: 2,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  },
};

export default {
  animationPresets,
  useFadeAnimation,
  useSlideAnimation,
  useScaleAnimation,
  useBounceAnimation,
  useLoadingAnimation,
  useShakeAnimation,
  useStaggerAnimation,
  screenTransitions,
  microInteractions,
}; 