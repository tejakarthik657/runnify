const { User, DailyProof } = require('../core/schema');
const { buildLeaf, buildMerkleTree, buildMerkleProof, verifyMerkleProof } = require('./merkle');
const { fetchProofFromChain } = require('./anchor.sync');

async function generateUserProof(userId, dateStr) {
  const users = await User.find({ isBanned: false })
    .select('_id credits hexesOwned stats.totalKm')
    .sort('_id')
    .lean();

  const userIndex = users.findIndex((user) => user._id.toString() === userId);
  if (userIndex === -1) throw new Error('User not found');

  const leaves = users.map((user) =>
    buildLeaf(
      user._id.toString(),
      user.credits || 0,
      user.hexesOwned || 0,
      user.stats?.totalKm || 0,
      dateStr
    )
  );

  const { root, tree } = buildMerkleTree(leaves);
  const { proof } = buildMerkleProof(tree, userIndex);

  const dbProof = await DailyProof.findOne({ date: dateStr, status: 'confirmed' });
  const chainProof = await fetchProofFromChain(dateStr).catch(() => null);

  const target = users[userIndex];
  const network = process.env.SOLANA_NETWORK || 'devnet';

  return {
    userId,
    dateStr,
    userData: {
      credits: target.credits,
      hexesOwned: target.hexesOwned,
      totalKm: target.stats?.totalKm || 0,
    },
    userLeafHash: leaves[userIndex].toString('hex'),
    merkleProof: proof,
    expectedMerkleRoot: root.toString('hex'),
    dbMerkleRoot: dbProof?.merkleRoot || null,
    chainMerkleRoot: chainProof?.merkleRoot || null,
    txSignature: dbProof?.txSignature || null,
    explorerUrl: dbProof?.txSignature
      ? `https://explorer.solana.com/tx/${dbProof.txSignature}?cluster=${network}`
      : null,
  };
}

function verifyUserProof(proofPackage) {
  const { userLeafHash, merkleProof, chainMerkleRoot } = proofPackage;
  if (!chainMerkleRoot) return false;
  return verifyMerkleProof(userLeafHash, merkleProof, chainMerkleRoot);
}

module.exports = {
  generateUserProof,
  verifyUserProof,
};
