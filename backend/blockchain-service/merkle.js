const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest();
}

function buildLeaf(userId, credits, hexes, km, date) {
  const input = `${userId}:${credits}:${hexes}:${Math.round((km || 0) * 100)}:${date}`;
  return sha256(input);
}

function buildMerkleTree(leaves) {
  if (!leaves.length) throw new Error('Cannot build Merkle tree from empty leaves');
  if (leaves.length === 1) return { root: leaves[0], tree: [leaves] };

  const tree = [leaves];
  let level = leaves;

  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256(Buffer.concat([left, right])));
    }
    tree.push(next);
    level = next;
  }

  return { root: level[0], tree };
}

function buildMerkleProof(tree, leafIndex) {
  const proof = [];
  let index = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const isRight = index % 2 === 1;
    const siblingIdx = isRight ? index - 1 : index + 1;
    if (siblingIdx < tree[level].length) {
      proof.push({
        hash: tree[level][siblingIdx].toString('hex'),
        position: isRight ? 'left' : 'right',
      });
    }
    index = Math.floor(index / 2);
  }

  return { proof };
}

function verifyMerkleProof(leafHex, proof, rootHex) {
  let current = Buffer.from(leafHex, 'hex');
  for (const node of proof) {
    const sibling = Buffer.from(node.hash, 'hex');
    current = node.position === 'left'
      ? sha256(Buffer.concat([sibling, current]))
      : sha256(Buffer.concat([current, sibling]));
  }
  return current.toString('hex') === rootHex;
}

module.exports = {
  buildLeaf,
  buildMerkleTree,
  buildMerkleProof,
  verifyMerkleProof,
};
