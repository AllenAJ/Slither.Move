'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { createGame, createGameNative, joinGame, joinGameNative, getGame } from '../lib/game-transactions';
import StakeModal from './StakeModal';
import { Clipboard, User } from 'lucide-react';

interface GameLobbyProps {
  walletAddress: string;
  onGameStart: (gameCreator: string, isPlayer1: boolean, isTwoPlayerMode?: boolean) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function GameLobby({ walletAddress, onGameStart, onToast }: GameLobbyProps) {
  const { user } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const { account, signAndSubmitTransaction } = useWallet();
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinAddress, setJoinAddress] = useState('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [myStake, setMyStake] = useState<number>(0);

  const isPrivyWallet = !!user?.linkedAccounts?.find((acc: any) => acc.chainType === 'aptos');

  const handleCreateGame = async (stakeAmount: number) => {
    setIsCreating(true);
    try {
      if (isPrivyWallet) {
        const moveWallet = user!.linkedAccounts!.find((acc: any) => acc.chainType === 'aptos') as any;
        await createGame(stakeAmount, moveWallet.address, moveWallet.publicKey, signRawHash!);
      } else {
        await createGameNative(stakeAmount, account!.address.toString(), signAndSubmitTransaction);
      }

      setMyStake(stakeAmount);
      onToast('Game created! Waiting for opponent...', 'success');
      setShowStakeModal(false);
      setWaitingForOpponent(true);
      
      const pollInterval = setInterval(async () => {
        const gameInfo = await getGame(walletAddress);
        if (gameInfo && gameInfo.status === 1) {
          clearInterval(pollInterval);
          setWaitingForOpponent(false);
          onToast('Opponent joined! Starting game...', 'success');
          setTimeout(() => onGameStart(walletAddress, true, true), 1000);
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (waitingForOpponent) {
          setWaitingForOpponent(false);
          onToast('No opponent found. Starting single-player mode...', 'info');
          onGameStart(walletAddress, true, false);
        }
      }, 60000);

    } catch (error: any) {
      console.error('Error creating game:', error);
      onToast(error.message || 'Failed to create game', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinAddress.trim()) {
      onToast('Please enter opponent address', 'error');
      return;
    }

    if (joinAddress.toLowerCase() === walletAddress.toLowerCase()) {
      onToast("You can't join your own game!", 'error');
      return;
    }

    setIsJoining(true);
    try {
      const gameInfo = await getGame(joinAddress);
      if (!gameInfo) {
        onToast('Game not found', 'error');
        setIsJoining(false);
        return;
      }

      if (gameInfo.status !== 0) {
        onToast('Game already started or completed', 'error');
        setIsJoining(false);
        return;
      }

      if (isPrivyWallet) {
        const moveWallet = user!.linkedAccounts!.find((acc: any) => acc.chainType === 'aptos') as any;
        await joinGame(joinAddress, moveWallet.address, moveWallet.publicKey, signRawHash!);
      } else {
        await joinGameNative(joinAddress, account!.address.toString(), signAndSubmitTransaction);
      }

      onToast('Joined game! Starting...', 'success');
      setTimeout(() => onGameStart(joinAddress, false, true), 1000);
    } catch (error: any) {
      console.error('Error joining game:', error);
      onToast(error.message || 'Failed to join game', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    onToast('Address copied!', 'info');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl mb-4 text-neon-green drop-shadow-[0_0_10px_rgba(0,255,157,0.5)]">
            Battle<span className="text-white">Zone</span>
          </h1>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">Select your protocol</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Create Game */}
          <div className="card group hover:border-neon-green transition-colors duration-300">
            <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl text-white mb-1">Host Game</h2>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Initialize Battle</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-neon-green/10 flex items-center justify-center text-neon-green">
                <span className="text-2xl">+</span>
              </div>
            </div>

            {!waitingForOpponent ? (
              <div className="space-y-6">
                <p className="text-gray-400 text-sm leading-relaxed">
                  Create a new game lobby and wait for an opponent. You will set the stake amount.
                </p>
                <button
                  onClick={() => setShowStakeModal(true)}
                  disabled={isCreating}
                  className="btn btn-primary"
                >
                  {isCreating ? 'Initializing...' : 'Create Lobby'}
                </button>
              </div>
            ) : (
              <div className="alert alert-warning text-center animate-pulse">
                <div className="spinner mx-auto mb-4 border-t-neon-yellow"></div>
                <p className="font-bold text-lg mb-2 text-neon-yellow">Awaiting Challenger...</p>
                <p className="text-sm text-gray-400 mb-6">Share your coordinates:</p>
                
                <div 
                  className="bg-black/50 border border-neon-yellow/30 rounded p-4 mb-4 cursor-pointer hover:bg-neon-yellow/10 transition-colors group/copy relative"
                  onClick={copyAddress}
                >
                  <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">Target ID</p>
                  <div className="flex items-center justify-between gap-2">
                     <p className="font-mono text-sm break-all text-neon-yellow">{walletAddress}</p>
                     <Clipboard className="w-4 h-4 text-gray-500 group-hover/copy:text-neon-yellow" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-gray-800">
                  <span className="text-xs text-gray-500 font-bold uppercase">Stake</span>
                  <span className="font-mono text-xl text-neon-green">{myStake} MOVE</span>
                </div>
              </div>
            )}
          </div>

          {/* Join Game */}
          <div className="card group hover:border-neon-pink transition-colors duration-300">
            <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-2xl text-white mb-1">Join Game</h2>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Infiltrate Lobby</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-neon-pink/10 flex items-center justify-center text-neon-pink">
                <span className="text-2xl">→</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold mb-2 text-gray-500 uppercase tracking-widest">Target Address</label>
                <div className="relative">
                    <input
                    type="text"
                    value={joinAddress}
                    onChange={(e) => setJoinAddress(e.target.value)}
                    placeholder="0x..."
                    className={`input pl-10 ${joinAddress && joinAddress.toLowerCase() === walletAddress.toLowerCase() ? 'input-error' : ''}`}
                    disabled={isJoining}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
                {joinAddress && joinAddress.toLowerCase() === walletAddress.toLowerCase() && (
                  <p className="text-neon-pink text-xs font-bold mt-2 uppercase">Cannot target self</p>
                )}
              </div>

              <button
                onClick={handleJoinGame}
                disabled={isJoining || !joinAddress.trim() || joinAddress.toLowerCase() === walletAddress.toLowerCase()}
                className="btn btn-secondary"
              >
                {isJoining ? 'Infiltrating...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>

        {/* How to Play */}
        <div className="card bg-black/40 border-gray-800">
          <h2 className="text-lg font-bold mb-6 text-center uppercase tracking-widest text-gray-500">Mission Directives</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { num: '01', text: '30s Time Limit', icon: '⏱️' },
              { num: '02', text: 'Collect Data', icon: '🍎' },
              { num: '03', text: 'Avoid Crashes', icon: '💥' },
              { num: '04', text: 'Winner Takes Pot', icon: '💰' },
            ].map((item) => (
              <div key={item.num} className="text-center group">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 bg-neon-green/20 rounded-full blur-xl group-hover:bg-neon-green/40 transition-colors"></div>
                    <div className="relative w-full h-full rounded-full border border-neon-green/30 bg-black flex items-center justify-center text-2xl">
                        {item.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 bg-neon-green text-black text-[10px] font-bold px-2 py-1 rounded">
                        {item.num}
                    </div>
                </div>
                <p className="font-mono text-sm text-gray-400 group-hover:text-white transition-colors">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Status */}
        <div className="mt-8 flex items-center justify-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
          <span className="status-dot status-dot-green"></span>
          <span className="text-neon-green font-mono text-xs uppercase tracking-widest">System Online: Movement Bardock</span>
        </div>
      </div>

      {showStakeModal && (
        <StakeModal
          onConfirm={handleCreateGame}
          onCancel={() => setShowStakeModal(false)}
        />
      )}
    </div>
  );
}
