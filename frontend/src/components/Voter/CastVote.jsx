// src/components/Voter/CastVote.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useBlockchain } from '../../hooks/useBlockchain';
import { CONTRACTS } from '../../config/contracts';
import './css/CastVote.css';

const CastVote = () => {
  const [step, setStep] = useState(1); // 1: Register Secret Key, 2: Cast Vote
  const [secretKey, setSecretKey] = useState('');
  const [confirmSecretKey, setConfirmSecretKey] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasRegisteredKey, setHasRegisteredKey] = useState(false);

  const { getContract, connectWallet } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    const isVoter = sessionStorage.getItem('isVoter');
    if (!isVoter) {
      navigate('/voter/login', { replace: true });
      return;
    }
    checkSecretKeyStatus();
    loadCandidates();
  }, [navigate]);

  const checkSecretKeyStatus = async () => {
    try {
      const cnic = sessionStorage.getItem('voterCnic');
      const voterContract = await getContract('VoterManagement');
      const secretHash = await voterContract.getVoterSecretKeyHash(cnic);
      
      if (secretHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setHasRegisteredKey(true);
        setStep(2); // Skip to voting step
      }
    } catch (error) {
      console.error('Error checking secret key:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      const province = sessionStorage.getItem('voterProvince');
      const constituency = sessionStorage.getItem('voterConstituency');
      
      const candidateContract = await getContract('CandidateManagement');
      
      // ✅ FIX: Use event-based loading like ViewCandidates
      const filter = candidateContract.filters.CandidateRegistered();
      const events = await candidateContract.queryFilter(filter);
      
      const allCandidateIds = events.map(event => Number(event.args.candidateId));
      
      if (allCandidateIds.length === 0) {
        setCandidates([]);
        return;
      }

      const candidateDetails = await Promise.all(
        allCandidateIds.map(async (id) => {
          try {
            const details = await candidateContract.viewCandidate(id);
            
            const candidateProvince = details[3];
            const candidateConstituency = details[4];
            
            if (candidateProvince === province && candidateConstituency === constituency) {
              return {
                id: Number(details[0]),
                cnic: details[1].toString(),
                name: details[2],
                party: details[5]
              };
            }
            return null;
          } catch (error) {
            return null;
          }
        })
      );
      
      const validCandidates = candidateDetails.filter(candidate => candidate !== null);
      setCandidates(validCandidates);
      
    } catch (error) {
      console.error('Error loading candidates:', error);
      setMessage({ type: 'error', text: 'Failed to load candidates' });
    }
  };

  const handleRegisterSecretKey = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (secretKey.length < 6) {
      setMessage({ type: 'error', text: 'Secret key must be at least 6 characters' });
      return;
    }

    if (secretKey !== confirmSecretKey) {
      setMessage({ type: 'error', text: 'Secret keys do not match' });
      return;
    }

    setLoading(true);

    try {
      const cnic = sessionStorage.getItem('voterCnic');
      const password = sessionStorage.getItem('voterPassword');

      // ✅ FIX: Connect wallet and get signer for write operation
      const wallet = await connectWallet();
      if (!wallet) {
        throw new Error('Failed to connect wallet');
      }

      // ✅ FIX: Create contract with signer
      const votingProcess = new ethers.Contract(
        CONTRACTS.VotingProcess.address,
        CONTRACTS.VotingProcess.abi,
        wallet.signer
      );
      
      // ✅ Try to estimate gas first to catch errors early
      try {
        await votingProcess.registerSecretKey.estimateGas(cnic, password, secretKey);
      } catch (estimateError) {
        const errorStr = estimateError.message.toLowerCase();
        
        if (errorStr.includes('already voted')) {
          throw new Error('❌ You have already voted. Cannot register secret key.');
        } else if (errorStr.includes('voting is not active') || errorStr.includes('not active')) {
          throw new Error('❌ Voting is not currently active');
        } else if (errorStr.includes('voting has ended')) {
          throw new Error('❌ Voting period has ended');
        } else if (errorStr.includes('invalid voter credentials')) {
          throw new Error('❌ Invalid voter credentials');
        } else {
          throw new Error('❌ Transaction will fail. Please check:\n• Voting is currently active\n• You have not voted already\n• Your credentials are correct');
        }
      }
      
      const tx = await votingProcess.registerSecretKey(cnic, password, secretKey);
      
      setMessage({ type: 'info', text: '⏳ Transaction submitted. Waiting for confirmation...' });
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Secret key registered successfully!' });
      setHasRegisteredKey(true);
      setTimeout(() => {
        setStep(2);
        setMessage({ type: '', text: '' });
      }, 2000);

    } catch (error) {
      console.error('Error registering secret key:', error);
      
      let errorMessage = error.message;
      
      if (!errorMessage || errorMessage.includes('missing revert data')) {
        errorMessage = '❌ Failed to register secret key. Common reasons:\n• Voting is not active\n• You have already voted\n• Invalid credentials';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleCastVote = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!selectedCandidate) {
      setMessage({ type: 'error', text: 'Please select a candidate' });
      return;
    }

    if (!secretKey) {
      setMessage({ type: 'error', text: 'Please enter your secret key' });
      return;
    }

    const selectedCandidateName = candidates.find(c => c.id == selectedCandidate)?.name;
    if (!window.confirm(`Confirm vote for ${selectedCandidateName}?`)) {
      return;
    }

    setLoading(true);

    try {
      const cnic = sessionStorage.getItem('voterCnic');
      const password = sessionStorage.getItem('voterPassword');

      // ✅ FIX: Connect wallet and get signer for write operation
      const wallet = await connectWallet();
      if (!wallet) {
        throw new Error('Failed to connect wallet');
      }

      // ✅ FIX: Create contract with signer
      const votingProcess = new ethers.Contract(
        CONTRACTS.VotingProcess.address,
        CONTRACTS.VotingProcess.abi,
        wallet.signer
      );
      
      // ✅ Try to estimate gas first to catch errors early
      try {
        await votingProcess.castVote.estimateGas(cnic, password, selectedCandidate, secretKey);
      } catch (estimateError) {
        // Parse common errors
        const errorStr = estimateError.message.toLowerCase();
        
        if (errorStr.includes('already voted')) {
          throw new Error('❌ You have already cast your vote');
        } else if (errorStr.includes('invalid secret key') || errorStr.includes('secret')) {
          throw new Error('❌ Invalid secret key. Please enter the correct secret key you registered.');
        } else if (errorStr.includes('voting is not active') || errorStr.includes('not active')) {
          throw new Error('❌ Voting is not currently active');
        } else if (errorStr.includes('voting has ended')) {
          throw new Error('❌ Voting period has ended');
        } else if (errorStr.includes('invalid voter credentials')) {
          throw new Error('❌ Invalid voter credentials');
        } else if (errorStr.includes('not registered')) {
          throw new Error('❌ Secret key not registered. Please register your secret key first.');
        } else {
          throw new Error('❌ Transaction will fail. Please check:\n• Secret key is correct\n• You have not voted already\n• Voting is currently active');
        }
      }
      
      const tx = await votingProcess.castVote(cnic, password, selectedCandidate, secretKey);
      
      setMessage({ type: 'info', text: '⏳ Transaction submitted. Waiting for confirmation...' });
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Vote cast successfully!' });
      
      setTimeout(() => {
        navigate('/voter/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Error casting vote:', error);
      
      // Better error message handling
      let errorMessage = error.message;
      
      // If it's still a generic error, provide helpful message
      if (!errorMessage || errorMessage.includes('missing revert data')) {
        errorMessage = '❌ Failed to cast vote. Common reasons:\n• Secret key does not match\n• You have already voted\n• Voting is not active\n• Invalid credentials';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cast-vote-container">
      <div className="cast-vote-header">
        <button onClick={() => navigate('/voter/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>🗳️ Cast Your Vote</h1>
      </div>

      <div className="cast-vote-content">
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''} ${hasRegisteredKey ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Register Secret Key</div>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Cast Vote</div>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Step 1: Register Secret Key */}
        {step === 1 && !hasRegisteredKey && (
          <div className="voting-card">
            <h2>Step 1: Register Your Secret Key</h2>
            <p className="description">
              Create a secret key that you'll use to cast and verify your vote. 
              <strong> Remember this key - you'll need it to verify your vote later!</strong>
            </p>

            <form onSubmit={handleRegisterSecretKey}>
              <div className="form-group">
                <label>Secret Key</label>
                <input
                  type="password"
                  placeholder="Enter secret key (min 6 characters)"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  minLength="6"
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Secret Key</label>
                <input
                  type="password"
                  placeholder="Re-enter secret key"
                  value={confirmSecretKey}
                  onChange={(e) => setConfirmSecretKey(e.target.value)}
                  minLength="6"
                  required
                />
              </div>

              <div className="warning-box">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>Keep your secret key safe and private</li>
                  <li>You'll need it to verify your vote</li>
                  <li>Once registered, you cannot change it</li>
                </ul>
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Registering...' : 'Register Secret Key'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Cast Vote */}
        {step === 2 && (
          <div className="voting-card">
            <h2>Step 2: Cast Your Vote</h2>
            <p className="description">
              Select your preferred candidate from the list below.
            </p>

            <form onSubmit={handleCastVote}>
              {/* Candidates List */}
              <div className="candidates-list">
                {candidates.length === 0 ? (
                  <p className="no-candidates">No candidates available in your constituency</p>
                ) : (
                  candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className={`candidate-card ${selectedCandidate == candidate.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCandidate(candidate.id)}
                    >
                      <div className="candidate-radio">
                        <input
                          type="radio"
                          name="candidate"
                          value={candidate.id}
                          checked={selectedCandidate == candidate.id}
                          onChange={() => setSelectedCandidate(candidate.id)}
                        />
                      </div>
                      <div className="candidate-info">
                        <h3>{candidate.name}</h3>
                        <p className="candidate-party">🎭 {candidate.party}</p>
                        <p className="candidate-cnic">CNIC: {candidate.cnic}</p>
                      </div>
                      {selectedCandidate == candidate.id && (
                        <div className="selected-badge">✓ Selected</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Secret Key Input */}
              <div className="form-group">
                <label>Enter Your Secret Key</label>
                <input
                  type="password"
                  placeholder="Enter the secret key you registered"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  minLength="6"
                  required
                />
              </div>

              <div className="info-box">
                <strong>ℹ️ Before casting your vote:</strong>
                <ul>
                  <li>Make sure you've selected the right candidate</li>
                  <li>Enter the same secret key you registered in Step 1</li>
                  <li>Once cast, your vote cannot be changed</li>
                  <li>You can verify your vote later using your secret key</li>
                </ul>
              </div>

              <button 
                type="submit" 
                disabled={loading || !selectedCandidate || candidates.length === 0} 
                className="btn-success"
              >
                {loading ? 'Casting Vote...' : 'Cast Vote'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CastVote;