import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '../config/contracts';

export const useBlockchain = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);

  /* ============================
     CONNECT WALLET (WRITE MODE)
  ============================ */
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask not installed');
      return null;
    }

    try {
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      // 🔐 Enforce correct network BEFORE signer
      if (Number(network.chainId) !== NETWORK.chainId) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK.chainIdHex }],
        });
      }

      const signer = await provider.getSigner();
      const account = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      return { provider, signer, account };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return null;
    }
  };

  /* ============================
     AUTO RECONNECT (SAFE)
  ============================ */
  useEffect(() => {
    const reconnect = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length === 0) return;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        // ❌ Do not reconnect on wrong network
        if (Number(network.chainId) !== NETWORK.chainId) return;

        const signer = await provider.getSigner();

        setProvider(provider);
        setSigner(signer);
        setAccount(accounts[0]);
        setChainId(Number(network.chainId));
        setIsConnected(true);
      } catch (err) {
        console.warn('Silent reconnect skipped:', err);
      }
    };

    reconnect();
  }, []);

  /* ============================
     GET CONTRACT (READ / WRITE)
     withSigner = false → READ
     withSigner = true  → WRITE
  ============================ */
  const getContract = async (contractName, withSigner = false) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not available');
    }

    const contractConfig = CONTRACTS[contractName];
    if (!contractConfig) {
      throw new Error(`Contract ${contractName} not found`);
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    // ✅ READ-ONLY (SAFE on startup)
    if (!withSigner) {
      return new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
    }

    // ✍️ WRITE (wallet must be connected)
    const signer = await provider.getSigner();

    return new ethers.Contract(
      contractConfig.address,
      contractConfig.abi,
      signer
    );
  };

  /* ============================
     RETURN API (UNCHANGED)
  ============================ */
  return {
    provider,
    signer,
    account,
    isConnected,
    chainId,
    connectWallet,
    getContract,
  };
};
