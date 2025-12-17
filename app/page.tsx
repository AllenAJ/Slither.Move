'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useCreateWallet } from '@privy-io/react-auth/extended-chains';
import { useEffect, useState, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import GameLobby from './components/GameLobby';
import SnakeGame from './components/SnakeGame';
import Toast from './components/Toast';
import WalletDropdown from './components/WalletDropdown';
import { getAccountBalance } from './lib/game-transactions';

export default function Home() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { account, connected, disconnect: disconnectNative } = useWallet();
  const { createWallet } = useCreateWallet();
  const [movementAddress, setMovementAddress] = useState<string>('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [balance, setBalance] = useState(0);
  const [gameState, setGameState] = useState<'lobby' | 'playing'>('lobby');
  const [gameCreator, setGameCreator] = useState<string>('');
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [isTwoPlayerMode, setIsTwoPlayerMode] = useState(false);
  const [isPrivyWallet, setIsPrivyWallet] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ 
    message: '', 
    type: 'info', 
    isVisible: false 
  });

  // Handle Privy wallet setup
  useEffect(() => {
    const setupMovementWallet = async () => {
      if (!authenticated || !user || isCreatingWallet) return;

      // Check if user already has an Aptos/Movement wallet
      const moveWallet = user.linkedAccounts?.find(
        (account: any) => account.chainType === 'aptos'
      ) as any;

      if (moveWallet) {
        const address = moveWallet.address as string;
        setMovementAddress(address);
        setIsPrivyWallet(true);
        console.log('Privy Movement Wallet Address:', address);
      } else {
        // Create a new Aptos/Movement wallet
        console.log('No Movement wallet found. Creating one now...');
        setIsCreatingWallet(true);
        try {
          const wallet = await createWallet({ chainType: 'aptos' });
          const address = (wallet as any).address;
          setMovementAddress(address);
          setIsPrivyWallet(true);
          console.log('Created Privy Movement Wallet Address:', address);
          showToast('Wallet created!', 'success');
        } catch (error) {
          console.error('Error creating Movement wallet:', error);
          showToast('Failed to create wallet', 'error');
        } finally {
          setIsCreatingWallet(false);
        }
      }
    };

    setupMovementWallet();
  }, [authenticated, user, createWallet, isCreatingWallet]);

  // Handle native wallet connection
  useEffect(() => {
    if (connected && account?.address) {
      const address = account.address.toString();
      setMovementAddress(address);
      setIsPrivyWallet(false);
      console.log('Native Wallet Address:', address);
    }
  }, [connected, account]);

  // Fetch balance function
  const fetchBalance = useCallback(async () => {
    if (!movementAddress) return;
    try {
      const bal = await getAccountBalance(movementAddress);
      setBalance(bal);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [movementAddress]);

  // Fetch balance on wallet connection and poll every 10 seconds
  useEffect(() => {
    if (movementAddress) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [movementAddress, fetchBalance]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast({ message: '', type: 'info', isVisible: false });
  };

  const handleGameStart = (creator: string, player1: boolean, twoPlayerMode: boolean = false) => {
    setGameCreator(creator);
    setIsPlayer1(player1);
    setIsTwoPlayerMode(twoPlayerMode);
    setGameState('playing');
  };

  const handleGameExit = () => {
    setGameState('lobby');
    setGameCreator('');
  };

  const handleDisconnect = async () => {
    if (isPrivyWallet) {
      await logout();
    } else {
      disconnectNative();
    }
    setMovementAddress('');
    setBalance(0);
    setGameState('lobby');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
        <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
        <div className="text-neon-green font-mono text-xl animate-pulse">INITIALIZING SYSTEM...</div>
      </div>
    );
  }

  // Show game if either Privy is authenticated OR native wallet is connected
  const isWalletConnected = authenticated || connected;

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {isWalletConnected && movementAddress && (
        <div className="fixed top-4 right-4 z-[1000]">
          <WalletDropdown 
            address={movementAddress}
            balance={balance}
            onDisconnect={handleDisconnect}
            onFaucet={() => window.open('https://faucet.movementnetwork.xyz/', '_blank')}
          />
        </div>
      )}

      {!isWalletConnected ? (
        <LoginPage />
      ) : gameState === 'lobby' ? (
        <GameLobby 
          walletAddress={movementAddress}
          onGameStart={handleGameStart}
          onToast={showToast}
        />
      ) : (
        <SnakeGame
          gameCreator={gameCreator}
          isPlayer1={isPlayer1}
          walletAddress={movementAddress}
          isTwoPlayerMode={isTwoPlayerMode}
          onExit={handleGameExit}
          onToast={showToast}
        />
      )}
    </>
  );
}
