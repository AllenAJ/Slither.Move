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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black text-black">Set Stake</h2>
            <p className="text-sm text-gray-600 font-semibold mt-1">Choose your wager amount</p>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-black mb-3">Quick Select</label>
          <div className="grid grid-cols-5 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.amount}
                onClick={() => handlePresetClick(preset.amount)}
                className={`relative py-4 rounded-2xl font-black text-lg transition-all ${
                  selectedPreset === preset.amount
                    ? 'bg-green-400 text-black scale-105'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {preset.label}
                {preset.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                    POPULAR
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-black mb-2">Custom Amount</label>
          <div className="relative">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="Enter amount"
              step="0.1"
              min="0.1"
              className={`w-full px-4 py-4 pr-20 rounded-2xl border-2 ${
                error ? 'border-red-500' : 'border-gray-300'
              } focus:border-green-400 focus:outline-none font-bold text-lg bg-white`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">
              MOVE
            </span>
          </div>
          {error && (
            <p className="text-red-500 text-sm font-bold mt-2">⚠️ {error}</p>
          )}
        </div>

        {/* Summary */}
        {getStakeAmount() > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 font-semibold text-sm">Your Stake</span>
              <span className="text-white font-black text-2xl">{getStakeAmount()} MOVE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-semibold text-sm">Potential Win</span>
              <span className="text-green-400 font-black text-2xl">{(getStakeAmount() * 2).toFixed(1)} MOVE</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 text-black font-bold py-4 px-6 rounded-2xl transition-all"
            style={{ fontSize: '1.125rem' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!getStakeAmount() || !!error}
            className="bg-green-400 hover:bg-green-500 text-black font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50"
            style={{ fontSize: '1.125rem' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
