import VotingMachineABI from '../artifacts/VotingMachine.json';
import GeographicManagementABI from '../artifacts/GeographicManagement.json';
import PartyManagementABI from '../artifacts/PartyManagement.json';
import CandidateManagementABI from '../artifacts/CandidateManagement.json';
import VoterManagementABI from '../artifacts/VoterManagement.json';
import VotingProcessABI from '../artifacts/VotingProcess.json';
import ResultManagementABI from '../artifacts/ResultManagement.json';

export const CONTRACTS = {
  VotingMachine: {
    address: "0xAc7F27fe6CF65D781f2B722bE60691E7E87Ea4d2",
    abi: VotingMachineABI.abi,
  },
  GeographicManagement: {
    address: "0xc85670Cbf5b59B4cb8D5B4028Ae31DfFd51B5C11",
    abi: GeographicManagementABI.abi,
  },
  PartyManagement: {
    address: "0x421B6D18C9Ce4466F2a5f684D5C10585662A5423",
    abi: PartyManagementABI.abi,
  },
  CandidateManagement: {
    address: "0xE122153278824ed339c0E155206359485751bb99",
    abi: CandidateManagementABI.abi,
  },
  VoterManagement: {
    address: "0x98fa16FbBBAc3c249090E3eb8FD4fC8659BC4d6d",
    abi: VoterManagementABI.abi,
  },
  VotingProcess: {
    address: "0xd0253eBc5401F086e9b78eA19F6e6f8144Bb103F",
    abi: VotingProcessABI.abi,
  },
  ResultManagement: {
    address: "0x0FDe2e1bEDe68D92ca736900b5613FdEEc315Cdd",
    abi: ResultManagementABI.abi,
  },
};

export const NETWORK = {
  chainId: 11155111,
  chainIdHex: "0xaa36a7",
  name: "Sepolia",
  rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/0SVM778dkro9JohPja3Qs",
  blockExplorer: "https://sepolia.etherscan.io",
};
