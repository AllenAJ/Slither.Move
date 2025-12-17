'use client';

import { useState } from 'react';

interface StakeModalProps {
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export default function StakeModal({ onConfirm, onCancel }: StakeModalProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [error, setError] = useState('');

  const presets = [
    { amount: 0.1, label: '0.1', popular: false },
    { amount: 0.5, label: '0.5', popular: true },
    { amount: 1, label: '1', popular: false },
    { amount: 5, label: '5', popular: false },
    { amount: 10, label: '10', popular: false },
  ];

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount('');
    setError('');
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedPreset(null);
    
    const num = parseFloat(value);
    if (value && (isNaN(num) || num < 0.1)) {
      setError('Minimum stake is 0.1 MOVE');
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    const amount = selectedPreset || parseFloat(customAmount);
    
    if (!amount || amount < 0.1) {
      setError('Please select or enter a valid stake amount (min 0.1 MOVE)');
      return;
    }

    onConfirm(amount);
  };

  const getStakeAmount = () => {
    return selectedPreset || parseFloat(customAmount) || 0;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content relative overflow-hidden">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(0, 255, 157, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 157, 0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
        }}></div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Set Stake</h2>
            <p className="text-sm text-gray-500 font-mono mt-1">Select your wager amount</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center transition-colors text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Presets */}
        <div className="relative z-10 mb-8">
          <label className="block text-xs font-bold mb-3 text-neon-green uppercase tracking-widest">Quick Select</label>
          <div className="grid grid-cols-5 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.amount}
                onClick={() => handlePresetClick(preset.amount)}
                className={`preset-btn ${selectedPreset === preset.amount ? 'preset-btn-active' : 'preset-btn-inactive'}`}
              >
                {preset.label}
                {preset.popular && <span className="preset-tag">HOT</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="relative z-10 mb-8">
          <label className="block text-xs font-bold mb-3 text-neon-green uppercase tracking-widest">Custom Amount</label>
          <div className="relative">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="0.0"
              step="0.1"
              min="0.1"
              className={`input pr-16 bg-black text-white border-gray-800 focus:border-neon-green ${error ? 'input-error' : ''}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm font-mono">
              MOVE
            </span>
          </div>
          {error && <p className="text-neon-pink text-xs font-bold mt-2 font-mono uppercase">&gt;&gt; {error}</p>}
        </div>

        {/* Summary */}
        {getStakeAmount() > 0 && (
          <div className="relative z-10 summary-box mb-8 bg-black/40 border border-neon-green/30">
            <div className="summary-row mb-2">
              <span className="summary-label text-gray-400 font-mono uppercase text-xs">Stake</span>
              <span className="summary-value text-white font-mono">{getStakeAmount()} MOVE</span>
            </div>
            <div className="summary-row">
              <span className="summary-label text-neon-green font-mono uppercase text-xs">Potential Win</span>
              <span className="summary-value text-neon-green font-mono drop-shadow-[0_0_5px_rgba(0,255,157,0.5)]">
                {(getStakeAmount() * 2).toFixed(1)} MOVE
              </span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          <button onClick={onCancel} className="btn btn-outline text-gray-400 border-gray-600 hover:border-white hover:text-white">
            Abort
          </button>
          <button
            onClick={handleConfirm}
            disabled={!getStakeAmount() || !!error}
            className="btn btn-primary"
          >
            Confirm Stake
          </button>
        </div>
      </div>
    </div>
  );
}
