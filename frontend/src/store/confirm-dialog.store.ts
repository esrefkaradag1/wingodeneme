import { create } from 'zustand';

export type ConfirmDialogOptions = {
  /** Başlık (varsayılan: "Onay") */
  title?: string;
  /** Ana metin */
  message: string;
  onayMetni?: string;
  iptalMetni?: string;
  /** destructive: kırmızı vurgu */
  variant?: 'default' | 'destructive';
};

type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  onayMetni: string;
  iptalMetni: string;
  variant: 'default' | 'destructive';
  resolve: ((value: boolean) => void) | null;
};

export const useConfirmDialogStore = create<
  ConfirmDialogState & {
    ask: (opts: ConfirmDialogOptions) => Promise<boolean>;
    closeWith: (result: boolean) => void;
  }
>((set, get) => ({
  open: false,
  title: 'Onay',
  message: '',
  onayMetni: 'Tamam',
  iptalMetni: 'İptal',
  variant: 'destructive',
  resolve: null,

  ask: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: opts.title ?? 'Onay',
        message: opts.message,
        onayMetni: opts.onayMetni ?? 'Tamam',
        iptalMetni: opts.iptalMetni ?? 'İptal',
        variant: opts.variant ?? 'destructive',
        resolve,
      });
    }),

  closeWith: (result) => {
    const r = get().resolve;
    r?.(result);
    set({ open: false, resolve: null });
  },
}));

/** Hook kullanmadan (ör. onClick içinde) await ile kullanım */
export function confirmAsk(opts: ConfirmDialogOptions): Promise<boolean> {
  return useConfirmDialogStore.getState().ask(opts);
}
