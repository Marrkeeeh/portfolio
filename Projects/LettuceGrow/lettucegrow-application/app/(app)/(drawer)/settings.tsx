import { OtpInput, useDialog } from '@/components/ui';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import KeyboardAwareScrollView from '@/components/ui/KeyboardAwareScrollView';
import { useAppearance } from '@/contexts/AppearanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppearanceMode = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const { appearanceMode, setAppearanceMode, theme } = useAppearance();
  const { 
    changePassword,
    user,
    startTwoFactorSetup,
    verifyTwoFactorSetupCode,
    disableTwoFactorAuth,
    getTwoFactorRecoveryCodesForUser,
  } = useAuth();
  const { showDialog, Dialog: DialogComponent } = useDialog();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [passwordErrors, setPasswordErrors] = React.useState<{
    current?: string;
    password?: string;
    confirm?: string;
  }>({});

  // Two-factor authentication state
  const [twoFactorSecret, setTwoFactorSecret] = React.useState<string | null>(null);
  const [twoFactorQrUrl, setTwoFactorQrUrl] = React.useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = React.useState('');
  const [twoFactorCodeError, setTwoFactorCodeError] = React.useState<string | undefined>();
  const [twoFactorLoading, setTwoFactorLoading] = React.useState(false);
  const [enablePassword, setEnablePassword] = React.useState('');
  const [enablePasswordError, setEnablePasswordError] = React.useState<string | undefined>();
  const [disablePassword, setDisablePassword] = React.useState('');
  const [disablePasswordError, setDisablePasswordError] = React.useState<string | undefined>();
  const [disableLoading, setDisableLoading] = React.useState(false);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null);
  const [recoveryLoading, setRecoveryLoading] = React.useState(false);

  const twoFactorEnabled = !!user?.two_factor_enabled;

  const appearanceOptions: { mode: AppearanceMode; label: string; icon: string; description: string }[] = [
    {
      mode: 'light',
      label: 'Light',
      icon: 'sunny',
      description: 'Always use light theme',
    },
    {
      mode: 'dark',
      label: 'Dark',
      icon: 'moon',
      description: 'Always use dark theme',
    },
    {
      mode: 'system',
      label: 'System',
      icon: 'phone-portrait',
      description: 'Follow system appearance',
    },
  ];

  const handleAppearanceChange = async (mode: AppearanceMode) => {
    await setAppearanceMode(mode);
  };

  const validatePasswordForm = () => {
    const errors: { current?: string; password?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = 'Current password is required';
    }
    if (!newPassword) {
      errors.password = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      errors.confirm = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirm = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setIsSubmitting(true);
    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword);
      if (!result.success) {
        if (result.fieldErrors) {
          const errors: { current?: string; password?: string; confirm?: string } = {};
          if (result.fieldErrors.current_password && result.fieldErrors.current_password.length > 0) {
            errors.current = result.fieldErrors.current_password[0];
          }
          if (result.fieldErrors.password && result.fieldErrors.password.length > 0) {
            errors.password = result.fieldErrors.password[0];
          }
          setPasswordErrors(errors);
        } else if (result.error) {
          showDialog({
            title: 'Change password failed',
            message: result.error,
            icon: 'alert-circle-outline',
            iconColor: '#ef4444',
          });
        }
      } else {
        setPasswordErrors({});
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showDialog({
          title: 'Password updated',
          message: result.message || 'Your password has been changed successfully.',
          icon: 'checkmark-circle-outline',
          iconColor: '#059669',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTwoFactor = async () => {
    if (!enablePassword) {
      setEnablePasswordError('Current password is required to enable 2FA');
      return;
    }

    setTwoFactorCode('');
    setTwoFactorCodeError(undefined);
    setTwoFactorLoading(true);
    try {
      const result = await startTwoFactorSetup(enablePassword);
      if (!result.success) {
        showDialog({
          title: 'Enable 2FA failed',
          message: result.error || result.message || 'Unable to start two-factor setup.',
          icon: 'alert-circle-outline',
          iconColor: '#ef4444',
        });
        return;
      }

      setTwoFactorSecret(result.secret || null);
      setTwoFactorQrUrl(result.qrCodeUrl || null);
      setEnablePassword('');
      setEnablePasswordError(undefined);
      showDialog({
        title: 'Two-factor setup started',
        message: 'Scan the QR code with your authenticator app, then enter the 6-digit code below.',
        icon: 'shield-checkmark-outline',
        iconColor: '#059669',
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerifyTwoFactorSetup = async () => {
    if (!twoFactorCode.trim()) {
      setTwoFactorCodeError('Verification code is required');
      return;
    }

    setTwoFactorCodeError(undefined);
    setTwoFactorLoading(true);
    try {
      const result = await verifyTwoFactorSetupCode(twoFactorCode.trim());
      if (!result.success) {
        setTwoFactorCodeError(result.error || 'Invalid verification code');
        return;
      }

      setTwoFactorSecret(null);
      setTwoFactorQrUrl(null);
      setTwoFactorCode('');
      setRecoveryCodes(null);
      showDialog({
        title: 'Two-factor enabled',
        message: result.message || 'Two-factor authentication has been enabled on your account.',
        icon: 'checkmark-circle-outline',
        iconColor: '#059669',
      });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleCancelTwoFactorSetup = () => {
    setTwoFactorSecret(null);
    setTwoFactorQrUrl(null);
    setTwoFactorCode('');
    setTwoFactorCodeError(undefined);
  };

  const handleCopyTwoFactorSecret = async () => {
    if (!twoFactorSecret) {
      return;
    }

    try {
      await Clipboard.setStringAsync(twoFactorSecret);
      showDialog({
        title: 'Key copied',
        message: 'The two-factor authentication key has been copied to your clipboard.',
        icon: 'copy-outline',
        iconColor: theme.primary,
      });
    } catch (error: any) {
      showDialog({
        title: 'Copy failed',
        message: error?.message || 'Unable to copy the two-factor key. Please try again.',
        icon: 'alert-circle-outline',
        iconColor: '#ef4444',
      });
    }
  };

  const handleOpenAuthenticatorApp = async () => {
    try {
      const url =
        twoFactorQrUrl ||
        (twoFactorSecret
          ? `otpauth://totp/LettuceGrow?secret=${encodeURIComponent(twoFactorSecret)}&issuer=LettuceGrow`
          : null);

      if (!url) {
        showDialog({
          title: 'Authenticator unavailable',
          message: 'No authenticator link is available. Please use the QR code or manual key.',
          icon: 'alert-circle-outline',
          iconColor: '#ef4444',
        });
        return;
      }

      await Linking.openURL(url);
    } catch (error: any) {
      showDialog({
        title: 'Could not open authenticator',
        message: error?.message || 'Your device could not open the authenticator app.',
        icon: 'alert-circle-outline',
        iconColor: '#ef4444',
      });
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!disablePassword) {
      setDisablePasswordError('Current password is required to disable 2FA');
      return;
    }

    setDisablePasswordError(undefined);
    setDisableLoading(true);
    try {
      const result = await disableTwoFactorAuth(disablePassword);
      if (!result.success) {
        setDisablePasswordError(result.error || 'Failed to disable two-factor authentication');
        return;
      }

      setDisablePassword('');
      setRecoveryCodes(null);
      setTwoFactorSecret(null);
      setTwoFactorQrUrl(null);
      showDialog({
        title: 'Two-factor disabled',
        message: result.message || 'Two-factor authentication has been disabled.',
        icon: 'alert-circle-outline',
        iconColor: '#f97316',
      });
    } finally {
      setDisableLoading(false);
    }
  };

  const handleLoadRecoveryCodes = async () => {
    setRecoveryLoading(true);
    try {
      const result = await getTwoFactorRecoveryCodesForUser();
      if (!result.success || !result.codes) {
        showDialog({
          title: 'Recovery codes unavailable',
          message: result.error || result.message || 'Could not load recovery codes.',
          icon: 'alert-circle-outline',
          iconColor: '#ef4444',
        });
        return;
      }

      setRecoveryCodes(result.codes);
      showDialog({
        title: 'Recovery codes loaded',
        message: 'Store these codes in a safe place. Each code can be used once.',
        icon: 'information-circle-outline',
        iconColor: '#0ea5e9',
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <>
      <DialogComponent />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}
        edges={["bottom", "left", "right"]}
      >
        <KeyboardAwareScrollView
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          overScrollMode="never"
        >
          <View style={{ paddingHorizontal: 24, paddingBottom: 32, marginTop: 8 }}>
            {/* Appearance Section */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16 }}>
                Appearance
              </Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 16 }}>
                Choose how LettuceGrow looks to you
              </Text>

              <View>
                {appearanceOptions.map((option, index) => {
                  const isSelected = appearanceMode === option.mode;
                  return (
                    <TouchableOpacity
                      key={option.mode}
                      onPress={() => handleAppearanceChange(option.mode)}
                      className="flex-row items-center rounded-xl px-4 py-4 border-2"
                      style={{
                        marginBottom: index < appearanceOptions.length - 1 ? 8 : 0,
                        backgroundColor: isSelected ? theme.backgroundTertiary : theme.background,
                        borderColor: isSelected ? theme.primary : theme.border,
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                        }}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={isSelected ? '#ffffff' : theme.textSecondary}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: isSelected ? theme.primary : theme.text,
                          }}
                        >
                          {option.label}
                        </Text>
                        <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 2 }}>
                          {option.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={theme.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Change Password Section */}
            <View style={{ marginTop: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16 }}>
                Change Password
              </Text>
              <View
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Input
                  label="Current Password"
                  secureTextEntry
                  showPasswordToggle
                  passwordVisible={showCurrent}
                  onTogglePassword={() => setShowCurrent((v) => !v)}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  error={passwordErrors.current}
                  containerStyle={{ marginBottom: 12 }}
                />
                <Input
                  label="New Password"
                  secureTextEntry
                  showPasswordToggle
                  passwordVisible={showNew}
                  onTogglePassword={() => setShowNew((v) => !v)}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  error={passwordErrors.password}
                  containerStyle={{ marginBottom: 12 }}
                />
                <Input
                  label="Confirm New Password"
                  secureTextEntry
                  showPasswordToggle
                  passwordVisible={showConfirm}
                  onTogglePassword={() => setShowConfirm((v) => !v)}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  error={passwordErrors.confirm}
                  containerStyle={{ marginBottom: 4 }}
                />
                <Button
                  title="Update Password"
                  variant="primary"
                  size="medium"
                  icon="key-outline"
                  fullWidth
                  loading={isSubmitting}
                  onPress={handleChangePassword}
                  containerStyle={{ marginTop: 8 }}
                />
              </View>
            </View>

            {/* Two-Factor Authentication Section */}
            <View style={{ marginTop: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16 }}>
                Two-Factor Authentication
              </Text>
              <View
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                  Status: <Text style={{ fontWeight: '600', color: twoFactorEnabled ? theme.success : theme.error }}>
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </Text>

                {!twoFactorEnabled && (
                  <>
                    <Text style={{ fontSize: 13, color: theme.textTertiary, marginBottom: 12 }}>
                      Protect your account with an extra security step using an authenticator app.
                    </Text>
                    {!twoFactorSecret && !twoFactorQrUrl && (
                      <>
                        <Input
                          label="Current Password"
                          secureTextEntry
                          showPasswordToggle
                          value={enablePassword}
                          onChangeText={(text: string) => {
                            setEnablePassword(text);
                            setEnablePasswordError(undefined);
                          }}
                          placeholder="Enter current password to enable 2FA"
                          error={enablePasswordError}
                          containerStyle={{ marginBottom: 12 }}
                        />
                        <Button
                          title="Enable Two-Factor Authentication"
                          variant="primary"
                          size="medium"
                          icon="shield-checkmark-outline"
                          fullWidth
                          loading={twoFactorLoading}
                          onPress={handleStartTwoFactor}
                          containerStyle={{ marginBottom: 12 }}
                        />
                      </>
                    )}

                    {(twoFactorSecret || twoFactorQrUrl) && (
                      <View style={{ marginTop: 8 }}>
                        {twoFactorQrUrl && (
                          <View style={{ alignItems: 'center', marginBottom: 12 }}>
                            <QRCode
                              value={twoFactorQrUrl}
                              size={160}
                              color={theme.text}
                              backgroundColor="transparent"
                            />
                          </View>
                        )}
                        {twoFactorSecret && (
                          <View style={{ marginBottom: 12 }}>
                            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>
                              Or manually enter this key in your authenticator app:
                            </Text>
                            <Text
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 14,
                                color: theme.primary,
                                paddingVertical: 4,
                              }}
                            >
                              {twoFactorSecret}
                            </Text>
                            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                              <TouchableOpacity
                                onPress={handleCopyTwoFactorSecret}
                                style={{ marginRight: 16 }}
                                activeOpacity={0.7}
                              >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                                  Copy key
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={handleOpenAuthenticatorApp}
                                activeOpacity={0.7}
                              >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                                  Open authenticator app
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                        <OtpInput
                          label="Verification Code"
                          value={twoFactorCode}
                          onChange={(text: string) => {
                            setTwoFactorCode(text);
                            setTwoFactorCodeError(undefined);
                          }}
                          error={twoFactorCodeError}
                          containerStyle={{ marginBottom: 8 }}
                        />
                        <Button
                          title="Confirm 2FA Setup"
                          variant="primary"
                          size="medium"
                          icon="checkmark-circle-outline"
                          fullWidth
                          loading={twoFactorLoading}
                          onPress={handleVerifyTwoFactorSetup}
                          containerStyle={{ marginBottom: 8 }}
                        />
                        <Button
                          title="Cancel"
                          variant="outline"
                          size="medium"
                          icon="close-circle-outline"
                          fullWidth
                          onPress={handleCancelTwoFactorSetup}
                        />
                      </View>
                    )}
                  </>
                )}

                {twoFactorEnabled && (
                  <>
                    <Text style={{ fontSize: 13, color: theme.textTertiary, marginBottom: 12 }}>
                      You have two-factor authentication enabled. Use recovery codes if you lose access to your device.
                    </Text>

                    <Button
                      title="View Recovery Codes"
                      variant="outline"
                      size="medium"
                      icon="list-outline"
                      fullWidth
                      loading={recoveryLoading}
                      onPress={handleLoadRecoveryCodes}
                      containerStyle={{ marginBottom: 12 }}
                    />

                    {recoveryCodes && recoveryCodes.length > 0 && (
                      <View
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: theme.backgroundSecondary,
                          marginBottom: 12,
                        }}
                      >
                        {recoveryCodes.map((code, index) => (
                          <Text
                            key={code + index}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 13,
                              color: theme.text,
                              marginBottom: index < recoveryCodes.length - 1 ? 4 : 0,
                            }}
                          >
                            • {code}
                          </Text>
                        ))}
                      </View>
                    )}

                    <Input
                      label="Current Password"
                      secureTextEntry
                      showPasswordToggle
                      value={disablePassword}
                      onChangeText={(text: string) => {
                        setDisablePassword(text);
                        setDisablePasswordError(undefined);
                      }}
                      placeholder="Enter current password to disable 2FA"
                      error={disablePasswordError}
                      containerStyle={{ marginBottom: 8 }}
                    />
                    <Button
                      title="Disable Two-Factor Authentication"
                      variant="danger"
                      size="medium"
                      icon="warning-outline"
                      fullWidth
                      loading={disableLoading}
                      onPress={handleDisableTwoFactor}
                    />
                  </>
                )}
              </View>
            </View>

            {/* Additional Settings Section */}
            <View style={{ marginTop: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16 }}>
                Other Settings
              </Text>
              <Text style={{ fontSize: 14, color: theme.textTertiary }}>
                More settings coming soon...
              </Text>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </>
  );
}
