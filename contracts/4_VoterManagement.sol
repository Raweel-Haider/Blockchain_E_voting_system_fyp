// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// ============================================
// 4. VOTER MANAGEMENT CONTRACT
// Handles: Voter Registration & Management
// ============================================
import "./1_GeographicManagement.sol";

contract VoterManagement {
    
    address public admin;
    address public votingProcessContract;
    GeographicManagement public geoContract;
    
    struct Voter {
        uint256 cnic;
        string name;
        string province;
        string constituency;
        bytes32 passwordHash;
        bool isRegistered;
        bool hasVoted;
        bytes32 secretKeyHash;
    }
    
    // Storage
    mapping(uint256 => Voter) public voters;
    mapping(uint256 => bool) public isVoterCnicRegistered;
    uint256 public voterCount;
    
    // Track all registered CNICs for batch reset
    uint256[] private registeredCnics;
    mapping(uint256 => bool) private isCnicTracked;
    
    // Events
    event VoterRegistered(uint256 indexed cnic, string name, string constituency);
    event VoterRemoved(uint256 indexed cnic);
    event VoterMarkedAsVoted(uint256 indexed cnic);
    event VotingProcessSet(address indexed votingProcess);
    event VoterResetForNewElection(uint256 indexed cnic);
    event AllVotersResetForNewElection(uint256 count, uint256 timestamp);
    event VoterPasswordChanged(uint256 indexed cnic, uint256 timestamp); // ✅ NEW
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == admin || msg.sender == votingProcessContract,
            "Only admin or VotingProcess can call this"
        );
        _;
    }
    
    constructor(address _votingMachine, address _geoContract) {
        admin = _votingMachine;
        geoContract = GeographicManagement(_geoContract);
    }
    
    function setVotingProcessContract(address _votingProcess) external onlyAdmin {
        require(_votingProcess != address(0), "Invalid address");
        votingProcessContract = _votingProcess;
        emit VotingProcessSet(_votingProcess);
    }
    
    // Register Voter
    function registerVoter(
        uint256 _cnic,
        string memory _name,
        string memory _province,
        string memory _constituency,
        string memory _password
    ) external onlyAdmin {
        require(!isVoterCnicRegistered[_cnic], "CNIC already registered");
        require(geoContract.isProvinceAdded(_province), "Province does not exist");
        require(geoContract.isConstituencyAdded(_province, _constituency), "Constituency does not exist");
        require(bytes(_password).length >= 6, "Password must be at least 6 characters");
        
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        
        voters[_cnic] = Voter(
            _cnic,
            _name,
            _province,
            _constituency,
            passwordHash,
            true,
            false,
            bytes32(0)
        );
        
        isVoterCnicRegistered[_cnic] = true;
        voterCount++;
        
        if (!isCnicTracked[_cnic]) {
            registeredCnics.push(_cnic);
            isCnicTracked[_cnic] = true;
        }
        
        emit VoterRegistered(_cnic, _name, _constituency);
    }
    
    // Batch Register Voters
    function batchRegisterVoters(
        uint256[] memory _cnics,
        string[] memory _names,
        string[] memory _provinces,
        string[] memory _constituencies,
        string[] memory _passwords
    ) external onlyAdmin {
        require(
            _cnics.length == _names.length &&
            _names.length == _provinces.length &&
            _provinces.length == _constituencies.length &&
            _constituencies.length == _passwords.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < _cnics.length; i++) {
            if (!isVoterCnicRegistered[_cnics[i]]) {
                bytes32 passwordHash = keccak256(abi.encodePacked(_passwords[i]));
                
                voters[_cnics[i]] = Voter(
                    _cnics[i],
                    _names[i],
                    _provinces[i],
                    _constituencies[i],
                    passwordHash,
                    true,
                    false,
                    bytes32(0)
                );
                
                isVoterCnicRegistered[_cnics[i]] = true;
                voterCount++;
                
                if (!isCnicTracked[_cnics[i]]) {
                    registeredCnics.push(_cnics[i]);
                    isCnicTracked[_cnics[i]] = true;
                }
                
                emit VoterRegistered(_cnics[i], _names[i], _constituencies[i]);
            }
        }
    }
    
    // Remove Voter
    function removeVoter(uint256 _cnic) external onlyAdmin {
        require(voters[_cnic].isRegistered, "Voter does not exist");
        
        isVoterCnicRegistered[_cnic] = false;
        delete voters[_cnic];
        voterCount--;
        
        emit VoterRemoved(_cnic);
    }
    
    // ✅ NEW: Change voter password (keeps everything else intact)
    function changeVoterPassword(
        uint256 _cnic,
        bytes32 _currentPasswordHash,
        string memory _newPassword
    ) external onlyAdmin {
        require(voters[_cnic].isRegistered, "Voter not registered");
        require(voters[_cnic].passwordHash == _currentPasswordHash, "Current password incorrect");
        require(bytes(_newPassword).length >= 6, "New password must be at least 6 characters");
        
        bytes32 newPasswordHash = keccak256(abi.encodePacked(_newPassword));
        require(newPasswordHash != _currentPasswordHash, "New password must be different");
        
        voters[_cnic].passwordHash = newPasswordHash;
        
        emit VoterPasswordChanged(_cnic, block.timestamp);
    }
    
    // Reset single voter for new election (keeps password & personal data)
    function resetVoterForNewElection(uint256 _cnic) external onlyAdmin {
        require(voters[_cnic].isRegistered, "Voter not registered");
        
        voters[_cnic].hasVoted = false;
        voters[_cnic].secretKeyHash = bytes32(0);
        
        emit VoterResetForNewElection(_cnic);
    }
    
    // Reset ALL voters for new election (batch operation)
    function resetAllVotersForNewElection() external onlyAdmin returns (uint256) {
        uint256 resetCount = 0;
        
        for (uint256 i = 0; i < registeredCnics.length; i++) {
            uint256 cnic = registeredCnics[i];
            
            if (voters[cnic].isRegistered) {
                voters[cnic].hasVoted = false;
                voters[cnic].secretKeyHash = bytes32(0);
                resetCount++;
                
                emit VoterResetForNewElection(cnic);
            }
        }
        
        emit AllVotersResetForNewElection(resetCount, block.timestamp);
        return resetCount;
    }
    
    // View Voter
    function viewVoter(uint256 _cnic) external view returns (
        uint256 cnic,
        string memory name,
        string memory province,
        string memory constituency,
        bool hasVoted,
        bool isRegistered
    ) {
        Voter memory voter = voters[_cnic];
        return (voter.cnic, voter.name, voter.province, voter.constituency, voter.hasVoted, voter.isRegistered);
    }
    
    // Mark voter as voted
    function markAsVoted(uint256 _cnic) external onlyAuthorized {
        require(voters[_cnic].isRegistered, "Voter not registered");
        require(!voters[_cnic].hasVoted, "Already marked as voted");
        voters[_cnic].hasVoted = true;
        emit VoterMarkedAsVoted(_cnic);
    }
    
    // Set secret key hash
    function setSecretKeyHash(uint256 _cnic, bytes32 _secretKeyHash) external onlyAuthorized {
        require(voters[_cnic].isRegistered, "Voter not registered");
        voters[_cnic].secretKeyHash = _secretKeyHash;
    }
    
    // Verify voter credentials
    function verifyVoterCredentials(uint256 _cnic, bytes32 _passwordHash) external view returns (bool) {
        return voters[_cnic].isRegistered && voters[_cnic].passwordHash == _passwordHash;
    }
    
    // Get voter constituency
    function getVoterConstituency(uint256 _cnic) external view returns (string memory province, string memory constituency) {
        require(voters[_cnic].isRegistered, "Voter not registered");
        return (voters[_cnic].province, voters[_cnic].constituency);
    }
    
    // Get voter secret key hash
    function getVoterSecretKeyHash(uint256 _cnic) external view returns (bytes32) {
        require(voters[_cnic].isRegistered, "Voter not registered");
        return voters[_cnic].secretKeyHash;
    }
    
    // Get voter count
    function getVoterCount() external view returns (uint256) {
        return voterCount;
    }
    
    // Get all registered CNICs
    function getAllRegisteredCnics() external view returns (uint256[] memory) {
        uint256[] memory activeCnics = new uint256[](voterCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < registeredCnics.length; i++) {
            uint256 cnic = registeredCnics[i];
            if (voters[cnic].isRegistered) {
                activeCnics[index] = cnic;
                index++;
            }
        }
        
        return activeCnics;
    }
}