// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// ============================================
// 5. VOTING PROCESS CONTRACT
// Handles: Vote Casting & Verification
// ============================================
import "./4_VoterManagement.sol";
import "./3_CandidateManagement.sol";

contract VotingProcess {
    
    address public admin;
    VoterManagement public voterContract;
    CandidateManagement public candidateContract;
    
    bool public votingActive;
    uint256 public votingStartTime;
    uint256 public votingEndTime;
    
    // Vote storage
    mapping(uint256 => bytes32) public voteHashes; // cnic => vote hash
    mapping(uint256 => uint256) public votes; // cnic => candidateId (changed to public for result counting)
    
    // Events
    event VotingStarted(uint256 startTime, uint256 endTime);
    event VotingEnded(uint256 endTime);
    event SecretKeyRegistered(uint256 indexed voterCnic);
    event VoteCast(uint256 indexed voterCnic, bytes32 voteHash, uint256 timestamp);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier withinVotingPeriod() {
        require(votingActive, "Voting is not active");
        require(block.timestamp >= votingStartTime, "Voting has not started yet");
        require(block.timestamp <= votingEndTime, "Voting has ended");
        _;
    }
    
    // ✅ FIXED: Constructor now accepts VotingMachine address
    constructor(address _votingMachine, address _voterContract, address _candidateContract) {
        admin = _votingMachine;
        voterContract = VoterManagement(_voterContract);
        candidateContract = CandidateManagement(_candidateContract);
        votingActive = false;
    }
    
    // Start Voting
    function startVoting(uint256 _durationInHours) external onlyAdmin {
        require(!votingActive, "Voting is already active");
        require(_durationInHours > 0, "Duration must be greater than 0");
        
        votingStartTime = block.timestamp;
        votingEndTime = block.timestamp + (_durationInHours * 1 hours);
        votingActive = true;
        
        emit VotingStarted(votingStartTime, votingEndTime);
    }
    
    // Stop Voting
    function stopVoting() external onlyAdmin {
        require(votingActive, "Voting is not active");
        
        votingActive = false;
        votingEndTime = block.timestamp;
        
        emit VotingEnded(votingEndTime);
    }
    
    // Register Secret Key (Step 1 of voting)
    function registerSecretKey(
        uint256 _voterCnic,
        string memory _password,
        string memory _secretKey
    ) external withinVotingPeriod {
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        
        require(voterContract.verifyVoterCredentials(_voterCnic, passwordHash), "Invalid voter credentials");
        
        (,,,,bool hasVoted,) = voterContract.viewVoter(_voterCnic);
        require(!hasVoted, "Already voted");
        require(bytes(_secretKey).length >= 6, "Secret key must be at least 6 characters");
        
        bytes32 secretKeyHash = keccak256(abi.encodePacked(_secretKey));
        voterContract.setSecretKeyHash(_voterCnic, secretKeyHash);
        
        emit SecretKeyRegistered(_voterCnic);
    }
    
    // Cast Vote (Step 2 of voting)
    function castVote(
        uint256 _voterCnic,
        string memory _password,
        uint256 _candidateId,
        string memory _secretKey
    ) external withinVotingPeriod {
        // Verify voter credentials
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        require(voterContract.verifyVoterCredentials(_voterCnic, passwordHash), "Invalid voter credentials");
        
        // Check if already voted
        (,,,,bool hasVoted,) = voterContract.viewVoter(_voterCnic);
        require(!hasVoted, "Already voted");
        
        // ✅ FIXED: Verify secret key matches registered one
        bytes32 storedSecretHash = voterContract.getVoterSecretKeyHash(_voterCnic);
        require(storedSecretHash != bytes32(0), "Secret key not registered. Register first.");
        
        bytes32 providedSecretHash = keccak256(abi.encodePacked(_secretKey));
        require(storedSecretHash == providedSecretHash, "Invalid secret key");
        
        // Get voter's constituency
        (string memory voterProvince, string memory voterConstituency) = voterContract.getVoterConstituency(_voterCnic);
        
        // Verify candidate exists
        (,,,string memory candidateProvince, string memory candidateConstituency,) = candidateContract.viewCandidate(_candidateId);
        
        // Verify candidate is in voter's constituency
        require(
            keccak256(bytes(candidateProvince)) == keccak256(bytes(voterProvince)) &&
            keccak256(bytes(candidateConstituency)) == keccak256(bytes(voterConstituency)),
            "Candidate not in your constituency"
        );
        
        // Record vote
        votes[_voterCnic] = _candidateId;
        bytes32 voteHash = keccak256(abi.encodePacked(_voterCnic, _candidateId, _secretKey, block.timestamp));
        voteHashes[_voterCnic] = voteHash;
        
        // Mark voter as voted
        voterContract.markAsVoted(_voterCnic);
        
        emit VoteCast(_voterCnic, voteHash, block.timestamp);
    }
    
    // ✅ FIXED: Verify My Vote - now properly verifies secret key
    function verifyMyVote(
        uint256 _voterCnic,
        string memory _secretKey
    ) external view returns (uint256 candidateId, bool verified) {
        (,,,,bool hasVoted,) = voterContract.viewVoter(_voterCnic);
        require(hasVoted, "You haven't voted yet");
        
        // Verify secret key
        bytes32 storedSecretHash = voterContract.getVoterSecretKeyHash(_voterCnic);
        bytes32 providedSecretHash = keccak256(abi.encodePacked(_secretKey));
        
        if (storedSecretHash == providedSecretHash) {
            return (votes[_voterCnic], true);
        } else {
            return (0, false);
        }
    }
    
    // Get voting status
    function getVotingStatus() external view returns (
        bool active,
        uint256 startTime,
        uint256 endTime,
        uint256 currentTime
    ) {
        return (votingActive, votingStartTime, votingEndTime, block.timestamp);
    }
    // ✅ ADD THIS NEW FUNCTION HERE
    function getVoterVote(uint256 _voterCnic) external view returns (uint256) {
        return votes[_voterCnic];
    }

}