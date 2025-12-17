'use client';

import { useState, useRef, useEffect } from 'react';

const MOVEMENT_EXPLORER_URL = 'https://explorer.movementnetwork.xyz';

interface WalletDropdownProps {
  address: string;
  balance: number;
  onDisconnect: () => void;
  onFaucet: () => void;
}

export default function WalletDropdown({ address, balance, onDisconnect, onFaucet }: WalletDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dropdown relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="dropdown-trigger flex items-center gap-3 px-4 py-2 bg-black border border-neon-green text-neon-green hover:bg-neon-green/10 transition-colors">
        <span className="status-dot status-dot-green"></span>
        <div className="text-left">
          <p className="font-black text-sm tracking-wider font-mono">{balance.toFixed(2)} MOVE</p>
          <p className="font-mono text-gray-500 text-[10px] uppercase tracking-widest">{shortenAddress(address)}</p>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu absolute right-0 mt-2 w-72 bg-black border border-neon-green shadow-[0_0_20px_rgba(0,255,157,0.2)] z-50">
          {/* Network Info */}
          <div className="p-4 border-b border-gray-800 bg-gray-900/50">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Network Status</p>
            <div className="flex items-center gap-2">
              <span className="status-dot status-dot-green"></span>
              <span className="font-bold text-sm text-white font-mono">Movement Testnet</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase">&gt;&gt; Node: Bardock</p>
          </div>
          
          {/* Actions */}
          <div className="p-2">
            <button onClick={() => { handleCopy(); setIsOpen(false); }} className="dropdown-item w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-neon-green/20 hover:text-neon-green transition-colors font-mono">
              <span>{copied ? '&gt;&gt; COPIED' : '&gt;&gt; COPY ADDRESS'}</span>
            </button>
            
            <a
              href={`${MOVEMENT_EXPLORER_URL}/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="dropdown-item block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-neon-green/20 hover:text-neon-green transition-colors font-mono"
            >
              <span>&gt;&gt; VIEW EXPLORER</span>
            </a>
            
            <button onClick={() => { onFaucet(); setIsOpen(false); }} className="dropdown-item w-full text-left px-3 py-2 text-sm text-neon-blue hover:bg-neon-blue/20 transition-colors font-mono">
              <span>&gt;&gt; GET TEST TOKENS</span>
            </button>
          </div>

          <div className="border-t border-gray-800"></div>

          {/* Disconnect */}
          <div className="p-2 bg-gray-900/50">
            <button onClick={() => { onDisconnect(); setIsOpen(false); }} className="dropdown-item w-full text-left px-3 py-2 text-sm text-neon-pink hover:bg-neon-pink/20 transition-colors font-mono">
              <span>&gt;&gt; TERMINATE LINK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
