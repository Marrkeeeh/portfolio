import { useAppearance } from "@/contexts/AppearanceContext";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface SemiCircularGaugeProps {
  value: number;
  min: number;
  max: number;
  optimalMin?: number;
  optimalMax?: number;
  unit?: string;
  colors?: string[];
  size?: number;
}

export default function SemiCircularGauge({
  value,
  min,
  max,
  optimalMin,
  optimalMax,
  unit = "",
  colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6"],
  size = 100,
}: SemiCircularGaugeProps) {
  const { theme } = useAppearance();
  
  // Calculate initial percentage and angle
  const initialPercentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const initialAngle = (initialPercentage / 100) * 180;
  
  // Animated values - initialize with current values
  const animatedAngle = useRef(new Animated.Value(initialAngle)).current;
  const animatedValue = useRef(new Animated.Value(value)).current;
  
  // State for current animated values
  const [currentAngle, setCurrentAngle] = useState(initialAngle);
  const [displayValue, setDisplayValue] = useState(value);
  
  // Calculate current percentage and target angle
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const targetAngle = (percentage / 100) * 180;
  
  // Animate angle and value when they change
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedAngle, {
        toValue: targetAngle,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedValue, {
        toValue: value,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, targetAngle, animatedAngle, animatedValue]);
  
  // Listen to animated value changes
  useEffect(() => {
    const angleListener = animatedAngle.addListener(({ value: angleValue }) => {
      setCurrentAngle(angleValue);
    });
    const valueListener = animatedValue.addListener(({ value: numValue }) => {
      setDisplayValue(numValue);
    });
    
    return () => {
      animatedAngle.removeListener(angleListener);
      animatedValue.removeListener(valueListener);
    };
  }, [animatedAngle, animatedValue]);
  
  // SVG dimensions
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 8;
  
  // Create arc path for the filled portion
  const createArcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };
  
  // Convert polar to cartesian coordinates
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };
  
  const getColor = () => {
    const [critical, warning, optimal] = colors;

    if (optimalMin !== undefined && optimalMax !== undefined) {
      if (value >= optimalMin && value <= optimalMax) {
        return optimal;
      }

      const optimalWidth = optimalMax - optimalMin;
      const distanceFromOptimal =
        value < optimalMin ? optimalMin - value : value - optimalMax;

      if (distanceFromOptimal <= optimalWidth) {
        return warning;
      }

      return critical;
    }

    if (percentage < 25) return critical;
    if (percentage < 50) return warning;
    if (percentage < 75) return optimal;
    return colors[3] ?? optimal;
  };
  
  const gaugeColor = getColor();
  
  // Create segments for the background
  const segments = 4;
  const segmentAngle = 180 / segments;
  
  return (
    <View style={[styles.container, { width: size, height: size / 2 + 5 }]}>
      <Svg width={size} height={size / 2 + 5} viewBox={`0 0 ${size} ${size / 2 + 5}`}>
        {/* Background arc segments */}
        {Array.from({ length: segments }).map((_, index) => {
          const startAngle = index * segmentAngle;
          const endAngle = (index + 1) * segmentAngle;
          const path = createArcPath(startAngle, endAngle);
          return (
            <Path
              key={index}
              d={path}
              stroke={theme.backgroundSecondary}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* Filled arc */}
        {currentAngle > 0 && (
          <Path
            d={createArcPath(0, currentAngle)}
            stroke={gaugeColor}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      
      {/* Value text */}
      <View style={[styles.valueContainer, { bottom: 5 }]}>
        <Text style={[styles.valueText, { color: theme.text }]}>
          {displayValue.toFixed(2)}
        </Text>
        {unit && (
          <Text style={[styles.unitText, { color: theme.textSecondary }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    marginVertical: 8,
    overflow: 'hidden',
  },
  valueContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  valueText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  unitText: {
    fontSize: 9,
    marginTop: 1,
  },
});
