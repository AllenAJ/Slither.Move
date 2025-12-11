'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { createGame, createGameNative, joinGame, joinGameNative, getGame } from '../lib/game-transactions';
import StakeModal from './StakeModal';

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

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #F5F5F2 0%, #E5E5E0 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-black mb-2">Game Lobby</h1>
          <p className="text-gray-600 font-semibold">Create or join a snake battle</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create Game */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-gray-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">⚔️</div>
              <div>
                <h2 className="text-2xl font-black text-black">Create Game</h2>
                <p className="text-sm text-gray-600 font-semibold">Start a new battle</p>
              </div>
            </div>

            {!waitingForOpponent ? (
              <button
                onClick={() => setShowStakeModal(true)}
                disabled={isCreating}
                className="w-full bg-green-400 hover:bg-green-500 text-black font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50"
                style={{ fontSize: '1.125rem' }}
              >
                {isCreating ? 'Creating...' : 'Create Game'}
              </button>
            ) : (
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-6 text-center">
                <div className="w-6 h-6 border-4 border-gray-300 border-t-green-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-black text-black text-lg mb-2">Waiting for opponent...</p>
                <div className="bg-white rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-600 font-bold mb-1">Your Address</p>
                  <p className="font-mono text-sm text-black break-all">{walletAddress}</p>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-600 font-bold mb-1">Stake Amount</p>
                  <p className="font-black text-2xl text-yellow-600">{myStake} MOVE</p>
                </div>
              </div>
            )}
          </div>

          {/* Join Game */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-gray-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">🎯</div>
              <div>
                <h2 className="text-2xl font-black text-black">Join Game</h2>
                <p className="text-sm text-gray-600 font-semibold">Enter opponent's address</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">Opponent Address</label>
                <input
                  type="text"
                  value={joinAddress}
                  onChange={(e) => setJoinAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-300 focus:border-blue-400 focus:outline-none font-mono text-sm bg-white"
                  disabled={isJoining}
                />
                {joinAddress && joinAddress.toLowerCase() === walletAddress.toLowerCase() && (
                  <p className="text-red-500 text-sm font-bold mt-2">⚠️ You can't join your own game!</p>
                )}
              </div>

              <button
                onClick={handleJoinGame}
                disabled={isJoining || !joinAddress.trim() || joinAddress.toLowerCase() === walletAddress.toLowerCase()}
                className="w-full bg-blue-400 hover:bg-blue-500 text-black font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50"
                style={{ fontSize: '1.125rem' }}
              >
                {isJoining ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>

        {/* How to Play */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-gray-900">
          <h2 className="text-2xl font-black text-black mb-6">📖 How to Play</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-400 flex items-center justify-center text-white font-black mx-auto mb-2">1</div>
              <p className="font-bold text-black">30-second match</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-400 flex items-center justify-center text-white font-black mx-auto mb-2">2</div>
              <p className="font-bold text-black">Most apples wins</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-400 flex items-center justify-center text-white font-black mx-auto mb-2">3</div>
              <p className="font-bold text-black">Collision = loss</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-400 flex items-center justify-center text-white font-black mx-auto mb-2">4</div>
              <p className="font-bold text-black">Draws return stake</p>
            </div>
          </div>
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
