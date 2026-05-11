import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { theme } from '../theme';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmDestructive?: boolean;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmDestructive = false,
}: ConfirmModalProps) {
  const confirmBg = confirmDestructive ? theme.colors.danger : theme.colors.accent;
  const confirmFg = confirmDestructive ? '#fff' : theme.colors.accentText;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={s.backdrop} onPress={onCancel}>
        <Pressable style={s.card} onPress={() => {}}>
          <Text style={s.title}>{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: confirmBg }]}
              onPress={onConfirm}
            >
              <Text style={[s.confirmText, { color: confirmFg }]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDestructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(opts => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
      setState(opts);
    });
  }, []);

  const close = (result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState(null);
    resolve?.(result);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        visible={!!state}
        title={state?.title || ''}
        message={state?.message || ''}
        confirmLabel={state?.confirmLabel}
        confirmDestructive={state?.confirmDestructive}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: theme.spacing.sm,
  },
  message: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cancelText: {
    color: theme.colors.muted,
    fontWeight: '900',
    fontSize: 14,
  },
  confirmText: {
    fontWeight: '900',
    fontSize: 14,
  },
});
