// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// ============================================
// 6. RESULT MANAGEMENT CONTRACT
// Handles: Vote Counting & Results
// ============================================
import "./5_VotingProcess.sol";
import "./3_CandidateManagement.sol";
import "./4_VoterManagement.sol";

contract ResultManagement {
    
    address public admin;
    VotingProcess public votingContract;
    CandidateManagement public candidateContract;
    VoterManagement public voterContract;
    
    mapping(uint256 => uint256) public candidateVotes; // candidateId => vote count
    mapping(string => mapping(string => bool)) public resultDeclared; // province => constituency => declared
    mapping(string => mapping(string => uint256)) public winners; // province => constituency => winnerCandidateId
    
    // ✅ NEW: Track constituencies with results
    string[] private provincesWithResults;
    mapping(string => bool) private hasProvinceResults;
    mapping(string => string[]) private constituenciesWithResults;
    mapping(string => mapping(string => bool)) private hasConstituencyResult;
    
    // Events
    event VotesCounted(string indexed province, string indexed constituency, uint256 totalVotes);
    event ResultDeclared(string indexed province, string indexed constituency, uint256 winnerId, uint256 voteCount);
    event VoteCountEntered(uint256 indexed candidateId, uint256 voteCount);
    event AllResultsReset(uint256 timestamp); // ✅ NEW
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    constructor(
        address _votingMachine,
        address _votingContract,
        address _candidateContract,
        address _voterContract
    ) {
        admin = _votingMachine;
        votingContract = VotingProcess(_votingContract);
        candidateContract = CandidateManagement(_candidateContract);
        voterContract = VoterManagement(_voterContract);
    }
    
    // Count Votes
    function countVotes(string memory _province, string memory _constituency) external onlyAdmin {
        (bool active,,,) = votingContract.getVotingStatus();
        require(!active, "Voting still in progress");
        require(!resultDeclared[_province][_constituency], "Result already declared");
        
        uint256[] memory candidates = candidateContract.viewCandidatesByConstituency(_province, _constituency);
        require(candidates.length > 0, "No candidates in this constituency");
        
        for (uint256 i = 0; i < candidates.length; i++) {
            candidateVotes[candidates[i]] = 0;
        }
        
        emit VotesCounted(_province, _constituency, 0);
    }
    
    // Enter Vote Counts
    function enterVoteCounts(uint256[] memory _candidateIds, uint256[] memory _counts) external onlyAdmin {
        require(_candidateIds.length == _counts.length, "Array length mismatch");
        require(_candidateIds.length > 0, "Empty arrays");
        
        for (uint256 i = 0; i < _candidateIds.length; i++) {
            (uint256 candidateId,,,,, ) = candidateContract.viewCandidate(_candidateIds[i]);
            require(candidateId != 0, "Candidate does not exist");
            
            candidateVotes[_candidateIds[i]] = _counts[i];
            emit VoteCountEntered(_candidateIds[i], _counts[i]);
        }
    }
    
    // Declare Winner
    function declareWinner(string memory _province, string memory _constituency) 
        external 
        onlyAdmin 
        returns (uint256 winnerId, uint256 winnerVotes) 
    {
        require(!resultDeclared[_province][_constituency], "Result already declared");
        
        uint256[] memory candidates = candidateContract.viewCandidatesByConstituency(_province, _constituency);
        require(candidates.length > 0, "No candidates in this constituency");
        
        uint256 maxVotes = 0;
        uint256 winnerCandidateId = 0;
        
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidateVotes[candidates[i]] > maxVotes) {
                maxVotes = candidateVotes[candidates[i]];
                winnerCandidateId = candidates[i];
            }
        }
        
        require(winnerCandidateId != 0, "No valid winner found");
        
        resultDeclared[_province][_constituency] = true;
        winners[_province][_constituency] = winnerCandidateId;
        
        _trackConstituencyResult(_province, _constituency);
        
        emit ResultDeclared(_province, _constituency, winnerCandidateId, maxVotes);
        return (winnerCandidateId, maxVotes);
    }
    function autoCountVotes(
    string memory _province, 
    string memory _constituency
) external onlyAdmin returns (uint256 totalVotes) {
    (bool votingActive,,,) = votingContract.getVotingStatus();
    require(!votingActive, "Voting still in progress");
    require(!resultDeclared[_province][_constituency], "Result already declared");
    
    uint256[] memory candidates = candidateContract.viewCandidatesByConstituency(_province, _constituency);
    require(candidates.length > 0, "No candidates in constituency");
    
    // Reset all candidate votes to 0
    for (uint256 i = 0; i < candidates.length; i++) {
        candidateVotes[candidates[i]] = 0;
    }
    
    // Get all registered voters
    uint256[] memory allVoters = voterContract.getAllRegisteredCnics();
    
    // Count votes for this constituency
    for (uint256 i = 0; i < allVoters.length; i++) {
        uint256 voterCnic = allVoters[i];
        
        try voterContract.viewVoter(voterCnic) returns (
            uint256, 
            string memory, 
            string memory voterProvince, 
            string memory voterConstituency, 
            bool hasVoted, 
            bool isRegistered
        ) {
            // Check if voter is in this constituency and has voted
            if (isRegistered && 
                hasVoted &&
                keccak256(bytes(voterProvince)) == keccak256(bytes(_province)) &&
                keccak256(bytes(voterConstituency)) == keccak256(bytes(_constituency))) {
                
                // Get the candidate they voted for
                uint256 votedForCandidateId = votingContract.votes(voterCnic);
                
                // Increment that candidate's vote count
                if (votedForCandidateId > 0) {
                    candidateVotes[votedForCandidateId]++;
                    totalVotes++;
                }
            }
        } catch {
            // Skip voter if there's an error
            continue;
        }
    }
    
    emit VotesCounted(_province, _constituency, totalVotes);
    return totalVotes;
}
    
    // ✅ NEW: Reset all results for new election
    function resetAllResults() external onlyAdmin returns (uint256) {
        uint256 resetCount = 0;
        
        // Reset all tracked constituencies
        for (uint256 i = 0; i < provincesWithResults.length; i++) {
            string memory province = provincesWithResults[i];
            string[] memory constituencies = constituenciesWithResults[province];
            
            for (uint256 j = 0; j < constituencies.length; j++) {
                string memory constituency = constituencies[j];
                
                resultDeclared[province][constituency] = false;
                winners[province][constituency] = 0;
                hasConstituencyResult[province][constituency] = false;
                resetCount++;
            }
            
            delete constituenciesWithResults[province];
            hasProvinceResults[province] = false;
        }
        
        delete provincesWithResults;
        
        emit AllResultsReset(block.timestamp);
        return resetCount;
    }
    
    // Internal tracking
    function _trackConstituencyResult(string memory _province, string memory _constituency) private {
        if (!hasProvinceResults[_province]) {
            provincesWithResults.push(_province);
            hasProvinceResults[_province] = true;
        }
        
        if (!hasConstituencyResult[_province][_constituency]) {
            constituenciesWithResults[_province].push(_constituency);
            hasConstituencyResult[_province][_constituency] = true;
        }
    }
    
    // Get Results
    function getResults(string memory _province, string memory _constituency) 
        external 
        view 
        returns (uint256[] memory candidateIds, uint256[] memory voteCounts) 
    {
        uint256[] memory candidates = candidateContract.viewCandidatesByConstituency(_province, _constituency);
        uint256[] memory counts = new uint256[](candidates.length);
        
        for (uint256 i = 0; i < candidates.length; i++) {
            counts[i] = candidateVotes[candidates[i]];
        }
        
        return (candidates, counts);
    }
    
    // Get Winner
    function getWinner(string memory _province, string memory _constituency) 
        external 
        view 
        returns (uint256 winnerId, uint256 voteCount, bool isDeclared) 
    {
        bool declared = resultDeclared[_province][_constituency];
        uint256 winner = winners[_province][_constituency];
        uint256 votes = candidateVotes[winner];
        
        return (winner, votes, declared);
    }
    
    // Get Candidate Vote Count
    function getCandidateVotes(uint256 _candidateId) external view returns (uint256) {
        return candidateVotes[_candidateId];
    }
    
    // Check if result declared
    function isResultDeclared(string memory _province, string memory _constituency) external view returns (bool) {
        return resultDeclared[_province][_constituency];
    }
}