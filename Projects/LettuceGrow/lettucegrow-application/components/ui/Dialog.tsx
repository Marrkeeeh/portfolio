import { useAppearance } from "@/contexts/AppearanceContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Button from "./Button";

export interface DialogButton {
  text: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  style?: object;
}

export interface DialogProps {
  visible: boolean;
  title?: string;
  message: string;
  buttons?: DialogButton[];
  onClose?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  showCloseButton?: boolean;
}

export default function Dialog({
  visible,
  title,
  message,
  buttons = [{ text: "OK" }],
  onClose,
  icon,
  iconColor = "#059669",
  showCloseButton = false,
}: DialogProps) {
  const { theme, colorScheme } = useAppearance();

  const handleButtonPress = (button: DialogButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            styles.overlay,
            {
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(15, 23, 42, 0.85)"
                  : "rgba(0, 0, 0, 0.5)",
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[
                styles.dialog,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
            >
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              )}

              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                  <Ionicons name={icon} size={32} color={iconColor} />
                </View>
              )}

              {title && (
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              )}
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                {message}
              </Text>

              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <Button
                    key={index}
                    title={button.text}
                    variant={button.variant || "primary"}
                    onPress={() => handleButtonPress(button)}
                    containerStyle={[
                      buttons.length === 1 && styles.singleButton,
                      button.style,
                    ]}
                    fullWidth={buttons.length === 1}
                  />
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  singleButton: {
    flex: 1,
  },
});

