// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// ============================================
// 3. CANDIDATE MANAGEMENT CONTRACT
// Handles: Candidate Registration & Management
// ============================================
import "./1_GeographicManagement.sol";
import "./2_PartyManagement.sol";

contract CandidateManagement {
    
    address public admin;
    GeographicManagement public geoContract;
    PartyManagement public partyContract;
    
    struct Candidate {
        uint256 id;
        uint256 cnic;
        string name;
        string province;
        string constituency;
        string party;
        bool exists;
    }
    
    // Storage
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => bool) public isCandidateCnicRegistered;
    mapping(string => mapping(string => uint256[])) public candidatesInConstituency;
    mapping(string => mapping(string => mapping(string => uint256))) public candidateByParty;
    
    uint256 public candidateCount;
    
    // Events
    event CandidateRegistered(uint256 indexed candidateId, string name, string party, string constituency);
    event CandidateRemoved(uint256 indexed candidateId);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    // ✅ FIXED: Constructor now accepts VotingMachine address
    constructor(address _votingMachine, address _geoContract, address _partyContract) {
        admin = _votingMachine;
        geoContract = GeographicManagement(_geoContract);
        partyContract = PartyManagement(_partyContract);
    }
    
    // Register Candidate
    function registerCandidate(
        uint256 _cnic,
        string memory _name,
        string memory _province,
        string memory _constituency,
        string memory _party
    ) external onlyAdmin returns (uint256) {
        require(!isCandidateCnicRegistered[_cnic], "CNIC already registered as candidate");
        require(geoContract.isProvinceAdded(_province), "Province does not exist");
        require(geoContract.isConstituencyAdded(_province, _constituency), "Constituency does not exist");
        require(partyContract.isPartyRegistered(_party), "Party not registered");
        require(
            candidateByParty[_province][_constituency][_party] == 0,
            "Party already has candidate in this constituency"
        );
        
        candidateCount++;
        
        candidates[candidateCount] = Candidate(
            candidateCount,
            _cnic,
            _name,
            _province,
            _constituency,
            _party,
            true
        );
        
        isCandidateCnicRegistered[_cnic] = true;
        candidatesInConstituency[_province][_constituency].push(candidateCount);
        candidateByParty[_province][_constituency][_party] = candidateCount;
        
        emit CandidateRegistered(candidateCount, _name, _party, _constituency);
        return candidateCount;
    }
    
    // Remove Candidate
    function removeCandidate(uint256 _candidateId) external onlyAdmin {
        require(candidates[_candidateId].exists, "Candidate does not exist");
        
        Candidate memory candidate = candidates[_candidateId];
        
        // Remove from mappings
        isCandidateCnicRegistered[candidate.cnic] = false;
        candidateByParty[candidate.province][candidate.constituency][candidate.party] = 0;
        
        // Remove from constituency array
        uint256[] storage constCandidates = candidatesInConstituency[candidate.province][candidate.constituency];
        for (uint256 i = 0; i < constCandidates.length; i++) {
            if (constCandidates[i] == _candidateId) {
                constCandidates[i] = constCandidates[constCandidates.length - 1];
                constCandidates.pop();
                break;
            }
        }
        
        delete candidates[_candidateId];
        
        emit CandidateRemoved(_candidateId);
    }
    
    // View Candidate
    function viewCandidate(uint256 _candidateId) external view returns (
        uint256 id,
        uint256 cnic,
        string memory name,
        string memory province,
        string memory constituency,
        string memory party
    ) {
        require(candidates[_candidateId].exists, "Candidate does not exist");
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.id, candidate.cnic, candidate.name, candidate.province, candidate.constituency, candidate.party);
    }
    
    // View Candidates by Constituency
    function viewCandidatesByConstituency(string memory _province, string memory _constituency) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return candidatesInConstituency[_province][_constituency];
    }
    
    // Get Candidate Count
    function getCandidateCount() external view returns (uint256) {
        return candidateCount;
    }
    
    // Check if candidate exists in constituency
    function candidateExistsInConstituency(
        string memory _province,
        string memory _constituency,
        string memory _party
    ) external view returns (bool) {
        return candidateByParty[_province][_constituency][_party] != 0;
    }
}