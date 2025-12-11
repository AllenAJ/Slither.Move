'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { SnakeGameEngine } from '../lib/game-engine';
import { submitGameResult, claimWinnings, claimWinningsNative, GAME_CONTRACT_ADDRESS } from '../lib/game-transactions';

interface GameResultsProps {
  gameEngine: SnakeGameEngine;
  winner: number | null;
  isPlayer1: boolean;
  gameCreator: string;
  walletAddress: string;
  onExit: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function GameResults({
  gameEngine,
  winner,
  isPlayer1,
  gameCreator,
  walletAddress,
  onExit,
  onToast
}: GameResultsProps) {
  const { user } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const { account, signAndSubmitTransaction } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isPrivyWallet = !!user?.linkedAccounts?.find((acc: any) => acc.chainType === 'aptos');
  const state = gameEngine.getState();
  const playerId = isPlayer1 ? 1 : 2;
  const myScore = isPlayer1 ? state.player1.score : state.player2.score;
  const opponentScore = isPlayer1 ? state.player2.score : state.player1.score;
  const iWon = winner === playerId;
  const gameHash = gameEngine.generateGameHash();

  const handleSubmitResult = async () => {
    setIsSubmitting(true);
    try {
      if (isPrivyWallet) {
        const moveWallet = user!.linkedAccounts!.find((acc: any) => acc.chainType === 'aptos') as any;
        await submitGameResult(
          gameCreator,
          myScore,
          gameHash,
          iWon,
          moveWallet.address,
          moveWallet.publicKey,
          signRawHash!
        );
      } else {
        // For native wallet, we need a different approach
        onToast('Native wallet result submission coming soon', 'info');
        return;
      }

      onToast('Result submitted successfully!', 'success');
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting result:', error);
      onToast(error?.message || 'Failed to submit result', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimWinnings = async () => {
    if (!iWon) {
      console.log('[Claim] Not winner, cannot claim');
      return;
    }

    console.log('[Claim] Starting claim process', {
      gameCreator,
      walletAddress,
      isPrivyWallet,
      iWon
    });

    setIsClaiming(true);
    try {
      if (isPrivyWallet) {
        const moveWallet = user!.linkedAccounts!.find((acc: any) => acc.chainType === 'aptos') as any;
        
        if (!moveWallet) {
          throw new Error('Wallet not found');
        }
        
        console.log('[Claim] V2 Contract - Winner can claim directly!', {
          gameCreator: gameCreator.toLowerCase(),
          myAddress: moveWallet.address.toLowerCase(),
          isWinner: iWon
        });
        
        // V2: Winner can claim directly!
        console.log('[Claim] Calling claimWinnings contract function');
        await claimWinnings(
          gameCreator,
          moveWallet.address, // winner's address
          moveWallet.publicKey,
          signRawHash!
        );
        onToast('Winnings claimed successfully! 🎉', 'success');
        setTimeout(onExit, 2000);
      } else {
        // Native wallet support
        if (!account || !signAndSubmitTransaction) {
          throw new Error('Native wallet not connected');
        }
        
        console.log('[Claim] V2 Contract - Winner can claim directly (Native)!', {
          gameCreator: gameCreator.toLowerCase(),
          myAddress: account.address.toString().toLowerCase(),
          isWinner: iWon
        });
        
        await claimWinningsNative(
          gameCreator,
          account.address.toString(),
          signAndSubmitTransaction
        );
        onToast('Winnings claimed successfully! 🎉', 'success');
        setTimeout(onExit, 2000);
      }
    } catch (error: any) {
      console.error('Error claiming winnings:', error);
      const errorMsg = error?.message || 'Failed to claim winnings';
      
      // Check for specific error codes
      if (errorMsg.includes('E_NOT_READY_TO_CLAIM')) {
        onToast('⏳ Waiting for opponent to submit their result. Please try again in a moment.', 'info');
      } else {
        onToast(errorMsg, 'error');
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col gap-6 justify-center items-center p-4" style={{ backgroundColor: '#e8f4f8' }}>
      {/* Result Header */}
      <div className="w-full max-w-2xl">
        <div 
          className={`rounded-xl p-8 text-center ${
            iWon ? 'bg-green-500' : winner === null ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{
            border: '4px solid black',
            boxShadow: '6px 6px 0px black'
          }}
        >
          <div className="text-6xl mb-4">
            {iWon ? '🎉' : winner === null ? '🤝' : '😢'}
          </div>
          <h1 className="text-5xl font-black text-white mb-2">
            {iWon ? 'YOU WON!' : winner === null ? 'TIE GAME!' : 'YOU LOST!'}
          </h1>
          <p className="text-xl text-white">
            {iWon ? 'Congratulations! Claim your winnings below' : winner === null ? 'Both players performed equally' : 'Better luck next time!'}
          </p>
        </div>
      </div>

      {/* Game Stats */}
      <div className="w-full max-w-2xl">
        <div 
          className="bg-white rounded-xl p-8"
          style={{
            border: '4px solid black',
            boxShadow: '6px 6px 0px black'
          }}
        >
          <h2 className="text-3xl font-black mb-6 text-center">📊 GAME STATS</h2>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Your Stats */}
            <div className="text-center">
              <div className="text-2xl mb-2">
                {isPlayer1 ? '🟢' : '🔵'}
              </div>
              <div className="font-bold text-lg mb-2">You</div>
              <div className="space-y-2">
                <div className="flex justify-between px-4">
                  <span className="text-gray-600">Apples:</span>
                  <span className="font-bold">{myScore}</span>
                </div>
                <div className="flex justify-between px-4">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-bold">
                    {(isPlayer1 ? state.player1.alive : state.player2.alive) ? '✅ Alive' : '💀 Dead'}
                  </span>
                </div>
              </div>
            </div>

            {/* Opponent Stats */}
            <div className="text-center">
              <div className="text-2xl mb-2">
                {isPlayer1 ? '🔵' : '🟢'}
              </div>
              <div className="font-bold text-lg mb-2">Opponent</div>
              <div className="space-y-2">
                <div className="flex justify-between px-4">
                  <span className="text-gray-600">Apples:</span>
                  <span className="font-bold">{opponentScore}</span>
                </div>
                <div className="flex justify-between px-4">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-bold">
                    {(isPlayer1 ? state.player2.alive : state.player1.alive) ? '✅ Alive' : '💀 Dead'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Hash */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Game Hash (for verification):</p>
            <p className="text-xs font-mono break-all">{gameHash}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-2xl space-y-4">
        {!submitted && (
          <button
            onClick={handleSubmitResult}
            disabled={isSubmitting}
            className="w-full font-bold text-white text-xl px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#0099ff',
              border: '4px solid black',
              boxShadow: '4px 4px 0px black'
            }}
          >
            {isSubmitting ? '⏳ SUBMITTING...' : '📤 SUBMIT RESULT'}
          </button>
        )}

        {submitted && iWon && (
          <>
            <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-400 mb-2">
              <p className="text-sm text-green-800">
                ✅ <strong>V2 Contract:</strong> You can claim your winnings directly!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Funds are held in escrow. Click below to receive your payout.
              </p>
              <p className="text-xs text-orange-700 mt-2">
                ⚠️ <strong>Note:</strong> In two-player mode, both players must submit results before claiming.
              </p>
            </div>
            <button
              onClick={handleClaimWinnings}
              disabled={isClaiming}
              className="w-full font-bold text-white text-xl px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
              style={{
                backgroundColor: '#00ff88',
                color: 'black',
                border: '4px solid black',
                boxShadow: '4px 4px 0px black'
              }}
            >
              {isClaiming ? '⏳ CLAIMING...' : '💰 CLAIM WINNINGS'}
            </button>
          </>
        )}

        {submitted && !iWon && (
          <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-400">
            <p className="text-sm text-blue-800">
              ✅ Result submitted! {winner === null ? 'Waiting for refund processing...' : 'Better luck next time!'}
            </p>
          </div>
        )}

        <button
          onClick={onExit}
          className="w-full font-bold text-white px-8 py-3 rounded-xl transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: '#666',
            border: '3px solid black',
            boxShadow: '3px 3px 0px black'
          }}
        >
          🏠 BACK TO LOBBY
        </button>
      </div>
    </div>
  );
}
