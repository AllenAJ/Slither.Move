'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export default function LoginPage() {
  const { login, authenticated, ready, logout } = usePrivy();
  const { wallets, connect } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (authenticated) {
      console.log('User is already authenticated, waiting for wallet setup...');
    }
  }, [authenticated]);

  const handlePrivyLogin = async () => {
    if (authenticated) {
      await logout();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsConnecting(true);
    try {
      await login();
    } catch (error) {
      console.error('Privy login error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleNativeWallet = async () => {
    setIsConnecting(true);
    try {
      if (wallets && wallets.length > 0) {
        await connect(wallets[0].name);
      } else {
        window.open('https://nightly.app/', '_blank');
      }
    } catch (error) {
      console.error('Native wallet error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F5F5F2 0%, #E5E5E0 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4">🐍💰</div>
          <h1 className="text-5xl md:text-6xl font-black text-black mb-3">
            SlitherMoney
          </h1>
          <p className="text-lg text-gray-600 font-semibold">
            Stake. Battle. Win.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-gray-900">
          {authenticated && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-4">
              <p className="font-bold text-black text-sm">⏳ Setting up your wallet...</p>
              <p className="text-gray-700 text-sm mt-1">If stuck, try logging out and back in.</p>
              <button 
                onClick={handleLogout}
                className="mt-3 text-black underline font-bold text-sm hover:text-gray-700"
              >
                Logout & Retry
              </button>
            </div>
          )}

          {/* Privy Button */}
          <button 
            onClick={handlePrivyLogin}
            disabled={isConnecting || !ready}
            className="w-full bg-green-400 hover:bg-green-500 text-black font-bold py-4 px-6 rounded-2xl flex items-center justify-between mb-4 transition-all disabled:opacity-50"
            style={{ fontSize: '1.125rem' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black bg-opacity-10 flex items-center justify-center text-2xl">
                🔑
              </div>
              <span>Privy Social Login</span>
            </div>
            <span>→</span>
          </button>

          {/* Aptos Button */}
          <button 
            onClick={handleNativeWallet}
            disabled={isConnecting}
            className="w-full bg-blue-400 hover:bg-blue-500 text-black font-bold py-4 px-6 rounded-2xl flex items-center justify-between transition-all disabled:opacity-50"
            style={{ fontSize: '1.125rem' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black bg-opacity-10 flex items-center justify-center text-2xl">
                ⚫
              </div>
              <span>Aptos Wallet</span>
            </div>
            <span>→</span>
          </button>

          {isConnecting && (
            <div className="flex items-center justify-center gap-2 py-2 mt-4">
              <div className="w-6 h-6 border-4 border-gray-300 border-t-green-400 rounded-full animate-spin"></div>
              <span className="text-gray-600 font-semibold">Connecting...</span>
            </div>
          )}
        </div>

        {/* Network Badge */}
        <div className="mt-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Movement Testnet (Bardock)
          </div>
          <p className="text-gray-600 text-sm font-semibold">
            Powered by Movement Network
          </p>
        </div>
      </div>
    </div>
  );
}
