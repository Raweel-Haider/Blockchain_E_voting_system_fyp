const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting System", function () {
  let votingMachine, geoContract, partyContract, candidateContract, voterContract, votingContract, resultContract;
  let owner, admin, voter1, voter2;

  const ADMIN_CNIC = 1234567890123n;
  const ADMIN_PASSWORD = "admin123";
  const VOTER1_CNIC = 5555555555555n;
  const VOTER2_CNIC = 6666666666666n;

  // ✅ MAIN beforeEach - runs before EVERY test
  beforeEach(async function () {
    [owner, admin, voter1, voter2] = await ethers.getSigners();

    // Deploy all contracts
    const VotingMachine = await ethers.getContractFactory("VotingMachine");
    votingMachine = await VotingMachine.deploy();
    await votingMachine.waitForDeployment();
    const votingMachineAddress = await votingMachine.getAddress();

    const GeographicManagement = await ethers.getContractFactory("GeographicManagement");
    geoContract = await GeographicManagement.deploy(votingMachineAddress);
    await geoContract.waitForDeployment();

    const PartyManagement = await ethers.getContractFactory("PartyManagement");
    partyContract = await PartyManagement.deploy(votingMachineAddress);
    await partyContract.waitForDeployment();

    const CandidateManagement = await ethers.getContractFactory("CandidateManagement");
    candidateContract = await CandidateManagement.deploy(
      votingMachineAddress,
      await geoContract.getAddress(),
      await partyContract.getAddress()
    );
    await candidateContract.waitForDeployment();

    const VoterManagement = await ethers.getContractFactory("VoterManagement");
    voterContract = await VoterManagement.deploy(
      votingMachineAddress,
      await geoContract.getAddress()
    );
    await voterContract.waitForDeployment();

    const VotingProcess = await ethers.getContractFactory("VotingProcess");
    votingContract = await VotingProcess.deploy(
      votingMachineAddress,
      await voterContract.getAddress(),
      await candidateContract.getAddress()
    );
    await votingContract.waitForDeployment();

    const ResultManagement = await ethers.getContractFactory("ResultManagement");
    resultContract = await ResultManagement.deploy(
      votingMachineAddress,
      await votingContract.getAddress(),
      await candidateContract.getAddress(),
      await voterContract.getAddress()
    );
    await resultContract.waitForDeployment();

    // Link contracts
    await votingMachine.linkContracts(
      await geoContract.getAddress(),
      await partyContract.getAddress(),
      await candidateContract.getAddress(),
      await voterContract.getAddress(),
      await votingContract.getAddress(),
      await resultContract.getAddress()
    );

    // ✅ Add admin ONCE here (for all tests)
    await votingMachine.addAdmin(ADMIN_CNIC, "Test Admin", ADMIN_PASSWORD);

    // ✅ Set VotingProcess
    await votingMachine.admin_setVotingProcessContract(
      ADMIN_CNIC,
      ADMIN_PASSWORD,
      await votingContract.getAddress()
    );
  });

  describe("Admin Management", function () {
    it("Should add admin", async function () {
      // Admin already added in beforeEach, so test a NEW admin
      const NEW_ADMIN_CNIC = 9999999999999n;
      await votingMachine.addAdmin(NEW_ADMIN_CNIC, "Second Admin", "password123");
      const admin = await votingMachine.viewAdmin(NEW_ADMIN_CNIC);
      expect(admin.exists).to.be.true;
      expect(admin.name).to.equal("Second Admin");
    });
  });

  describe("Geographic Setup", function () {
    // No separate beforeEach needed - admin already exists

    it("Should add province", async function () {
      await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
      expect(await geoContract.isProvinceAdded("Punjab")).to.be.true;
    });

    it("Should add constituency", async function () {
      await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
      await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
      expect(await geoContract.isConstituencyAdded("Punjab", "NA-125")).to.be.true;
    });
  });

  describe("Full Voting Flow", function () {
    beforeEach(async function () {
      // ✅ NO addAdmin here - already done in main beforeEach
      // Setup complete system
      await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
      await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
      await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
      await votingMachine.admin_registerCandidate(ADMIN_CNIC, ADMIN_PASSWORD, 1111111111111n, "Candidate 1", "Punjab", "NA-125", "PTI");
      await votingMachine.admin_registerVoter(ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123");
    });

    it("Should complete voting process", async function () {
      // Start voting
      await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
      
      // Register secret key
      await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
      
      // Cast vote
      await votingContract.castVote(VOTER1_CNIC, "voter123", 1, "secret123");
      
      // Verify vote
      const [candidateId, verified] = await votingContract.verifyMyVote(VOTER1_CNIC, "secret123");
      expect(verified).to.be.true;
      expect(candidateId).to.equal(1);
    });
  });
});