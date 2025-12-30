const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🧪 Setting up test data...\n");

    // Load deployed addresses
    const addresses = JSON.parse(fs.readFileSync(`deployed-${hre.network.name}.json`, 'utf8'));
    const votingMachine = await hre.ethers.getContractAt("VotingMachine", addresses.contracts.VotingMachine);

    const [owner] = await hre.ethers.getSigners();

    console.log("1️⃣  Adding Admin...");

    const ADMIN_CNIC = 1234567890123n;

    const adminExists = await votingMachine.isAdminCnic(ADMIN_CNIC);

    if (!adminExists) {
        const tx = await votingMachine.addAdmin(
            ADMIN_CNIC,
            "Test Admin",
            "admin123"
        );
        await tx.wait();
        console.log("✅ Admin added\n");
    } else {
        console.log("⚠️ Admin already exists, skipping\n");
    }

    // 2. Add Provinces
    console.log("2️⃣  Adding Provinces...");
    tx = await votingMachine.admin_addProvince(1234567890123n, "admin123", "Punjab");
    await tx.wait();
    tx = await votingMachine.admin_addProvince(1234567890123n, "admin123", "Sindh");
    await tx.wait();
    console.log("✅ Provinces added\n");

    // 3. Add Constituencies
    console.log("3️⃣  Adding Constituencies...");
    tx = await votingMachine.admin_addConstituency(1234567890123n, "admin123", "Punjab", "NA-125");
    await tx.wait();
    tx = await votingMachine.admin_addConstituency(1234567890123n, "admin123", "Punjab", "NA-126");
    await tx.wait();
    tx = await votingMachine.admin_addConstituency(1234567890123n, "admin123", "Sindh", "NA-246");
    await tx.wait();
    console.log("✅ Constituencies added\n");

    // 4. Add Parties
    console.log("4️⃣  Adding Parties...");
    const parties = ["PTI", "PMLN", "PPP", "Independent"];
    for (const party of parties) {
        tx = await votingMachine.admin_addParty(1234567890123n, "admin123", party);
        await tx.wait();
    }
    console.log("✅ Parties added\n");

    // 5. Register Candidates
    console.log("5️⃣  Registering Candidates...");
    tx = await votingMachine.admin_registerCandidate(1234567890123n, "admin123", 1111111111111n, "Ali Ahmed", "Punjab", "NA-125", "PTI");
    await tx.wait();
    tx = await votingMachine.admin_registerCandidate(1234567890123n, "admin123", 2222222222222n, "Sara Khan", "Punjab", "NA-125", "PMLN");
    await tx.wait();
    tx = await votingMachine.admin_registerCandidate(1234567890123n, "admin123", 3333333333333n, "Hassan Ali", "Punjab", "NA-125", "PPP");
    await tx.wait();
    console.log("✅ Candidates registered\n");

    // 6. Register Voters
    console.log("6️⃣  Registering Voters...");
    tx = await votingMachine.admin_registerVoter(1234567890123n, "admin123", 5555555555555n, "Voter One", "Punjab", "NA-125", "voter123");
    await tx.wait();
    tx = await votingMachine.admin_registerVoter(1234567890123n, "admin123", 6666666666666n, "Voter Two", "Punjab", "NA-125", "voter456");
    await tx.wait();
    tx = await votingMachine.admin_registerVoter(1234567890123n, "admin123", 7777777777777n, "Voter Three", "Punjab", "NA-125", "voter789");
    await tx.wait();
    console.log("✅ Voters registered\n");

    console.log("🎉 Test data setup completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });