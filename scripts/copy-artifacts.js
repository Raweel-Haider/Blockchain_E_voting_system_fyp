const fs = require('fs');
const path = require('path');

// Source and destination paths
const artifactsSource = path.join(__dirname, '../artifacts/contracts');
const frontendDest = path.join(__dirname, '../frontend/src/artifacts');

// Contracts to copy
const contracts = [
  'VotingMachine.sol/VotingMachine.json',
  '1_GeographicManagement.sol/GeographicManagement.json',
  '2_PartyManagement.sol/PartyManagement.json',
  '3_CandidateManagement.sol/CandidateManagement.json',
  '4_VoterManagement.sol/VoterManagement.json',
  '5_VotingProcess.sol/VotingProcess.json',
  '6_ResultManagement.sol/ResultManagement.json'
];

// Create destination folder if it doesn't exist
if (!fs.existsSync(frontendDest)) {
  fs.mkdirSync(frontendDest, { recursive: true });
}

console.log('📦 Copying contract ABIs to frontend...\n');

contracts.forEach(contract => {
  const sourcePath = path.join(artifactsSource, contract);
  const fileName = path.basename(contract);
  const destPath = path.join(frontendDest, fileName);
  
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied: ${fileName}`);
    } else {
      console.log(`⚠️  Not found: ${contract}`);
    }
  } catch (error) {
    console.log(`❌ Error copying ${fileName}:`, error.message);
  }
});

console.log('\n🎉 ABIs copied successfully!');
console.log(`📁 Location: ${frontendDest}\n`);