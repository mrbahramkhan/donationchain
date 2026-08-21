/** Deployed DonationRegistry addresses — update after hardhat deploy */
window.DC_CONTRACT = {
  // Set after deploy (Polygon Amoy example placeholder)
  address: "0x0000000000000000000000000000000000000000",
  chainId: 80002, // Polygon Amoy testnet
  chainName: "Polygon Amoy",
  rpcUrl: "https://rpc-amoy.polygon.technology",
  explorerTx: "https://amoy.polygonscan.com/tx/",
  explorerAddress: "https://amoy.polygonscan.com/address/",
  // Minimal ABI subset used by the web app
  abi: [
    "function isAnchored(bytes32 receiptHash) view returns (bool)",
    "function getProof(bytes32 receiptHash) view returns (tuple(bytes32 receiptHash, bytes32 dataHash, uint256 amount, uint64 timestamp, address reporter))",
    "function donationCount() view returns (uint256)",
    "function tipAnchorCount() view returns (uint256)",
    "function latestTipAnchor() view returns (tuple(bytes32 tipHash, uint256 blockIndex, uint64 timestamp, string note))",
    "function anchorDonation(bytes32 receiptHash, bytes32 dataHash, uint256 amount)",
    "function anchorLedgerTip(bytes32 tipHash, uint256 blockIndex, string note)",
    "function anchorMerkleRoot(bytes32 root, uint256 leafCount, string label)",
    "function isMerkleRootAnchored(bytes32 root) view returns (bool)",
    "function merkleRootCount() view returns (uint256)",
    "event DonationAnchored(bytes32 indexed receiptHash, bytes32 dataHash, uint256 amount, address indexed reporter, uint256 index)"
  ]
};
