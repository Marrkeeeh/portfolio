import React, { useCallback, useState } from "react";
import Dialog, { DialogButton, DialogProps } from "./Dialog";

export interface UseDialogOptions {
  title?: string;
  message: string;
  buttons?: DialogButton[];
  icon?: DialogProps["icon"];
  iconColor?: string;
  showCloseButton?: boolean;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: DialogButton["variant"];
  cancelVariant?: DialogButton["variant"];
  icon?: DialogProps["icon"];
  iconColor?: string;
  showCloseButton?: boolean;
  destructive?: boolean; // If true, uses error/danger styling for confirm button
}

export function useDialog() {
  const [visible, setVisible] = useState(false);
  const [dialogProps, setDialogProps] = useState<UseDialogOptions>({
    message: "",
  });

  const showDialog = useCallback((options: UseDialogOptions) => {
    setDialogProps(options);
    setVisible(true);
  }, []);

  const hideDialog = useCallback(() => {
    setVisible(false);
  }, []);

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      const {
        title,
        message,
        confirmText = "OK",
        cancelText = "Cancel",
        confirmVariant = "primary",
        cancelVariant = "secondary",
        icon,
        iconColor,
        showCloseButton,
        destructive,
      } = options;
      
      // Use danger variant if destructive is true
      const finalConfirmVariant = destructive ? "danger" : confirmVariant;

      return new Promise<boolean>((resolve) => {
        const buttons: DialogButton[] = [
          {
            text: cancelText,
            variant: cancelVariant,
            onPress: () => resolve(false),
          },
          {
            text: confirmText,
            variant: finalConfirmVariant,
            onPress: () => resolve(true),
          },
        ];

        showDialog({
          title,
          message,
          buttons,
          icon,
          iconColor,
          showCloseButton,
        });
      });
    },
    [showDialog],
  );

  const DialogComponent = useCallback(
    () => (
      <Dialog
        visible={visible}
        {...dialogProps}
        onClose={hideDialog}
      />
    ),
    [visible, dialogProps, hideDialog]
  );

  return {
    showDialog,
    hideDialog,
    confirm,
    Dialog: DialogComponent,
  };
}

// Helper function to create Alert-like dialogs
export function createAlertDialog(
  title: string,
  message: string,
  buttons?: DialogButton[]
) {
  return {
    title,
    message,
    buttons: buttons || [{ text: "OK" }],
  };
}

