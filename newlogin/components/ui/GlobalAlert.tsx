import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useStyles } from './GlobalAlert.styles';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertConfig {
  type: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  autoClose?: boolean;
  duration?: number;
}

interface GlobalAlertProps {
  visible: boolean;
  config: AlertConfig | null;
  onClose: () => void;
}


export function GlobalAlert({ visible, config, onClose }: GlobalAlertProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  React.useEffect(() => {
    // Auto close if enabled
    if (visible && config?.autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, config.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, config]);

  const handleClose = () => {
    onClose();
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    handleClose();
  };

  if (!config) return null;

  const buttons = config.buttons || [{ text: 'OK', style: 'default' }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.alertContainer}>
            <TouchableOpacity activeOpacity={1}>
              {/* Title */}
              <Text style={styles.title}>
                {config.title}
              </Text>

              {/* Message */}
              {config.message && (
                <Text style={styles.message}>{config.message}</Text>
              )}

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      button.style === 'default' && styles.defaultButton,
                      button.style === 'cancel' && styles.cancelButton,
                      button.style === 'destructive' && styles.destructiveButton,
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        button.style === 'default' && styles.defaultButtonText,
                        button.style === 'cancel' && styles.cancelButtonText,
                        button.style === 'destructive' && styles.destructiveButtonText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

