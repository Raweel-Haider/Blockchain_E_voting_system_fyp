// src/components/Admin/CheckCNIC.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useBlockchain } from '../../hooks/useBlockchain';
import { CONTRACTS } from '../../config/contracts';

const CheckCNIC = () => {
  const [cnic, setCnic] = useState('');
  const [voterInfo, setVoterInfo] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const { connectWallet } = useBlockchain();
  const navigate = useNavigate();

  const checkCNIC = async () => {
    if (!cnic || cnic.length !== 13) {
      setMessage({ type: 'error', text: 'Please enter a valid 13-digit CNIC' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    setVoterInfo(null);
    setCandidateInfo(null);

    try {
      const wallet = await connectWallet();
      if (!wallet) throw new Error('Wallet not connected');

      // Check as Voter
      try {
        const voterContract = new ethers.Contract(
          CONTRACTS.VoterManagement.address,
          CONTRACTS.VoterManagement.abi,
          wallet.signer
        );

        const voter = await voterContract.viewVoter(cnic);
        
        if (voter[5]) { // exists
          setVoterInfo({
            cnic: voter[0].toString(),
            name: voter[1],
            province: voter[2],
            constituency: voter[3],
            hasVoted: voter[4],
            exists: voter[5]
          });
          setMessage({ 
            type: 'warning', 
            text: `⚠️ This CNIC is already registered as a VOTER`
          });
        }
      } catch (e) {
        console.log('Not registered as voter:', e.message);
      }

      // Check as Candidate
      try {
        const candidateContract = new ethers.Contract(
          CONTRACTS.CandidateManagement.address,
          CONTRACTS.CandidateManagement.abi,
          wallet.signer
        );

        // Get all candidate CNICs
        const candidateCount = await candidateContract.getCandidateCount();
        let foundCandidate = null;

        for (let i = 1; i <= candidateCount; i++) {
          try {
            const candidate = await candidateContract.viewCandidate(i);
            if (candidate[1].toString() === cnic) {
              foundCandidate = {
                id: Number(candidate[0]),
                cnic: candidate[1].toString(),
                name: candidate[2],
                province: candidate[3],
                constituency: candidate[4],
                party: candidate[5]
              };
              break;
            }
          } catch (e) {
            // Candidate might be deleted
            continue;
          }
        }

        if (foundCandidate) {
          setCandidateInfo(foundCandidate);
          setMessage({ 
            type: 'warning', 
            text: voterInfo 
              ? `⚠️ This CNIC is registered as BOTH voter AND candidate!`
              : `⚠️ This CNIC is already registered as a CANDIDATE`
          });
        }
      } catch (e) {
        console.log('Not registered as candidate:', e.message);
      }

      // If neither
      if (!voterInfo && !candidateInfo) {
        setMessage({ 
          type: 'success', 
          text: `✅ CNIC ${cnic} is NOT registered. Safe to use!`
        });
      }

    } catch (error) {
      console.error('Error checking CNIC:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testMultipleCNICs = async () => {
    setMessage({ type: 'info', text: 'Testing 10 random CNICs...' });
    
    const testCnics = [];
    for (let i = 0; i < 10; i++) {
      const randomCnic = '99' + Math.floor(Math.random() * 10000000000).toString().padStart(11, '0');
      testCnics.push(randomCnic);
    }

    try {
      const wallet = await connectWallet();
      const voterContract = new ethers.Contract(
        CONTRACTS.VoterManagement.address,
        CONTRACTS.VoterManagement.abi,
        wallet.signer
      );

      const available = [];
      for (const testCnic of testCnics) {
        try {
          const voter = await voterContract.viewVoter(testCnic);
          if (!voter[5]) { // doesn't exist
            available.push(testCnic);
          }
        } catch (e) {
          available.push(testCnic);
        }
      }

      if (available.length > 0) {
        setMessage({ 
          type: 'success', 
          text: `✅ Found ${available.length} available CNICs:\n\n${available.join('\n')}\n\nYou can use any of these for testing!`
        });
      } else {
        setMessage({ 
          type: 'warning', 
          text: `All test CNICs are registered. Try manually with a random CNIC.`
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px' 
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            🔍 Check CNIC Registration Status
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '30px' }}>
            Check if a CNIC is already registered as voter or candidate
          </p>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Enter 13-digit CNIC"
              value={cnic}
              onChange={(e) => setCnic(e.target.value.replace(/\D/g, '').substring(0, 13))}
              maxLength={13}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '16px',
                border: '2px solid #e9ecef',
                borderRadius: '10px',
                marginBottom: '15px'
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={checkCNIC}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '15px 30px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Checking...' : '🔍 Check CNIC'}
              </button>

              <button
                onClick={testMultipleCNICs}
                style={{
                  flex: 1,
                  padding: '15px 30px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🎲 Find Available CNICs
              </button>
            </div>
          </div>

          {message.text && (
            <div style={{
              padding: '20px',
              borderRadius: '10px',
              marginBottom: '25px',
              background: message.type === 'success' ? '#d4edda' : 
                          message.type === 'error' ? '#f8d7da' : 
                          message.type === 'warning' ? '#fff3cd' : '#d1ecf1',
              color: message.type === 'success' ? '#155724' : 
                     message.type === 'error' ? '#721c24' :
                     message.type === 'warning' ? '#856404' : '#0c5460',
              borderLeft: `5px solid ${
                message.type === 'success' ? '#28a745' : 
                message.type === 'error' ? '#dc3545' :
                message.type === 'warning' ? '#ffc107' : '#17a2b8'
              }`,
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '14px'
            }}>
              {message.text}
            </div>
          )}

          {voterInfo && (
            <div style={{
              background: '#fff3cd',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
              borderLeft: '5px solid #ffc107'
            }}>
              <h3 style={{ color: '#856404', marginTop: 0 }}>
                👤 Registered as Voter
              </h3>
              <div style={{ color: '#856404' }}>
                <p><strong>CNIC:</strong> {voterInfo.cnic}</p>
                <p><strong>Name:</strong> {voterInfo.name}</p>
                <p><strong>Province:</strong> {voterInfo.province}</p>
                <p><strong>Constituency:</strong> {voterInfo.constituency}</p>
                <p><strong>Has Voted:</strong> {voterInfo.hasVoted ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}

          {candidateInfo && (
            <div style={{
              background: '#d1ecf1',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
              borderLeft: '5px solid #17a2b8'
            }}>
              <h3 style={{ color: '#0c5460', marginTop: 0 }}>
                🎭 Registered as Candidate
              </h3>
              <div style={{ color: '#0c5460' }}>
                <p><strong>ID:</strong> {candidateInfo.id}</p>
                <p><strong>CNIC:</strong> {candidateInfo.cnic}</p>
                <p><strong>Name:</strong> {candidateInfo.name}</p>
                <p><strong>Party:</strong> {candidateInfo.party}</p>
                <p><strong>Province:</strong> {candidateInfo.province}</p>
                <p><strong>Constituency:</strong> {candidateInfo.constituency}</p>
              </div>
            </div>
          )}

          <div style={{
            background: '#e7f3ff',
            borderRadius: '10px',
            padding: '20px',
            borderLeft: '5px solid #007bff'
          }}>
            <h3 style={{ color: '#004085', marginTop: 0 }}>
              💡 Tips
            </h3>
            <ul style={{ color: '#004085', lineHeight: '1.8' }}>
              <li>CNICs must be exactly 13 digits</li>
              <li>Each CNIC can only be registered once as a voter</li>
              <li>If CNIC exists, try a different one</li>
              <li>Use "Find Available CNICs" to get test CNICs</li>
              <li>The same CNIC can be both voter AND candidate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckCNIC;