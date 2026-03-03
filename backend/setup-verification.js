// setup-verification.js
// Run this to verify your Ethereum Sepolia setup before starting the backend
// Tests: S1-S4 from the blockchain setup guide

require('dotenv').config();
const { ethers } = require('ethers');

async function runSetupTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  ETHEREUM SEPOLIA SETUP VERIFICATION');
  console.log('═══════════════════════════════════════════\n');

  // S2 — Check Alchemy RPC URL is set
  console.log('[S2] Checking Alchemy RPC URL...');
  if (!process.env.ALCHEMY_RPC_URL || process.env.ALCHEMY_RPC_URL === 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY_HERE') {
    console.log('❌ FAIL: ALCHEMY_RPC_URL not set or still has placeholder value');
    console.log('   → Go to https://dashboard.alchemy.com and get your API key');
    console.log('   → Update .env: ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY\n');
    return;
  }
  console.log('✅ PASS: ALCHEMY_RPC_URL is set\n');

  // S3 — Check Wallet Private Key is set
  console.log('[S3] Checking Wallet Private Key...');
  if (!process.env.WALLET_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY === 'your_metamask_private_key_here') {
    console.log('❌ FAIL: WALLET_PRIVATE_KEY not set or still has placeholder value');
    console.log('   → Open MetaMask → Account Details → Export Private Key');
    console.log('   → Update .env: WALLET_PRIVATE_KEY=your_actual_private_key\n');
    return;
  }
  console.log('✅ PASS: WALLET_PRIVATE_KEY is set\n');

  try {
    // S2 — Test Alchemy RPC responds
    console.log('[S2] Testing connection to Alchemy RPC...');
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
    const network = await provider.getNetwork();
    
    if (network.chainId !== 11155111n) {
      console.log(`❌ FAIL: Wrong network! Expected Sepolia (11155111) but got chain ID ${network.chainId}`);
      console.log('   → Check your Alchemy RPC URL is for Sepolia testnet\n');
      return;
    }
    console.log('✅ PASS: Connected to Sepolia testnet (chain ID: 11155111)\n');

    // S3 — Test wallet connects
    console.log('[S3] Testing wallet connection...');
    const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    console.log(`✅ PASS: Wallet connected: ${address}\n`);

    // S1 — Check wallet has Sepolia ETH
    console.log('[S1] Checking Sepolia ETH balance...');
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    
    if (balance === 0n) {
      console.log('❌ FAIL: Wallet has 0 SepoliaETH');
      console.log('   → Visit these faucets and paste your address:');
      console.log('     • https://sepoliafaucet.com');
      console.log('     • https://faucet.quicknode.com/ethereum/sepolia');
      console.log('     • https://faucets.chain.link/sepolia\n');
      return;
    }
    console.log(`✅ PASS: Wallet has ${balanceInEth} SepoliaETH\n`);

    // S4 — Test gas estimation
    console.log('[S4] Testing gas estimation...');
    const gasEstimate = await provider.estimateGas({
      to: address,
      value: 0n,
      data: '0x' + Buffer.from('test', 'utf8').toString('hex'),
    });
    console.log(`✅ PASS: Gas estimate: ${gasEstimate.toString()} units\n`);

    // All tests passed!
    console.log('═══════════════════════════════════════════');
    console.log('✅ ALL SETUP TESTS PASSED!');
    console.log('═══════════════════════════════════════════');
    console.log('Your Ethereum Sepolia setup is ready.');
    console.log('You can now start the backend and test blockchain anchoring.\n');
    console.log('Next steps:');
    console.log('1. Run: npm install  (to install ethers.js if not already)');
    console.log('2. Run: node test-merkle.js  (to test Merkle logic)');
    console.log('3. Run: npm run dev  (to start backend)');
    console.log('4. Test anchor: POST /blockchain/anchor-now\n');

  } catch (error) {
    console.log('❌ ERROR during setup verification:');
    console.log(error.message);
    
    if (error.message.includes('invalid private key')) {
      console.log('\n💡 Your WALLET_PRIVATE_KEY is invalid.');
      console.log('   Make sure you copied the full private key from MetaMask.');
    } else if (error.message.includes('could not detect network')) {
      console.log('\n💡 Cannot connect to Alchemy RPC.');
      console.log('   Check your ALCHEMY_RPC_URL and internet connection.');
    }
    console.log('');
  }
}

runSetupTests();
