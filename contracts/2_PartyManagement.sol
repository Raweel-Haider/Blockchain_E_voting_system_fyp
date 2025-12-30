// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// ============================================
// 2. PARTY MANAGEMENT CONTRACT
// Handles: Political Parties
// ============================================
contract PartyManagement {
    
    address public admin;
    
    struct Party {
        string name;
        bool exists;
    }
    
    // Storage
    string[] public parties;
    mapping(string => Party) public partyDetails;
    mapping(string => bool) public isPartyRegistered;
    
    // Events
    event PartyAdded(string indexed partyName);
    event PartyRemoved(string indexed partyName);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    // ✅ FIXED: Constructor now accepts VotingMachine address
    constructor(address _votingMachine) {
        admin = _votingMachine;
    }
    
    // Add Party
    function addParty(string memory _partyName) external onlyAdmin {
        require(bytes(_partyName).length > 0, "Party name cannot be empty");
        require(!isPartyRegistered[_partyName], "Party already registered");
        
        parties.push(_partyName);
        partyDetails[_partyName] = Party(_partyName, true);
        isPartyRegistered[_partyName] = true;
        
        emit PartyAdded(_partyName);
    }
    
    // Remove Party
    function removeParty(string memory _partyName) external onlyAdmin {
        require(isPartyRegistered[_partyName], "Party does not exist");
        
        isPartyRegistered[_partyName] = false;
        delete partyDetails[_partyName];
        
        for (uint256 i = 0; i < parties.length; i++) {
            if (keccak256(bytes(parties[i])) == keccak256(bytes(_partyName))) {
                parties[i] = parties[parties.length - 1];
                parties.pop();
                break;
            }
        }
        
        emit PartyRemoved(_partyName);
    }
    
    // View all Parties
    function viewParties() external view returns (string[] memory) {
        return parties;
    }
    
    // Get total count
    function getPartyCount() external view returns (uint256) {
        return parties.length;
    }
}