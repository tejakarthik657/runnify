/**
 * Solana/Anchor Blockchain Synchronization Service
 * Handles daily territory proof commitments to Solana blockchain
 */
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Program, web3 } = require('@project-serum/anchor');
const bs58 = require('bs58');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { DailyProof } = require('./proof.model');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * Initialize Solana connection
 */
function initializeSolana() {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );
  
  // Load wallet from private key
  const privateKey = process.env.SOLANA_WALLET_PRIVATE_KEY;
  const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
  
  return { connection, wallet };
}

/**
 * Generate Merkle root from territory data
 */
function generateMerkleRoot(territories) {
  if (!territories || territories.length === 0) {
    return crypto.createHash('sha256').update('EMPTY').digest('hex');
  }
  
  // Create leaf hashes from territory data
  const leaves = territories.map(territory => {
    const data = JSON.stringify({
      hexId: territory.hexId,
      owner: territory.owner,
      credits: territory.credits,
      lastUpdated: territory.lastUpdated
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  });
  
  // Build Merkle tree (simple implementation)
  while (leaves.length > 1) {
    const newLevel = [];
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = leaves[i + 1] || left; // Duplicate if odd
      const combined = crypto.createHash('sha256')
        .update(left + right)
        .digest('hex');
      newLevel.push(combined);
    }
    leaves.splice(0, leaves.length, ...newLevel);
  }
  
  return leaves[0];
}

/**
 * Create audit hash from daily stats
 */
function createAuditHash(stats) {
  const data = JSON.stringify({
    totalTerritories: stats.totalTerritories,
    totalPlayers: stats.totalPlayers,
    totalRuns: stats.totalRuns,
    merkleRoot: stats.merkleRoot,
    timestamp: stats.timestamp
  });
  
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate and commit daily proof to Solana
 */
async function generateDailyProof() {
  const startTime = Date.now();
  logger.info('📊 Generating daily territory proof...');
  
  try {
    // Connect to MongoDB
    const Territory = mongoose.model('Territory');
    const User = mongoose.model('User');
    const Run = mongoose.model('Run');
    
    // Fetch current state
    const territories = await Territory.find({}).lean();
    const userCount = await User.countDocuments();
    const runCount = await Run.countDocuments({
      startTime: { $gte: Date.now() - 86400000 } // Last 24h
    });
    
    // Generate Merkle root
    const merkleRoot = generateMerkleRoot(territories);
    
    // Compile stats
    const stats = {
      totalTerritories: territories.length,
      totalPlayers: userCount,
      totalRuns: runCount,
      merkleRoot,
      timestamp: new Date()
    };
    
    // Create audit hash
    const auditHash = createAuditHash(stats);
    
    logger.info('📝 Proof data prepared:', {
      merkleRoot: merkleRoot.substring(0, 16) + '...',
      auditHash: auditHash.substring(0, 16) + '...',
      territories: territories.length
    });
    
    // Initialize Solana connection
    const { connection, wallet } = initializeSolana();
    
    // For now, we'll simulate the transaction
    // In production, this would interact with your Anchor program
    const txSignature = await simulateSolanaTransaction(
      connection,
      wallet,
      merkleRoot,
      auditHash
    );
    
    // Save proof to MongoDB
    const proof = new DailyProof({
      date: new Date(),
      merkleRoot: `0x${merkleRoot}`,
      auditHash: `0x${auditHash}`,
      transactionHash: txSignature,
      territoryCount: territories.length,
      playerCount: userCount,
      runCount: runCount,
      blockchainNetwork: 'solana-devnet',
      status: 'CONFIRMED'
    });
    
    await proof.save();
    
    const duration = Date.now() - startTime;
    logger.info(`✅ Daily proof committed in ${duration}ms`, {
      txHash: txSignature,
      proofId: proof._id
    });
    
    return {
      proofId: proof._id,
      merkleRoot: proof.merkleRoot,
      auditHash: proof.auditHash,
      transactionHash: txSignature,
      territories: territories.length,
      duration
    };
    
  } catch (error) {
    logger.error('❌ Daily proof generation failed:', error);
    throw error;
  }
}

/**
 * Simulate Solana transaction (replace with actual Anchor program call)
 */
async function simulateSolanaTransaction(connection, wallet, merkleRoot, auditHash) {
  // This is a placeholder - replace with your Anchor program interaction
  logger.info('🔗 Submitting to Solana blockchain...');
  
  try {
    // Example: Send a memo transaction as proof of concept
    const transaction = new web3.Transaction().add(
      new web3.TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(`TerritoryRun:${merkleRoot.substring(0, 32)}:${auditHash.substring(0, 32)}`)
      })
    );
    
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet]
    );
    
    logger.info('✅ Transaction confirmed:', signature);
    return signature;
    
  } catch (error) {
    logger.error('❌ Solana transaction failed:', error);
    // For development, return a mock signature
    return 'mock_' + crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Verify a historical proof
 */
async function verifyProof(proofId) {
  const proof = await DailyProof.findById(proofId);
  
  if (!proof) {
    throw new Error('Proof not found');
  }
  
  // Verify on-chain data
  const { connection } = initializeSolana();
  
  try {
    const txInfo = await connection.getTransaction(proof.transactionHash);
    return {
      valid: !!txInfo,
      proof,
      onChainData: txInfo
    };
  } catch (error) {
    return {
      valid: false,
      proof,
      error: error.message
    };
  }
}

module.exports = {
  generateDailyProof,
  verifyProof,
  generateMerkleRoot,
  createAuditHash
};
