// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DonationRegistry
 * @notice DonationChain on-chain anchor registry.
 *         Does NOT hold donor funds. Records immutable donation proofs
 *         and periodic ledger tip hashes for third-party audit.
 */
contract DonationRegistry {
    address public owner;
    uint256 public donationCount;
    uint256 public tipAnchorCount;

    struct DonationProof {
        bytes32 receiptHash;   // keccak256 of receipt id / payload
        bytes32 dataHash;      // hash of amount, vendor, case metadata
        uint256 amount;        // PKR minor units or scaled integer
        uint64  timestamp;
        address reporter;      // backend / oracle that submitted
    }

    struct TipAnchor {
        bytes32 tipHash;       // tip of off-chain SHA-256 ledger (as bytes32)
        uint256 blockIndex;    // off-chain block index
        uint64  timestamp;
        string  note;
    }

    mapping(bytes32 => DonationProof) public proofs;          // receiptHash => proof
    mapping(uint256 => bytes32) public donationByIndex;       // index => receiptHash
    mapping(uint256 => TipAnchor) public tipAnchors;

    event DonationAnchored(
        bytes32 indexed receiptHash,
        bytes32 dataHash,
        uint256 amount,
        address indexed reporter,
        uint256 index
    );

    event TipAnchored(
        bytes32 indexed tipHash,
        uint256 blockIndex,
        uint256 anchorId,
        address indexed reporter
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Anchor a single donation proof (called by trusted backend wallet).
     */
    function anchorDonation(
        bytes32 receiptHash,
        bytes32 dataHash,
        uint256 amount
    ) external onlyOwner {
        require(receiptHash != bytes32(0), "empty receipt");
        require(proofs[receiptHash].timestamp == 0, "already anchored");

        proofs[receiptHash] = DonationProof({
            receiptHash: receiptHash,
            dataHash: dataHash,
            amount: amount,
            timestamp: uint64(block.timestamp),
            reporter: msg.sender
        });

        donationByIndex[donationCount] = receiptHash;
        uint256 index = donationCount;
        donationCount += 1;

        emit DonationAnchored(receiptHash, dataHash, amount, msg.sender, index);
    }

    /**
     * @notice Batch anchor (gas-efficient for backend batch jobs).
     */
    function anchorDonationBatch(
        bytes32[] calldata receiptHashes,
        bytes32[] calldata dataHashes,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(
            receiptHashes.length == dataHashes.length &&
                dataHashes.length == amounts.length,
            "length mismatch"
        );
        for (uint256 i = 0; i < receiptHashes.length; i++) {
            bytes32 rh = receiptHashes[i];
            if (rh == bytes32(0) || proofs[rh].timestamp != 0) continue;
            proofs[rh] = DonationProof({
                receiptHash: rh,
                dataHash: dataHashes[i],
                amount: amounts[i],
                timestamp: uint64(block.timestamp),
                reporter: msg.sender
            });
            donationByIndex[donationCount] = rh;
            emit DonationAnchored(rh, dataHashes[i], amounts[i], msg.sender, donationCount);
            donationCount += 1;
        }
    }

    /**
     * @notice Anchor the tip of the off-chain verification ledger.
     */
    function anchorLedgerTip(
        bytes32 tipHash,
        uint256 blockIndex,
        string calldata note
    ) external onlyOwner {
        require(tipHash != bytes32(0), "empty tip");
        uint256 id = tipAnchorCount;
        tipAnchors[id] = TipAnchor({
            tipHash: tipHash,
            blockIndex: blockIndex,
            timestamp: uint64(block.timestamp),
            note: note
        });
        tipAnchorCount += 1;
        emit TipAnchored(tipHash, blockIndex, id, msg.sender);
    }

    function getProof(bytes32 receiptHash)
        external
        view
        returns (DonationProof memory)
    {
        return proofs[receiptHash];
    }

    function isAnchored(bytes32 receiptHash) external view returns (bool) {
        return proofs[receiptHash].timestamp != 0;
    }

    function latestTipAnchor() external view returns (TipAnchor memory) {
        require(tipAnchorCount > 0, "no anchors");
        return tipAnchors[tipAnchorCount - 1];
    }
}

    // ─── Merkle batch roots ───────────────────────────────────────────

    uint256 public merkleRootCount;

    struct MerkleRootAnchor {
        bytes32 root;
        uint256 leafCount;
        uint64  timestamp;
        string  label;
        address reporter;
    }

    mapping(uint256 => MerkleRootAnchor) public merkleRoots;
    mapping(bytes32 => uint256) public merkleRootId; // root => id+1 (0 = missing)

    event MerkleRootAnchored(
        bytes32 indexed root,
        uint256 leafCount,
        uint256 rootId,
        string label,
        address indexed reporter
    );

    /**
     * @notice Anchor a Merkle root of a donation batch (gas-efficient audit).
     */
    function anchorMerkleRoot(
        bytes32 root,
        uint256 leafCount,
        string calldata label
    ) external onlyOwner {
        require(root != bytes32(0), "empty root");
        require(leafCount > 0, "no leaves");
        uint256 id = merkleRootCount;
        merkleRoots[id] = MerkleRootAnchor({
            root: root,
            leafCount: leafCount,
            timestamp: uint64(block.timestamp),
            label: label,
            reporter: msg.sender
        });
        merkleRootId[root] = id + 1;
        merkleRootCount += 1;
        emit MerkleRootAnchored(root, leafCount, id, label, msg.sender);
    }

    function isMerkleRootAnchored(bytes32 root) external view returns (bool) {
        return merkleRootId[root] != 0;
    }

    /**
     * @notice Verify a leaf against a root using sorted-pair SHA-256 style path.
     * @dev Siblings are concatenated in sorted order (matching off-chain JS/Node).
     *      Note: on-chain we use keccak256 for gas; for production matching SHA-256
     *      proofs, verify off-chain or use a SHA-256 precompile / wrapper.
     *      This helper verifies keccak256 sorted pairs for EVM-native demos.
     */
    function verifyMerkleKeccak(
        bytes32 leaf,
        bytes32[] calldata siblings,
        bytes32 root
    ) external pure returns (bool) {
        bytes32 hash = leaf;
        for (uint256 i = 0; i < siblings.length; i++) {
            bytes32 s = siblings[i];
            if (hash < s) {
                hash = keccak256(abi.encodePacked(hash, s));
            } else {
                hash = keccak256(abi.encodePacked(s, hash));
            }
        }
        return hash == root;
    }
}
