import {
  AccountAuthenticatorEd25519,
  Ed25519PublicKey,
  Ed25519Signature,
  generateSigningMessageForTransaction,
} from '@aptos-labs/ts-sdk';
import { aptos, toHex } from './aptos';
import { SignRawHashFunction } from './transactions';

// Game contract address - deployed on Movement testnet
export const GAME_CONTRACT_ADDRESS = '0xf2fa21daeb741e9ea472603a1f4f0e189c3b9b0907a52128bc4e4218aaddb04b';

// Use V2 contract with proper escrow
const GAME_MODULE = 'game_v2';

/**
 * Create a new game
 */
export const createGame = async (
  stakeAmount: number,
  walletAddress: string,
  publicKeyHex: string,
  signRawHash: SignRawHashFunction
): Promise<string> => {
  try {
    // Convert MOVE to octas (1 MOVE = 100000000 octas)
    const stakeInOctas = Math.floor(stakeAmount * 100000000);
    console.log('[Create Game] Starting transaction:', { stakeAmount, stakeInOctas, walletAddress });

    const rawTxn = await aptos.transaction.build.simple({
      sender: walletAddress,
      data: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::create_game`,
        typeArguments: [],
        functionArguments: [stakeInOctas, GAME_CONTRACT_ADDRESS],
      },
    });

    const message = generateSigningMessageForTransaction(rawTxn);
    const { signature: rawSignature } = await signRawHash({
      address: walletAddress,
      chainType: 'aptos',
      hash: `0x${toHex(message)}`,
    });

    let cleanPublicKey = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
    if (cleanPublicKey.length === 66) {
      cleanPublicKey = cleanPublicKey.slice(2);
    }

    const senderAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(cleanPublicKey),
      new Ed25519Signature(rawSignature.startsWith('0x') ? rawSignature.slice(2) : rawSignature)
    );

    const committedTransaction = await aptos.transaction.submit.simple({
      transaction: rawTxn,
      senderAuthenticator,
    });

    const executed = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    console.log('[Create Game] Transaction confirmed');
    return committedTransaction.hash;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

/**
 * Create game with native wallet
 */
export const createGameNative = async (
  stakeAmount: number,
  walletAddress: string,
  signAndSubmitTransaction: any
): Promise<string> => {
  try {
    // Convert MOVE to octas (1 MOVE = 100000000 octas)
    const stakeInOctas = Math.floor(stakeAmount * 100000000);
    
    const response = await signAndSubmitTransaction({
      sender: walletAddress,
      data: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::create_game`,
        functionArguments: [stakeInOctas, GAME_CONTRACT_ADDRESS],
      },
    });

    const executed = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    return response.hash;
  } catch (error) {
    console.error('Error creating game with native wallet:', error);
    throw error;
  }
};

/**
 * Join an existing game
 */
export const joinGame = async (
  gameCreator: string,
  walletAddress: string,
  publicKeyHex: string,
  signRawHash: SignRawHashFunction
): Promise<string> => {
  try {
    console.log('[Join Game] Starting transaction:', { gameCreator, walletAddress });

    const rawTxn = await aptos.transaction.build.simple({
      sender: walletAddress,
      data: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::join_game`,
        typeArguments: [],
        functionArguments: [gameCreator],
      },
    });

    const message = generateSigningMessageForTransaction(rawTxn);
    const { signature: rawSignature } = await signRawHash({
      address: walletAddress,
      chainType: 'aptos',
      hash: `0x${toHex(message)}`,
    });

    let cleanPublicKey = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
    if (cleanPublicKey.length === 66) {
      cleanPublicKey = cleanPublicKey.slice(2);
    }

    const senderAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(cleanPublicKey),
      new Ed25519Signature(rawSignature.startsWith('0x') ? rawSignature.slice(2) : rawSignature)
    );

    const committedTransaction = await aptos.transaction.submit.simple({
      transaction: rawTxn,
      senderAuthenticator,
    });

    const executed = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    console.log('[Join Game] Transaction confirmed');
    return committedTransaction.hash;
  } catch (error) {
    console.error('Error joining game:', error);
    throw error;
  }
};

/**
 * Join game with native wallet
 */
export const joinGameNative = async (
  gameCreator: string,
  walletAddress: string,
  signAndSubmitTransaction: any
): Promise<string> => {
  try {
    const response = await signAndSubmitTransaction({
      sender: walletAddress,
      data: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::join_game`,
        functionArguments: [gameCreator],
      },
    });

    const executed = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    return response.hash;
  } catch (error) {
    console.error('Error joining game with native wallet:', error);
    throw error;
  }
};

/**
 * Submit game result (simplified version)
 */
export const submitGameResult = async (
  gameCreator: string,
  score: number,
  gameHash: string,
  won: boolean,
  walletAddress: string,
  publicKeyHex: string,
  signRawHash: SignRawHashFunction
): Promise<string> => {
  try {
    console.log('[Submit Result] Starting transaction:', { gameCreator, score, won });

    const rawTxn = await aptos.transaction.build.simple({
      sender: walletAddress,
      data: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::submit_result`,
        typeArguments: [],
        functionArguments: [gameCreator, score, won],
      },
    });

    const message = generateSigningMessageForTransaction(rawTxn);
    const { signature: rawSignature } = await signRawHash({
      address: walletAddress,
      chainType: 'aptos',
      hash: `0x${toHex(message)}`,
    });

    let cleanPublicKey = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
    if (cleanPublicKey.length === 66) {
      cleanPublicKey = cleanPublicKey.slice(2);
    }

    const senderAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(cleanPublicKey),
      new Ed25519Signature(rawSignature.startsWith('0x') ? rawSignature.slice(2) : rawSignature)
    );

    const committedTransaction = await aptos.transaction.submit.simple({
      transaction: rawTxn,
      senderAuthenticator,
    });

    const executed = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    console.log('[Submit Result] Transaction confirmed');
    return committedTransaction.hash;
  } catch (error) {
    console.error('Error submitting result:', error);
    throw error;
  }
};

/**
 * Claim winnings (V2: winner can claim directly!)
 */
export const claimWinnings = async (
  gameCreator: string,
  walletAddress: string,
  publicKeyHex: string,
  signRawHash: SignRawHashFunction
): Promise<string> => {
  try {
    console.log('[Claim Winnings] Starting transaction:', { gameCreator, walletAddress });

    const rawTxn = await aptos.transaction.build.simple({
      sender: walletAddress,
      data: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::claim_winnings`,
        typeArguments: [],
        functionArguments: [gameCreator, GAME_CONTRACT_ADDRESS],
      },
    });

    const message = generateSigningMessageForTransaction(rawTxn);
    const { signature: rawSignature } = await signRawHash({
      address: walletAddress, // Fixed: use walletAddress instead of gameCreator
      chainType: 'aptos',
      hash: `0x${toHex(message)}`,
    });

    let cleanPublicKey = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;
    if (cleanPublicKey.length === 66) {
      cleanPublicKey = cleanPublicKey.slice(2);
    }

    const senderAuthenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(cleanPublicKey),
      new Ed25519Signature(rawSignature.startsWith('0x') ? rawSignature.slice(2) : rawSignature)
    );

    const committedTransaction = await aptos.transaction.submit.simple({
      transaction: rawTxn,
      senderAuthenticator,
    });

    const executed = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    console.log('[Claim Winnings] Transaction confirmed');
    return committedTransaction.hash;
  } catch (error) {
    console.error('Error claiming winnings:', error);
    throw error;
  }
};

/**
 * Claim winnings with native wallet
 */
export const claimWinningsNative = async (
  gameCreator: string,
  walletAddress: string,
  signAndSubmitTransaction: any
): Promise<string> => {
  try {
    console.log('[Claim Winnings Native] Starting transaction:', { gameCreator, walletAddress });

    const response = await signAndSubmitTransaction({
      sender: walletAddress,
      data: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::claim_winnings`,
        functionArguments: [gameCreator, GAME_CONTRACT_ADDRESS],
      },
    });

    const executed = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    if (!executed.success) {
      throw new Error('Transaction failed');
    }

    console.log('[Claim Winnings Native] Transaction confirmed');
    return response.hash;
  } catch (error) {
    console.error('Error claiming winnings with native wallet:', error);
    throw error;
  }
};

/**
 * Get game by creator address (simplified version)
 */
export const getGame = async (gameCreator: string): Promise<any | null> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::get_game`,
        typeArguments: [],
        functionArguments: [gameCreator],
      },
    });

    // Parse the tuple response
    const [game_id, player1, player2, stake_amount, status, winner, player1_score, player2_score, player1_submitted, player2_submitted] = result as any[];

    return {
      game_id: Number(game_id),
      player1,
      player2,
      stake_amount: Number(stake_amount),
      status: Number(status),
      winner,
      player1_score: Number(player1_score),
      player2_score: Number(player2_score),
      player1_submitted,
      player2_submitted,
    };
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
};

/**
 * Get player stats
 */
export const getPlayerStats = async (playerAddress: string) => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${GAME_CONTRACT_ADDRESS}::${GAME_MODULE}::get_player_stats`,
        typeArguments: [],
        functionArguments: [playerAddress],
      },
    });

    return result[0];
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return null;
  }
};
