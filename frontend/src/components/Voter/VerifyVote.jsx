// src/components/Voter/VerifyVote.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import './css/VerifyVote.css';

const VerifyVote = () => {
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { getContract } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    const isVoter = sessionStorage.getItem('isVoter');
    if (!isVoter) {
      navigate('/voter/login', { replace: true });
    }
  }, [navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setVerificationResult(null);
    setCandidateDetails(null);

    if (!secretKey || secretKey.length < 6) {
      setMessage({ type: 'error', text: 'Please enter a valid secret key (min 6 characters)' });
      return;
    }

    setLoading(true);

    try {
      const cnic = sessionStorage.getItem('voterCnic');

      // Verify vote
      const votingProcess = await getContract('VotingProcess');
      const result = await votingProcess.verifyMyVote(cnic, secretKey);

      setVerificationResult({
        candidateId: Number(result[0]),
        verified: result[1]
      });

      if (result[1]) {
        // Get candidate details
        const candidateContract = await getContract('CandidateManagement');
        const candidate = await candidateContract.viewCandidate(result[0]);
        
        setCandidateDetails({
          id: Number(candidate[0]),
          cnic: candidate[1].toString(),
          name: candidate[2],
          province: candidate[3],
          constituency: candidate[4],
          party: candidate[5]
        });

        setMessage({ type: 'success', text: '✅ Vote verified successfully!' });
      } else {
        setMessage({ type: 'error', text: '❌ Invalid secret key. Verification failed.' });
      }

    } catch (error) {
      console.error('Error verifying vote:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to verify vote' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-vote-container">
      <div className="verify-vote-header">
        <button onClick={() => navigate('/voter/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>✓ Verify Your Vote</h1>
      </div>

      <div className="verify-vote-content">
        <div className="verify-card">
          <h2>Enter Your Secret Key</h2>
          <p className="description">
            Use the secret key you created when casting your vote to verify it was recorded correctly.
          </p>

          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>Secret Key</label>
              <input
                type="password"
                placeholder="Enter your secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                minLength="6"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-verify">
              {loading ? 'Verifying...' : 'Verify Vote'}
            </button>
          </form>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Verification Result */}
          {verificationResult && verificationResult.verified && candidateDetails && (
            <div className="result-card success">
              <div className="result-icon">✅</div>
              <h3>Vote Verified Successfully!</h3>
              
              <div className="candidate-details">
                <h4>You voted for:</h4>
                <div className="detail-row">
                  <span className="label">Candidate Name:</span>
                  <span className="value">{candidateDetails.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Party:</span>
                  <span className="value">{candidateDetails.party}</span>
                </div>
                <div className="detail-row">
                  <span className="label">CNIC:</span>
                  <span className="value">{candidateDetails.cnic}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Constituency:</span>
                  <span className="value">{candidateDetails.constituency}, {candidateDetails.province}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Candidate ID:</span>
                  <span className="value">#{candidateDetails.id}</span>
                </div>
              </div>

              <div className="info-box">
                <p>✓ Your vote has been securely recorded on the blockchain</p>
                <p>✓ This verification confirms your vote integrity</p>
              </div>
            </div>
          )}

          {verificationResult && !verificationResult.verified && (
            <div className="result-card error">
              <div className="result-icon">❌</div>
              <h3>Verification Failed</h3>
              <p>The secret key you entered does not match our records.</p>
              <p>Please make sure you're using the same secret key you registered when casting your vote.</p>
            </div>
          )}
        </div>

        {/* Information Card */}
        <div className="info-card">
          <h3>ℹ️ About Vote Verification</h3>
          <ul>
            <li>Use the same secret key you created during voting</li>
            <li>Verification proves your vote was recorded correctly</li>
            <li>Your vote remains private and anonymous on the blockchain</li>
            <li>Only you can verify your vote with your secret key</li>
            <li>Keep your secret key confidential</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VerifyVote;