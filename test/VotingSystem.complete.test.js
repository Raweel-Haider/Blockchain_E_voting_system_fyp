const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting System - COMPLETE TESTS", function () {
    let votingMachine, geoContract, partyContract, candidateContract, voterContract, votingContract, resultContract;
    let owner, addr1, addr2, addr3;

    const ADMIN_CNIC = 1234567890123n;
    const ADMIN_PASSWORD = "admin123";
    const VOTER1_CNIC = 5555555555555n;
    const VOTER2_CNIC = 6666666666666n;
    const VOTER3_CNIC = 7777777777777n;
    const CANDIDATE1_CNIC = 1111111111111n;
    const CANDIDATE2_CNIC = 2222222222222n;
    const CANDIDATE3_CNIC = 3333333333333n;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // Deploy VotingMachine
        const VotingMachine = await ethers.getContractFactory("VotingMachine");
        votingMachine = await VotingMachine.deploy();
        await votingMachine.waitForDeployment();
        const votingMachineAddress = await votingMachine.getAddress();

        // Deploy GeographicManagement
        const GeographicManagement = await ethers.getContractFactory("GeographicManagement");
        geoContract = await GeographicManagement.deploy(votingMachineAddress);
        await geoContract.waitForDeployment();

        // Deploy PartyManagement
        const PartyManagement = await ethers.getContractFactory("PartyManagement");
        partyContract = await PartyManagement.deploy(votingMachineAddress);
        await partyContract.waitForDeployment();

        // Deploy CandidateManagement
        const CandidateManagement = await ethers.getContractFactory("CandidateManagement");
        candidateContract = await CandidateManagement.deploy(
            votingMachineAddress,
            await geoContract.getAddress(),
            await partyContract.getAddress()
        );
        await candidateContract.waitForDeployment();

        // Deploy VoterManagement
        const VoterManagement = await ethers.getContractFactory("VoterManagement");
        voterContract = await VoterManagement.deploy(
            votingMachineAddress,
            await geoContract.getAddress()
        );
        await voterContract.waitForDeployment();

        // Deploy VotingProcess
        const VotingProcess = await ethers.getContractFactory("VotingProcess");
        votingContract = await VotingProcess.deploy(
            votingMachineAddress,
            await voterContract.getAddress(),
            await candidateContract.getAddress()
        );
        await votingContract.waitForDeployment();

        // Deploy ResultManagement
        const ResultManagement = await ethers.getContractFactory("ResultManagement");
        resultContract = await ResultManagement.deploy(
            votingMachineAddress,
            await votingContract.getAddress(),
            await candidateContract.getAddress(),
            await voterContract.getAddress()
        );
        await resultContract.waitForDeployment();

        // Link all contracts
        await votingMachine.linkContracts(
            await geoContract.getAddress(),
            await partyContract.getAddress(),
            await candidateContract.getAddress(),
            await voterContract.getAddress(),
            await votingContract.getAddress(),
            await resultContract.getAddress()
        );

        // Add admin
        await votingMachine.addAdmin(ADMIN_CNIC, "Test Admin", ADMIN_PASSWORD);

        // Set VotingProcess in VoterManagement
        await votingMachine.admin_setVotingProcessContract(
            ADMIN_CNIC,
            ADMIN_PASSWORD,
            await votingContract.getAddress()
        );
    });

    // ============================================
    // ADMIN MANAGEMENT TESTS
    // ============================================
    describe("Admin Management", function () {
        it("Should add admin", async function () {
            const NEW_ADMIN = 9999999999999n;
            await votingMachine.addAdmin(NEW_ADMIN, "New Admin", "password123");
            const admin = await votingMachine.viewAdmin(NEW_ADMIN);
            expect(admin.exists).to.be.true;
            expect(admin.name).to.equal("New Admin");
        });

        it("Should NOT allow duplicate admin CNIC", async function () {
            await expect(
                votingMachine.addAdmin(ADMIN_CNIC, "Duplicate Admin", "password")
            ).to.be.revertedWith("CNIC already registered as admin");
        });

        it("Should remove admin", async function () {
            const NEW_ADMIN = 8888888888888n;
            await votingMachine.addAdmin(NEW_ADMIN, "Temp Admin", "password123");
            await votingMachine.removeAdmin(NEW_ADMIN);
            const admin = await votingMachine.viewAdmin(NEW_ADMIN);
            expect(admin.exists).to.be.false;
        });

        it("Should verify admin credentials", async function () {
            const isValid = await votingMachine.verifyAdmin(ADMIN_CNIC, ADMIN_PASSWORD);
            expect(isValid).to.be.true;
        });

        it("Should reject wrong password", async function () {
            const isValid = await votingMachine.verifyAdmin(ADMIN_CNIC, "wrongpassword");
            expect(isValid).to.be.false;
        });
    });

    // ============================================
    // GEOGRAPHIC MANAGEMENT TESTS
    // ============================================
    describe("Geographic Management", function () {
        it("Should add province", async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            expect(await geoContract.isProvinceAdded("Punjab")).to.be.true;
        });

        it("Should NOT add duplicate province", async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await expect(
                votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab")
            ).to.be.revertedWith("Province already exists");
        });

        it("Should add constituency", async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            expect(await geoContract.isConstituencyAdded("Punjab", "NA-125")).to.be.true;
        });

        it("Should NOT add constituency to non-existent province", async function () {
            await expect(
                votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "NonExistent", "NA-125")
            ).to.be.revertedWith("Province does not exist");
        });

        it("Should NOT allow duplicate constituency", async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await expect(
                votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125")
            ).to.be.revertedWith("Constituency already exists");
        });

        it("Should remove constituency", async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_removeConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            expect(await geoContract.isConstituencyAdded("Punjab", "NA-125")).to.be.false;
        });

        it("Should NOT remove province with constituencies", async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await expect(
                votingMachine.admin_removeProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab")
            ).to.be.revertedWith("Remove all constituencies first");
        });
    });

    // ============================================
    // PARTY MANAGEMENT TESTS
    // ============================================
    describe("Party Management", function () {
        it("Should add party", async function () {
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            expect(await partyContract.isPartyRegistered("PTI")).to.be.true;
        });

        it("Should NOT add duplicate party", async function () {
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            await expect(
                votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI")
            ).to.be.revertedWith("Party already registered");
        });

        it("Should remove party", async function () {
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            await votingMachine.admin_removeParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            expect(await partyContract.isPartyRegistered("PTI")).to.be.false;
        });

        it("Should view all parties", async function () {
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PPP");
            const parties = await partyContract.viewParties();
            expect(parties.length).to.equal(3);
        });
    });

    // ============================================
    // CANDIDATE MANAGEMENT TESTS
    // ============================================
    describe("Candidate Management", function () {
        beforeEach(async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
        });

        it("Should register candidate", async function () {
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
            );
            const candidate = await candidateContract.viewCandidate(1);
            expect(candidate.name).to.equal("Candidate 1");
        });

        it("Should NOT register candidate with duplicate CNIC", async function () {
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
            );
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");
            await expect(
                votingMachine.admin_registerCandidate(
                    ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Another Candidate", "Punjab", "NA-125", "PMLN"
                )
            ).to.be.revertedWith("CNIC already registered as candidate");
        });

        it("Should NOT register 2 candidates from same party in same constituency", async function () {
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
            );
            await expect(
                votingMachine.admin_registerCandidate(
                    ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE2_CNIC, "Candidate 2", "Punjab", "NA-125", "PTI"
                )
            ).to.be.revertedWith("Party already has candidate in this constituency");
        });

        it("Should remove candidate", async function () {
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
            );
            await votingMachine.admin_removeCandidate(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await expect(candidateContract.viewCandidate(1)).to.be.revertedWith("Candidate does not exist");
        });

        it("Should view candidate details", async function () {
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Ali Ahmed", "Punjab", "NA-125", "PTI"
            );
            const candidate = await candidateContract.viewCandidate(1);
            expect(candidate.name).to.equal("Ali Ahmed");
            expect(candidate.party).to.equal("PTI");
            expect(candidate.constituency).to.equal("NA-125");
        });

        it("Should view candidates by constituency", async function () {
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
            );
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE2_CNIC, "Candidate 2", "Punjab", "NA-125", "PMLN"
            );
            const candidates = await candidateContract.viewCandidatesByConstituency("Punjab", "NA-125");
            expect(candidates.length).to.equal(2);
        });
    });

    // ============================================
    // VOTER MANAGEMENT TESTS
    // ============================================
    describe("Voter Management", function () {
        beforeEach(async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
        });

        it("Should register voter", async function () {
            await votingMachine.admin_registerVoter(
                ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123"
            );
            const voter = await voterContract.viewVoter(VOTER1_CNIC);
            expect(voter.name).to.equal("Voter 1");
            expect(voter.isRegistered).to.be.true;
        });

        it("Should NOT register voter with duplicate CNIC", async function () {
            await votingMachine.admin_registerVoter(
                ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123"
            );
            await expect(
                votingMachine.admin_registerVoter(
                    ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Duplicate Voter", "Punjab", "NA-125", "password"
                )
            ).to.be.revertedWith("CNIC already registered");
        });

        it("Should batch register voters", async function () {
            await votingMachine.admin_batchRegisterVoters(
                ADMIN_CNIC, ADMIN_PASSWORD,
                [VOTER1_CNIC, VOTER2_CNIC, VOTER3_CNIC],
                ["Voter 1", "Voter 2", "Voter 3"],
                ["Punjab", "Punjab", "Punjab"],
                ["NA-125", "NA-125", "NA-125"],
                ["pass1", "pass2", "pass3"]
            );
            const count = await voterContract.getVoterCount();
            expect(count).to.equal(3);
        });

        it("Should remove voter", async function () {
            await votingMachine.admin_registerVoter(
                ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123"
            );
            await votingMachine.admin_removeVoter(ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC);
            const voter = await voterContract.viewVoter(VOTER1_CNIC);
            expect(voter.isRegistered).to.be.false;
        });

        it("Should verify voter credentials", async function () {
            await votingMachine.admin_registerVoter(
                ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123"
            );
            const passwordHash = ethers.keccak256(ethers.toUtf8Bytes("voter123"));
            const isValid = await voterContract.verifyVoterCredentials(VOTER1_CNIC, passwordHash);
            expect(isValid).to.be.true;
        });
    });

    // ============================================
    // VOTING PROCESS TESTS
    // ============================================
    describe("Voting Process", function () {
        beforeEach(async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
            );
            await votingMachine.admin_registerVoter(
                ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123"
            );
        });

        it("Should start voting", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 2);
            const status = await votingContract.getVotingStatus();
            expect(status.active).to.be.true;
        });

        it("Should NOT allow voting before start time", async function () {
            await expect(
                votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123")
            ).to.be.revertedWith("Voting is not active");
        });

        it("Should register secret key", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
            const secretHash = await voterContract.getVoterSecretKeyHash(VOTER1_CNIC);
            expect(secretHash).to.not.equal(ethers.ZeroHash);
        });

        it("Should cast vote", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
            await votingContract.castVote(VOTER1_CNIC, "voter123", 1, "secret123");
            const voter = await voterContract.viewVoter(VOTER1_CNIC);
            expect(voter.hasVoted).to.be.true;
        });

        it("Should NOT allow voting twice", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
            await votingContract.castVote(VOTER1_CNIC, "voter123", 1, "secret123");
            await expect(
                votingContract.castVote(VOTER1_CNIC, "voter123", 1, "secret123")
            ).to.be.revertedWith("Already voted");
        });

        it("Should NOT allow voting for candidate in different constituency", async function () {
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-126");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE2_CNIC, "Candidate 2", "Punjab", "NA-126", "PMLN"
            );
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
            await expect(
                votingContract.castVote(VOTER1_CNIC, "voter123", 2, "secret123")
            ).to.be.revertedWith("Candidate not in your constituency");
        });

        it("Should NOT allow voting with wrong secret key", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
            await expect(
                votingContract.castVote(VOTER1_CNIC, "voter123", 1, "wrongsecret")
            ).to.be.revertedWith("Invalid secret key");
        });

        it("Should verify my vote", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
            await votingContract.castVote(VOTER1_CNIC, "voter123", 1, "secret123");
            const [candidateId, verified] = await votingContract.verifyMyVote(VOTER1_CNIC, "secret123");
            expect(verified).to.be.true;
            expect(candidateId).to.equal(1);
        });

        it("Should stop voting", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            const status = await votingContract.getVotingStatus();
            expect(status.active).to.be.false;
        });

        it("Should NOT allow voting after stopped", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            await expect(
                votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123")
            ).to.be.revertedWith("Voting is not active");
        });
    });

    // ============================================
    // RESULT MANAGEMENT TESTS
    // ============================================
    describe("Result Management", function () {
        beforeEach(async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
            );
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE2_CNIC, "Candidate 2", "Punjab", "NA-125", "PMLN"
            );
        });

        it("Should count votes (reset)", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            const votes1 = await resultContract.getCandidateVotes(1);
            expect(votes1).to.equal(0);
        });

        it("Should NOT count votes while voting active", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await expect(
                votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125")
            ).to.be.revertedWith("Voting still in progress");
        });

        it("Should enter vote counts manually", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_enterVoteCounts(ADMIN_CNIC, ADMIN_PASSWORD, [1, 2], [500, 300]);
            const votes1 = await resultContract.getCandidateVotes(1);
            const votes2 = await resultContract.getCandidateVotes(2);
            expect(votes1).to.equal(500);
            expect(votes2).to.equal(300);
        });

        it("Should declare winner", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_enterVoteCounts(ADMIN_CNIC, ADMIN_PASSWORD, [1, 2], [500, 300]);

            // Get return values using staticCall
            const [winnerId, winnerVotes] = await votingMachine.admin_declareWinner.staticCall(
                ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125"
            );

            // Execute the actual transaction
            await votingMachine.admin_declareWinner(
                ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125"
            );

            expect(winnerId).to.equal(1);
            expect(winnerVotes).to.equal(500);
        });

        it("Should NOT declare winner twice", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_enterVoteCounts(ADMIN_CNIC, ADMIN_PASSWORD, [1, 2], [500, 300]);
            await votingMachine.admin_declareWinner(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await expect(
                votingMachine.admin_declareWinner(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125")
            ).to.be.revertedWith("Result already declared");
        });

        it("Should get results by constituency", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_enterVoteCounts(ADMIN_CNIC, ADMIN_PASSWORD, [1, 2], [500, 300]);
            const [candidateIds, voteCounts] = await votingMachine.getResults("Punjab", "NA-125");
            expect(candidateIds.length).to.equal(2);
            expect(voteCounts[0]).to.equal(500);
            expect(voteCounts[1]).to.equal(300);
        });

        it("Should get winner details", async function () {
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);
            await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_enterVoteCounts(ADMIN_CNIC, ADMIN_PASSWORD, [1, 2], [500, 300]);
            await votingMachine.admin_declareWinner(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            const [winnerId, voteCount, isDeclared] = await votingMachine.getWinner("Punjab", "NA-125");
            expect(winnerId).to.equal(1);
            expect(voteCount).to.equal(500);
            expect(isDeclared).to.be.true;
        });
    });

    // ============================================
    // SECURITY & ACCESS CONTROL TESTS
    // ============================================
    describe("Security & Access Control", function () {
        beforeEach(async function () {
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
        });

        it("Should NOT allow non-admin to add province", async function () {
            const FAKE_ADMIN = 9999999999999n;
            await expect(
                votingMachine.admin_addProvince(FAKE_ADMIN, "wrongpass", "Sindh")
            ).to.be.revertedWith("Admin does not exist");
        });

        it("Should NOT allow non-admin to register candidate", async function () {
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            const FAKE_ADMIN = 9999999999999n;
            await expect(
                votingMachine.admin_registerCandidate(
                    FAKE_ADMIN, "wrongpass", CANDIDATE1_CNIC, "Fake Candidate", "Punjab", "NA-125", "PTI"
                )
            ).to.be.revertedWith("Admin does not exist");
        });

        it("Should NOT allow non-admin to start voting", async function () {
            const FAKE_ADMIN = 9999999999999n;
            await expect(
                votingMachine.admin_startVoting(FAKE_ADMIN, "wrongpass", 1)
            ).to.be.revertedWith("Admin does not exist");
        });

        it("Should NOT allow unauthorized access to voter functions", async function () {
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_registerVoter(
                ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123"
            );
            await expect(
                voterContract.markAsVoted(VOTER1_CNIC)
            ).to.be.revertedWith("Only admin or VotingProcess can call this");
        });
    });

    // ============================================
    // COMPLETE SYSTEM FLOW TESTS
    // ============================================
    describe("Complete System Flow", function () {
        it("Should complete full election cycle", async function () {
            // Setup geography
            await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
            await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");

            // Setup parties
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
            await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");

            // Register candidates
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Ali Ahmed", "Punjab", "NA-125", "PTI"
            );
            await votingMachine.admin_registerCandidate(
                ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE2_CNIC, "Sara Khan", "Punjab", "NA-125", "PMLN"
            );

            // Register voters
            await votingMachine.admin_registerVoter(
                ADMIN_CNIC, ADMIN_PASSWORD, VOTER1_CNIC, "Voter 1", "Punjab", "NA-125", "voter123"
            );

            // Start voting
            await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);

            // Vote
            await votingContract.registerSecretKey(VOTER1_CNIC, "voter123", "secret123");
            await votingContract.castVote(VOTER1_CNIC, "voter123", 1, "secret123");

            // Stop voting
            await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);

            // Count and declare results
            await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
            await votingMachine.admin_enterVoteCounts(ADMIN_CNIC, ADMIN_PASSWORD, [1, 2], [1, 0]);

            // Get return value using staticCall
            const [winnerId] = await votingMachine.admin_declareWinner.staticCall(
                ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125"
            );

            // Execute the actual transaction
            await votingMachine.admin_declareWinner(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");

            expect(winnerId).to.equal(1);

            it("Should handle multiple voters voting", async function () {
                // Setup
                await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
                await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
                await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
                await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");

                await votingMachine.admin_registerCandidate(
                    ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
                );
                await votingMachine.admin_registerCandidate(
                    ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE2_CNIC, "Candidate 2", "Punjab", "NA-125", "PMLN"
                );

                // Register multiple voters
                await votingMachine.admin_batchRegisterVoters(
                    ADMIN_CNIC, ADMIN_PASSWORD,
                    [VOTER1_CNIC, VOTER2_CNIC, VOTER3_CNIC],
                    ["Voter 1", "Voter 2", "Voter 3"],
                    ["Punjab", "Punjab", "Punjab"],
                    ["NA-125", "NA-125", "NA-125"],
                    ["pass1", "pass2", "pass3"]
                );

                // Start voting
                await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);

                // All voters vote
                await votingContract.registerSecretKey(VOTER1_CNIC, "pass1", "secret1");
                await votingContract.castVote(VOTER1_CNIC, "pass1", 1, "secret1");

                await votingContract.registerSecretKey(VOTER2_CNIC, "pass2", "secret2");
                await votingContract.castVote(VOTER2_CNIC, "pass2", 1, "secret2");

                await votingContract.registerSecretKey(VOTER3_CNIC, "pass3", "secret3");
                await votingContract.castVote(VOTER3_CNIC, "pass3", 2, "secret3");

                // Verify all voted
                const voter1 = await voterContract.viewVoter(VOTER1_CNIC);
                const voter2 = await voterContract.viewVoter(VOTER2_CNIC);
                const voter3 = await voterContract.viewVoter(VOTER3_CNIC);

                expect(voter1.hasVoted).to.be.true;
                expect(voter2.hasVoted).to.be.true;
                expect(voter3.hasVoted).to.be.true;
            });

            it("Should correctly count and declare winner", async function () {
                // Setup
                await votingMachine.admin_addProvince(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab");
                await votingMachine.admin_addConstituency(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
                await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PTI");
                await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PMLN");
                await votingMachine.admin_addParty(ADMIN_CNIC, ADMIN_PASSWORD, "PPP");

                await votingMachine.admin_registerCandidate(
                    ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE1_CNIC, "Candidate 1", "Punjab", "NA-125", "PTI"
                );
                await votingMachine.admin_registerCandidate(
                    ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE2_CNIC, "Candidate 2", "Punjab", "NA-125", "PMLN"
                );
                await votingMachine.admin_registerCandidate(
                    ADMIN_CNIC, ADMIN_PASSWORD, CANDIDATE3_CNIC, "Candidate 3", "Punjab", "NA-125", "PPP"
                );

                // Start and stop voting
                await votingMachine.admin_startVoting(ADMIN_CNIC, ADMIN_PASSWORD, 1);
                await votingMachine.admin_stopVoting(ADMIN_CNIC, ADMIN_PASSWORD);

                // Count votes and enter results
                await votingMachine.admin_countVotes(ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125");
                await votingMachine.admin_enterVoteCounts(
                    ADMIN_CNIC, ADMIN_PASSWORD,
                    [1, 2, 3],
                    [450, 600, 200]
                );

                // Declare winner - get return values using staticCall
                const [winnerId, winnerVotes] = await votingMachine.admin_declareWinner.staticCall(
                    ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125"
                );

                // Execute the actual transaction
                await votingMachine.admin_declareWinner(
                    ADMIN_CNIC, ADMIN_PASSWORD, "Punjab", "NA-125"
                );

                expect(winnerId).to.equal(2);
                expect(winnerVotes).to.equal(600);

                // Verify results are stored correctly
                const [candidateIds, voteCounts] = await votingMachine.getResults("Punjab", "NA-125");
                expect(voteCounts[0]).to.equal(450);
                expect(voteCounts[1]).to.equal(600);
                expect(voteCounts[2]).to.equal(200);
            });
        });
    })});