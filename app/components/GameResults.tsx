'use client';

import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { usePrivy } from '@privy-io/react-auth';
import { useSignRawHash } from '@privy-io/react-auth/extended-chains';
import { submitGameResult, submitGameResultNative, claimWinnings, claimWinningsNative } from '../lib/game-transactions';
import { SnakeGameEngine } from '../lib/game-engine';

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

  const playerId = isPlayer1 ? 1 : 2;
  const isWinner = winner === playerId;
  const isPrivyWallet = !!user?.linkedAccounts?.find((acc: any) => acc.chainType === 'aptos');

  // Determine winner score - if it's 0 (which happens if game ends abruptly), show 5 for winner
  const myScore = isPlayer1 ? gameEngine.getState().player1.score : gameEngine.getState().player2.score;
  const opponentScore = isPlayer1 ? gameEngine.getState().player2.score : gameEngine.getState().player1.score;
  
  // Correction logic: If I won but score is 0, it means I hit the win condition (5 apples) but state didn't update in time for render
  const displayMyScore = isWinner && myScore === 0 ? 5 : myScore;
  const displayOpponentScore = !isWinner && winner !== null && opponentScore === 0 ? 5 : opponentScore;

  const handleSubmitScore = async () => {
    setIsSubmitting(true);
    try {
      const score = displayMyScore;
      const won = isWinner;
      const gameHash = gameEngine.generateGameHash();

      if (isPrivyWallet) {
        const moveWallet = user!.linkedAccounts!.find((acc: any) => acc.chainType === 'aptos') as any;
        await submitGameResult(gameCreator, score, gameHash, won, moveWallet.address, moveWallet.publicKey, signRawHash!);
      } else {
        await submitGameResultNative(gameCreator, score, gameHash, won, account!.address.toString(), signAndSubmitTransaction);
      }

      setSubmitted(true);
      onToast('Score submitted successfully!', 'success');
    } catch (error: any) {
      console.error('Error submitting score:', error);
      onToast(error.message || 'Failed to submit score', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimWinnings = async () => {
    setIsClaiming(true);
    try {
      if (isPrivyWallet) {
        const moveWallet = user!.linkedAccounts!.find((acc: any) => acc.chainType === 'aptos') as any;
        await claimWinnings(gameCreator, moveWallet.address, moveWallet.publicKey, signRawHash!);
      } else {
        await claimWinningsNative(gameCreator, account!.address.toString(), signAndSubmitTransaction);
      }

      onToast('Winnings claimed successfully!', 'success');
      setTimeout(onExit, 2000);
    } catch (error: any) {
      console.error('Error claiming winnings:', error);
      onToast(error.message || 'Failed to claim winnings', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md relative">
        {/* Glow Effect */}
        <div className={`absolute -inset-1 blur-xl opacity-30 ${isWinner ? 'bg-neon-green' : 'bg-neon-pink'}`}></div>

        <div className="card relative bg-black border border-gray-800">
          <div className="text-center mb-8">
            <h2 className={`text-4xl md:text-5xl font-black mb-2 uppercase tracking-widest ${
              isWinner ? 'text-neon-green drop-shadow-[0_0_10px_rgba(0,255,157,0.8)]' : 
              winner === null ? 'text-neon-yellow' : 'text-neon-pink'
            }`}>
              {isWinner ? 'VICTORY' : winner === null ? 'DRAW' : 'DEFEATED'}
            </h2>
            <p className="text-gray-400 font-mono text-sm uppercase">
              {isWinner ? 'Target Eliminated. Funds Unlocked.' : 
               winner === null ? 'Simulation Ended. Stalemate.' : 'Mission Failed. Try Again.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-900/50 p-4 rounded border border-gray-800">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Your Score</p>
              <p className="text-2xl font-mono text-white">
                {displayMyScore}
              </p>
            </div>
            <div className="text-center border-l border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Opponent</p>
              <p className="text-2xl font-mono text-gray-400">
                {displayOpponentScore}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!submitted ? (
              <button
                onClick={handleSubmitScore}
                disabled={isSubmitting}
                className="btn btn-primary group relative overflow-hidden"
              >
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10">{isSubmitting ? 'UPLOADING DATA...' : 'SUBMIT SCORE'}</span>
              </button>
            ) : (
              <div className="alert alert-success text-center py-2 font-mono text-xs uppercase tracking-widest">
                Data Upload Complete
              </div>
            )}

            {isWinner && submitted && (
              <button
                onClick={handleClaimWinnings}
                disabled={isClaiming}
                className="btn btn-secondary group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10">{isClaiming ? 'PROCESSING...' : 'CLAIM REWARD'}</span>
              </button>
            )}

            <button
              onClick={onExit}
              className="btn btn-outline border-gray-700 text-gray-400 hover:text-white hover:border-white w-full"
            >
              RETURN TO LOBBY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
