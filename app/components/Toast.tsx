'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  if (!isVisible && !show) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-neon-green" />,
    error: <AlertCircle className="w-5 h-5 text-neon-pink" />,
    info: <Info className="w-5 h-5 text-neon-blue" />
  };

  const borderColors = {
    success: 'border-neon-green',
    error: 'border-neon-pink',
    info: 'border-neon-blue'
  };

  const bgColors = {
    success: 'bg-green-900/20',
    error: 'bg-red-900/20',
    info: 'bg-blue-900/20'
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-[2000] transition-all duration-300 transform ${
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`
        flex items-center gap-3 p-4 min-w-[300px] border-l-4 backdrop-blur-md bg-black/90 shadow-[0_0_20px_rgba(0,0,0,0.5)]
        ${borderColors[type]} 
      `}>
        {icons[type]}
        <div className="flex-1">
            <p className="text-sm font-bold text-white uppercase tracking-wider font-mono">{type}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{message}</p>
        </div>
        <button 
          onClick={handleClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
