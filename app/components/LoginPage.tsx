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
    <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 font-arcade drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
            Slither<br/>Money
          </h1>
          <p className="text-xl text-blue-300 font-mono tracking-widest uppercase border-y border-blue-500/30 py-2 inline-block">
            Stake • Battle • Win
          </p>
        </div>

        {/* Card */}
          <div className="card">
            <div className="flex flex-col items-center justify-center gap-6 py-4">
              {/* Privy Button */}
              <button 
                onClick={handlePrivyLogin}
                disabled={isConnecting || !ready}
                className="btn btn-primary gap-4 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 flex-1 text-left text-sm md:text-base">Login with Privy</span>
                <span className="relative z-10 text-xl">→</span>
              </button>
  
              {/* Divider */}
              <div className="flex items-center w-full gap-4 text-gray-500 text-xs uppercase tracking-widest">
                <div className="h-[1px] bg-gray-700 flex-1"></div>
                <span>OR</span>
                <div className="h-[1px] bg-gray-700 flex-1"></div>
              </div>
  
              {/* Aptos Button */}
              <button 
                onClick={handleNativeWallet}
                disabled={isConnecting}
                className="btn btn-secondary gap-4 group relative overflow-hidden"
              >
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 flex-1 text-left text-sm md:text-base">Connect Wallet</span>
                <span className="relative z-10 text-xl">→</span>
              </button>
            </div>
          </div>

        {/* Network Badge */}
        <div className="mt-8 text-center">
          <div className="badge badge-dark mb-3">
            <span className="status-dot status-dot-green"></span>
            Movement Testnet (Bardock)
          </div>
          <p className="text-gray-600 text-sm font-semibold">Powered by Movement Network</p>
        </div>
      </div>
    </div>
  );
}
