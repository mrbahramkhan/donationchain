/**
 * Optional on-chain anchor via ethers (backend owner wallet).
 * Set env: REGISTRY_ADDRESS, RPC_URL, OWNER_PRIVATE_KEY
 * Without env, returns simulated result.
 */
async function anchorDonationProof({ receiptId, amount, caseTitle, vendor, method }) {
  const address = process.env.REGISTRY_ADDRESS;
  const rpc = process.env.RPC_URL;
  const key = process.env.OWNER_PRIVATE_KEY;

  if (!address || !rpc || !key) {
    return {
      simulated: true,
      message: 'Set REGISTRY_ADDRESS, RPC_URL, OWNER_PRIVATE_KEY to enable real anchoring',
      receiptId,
    };
  }

  try {
    const { ethers } = require('ethers');
    const abi = [
      'function anchorDonation(bytes32 receiptHash, bytes32 dataHash, uint256 amount)',
    ];
    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(key, provider);
    const contract = new ethers.Contract(address, abi, wallet);
    const receiptHash = ethers.id(String(receiptId));
    const dataHash = ethers.id(
      JSON.stringify({ amount, case: caseTitle, vendor, method })
    );
    const tx = await contract.anchorDonation(receiptHash, dataHash, BigInt(amount));
    const mined = await tx.wait();
    return { simulated: false, txHash: mined.hash, receiptId };
  } catch (e) {
    return { error: e.message, receiptId };
  }
}

module.exports = { anchorDonationProof };
