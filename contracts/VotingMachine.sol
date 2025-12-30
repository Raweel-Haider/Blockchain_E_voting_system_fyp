// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// ============================================
// 7. VOTING MACHINE CONTRACT (MAIN CONTRACT)
// Handles: Admin Management & Contract Coordination
// ============================================
import "./1_GeographicManagement.sol";
import "./2_PartyManagement.sol";
import "./3_CandidateManagement.sol";
import "./4_VoterManagement.sol";
import "./5_VotingProcess.sol";
import "./6_ResultManagement.sol";

contract VotingMachine {
    address public immutable owner;

    struct Admin {
        uint256 cnic;
        string name;
        bytes32 passwordHash;
        bool exists;
    }

    mapping(uint256 => Admin) public admins;
    mapping(uint256 => bool) public isAdminCnic;

    // Contract references
    GeographicManagement public geoContract;
    PartyManagement public partyContract;
    CandidateManagement public candidateContract;
    VoterManagement public voterContract;
    VotingProcess public votingContract;
    ResultManagement public resultContract;

    bool public contractsLinked;

    // Events
    event AdminAdded(uint256 indexed cnic, string name);
    event AdminRemoved(uint256 indexed cnic);
    event ContractsLinked(
        address geo,
        address party,
        address candidate,
        address voter,
        address voting,
        address result
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAdmin(uint256 _cnic, string memory _password) {
        require(admins[_cnic].exists, "Admin does not exist");
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        require(admins[_cnic].passwordHash == passwordHash, "Invalid password");
        _;
    }

    modifier contractsAreLinked() {
        require(contractsLinked, "Contracts not linked yet");
        _;
    }

    constructor() {
        owner = msg.sender;
        contractsLinked = false;
    }

    // ADMIN MANAGEMENT
    // ============================================

    function addAdmin(
        uint256 _cnic,
        string memory _name,
        string memory _password
    ) external onlyOwner {
        require(!isAdminCnic[_cnic], "CNIC already registered as admin");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(
            bytes(_password).length >= 6,
            "Password must be at least 6 characters"
        );

        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        admins[_cnic] = Admin(_cnic, _name, passwordHash, true);
        isAdminCnic[_cnic] = true;

        emit AdminAdded(_cnic, _name);
    }

    function removeAdmin(uint256 _cnic) external onlyOwner {
        require(admins[_cnic].exists, "Admin does not exist");
        delete admins[_cnic];
        isAdminCnic[_cnic] = false;
        emit AdminRemoved(_cnic);
    }

    function viewAdmin(
        uint256 _cnic
    ) external view returns (uint256 cnic, string memory name, bool exists) {
        Admin memory admin = admins[_cnic];
        return (admin.cnic, admin.name, admin.exists);
    }

    function verifyAdmin(
        uint256 _cnic,
        string memory _password
    ) external view returns (bool) {
        if (!admins[_cnic].exists) return false;
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        return admins[_cnic].passwordHash == passwordHash;
    }

    // ============================================
    // CONTRACT LINKING
    // ============================================

    function linkContracts(
        address _geoContract,
        address _partyContract,
        address _candidateContract,
        address _voterContract,
        address _votingContract,
        address _resultContract
    ) external onlyOwner {
        require(!contractsLinked, "Contracts already linked");
        require(_geoContract != address(0), "Invalid geo address");
        require(_partyContract != address(0), "Invalid party address");
        require(_candidateContract != address(0), "Invalid candidate address");
        require(_voterContract != address(0), "Invalid voter address");
        require(_votingContract != address(0), "Invalid voting address");
        require(_resultContract != address(0), "Invalid result address");

        geoContract = GeographicManagement(_geoContract);
        partyContract = PartyManagement(_partyContract);
        candidateContract = CandidateManagement(_candidateContract);
        voterContract = VoterManagement(_voterContract);
        votingContract = VotingProcess(_votingContract);
        resultContract = ResultManagement(_resultContract);

        contractsLinked = true;

        emit ContractsLinked(
            _geoContract,
            _partyContract,
            _candidateContract,
            _voterContract,
            _votingContract,
            _resultContract
        );
    }

    function getContractAddresses()
        external
        view
        contractsAreLinked
        returns (
            address geo,
            address party,
            address candidate,
            address voter,
            address voting,
            address result
        )
    {
        return (
            address(geoContract),
            address(partyContract),
            address(candidateContract),
            address(voterContract),
            address(votingContract),
            address(resultContract)
        );
    }

    // ============================================
    // ADMIN PROXY FUNCTIONS - GEOGRAPHIC
    // ============================================

    function admin_addProvince(
        uint256 _adminCnic,
        string memory _password,
        string memory _province
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        geoContract.addProvince(_province);
    }

    function admin_removeProvince(
        uint256 _adminCnic,
        string memory _password,
        string memory _province
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        geoContract.removeProvince(_province);
    }

    function admin_addConstituency(
        uint256 _adminCnic,
        string memory _password,
        string memory _province,
        string memory _constituency
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        geoContract.addConstituency(_province, _constituency);
    }

    function admin_removeConstituency(
        uint256 _adminCnic,
        string memory _password,
        string memory _province,
        string memory _constituency
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        geoContract.removeConstituency(_province, _constituency);
    }

    // ============================================
    // ADMIN PROXY FUNCTIONS - PARTY
    // ============================================

    function admin_addParty(
        uint256 _adminCnic,
        string memory _password,
        string memory _party
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        partyContract.addParty(_party);
    }

    function admin_removeParty(
        uint256 _adminCnic,
        string memory _password,
        string memory _party
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        partyContract.removeParty(_party);
    }

    // ============================================
    // ADMIN PROXY FUNCTIONS - CANDIDATE
    // ============================================

    function admin_registerCandidate(
        uint256 _adminCnic,
        string memory _password,
        uint256 _candidateCnic,
        string memory _name,
        string memory _province,
        string memory _constituency,
        string memory _party
    )
        external
        onlyAdmin(_adminCnic, _password)
        contractsAreLinked
        returns (uint256)
    {
        return
            candidateContract.registerCandidate(
                _candidateCnic,
                _name,
                _province,
                _constituency,
                _party
            );
    }

    function admin_removeCandidate(
        uint256 _adminCnic,
        string memory _password,
        uint256 _candidateId
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        candidateContract.removeCandidate(_candidateId);
    }

    // ============================================
    // ADMIN PROXY FUNCTIONS - VOTER
    // ============================================

    function admin_registerVoter(
        uint256 _adminCnic,
        string memory _password,
        uint256 _voterCnic,
        string memory _name,
        string memory _province,
        string memory _constituency,
        string memory _voterPassword
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        voterContract.registerVoter(
            _voterCnic,
            _name,
            _province,
            _constituency,
            _voterPassword
        );
    }

    function admin_batchRegisterVoters(
        uint256 _adminCnic,
        string memory _password,
        uint256[] memory _voterCnics,
        string[] memory _names,
        string[] memory _provinces,
        string[] memory _constituencies,
        string[] memory _voterPasswords
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        voterContract.batchRegisterVoters(
            _voterCnics,
            _names,
            _provinces,
            _constituencies,
            _voterPasswords
        );
    }

    function admin_removeVoter(
        uint256 _adminCnic,
        string memory _password,
        uint256 _voterCnic
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        voterContract.removeVoter(_voterCnic);
    }

    // Add this function to VotingMachine.sol in the VOTER section

    // ============================================
    // ADMIN PROXY FUNCTIONS - VOTER (Add this new function)
    // ============================================

    function admin_changeVoterPassword(
        uint256 _adminCnic,
        string memory _password,
        uint256 _voterCnic,
        bytes32 _currentPasswordHash,
        string memory _newPassword
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        voterContract.changeVoterPassword(
            _voterCnic,
            _currentPasswordHash,
            _newPassword
        );
    }
    // ============================================
    // ADMIN PROXY FUNCTIONS - VOTING
    // ============================================

    function admin_startVoting(
        uint256 _adminCnic,
        string memory _password,
        uint256 _hours
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        votingContract.startVoting(_hours);
    }

    function admin_stopVoting(
        uint256 _adminCnic,
        string memory _password
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        votingContract.stopVoting();
    }

    // ============================================
    // ADMIN PROXY FUNCTIONS - VOTER CONTRACT SETUP
    // ============================================

    function admin_setVotingProcessContract(
        uint256 _adminCnic,
        string memory _password,
        address _votingProcessAddress
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        voterContract.setVotingProcessContract(_votingProcessAddress);
    }

    // ============================================
    // ADMIN PROXY FUNCTIONS - RESULTS
    // ============================================

    function admin_countVotes(
        uint256 _adminCnic,
        string memory _password,
        string memory _province,
        string memory _constituency
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        resultContract.countVotes(_province, _constituency);
    }
    // Add in the RESULTS section (around line 370, after admin_countVotes)

function admin_autoCountVotes(
    uint256 _adminCnic,
    string memory _password,
    string memory _province,
    string memory _constituency
)
    external
    onlyAdmin(_adminCnic, _password)
    contractsAreLinked
    returns (uint256)
{
    return resultContract.autoCountVotes(_province, _constituency);
}

    function admin_enterVoteCounts(
        uint256 _adminCnic,
        string memory _password,
        uint256[] memory _candidateIds,
        uint256[] memory _counts
    ) external onlyAdmin(_adminCnic, _password) contractsAreLinked {
        resultContract.enterVoteCounts(_candidateIds, _counts);
    }

    function admin_declareWinner(
        uint256 _adminCnic,
        string memory _password,
        string memory _province,
        string memory _constituency
    )
        external
        onlyAdmin(_adminCnic, _password)
        contractsAreLinked
        returns (uint256, uint256)
    {
        return resultContract.declareWinner(_province, _constituency);
    }

    // ============================================
    // ✅ NEW: ADMIN PROXY FUNCTIONS - RESET FOR NEW ELECTION
    // ============================================

    function admin_resetAllVoters(
        uint256 _adminCnic,
        string memory _password
    )
        external
        onlyAdmin(_adminCnic, _password)
        contractsAreLinked
        returns (uint256)
    {
        return voterContract.resetAllVotersForNewElection();
    }

    function admin_resetAllResults(
        uint256 _adminCnic,
        string memory _password
    )
        external
        onlyAdmin(_adminCnic, _password)
        contractsAreLinked
        returns (uint256)
    {
        return resultContract.resetAllResults();
    }

    // ============================================
    // PUBLIC VIEW FUNCTIONS
    // ============================================

    function getTotalStats()
        external
        view
        contractsAreLinked
        returns (
            uint256 provinces,
            uint256 constituencies,
            uint256 parties,
            uint256 candidates,
            uint256 voters
        )
    {
        (uint256 pCount, uint256 cCount) = geoContract.getCounts();
        return (
            pCount,
            cCount,
            partyContract.getPartyCount(),
            candidateContract.getCandidateCount(),
            voterContract.getVoterCount()
        );
    }

    function getVotingStatus()
        external
        view
        contractsAreLinked
        returns (
            bool active,
            uint256 startTime,
            uint256 endTime,
            uint256 currentTime
        )
    {
        return votingContract.getVotingStatus();
    }

    function getResults(
        string memory _province,
        string memory _constituency
    )
        external
        view
        contractsAreLinked
        returns (uint256[] memory candidateIds, uint256[] memory voteCounts)
    {
        return resultContract.getResults(_province, _constituency);
    }

    function getWinner(
        string memory _province,
        string memory _constituency
    )
        external
        view
        contractsAreLinked
        returns (uint256 winnerId, uint256 voteCount, bool isDeclared)
    {
        return resultContract.getWinner(_province, _constituency);
    }
}
