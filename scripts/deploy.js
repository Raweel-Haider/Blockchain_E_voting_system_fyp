const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Complete Deployment Started...\n");
  console.log("=" .repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ===========================================
  // PHASE 1: DEPLOY ALL CONTRACTS
  // ===========================================
  console.log("PHASE 1: DEPLOYING CONTRACTS");
  console.log("=" .repeat(60), "\n");

  // 1. Deploy VotingMachine
  console.log("1️⃣  Deploying VotingMachine...");
  const VotingMachine = await hre.ethers.getContractFactory("VotingMachine");
  const votingMachine = await VotingMachine.deploy();
  await votingMachine.waitForDeployment();
  const votingMachineAddress = await votingMachine.getAddress();
  console.log("✅ VotingMachine:", votingMachineAddress, "\n");

  // 2. Deploy GeographicManagement
  console.log("2️⃣  Deploying GeographicManagement...");
  const GeographicManagement = await hre.ethers.getContractFactory("GeographicManagement");
  const geoContract = await GeographicManagement.deploy(votingMachineAddress);
  await geoContract.waitForDeployment();
  const geoAddress = await geoContract.getAddress();
  console.log("✅ GeographicManagement:", geoAddress, "\n");

  // 3. Deploy PartyManagement
  console.log("3️⃣  Deploying PartyManagement...");
  const PartyManagement = await hre.ethers.getContractFactory("PartyManagement");
  const partyContract = await PartyManagement.deploy(votingMachineAddress);
  await partyContract.waitForDeployment();
  const partyAddress = await partyContract.getAddress();
  console.log("✅ PartyManagement:", partyAddress, "\n");

  // 4. Deploy CandidateManagement
  console.log("4️⃣  Deploying CandidateManagement...");
  const CandidateManagement = await hre.ethers.getContractFactory("CandidateManagement");
  const candidateContract = await CandidateManagement.deploy(votingMachineAddress, geoAddress, partyAddress);
  await candidateContract.waitForDeployment();
  const candidateAddress = await candidateContract.getAddress();
  console.log("✅ CandidateManagement:", candidateAddress, "\n");

  // 5. Deploy VoterManagement
  console.log("5️⃣  Deploying VoterManagement...");
  const VoterManagement = await hre.ethers.getContractFactory("VoterManagement");
  const voterContract = await VoterManagement.deploy(votingMachineAddress, geoAddress);
  await voterContract.waitForDeployment();
  const voterAddress = await voterContract.getAddress();
  console.log("✅ VoterManagement:", voterAddress, "\n");

  // 6. Deploy VotingProcess
  console.log("6️⃣  Deploying VotingProcess...");
  const VotingProcess = await hre.ethers.getContractFactory("VotingProcess");
  const votingContract = await VotingProcess.deploy(votingMachineAddress, voterAddress, candidateAddress);
  await votingContract.waitForDeployment();
  const votingAddress = await votingContract.getAddress();
  console.log("✅ VotingProcess:", votingAddress, "\n");

  // 7. Deploy ResultManagement
  console.log("7️⃣  Deploying ResultManagement...");
  const ResultManagement = await hre.ethers.getContractFactory("ResultManagement");
  const resultContract = await ResultManagement.deploy(votingMachineAddress, votingAddress, candidateAddress, voterAddress);
  await resultContract.waitForDeployment();
  const resultAddress = await resultContract.getAddress();
  console.log("✅ ResultManagement:", resultAddress, "\n");

  // 8. Link Contracts
  console.log("8️⃣  Linking all contracts...");
  const linkTx = await votingMachine.linkContracts(geoAddress, partyAddress, candidateAddress, voterAddress, votingAddress, resultAddress);
  await linkTx.wait();
  console.log("✅ Contracts linked successfully\n");

  // ===========================================
  // PHASE 2: INITIAL SETUP
  // ===========================================
  console.log("\n" + "=" .repeat(60));
  console.log("PHASE 2: INITIAL SETUP");
  console.log("=" .repeat(60), "\n");

  const ADMIN_CNIC = 1234567890123n;
  const ADMIN_PASSWORD = "admin123";

  // 9. Add Admin
  console.log("9️⃣  Adding System Admin...");
  const addAdminTx = await votingMachine.addAdmin(ADMIN_CNIC, "System Admin", ADMIN_PASSWORD);
  await addAdminTx.wait();
  console.log("✅ Admin added");
  console.log("   CNIC:", ADMIN_CNIC.toString());
  console.log("   Password:", ADMIN_PASSWORD, "\n");

  // 10. Set VotingProcess in VoterManagement
  console.log("🔟 Setting VotingProcess in VoterManagement...");
  const setVotingProcessTx = await votingMachine.admin_setVotingProcessContract(
    ADMIN_CNIC,
    ADMIN_PASSWORD,
    votingAddress
  );
  await setVotingProcessTx.wait();
  console.log("✅ VotingProcess configured\n");

  // 11. Verify Setup
  console.log("1️⃣1️⃣  Verifying setup...");
  const votingProcessAddr = await voterContract.votingProcessContract();
  console.log("✅ VotingProcess address:", votingProcessAddr);
  
  if (votingProcessAddr.toLowerCase() === votingAddress.toLowerCase()) {
    console.log("✅ Configuration verified!\n");
  } else {
    console.log("⚠️  Configuration mismatch!\n");
  }

  // ===========================================
  // SAVE ADDRESSES
  // ===========================================
  const addresses = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    admin: {
      cnic: ADMIN_CNIC.toString(),
      password: ADMIN_PASSWORD
    },
    contracts: {
      VotingMachine: votingMachineAddress,
      GeographicManagement: geoAddress,
      PartyManagement: partyAddress,
      CandidateManagement: candidateAddress,
      VoterManagement: voterAddress,
      VotingProcess: votingAddress,
      ResultManagement: resultAddress
    },
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(`deployed-${hre.network.name}.json`, JSON.stringify(addresses, null, 2));

  // ===========================================
  // SUMMARY
  // ===========================================
  console.log("\n" + "=" .repeat(60));
  console.log("🎉 COMPLETE DEPLOYMENT SUCCESSFUL!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("-".repeat(60));
  console.log("VotingMachine:        ", votingMachineAddress);
  console.log("GeographicManagement: ", geoAddress);
  console.log("PartyManagement:      ", partyAddress);
  console.log("CandidateManagement:  ", candidateAddress);
  console.log("VoterManagement:      ", voterAddress);
  console.log("VotingProcess:        ", votingAddress);
  console.log("ResultManagement:     ", resultAddress);
  console.log("-".repeat(60));

  console.log("\n🔐 Admin Credentials:");
  console.log("-".repeat(60));
  console.log("CNIC:     ", ADMIN_CNIC.toString());
  console.log("Password: ", ADMIN_PASSWORD);
  console.log("-".repeat(60));

  console.log(`\n💾 Details saved to: deployed-${hre.network.name}.json`);
  console.log("\n✅ System is ready to use!");
  console.log("\nNext steps:");
  console.log("  1. Run 'npm run setup-test' to add test data");
  console.log("  2. Run 'npm test' to verify everything works");
  console.log("  3. Start frontend: cd frontend && npm run dev\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });