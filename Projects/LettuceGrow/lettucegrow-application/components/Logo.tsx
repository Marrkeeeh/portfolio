import React from "react";
import { Image, StyleSheet, View } from "react-native";

interface LogoProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const sizeMap = {
  small: { container: 80, image: 80 },
  medium: { container: 100, image: 100 },
  large: { container: 130, image: 130 },
};

export default function Logo({ size = "medium", className = "" }: LogoProps) {
  const dimensions = sizeMap[size];
  const radius = dimensions.container / 2;

  return (
    <View className={`justify-center items-center ${className}`}>
      <View
        style={[
          styles.circularContainer,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: radius,
          },
        ]}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          style={[
            {
              width: dimensions.image,
              height: dimensions.image,
              borderRadius: radius,
            },
          ]}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circularContainer: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
