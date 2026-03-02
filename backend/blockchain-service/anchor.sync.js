const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');
const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey, clusterApiUrl } = require('@solana/web3.js');
const { User, Run, Territory, DailyProof } = require('../core/schema');
const { buildLeaf, buildMerkleTree } = require('./merkle');
const logger = require('../utils/logger');

const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');

function resolveWalletKeypair() {
  const keypairJson = process.env.SOLANA_WALLET_KEYPAIR;
  if (keypairJson) {
    const parsed = JSON.parse(keypairJson);
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  }

  const base58PrivateKey = process.env.SOLANA_WALLET_PRIVATE_KEY;
  if (base58PrivateKey) {
    return Keypair.fromSecretKey(bs58.decode(base58PrivateKey));
  }

  throw new Error('Missing wallet key: set SOLANA_WALLET_KEYPAIR (json array) or SOLANA_WALLET_PRIVATE_KEY (base58)');
}

function resolveIdlPath() {
  const candidates = [
    path.join(__dirname, '../contracts/target/idl/territory_proof.json'),
    path.join(__dirname, '../contracts/idl/territory_proof.json'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function getProvider() {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const keypair = resolveWalletKeypair();
  return new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), {
    commitment: 'confirmed',
  });
}

async function getProgram() {
  const programId = process.env.SOLANA_PROGRAM_ID;
  if (!programId) {
    throw new Error('Missing SOLANA_PROGRAM_ID in environment');
  }

  const idlPath = resolveIdlPath();
  if (!idlPath) {
    throw new Error('Anchor IDL not found. Expected contracts/target/idl/territory_proof.json');
  }

  const provider = getProvider();
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  return new anchor.Program(idl, new PublicKey(programId), provider);
}

function getProofStorePda(programId) {
  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('proof_store')], programId);
  return { pda, bump };
}

function getDailyProofPda(dateStr, programId) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('daily_proof'), Buffer.from(dateStr)],
    programId
  );
  return { pda, bump };
}

async function initializeProofStore() {
  const program = await getProgram();
  const authority = program.provider.wallet.publicKey;
  const { pda } = getProofStorePda(program.programId);

  try {
    const existing = await program.account.proofStore.fetch(pda);
    logger.info(`[Blockchain] ProofStore already exists. Authority=${existing.authority.toString()}`);
    return pda.toString();
  } catch {
    const tx = await program.methods
      .initialize(authority)
      .accounts({ proofStore: pda, payer: authority })
      .rpc();
    logger.info(`[Blockchain] ProofStore initialized. TX=${tx}`);
    return pda.toString();
  }
}

async function writeDailyProof(dateStr) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  logger.info(`[Blockchain] Building daily proof for ${targetDate}`);

  const existing = await DailyProof.findOne({ date: targetDate, status: 'confirmed' });
  if (existing) {
    logger.info(`[Blockchain] Already confirmed for ${targetDate}. TX=${existing.txSignature}`);
    return existing;
  }

  await DailyProof.findOneAndUpdate(
    { date: targetDate },
    { $set: { status: 'computing', date: targetDate }, $inc: { anchorAttempts: 1 } },
    { upsert: true, new: true }
  );

  try {
    const users = await User.find({ isBanned: false })
      .sort('_id')
      .select('_id credits hexesOwned stats.totalKm')
      .lean();

    const leaves = users.map((user) =>
      buildLeaf(
        user._id.toString(),
        user.credits || 0,
        user.hexesOwned || 0,
        user.stats?.totalKm || 0,
        targetDate
      )
    );

    const { root } = buildMerkleTree(leaves);

    const start = new Date(targetDate);
    const end = new Date(start.getTime() + 86400000);

    const [totalHexes, runsToday, activeUsers] = await Promise.all([
      Territory.countDocuments(),
      Run.countDocuments({ startedAt: { $gte: start, $lt: end }, isProcessed: true }),
      Run.distinct('userId', { startedAt: { $gte: start, $lt: end }, isProcessed: true }).then((ids) => ids.length),
    ]);

    await DailyProof.findOneAndUpdate(
      { date: targetDate },
      {
        $set: {
          merkleRoot: root.toString('hex'),
          leafCount: leaves.length,
          totalUsers: users.length,
          activeUsers,
          totalHexesClaimed: totalHexes,
          totalRunsCompleted: runsToday,
          status: 'anchoring',
          network: SOLANA_NETWORK,
        },
      }
    );

    const program = await getProgram();
    const authority = program.provider.wallet.publicKey;
    const { pda: proofStorePda } = getProofStorePda(program.programId);
    const { pda: dailyProofPda } = getDailyProofPda(targetDate, program.programId);

    const tx = await program.methods
      .writeDailyProof(
        targetDate,
        Array.from(root),
        users.length,
        new anchor.BN(totalHexes),
        runsToday
      )
      .accounts({
        dailyProof: dailyProofPda,
        proofStore: proofStorePda,
        authority,
      })
      .rpc();

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const blockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: tx, ...blockhash }, 'confirmed');
    const txInfo = await connection.getTransaction(tx, { commitment: 'confirmed' });

    const finalDoc = await DailyProof.findOneAndUpdate(
      { date: targetDate },
      {
        $set: {
          txSignature: tx,
          blockHeight: txInfo?.slot || 0,
          anchoredAt: new Date(),
          status: 'confirmed',
          anchorError: null,
          network: SOLANA_NETWORK,
        },
      },
      { new: true }
    );

    logger.info(`[Blockchain] Daily proof confirmed. date=${targetDate} tx=${tx}`);
    return finalDoc;
  } catch (error) {
    await DailyProof.findOneAndUpdate(
      { date: targetDate },
      { $set: { status: 'failed', anchorError: error.message } }
    );
    logger.error(`[Blockchain] Daily proof failed for ${targetDate}: ${error.message}`);
    throw error;
  }
}

async function fetchProofFromChain(dateStr) {
  try {
    const program = await getProgram();
    const { pda } = getDailyProofPda(dateStr, program.programId);
    const proof = await program.account.dailyProof.fetch(pda);

    return {
      dateStr: proof.dateStr,
      merkleRoot: Buffer.from(proof.merkleRoot).toString('hex'),
      totalUsers: proof.totalUsers,
      totalHexes: proof.totalHexes.toString(),
      writtenAt: new Date(Number(proof.writtenAt) * 1000).toISOString(),
      authority: proof.authority.toString(),
      pda: pda.toString(),
    };
  } catch {
    return null;
  }
}

module.exports = {
  initializeProofStore,
  writeDailyProof,
  fetchProofFromChain,
  getDailyProofPda,
  getProofStorePda,
};
