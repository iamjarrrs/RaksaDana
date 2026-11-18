import { createContext, useContext, useState, useRef, useCallback, useEffect, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({
    title: 'Konfirmasi',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    cancelText: 'Batal',
    variant: 'danger',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    let normalized: ConfirmOptions;
    if (typeof options === 'string') {
      const isDelete = options.toLowerCase().includes('hapus') || options.toLowerCase().includes('reset');
      normalized = {
        title: isDelete ? 'Konfirmasi Hapus' : 'Konfirmasi Tindakan',
        message: options,
        confirmText: isDelete ? 'Ya, Hapus' : 'Ya, Lanjutkan',
        cancelText: 'Batal',
        variant: isDelete ? 'danger' : 'info',
      };
    } else {
      const isDelete =
        options.message.toLowerCase().includes('hapus') ||
        (options.title && options.title.toLowerCase().includes('hapus'));
      normalized = {
        title: options.title || (isDelete ? 'Konfirmasi Hapus' : 'Konfirmasi Tindakan'),
        message: options.message,
        confirmText: options.confirmText || (isDelete ? 'Ya, Hapus' : 'Ya, Lanjutkan'),
        cancelText: options.cancelText || 'Batal',
        variant: options.variant || (isDelete ? 'danger' : 'info'),
      };
    }

    setConfig(normalized);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = useCallback((choice: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(choice);
      resolverRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {isOpen &&
        createPortal(
          <div
            className="fixed -top-12 -bottom-12 inset-x-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => handleClose(false)}
          >
            <div
              className="w-full max-w-sm sm:max-w-md bg-[#09090b] border border-[#27272e] rounded-3xl p-6 shadow-2xl space-y-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button top right */}
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#18181e] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon & Title */}
              <div className="flex items-start space-x-3.5">
                {config.variant === 'danger' && (
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                {config.variant === 'warning' && (
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                {config.variant === 'info' && (
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                )}

                <div className="pt-0.5 pr-6">
                  <h3 className="text-base font-bold text-white tracking-tight">{config.title}</h3>
                  <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">{config.message}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#1e1e24]">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#141418] hover:bg-[#1a1a20] text-neutral-300 hover:text-white border border-[#27272e] transition-all cursor-pointer"
                >
                  {config.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-lg transition-all cursor-pointer ${
                    config.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : config.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  }`}
                >
                  {config.confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
