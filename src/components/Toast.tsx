import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} item={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ item: Toast; onRemove: (id: string) => void }> = ({ item, onRemove }) => {
  const getVariantStyles = () => {
    switch (item.type) {
      case 'success': return {
        bg: 'bg-gray-900',
        border: 'border-green-500/30',
        accent: 'bg-green-500',
        text: 'text-green-400',
        icon: <CheckCircle className="w-4 h-4 text-green-400" />
      };
      case 'error': return {
        bg: 'bg-gray-900',
        border: 'border-red-500/30',
        accent: 'bg-red-500',
        text: 'text-red-400',
        icon: <AlertCircle className="w-4 h-4 text-red-400" />
      };
      case 'warning': return {
        bg: 'bg-gray-900',
        border: 'border-orange-500/30',
        accent: 'bg-orange-400',
        text: 'text-orange-400',
        icon: <Bell className="w-4 h-4 text-orange-400" />
      };
      case 'info': return {
        bg: 'bg-gray-900',
        border: 'border-brand/30',
        accent: 'bg-brand',
        text: 'text-brand',
        icon: <Info className="w-4 h-4 text-brand" />
      };
      default: return {
        bg: 'bg-white/5',
        border: 'border-white/10',
        accent: 'bg-white',
        text: 'text-white',
        icon: <Bell className="w-5 h-5 text-white" />
      };
    }
  };

  const styles = getVariantStyles();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-4 p-4 ${styles.bg} backdrop-blur-md border ${styles.border} rounded-2xl shadow-2xl overflow-hidden relative group min-h-[70px] shadow-black/20`}
    >
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${styles.accent}`} />
      
      <div className="flex-shrink-0 mt-0.5 ml-1">
        {styles.icon}
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <p className={`text-[10px] font-semibold leading-tight uppercase tracking-widest mb-0.5 ${styles.text}`}>{item.type}</p>
        <p className="text-sm font-medium text-white leading-snug">{item.message}</p>
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="absolute top-4 right-4 flex-shrink-0 text-white/20 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar */}
      {item.duration !== Infinity && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: (item.duration || 3000) / 1000, ease: "linear" }}
          className={`absolute bottom-0 left-0 h-0.5 ${styles.accent}`}
        />
      )}
    </motion.div>
  );
};
