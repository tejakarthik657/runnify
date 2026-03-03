const crypto = require('crypto');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function buildMerkleRoot(leaves) {
  if (!leaves.length)      return sha256('empty');
  if (leaves.length === 1) return leaves[0];
  const next = [];
  for (let i = 0; i < leaves.length; i += 2) {
    next.push(sha256(leaves[i] + (leaves[i + 1] || leaves[i])));
  }
  return buildMerkleRoot(next);
}

// MT1 — Single user leaf
console.log('MT1:', buildMerkleRoot(['abc123']) === 'abc123' ? '✅ PASS' : '❌ FAIL');

// MT2 — Two users
const twoUsers = buildMerkleRoot(['leaf1', 'leaf2']);
console.log('MT2:', twoUsers.length === 64 ? '✅ PASS' : '❌ FAIL');

// MT3 — Odd number of users (3)
const threeUsers = buildMerkleRoot(['leaf1', 'leaf2', 'leaf3']);
console.log('MT3:', threeUsers.length === 64 ? '✅ PASS' : '❌ FAIL');

// MT4 — Deterministic (same input = same root)
const root1 = buildMerkleRoot(['user1:2026-03-01:100:5', 'user2:2026-03-01:200:8']);
const root2 = buildMerkleRoot(['user1:2026-03-01:100:5', 'user2:2026-03-01:200:8']);
console.log('MT4:', root1 === root2 ? '✅ PASS' : '❌ FAIL');

// MT5 — Tamper detection (different input = different root)
const root3 = buildMerkleRoot(['user1:2026-03-01:101:5', 'user2:2026-03-01:200:8']); // 100 → 101
console.log('MT5:', root1 !== root3 ? '✅ PASS (tamper detected)' : '❌ FAIL');

// MT6 — Empty day
const emptyRoot = buildMerkleRoot([]);
console.log('MT6:', emptyRoot.length === 64 ? '✅ PASS' : '❌ FAIL');

console.log('\n═══════════════════════════════════════════');
console.log('All Merkle roots:');
console.log('═══════════════════════════════════════════');
console.log('root1 (clean):        ', root1);
console.log('root2 (same as root1):', root2);
console.log('root3 (tampered):     ', root3);
console.log('empty root:           ', emptyRoot);
console.log('═══════════════════════════════════════════');
console.log('\n✅ All MT1–MT6 tests completed!');
console.log('Run: node test-merkle.js');
