import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';
import './css/Management.css';

const VotingControl = () => {
  const [votingStatus, setVotingStatus] = useState({
    active: false,
    startTime: 0,
    endTime: 0,
    currentTime: 0
  });
  const [durationHours, setDurationHours] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { account, getContract, connectWallet } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    loadVotingStatus();
    const interval = setInterval(loadVotingStatus, 5000);
    return () => clearInterval(interval);
  }, [account]);

  const loadVotingStatus = async () => {
    try {
      const votingMachine = await getContract('VotingMachine');
      const status = await votingMachine.getVotingStatus();
      
      setVotingStatus({
        active: status[0],
        startTime: Number(status[1]),
        endTime: Number(status[2]),
        currentTime: Number(status[3])
      });
    } catch (error) {
      console.error('Error loading voting status:', error);
    }
  };

  const getAdminCredentials = () => {
    const cnic = prompt('Enter Admin CNIC:');
    const password = prompt('Enter Admin Password:');
    if (!cnic || !password) throw new Error('Credentials required');
    return { cnic, password };
  };

  const handleStartVoting = async () => {
    const hours = parseInt(durationHours) || 0;
    
    if (hours === 0 || hours < 1) {
      setMessage({ type: 'error', text: 'Please enter hours (minimum 1 hour)' });
      return;
    }

    if (hours > 168) {
      setMessage({ type: 'error', text: 'Maximum duration is 168 hours' });
      return;
    }

    // Check if previous election data exists
    const confirmMsg = `Start voting for ${hours} hour${hours > 1 ? 's' : ''}?

⚠️ This will automatically:
• Clear all previous election data
• Reset all voter statuses
• Clear all old results

Continue?`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { cnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      if (!wallet) throw new Error('Failed to connect wallet');

      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      // Auto-reset before starting new election
      setMessage({ type: 'info', text: '⏳ Resetting previous election data...' });
      
      try {
        await votingMachine.admin_resetAllResults(cnic, password);
        await votingMachine.admin_resetAllVoters(cnic, password);
      } catch (resetError) {
        // If reset fails (maybe no previous data), continue anyway
        console.log('Reset error (may be expected):', resetError);
      }

      setMessage({ type: 'info', text: '⏳ Starting new voting session...' });
      const tx = await votingMachine.admin_startVoting(cnic, password, hours);
      await tx.wait();

      setMessage({ 
        type: 'success', 
        text: `✅ New election started for ${hours} hour${hours > 1 ? 's' : ''}! Previous data cleared. Voters can now cast votes.` 
      });
      setDurationHours('');
      await loadVotingStatus();
    } catch (error) {
      setMessage({ type: 'error', text: '❌ ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStopVoting = async () => {
    if (!window.confirm('Stop voting now? This will end the voting period immediately.')) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { cnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      if (!wallet) throw new Error('Failed to connect wallet');

      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      const tx = await votingMachine.admin_stopVoting(cnic, password);
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Voting stopped! Go to Results Management to declare winners.' });
      await loadVotingStatus();
    } catch (error) {
      setMessage({ type: 'error', text: '❌ ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!votingStatus.active) return null;
    const remaining = votingStatus.endTime - votingStatus.currentTime;
    if (remaining <= 0) return 'Ended';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const hasVotingEnded = () => {
    return !votingStatus.active && votingStatus.endTime > 0 && votingStatus.currentTime >= votingStatus.endTime;
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          ← Back
        </button>
        <h1>⏱️ Voting Control</h1>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{message.text}</pre>
        </div>
      )}

      {/* Current Status */}
      <div className="voting-status-card">
        <h2>Current Status</h2>
        <div className={`status-indicator ${votingStatus.active ? 'active' : 'inactive'}`}>
          {votingStatus.active ? '🟢 VOTING ACTIVE' : '🔴 VOTING INACTIVE'}
        </div>
        
        {votingStatus.active && (
          <div className="status-details">
            <div className="status-row">
              <span className="label">Started:</span>
              <span className="value">{formatDate(votingStatus.startTime)}</span>
            </div>
            <div className="status-row">
              <span className="label">Ends:</span>
              <span className="value">{formatDate(votingStatus.endTime)}</span>
            </div>
            <div className="status-row">
              <span className="label">Time Remaining:</span>
              <span className="value highlight">{getTimeRemaining()}</span>
            </div>
          </div>
        )}

        {!votingStatus.active && votingStatus.endTime === 0 && (
          <div style={{ marginTop: '15px', padding: '12px', background: '#d1ecf1', borderRadius: '8px', textAlign: 'center' }}>
            ℹ️ Set duration and start voting below
          </div>
        )}

        {hasVotingEnded() && (
          <div style={{ 
            marginTop: '15px', 
            padding: '15px', 
            background: '#d4edda', 
            borderRadius: '8px', 
            border: '2px solid #28a745',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#155724', margin: '0 0 10px 0' }}>✅ Voting Ended</h3>
            <button
              onClick={() => navigate('/admin/results')}
              style={{
                padding: '12px 24px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Go to Results
            </button>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="management-grid-2col">
        {/* Start Voting */}
        <div className="management-card">
          <h3>Start Voting</h3>
          <p className="card-description">Start voting with specified duration</p>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Duration (Hours)
            </label>
            <input
              type="number"
              placeholder="Enter hours (1-168)"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="input-field"
              min="1"
              max="168"
              disabled={votingStatus.active}
            />
            <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '5px' }}>
              Min: 1 hour, Max: 168 hours
            </small>
          </div>

          <button
            onClick={handleStartVoting}
            disabled={loading || votingStatus.active}
            className="btn-success"
          >
            {loading ? 'Starting...' : 'Start Voting'}
          </button>
          {votingStatus.active && (
            <p className="warning-text">⚠️ Voting is already active</p>
          )}
        </div>

        {/* Stop Voting */}
        <div className="management-card">
          <h3>Stop Voting</h3>
          <p className="card-description">Stop voting immediately</p>
          
          <div className="alert-box">
            <strong>⚠️ Warning:</strong> This will end voting immediately
          </div>

          <button
            onClick={handleStopVoting}
            disabled={loading || !votingStatus.active}
            className="btn-danger"
          >
            {loading ? 'Stopping...' : 'Stop Voting'}
          </button>
          {!votingStatus.active && (
            <p className="info-text">ℹ️ Voting is not active</p>
          )}
        </div>
      </div>

      {/* Information */}
      <div className="info-card">
        <h3>ℹ️ Information</h3>
        <ul>
          <li><strong>Auto Reset:</strong> Starting new election automatically clears all previous data</li>
          <li><strong>Duration:</strong> Enter hours only (1-168 hours max)</li>
          <li><strong>Data Preserved:</strong> Voter accounts & passwords always kept after reset</li>
          <li><strong>Fresh Start:</strong> Each election starts with clean slate automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default VotingControl;