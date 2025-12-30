require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");  // ← Add this line
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
},
  // ============================================
  // CONTRACT SIZER CONFIGURATION (Add this)
  // ============================================
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [], // Empty means check all contracts
  },
  // ============================================
  // GAS REPORTER CONFIGURATION (Optional)
  // ============================================
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  // ============================================
  // PATHS
  // ============================================
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};