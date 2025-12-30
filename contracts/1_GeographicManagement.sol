// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// ============================================
// 1. GEOGRAPHIC MANAGEMENT CONTRACT
// Handles: Provinces & Constituencies
// ============================================
contract GeographicManagement {
    
    address public admin;
    
    // Province structure
    struct Province {
        string name;
        bool exists;
    }
    
    // Constituency structure
    struct Constituency {
        string name;
        string province;
        bool exists;
    }
    
    // Storage
    string[] public provinces;
    mapping(string => bool) public isProvinceAdded;
    mapping(string => string[]) public constituenciesByProvince;
    mapping(string => mapping(string => bool)) public isConstituencyAdded;
    
    // Events
    event ProvinceAdded(string indexed province);
    event ProvinceRemoved(string indexed province);
    event ConstituencyAdded(string indexed province, string indexed constituency);
    event ConstituencyRemoved(string indexed province, string indexed constituency);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    // ✅ FIXED: Constructor now accepts VotingMachine address
    constructor(address _votingMachine) {
        admin = _votingMachine;
    }
    
    // Add Province
    function addProvince(string memory _province) external onlyAdmin {
        require(bytes(_province).length > 0, "Province name cannot be empty");
        require(!isProvinceAdded[_province], "Province already exists");
        
        provinces.push(_province);
        isProvinceAdded[_province] = true;
        
        emit ProvinceAdded(_province);
    }
    
    // Remove Province
    function removeProvince(string memory _province) external onlyAdmin {
        require(isProvinceAdded[_province], "Province does not exist");
        require(constituenciesByProvince[_province].length == 0, "Remove all constituencies first");
        
        isProvinceAdded[_province] = false;
        
        for (uint256 i = 0; i < provinces.length; i++) {
            if (keccak256(bytes(provinces[i])) == keccak256(bytes(_province))) {
                provinces[i] = provinces[provinces.length - 1];
                provinces.pop();
                break;
            }
        }
        
        emit ProvinceRemoved(_province);
    }
    
    // View all Provinces
    function viewProvinces() external view returns (string[] memory) {
        return provinces;
    }
    
    // Add Constituency
    function addConstituency(string memory _province, string memory _constituency) external onlyAdmin {
        require(isProvinceAdded[_province], "Province does not exist");
        require(bytes(_constituency).length > 0, "Constituency name cannot be empty");
        require(!isConstituencyAdded[_province][_constituency], "Constituency already exists");
        
        constituenciesByProvince[_province].push(_constituency);
        isConstituencyAdded[_province][_constituency] = true;
        
        emit ConstituencyAdded(_province, _constituency);
    }
    
    // Remove Constituency
    function removeConstituency(string memory _province, string memory _constituency) external onlyAdmin {
        require(isConstituencyAdded[_province][_constituency], "Constituency does not exist");
        
        isConstituencyAdded[_province][_constituency] = false;
        
        string[] storage constituencies = constituenciesByProvince[_province];
        for (uint256 i = 0; i < constituencies.length; i++) {
            if (keccak256(bytes(constituencies[i])) == keccak256(bytes(_constituency))) {
                constituencies[i] = constituencies[constituencies.length - 1];
                constituencies.pop();
                break;
            }
        }
        
        emit ConstituencyRemoved(_province, _constituency);
    }
    
    // View Constituencies by Province
    function viewConstituenciesByProvince(string memory _province) external view returns (string[] memory) {
        require(isProvinceAdded[_province], "Province does not exist");
        return constituenciesByProvince[_province];
    }
    
    // Get total counts
    function getCounts() external view returns (uint256 provinceCount, uint256 constituencyCount) {
        uint256 totalConstituencies = 0;
        for (uint256 i = 0; i < provinces.length; i++) {
            totalConstituencies += constituenciesByProvince[provinces[i]].length;
        }
        return (provinces.length, totalConstituencies);
    }
}