// src/components/Admin/SystemHealthCheck.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useBlockchain } from '../../hooks/useBlockchain';
import { CONTRACTS, NETWORK } from '../../config/contracts';

const SystemHealthCheck = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const { connectWallet } = useBlockchain();
  const navigate = useNavigate();

  const runCompleteCheck = async () => {
    setLoading(true);
    const checkResults = {
      network: { ok: false, details: '' },
      wallet: { ok: false, details: '' },
      contracts: { ok: false, details: '' },
      contractsLinked: { ok: false, details: '' },
      admin: { ok: false, details: '' },
      votingProcessSet: { ok: false, details: '' },
      provinces: { ok: false, details: '' },
      constituencies: { ok: false, details: '' },
      testVoterRegistration: { ok: false, details: '' }
    };

    try {
      // 1. Check Network
      try {
        const wallet = await connectWallet();
        if (!wallet) throw new Error('Wallet connection failed');
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        if (Number(network.chainId) === NETWORK.chainId) {
          checkResults.network.ok = true;
          checkResults.network.details = `Connected to ${NETWORK.name} (Chain ID: ${NETWORK.chainId})`;
        } else {
          checkResults.network.details = `Wrong network! Connected to Chain ID: ${Number(network.chainId)}. Expected: ${NETWORK.chainId}`;
        }
        
        checkResults.wallet.ok = true;
        checkResults.wallet.details = `Wallet: ${wallet.account.substring(0, 10)}...${wallet.account.substring(38)}`;
      } catch (e) {
        checkResults.network.details = e.message;
        checkResults.wallet.details = e.message;
      }

      // 2. Check Contract Deployments
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const votingMachineCode = await provider.getCode(CONTRACTS.VotingMachine.address);
        const voterMgmtCode = await provider.getCode(CONTRACTS.VoterManagement.address);
        const votingProcessCode = await provider.getCode(CONTRACTS.VotingProcess.address);
        
        if (votingMachineCode === '0x') {
          checkResults.contracts.details = `❌ VotingMachine not deployed at ${CONTRACTS.VotingMachine.address}`;
        } else if (voterMgmtCode === '0x') {
          checkResults.contracts.details = `❌ VoterManagement not deployed at ${CONTRACTS.VoterManagement.address}`;
        } else if (votingProcessCode === '0x') {
          checkResults.contracts.details = `❌ VotingProcess not deployed at ${CONTRACTS.VotingProcess.address}`;
        } else {
          checkResults.contracts.ok = true;
          checkResults.contracts.details = '✅ All contracts deployed';
        }
      } catch (e) {
        checkResults.contracts.details = `Error checking contracts: ${e.message}`;
      }

      // 3. Check if Contracts are Linked
      if (checkResults.contracts.ok) {
        try {
          const wallet = await connectWallet();
          const votingMachine = new ethers.Contract(
            CONTRACTS.VotingMachine.address,
            CONTRACTS.VotingMachine.abi,
            wallet.signer
          );
          
          const linked = await votingMachine.contractsLinked();
          checkResults.contractsLinked.ok = linked;
          checkResults.contractsLinked.details = linked 
            ? '✅ Contracts are linked' 
            : '❌ Contracts NOT linked - Run linkContracts()';
        } catch (e) {
          checkResults.contractsLinked.details = `Error: ${e.message}`;
        }
      }

      // 4. Check Admin Credentials
      const testAdminCnic = prompt('Enter Admin CNIC for testing:');
      const testAdminPassword = prompt('Enter Admin Password:');
      
      if (testAdminCnic && testAdminPassword) {
        try {
          const wallet = await connectWallet();
          const votingMachine = new ethers.Contract(
            CONTRACTS.VotingMachine.address,
            CONTRACTS.VotingMachine.abi,
            wallet.signer
          );
          
          const isValid = await votingMachine.verifyAdmin(testAdminCnic, testAdminPassword);
          checkResults.admin.ok = isValid;
          checkResults.admin.details = isValid 
            ? `✅ Admin ${testAdminCnic} verified` 
            : `❌ Invalid admin credentials for ${testAdminCnic}`;
        } catch (e) {
          checkResults.admin.details = `Error: ${e.message}`;
        }
      } else {
        checkResults.admin.details = 'Skipped - no credentials provided';
      }

      // 5. Check VotingProcess Set in VoterManagement
      if (checkResults.contractsLinked.ok) {
        try {
          const wallet = await connectWallet();
          const voterContract = new ethers.Contract(
            CONTRACTS.VoterManagement.address,
            CONTRACTS.VoterManagement.abi,
            wallet.signer
          );
          
          const votingProcessAddr = await voterContract.votingProcessContract();
          checkResults.votingProcessSet.ok = votingProcessAddr !== ethers.ZeroAddress;
          checkResults.votingProcessSet.details = checkResults.votingProcessSet.ok
            ? `✅ VotingProcess set to: ${votingProcessAddr}`
            : '❌ VotingProcess NOT set - Run admin_setVotingProcessContract()';
        } catch (e) {
          checkResults.votingProcessSet.details = `Error: ${e.message}`;
        }
      }

      // 6. Check Geographic Data
      if (checkResults.contractsLinked.ok) {
        try {
          const wallet = await connectWallet();
          const geoContract = new ethers.Contract(
            CONTRACTS.GeographicManagement.address,
            CONTRACTS.GeographicManagement.abi,
            wallet.signer
          );
          
          const provinces = await geoContract.viewProvinces();
          checkResults.provinces.ok = provinces.length > 0;
          checkResults.provinces.details = checkResults.provinces.ok
            ? `✅ ${provinces.length} provinces: ${provinces.join(', ')}`
            : '❌ No provinces found - Add provinces first';
          
          // Check Punjab constituencies
          if (provinces.includes('Punjab') || provinces.includes('punjab')) {
            const punjabConst = await geoContract.viewConstituenciesByProvince('Punjab');
            checkResults.constituencies.ok = punjabConst.length > 0;
            checkResults.constituencies.details = checkResults.constituencies.ok
              ? `✅ Punjab has ${punjabConst.length} constituencies`
              : '❌ Punjab has no constituencies';
          } else {
            checkResults.constituencies.details = '⚠️ Punjab province not found';
          }
        } catch (e) {
          checkResults.provinces.details = `Error: ${e.message}`;
          checkResults.constituencies.details = `Error: ${e.message}`;
        }
      }

      // 7. Test Voter Registration (Gas Estimation Only)
      if (checkResults.admin.ok && checkResults.votingProcessSet.ok) {
        try {
          const wallet = await connectWallet();
          const votingMachine = new ethers.Contract(
            CONTRACTS.VotingMachine.address,
            CONTRACTS.VotingMachine.abi,
            wallet.signer
          );
          
          // Try to estimate gas for a test voter (won't actually register)
          const testCnic = '9999999999999'; // Unlikely to exist
          await votingMachine.admin_registerVoter.estimateGas(
            testAdminCnic,
            testAdminPassword,
            testCnic,
            'Test Voter',
            'Punjab',
            'NA-130', // Common constituency
            'testpass123'
          );
          
          checkResults.testVoterRegistration.ok = true;
          checkResults.testVoterRegistration.details = '✅ Voter registration should work!';
        } catch (e) {
          checkResults.testVoterRegistration.details = `❌ Gas estimation failed: ${e.message.substring(0, 200)}`;
        }
      }

    } catch (error) {
      console.error('Health check error:', error);
    }

    setResults(checkResults);
    setLoading(false);
  };

  const getStatusIcon = (ok) => ok ? '✅' : '❌';
  const getStatusColor = (ok) => ok ? '#28a745' : '#dc3545';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px' 
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/admin/dashboard')}
          style={{
            background: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <h1 style={{ color: '#667eea', marginBottom: '10px' }}>
            🏥 Complete System Health Check
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '30px' }}>
            Diagnose all potential issues with voter registration
          </p>

          <button
            onClick={runCompleteCheck}
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px 30px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '30px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Running Diagnostics...' : '▶️ Run Complete Health Check'}
          </button>

          {results && (
            <div>
              {Object.entries(results).map(([key, value]) => (
                <div 
                  key={key}
                  style={{
                    padding: '20px',
                    background: value.ok ? '#d4edda' : '#f8d7da',
                    borderRadius: '10px',
                    marginBottom: '15px',
                    borderLeft: `5px solid ${getStatusColor(value.ok)}`
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      color: value.ok ? '#155724' : '#721c24',
                      textTransform: 'capitalize'
                    }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <span style={{ fontSize: '24px' }}>
                      {getStatusIcon(value.ok)}
                    </span>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    color: value.ok ? '#155724' : '#721c24',
                    fontSize: '14px',
                    wordBreak: 'break-word'
                  }}>
                    {value.details}
                  </p>
                </div>
              ))}

              <div style={{
                background: '#fff3cd',
                borderRadius: '10px',
                padding: '25px',
                marginTop: '30px',
                borderLeft: '5px solid #ffc107'
              }}>
                <h3 style={{ color: '#856404', marginTop: 0 }}>
                  📋 Quick Fixes
                </h3>
                <ul style={{ color: '#856404', lineHeight: '2' }}>
                  {!results.contractsLinked.ok && (
                    <li><strong>Go to Admin Debug</strong> → Run "Link Contracts"</li>
                  )}
                  {!results.votingProcessSet.ok && (
                    <li><strong>Visit /admin/setup-voting</strong> → Set VotingProcess address</li>
                  )}
                  {!results.provinces.ok && (
                    <li><strong>Go to Geographic Management</strong> → Add provinces & constituencies</li>
                  )}
                  {!results.admin.ok && (
                    <li><strong>Check Admin Credentials</strong> → Verify CNIC and password are correct</li>
                  )}
                  {results.testVoterRegistration.ok && (
                    <li style={{ color: '#28a745', fontWeight: 'bold' }}>
                      ✅ Everything looks good! Voter registration should work.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemHealthCheck;