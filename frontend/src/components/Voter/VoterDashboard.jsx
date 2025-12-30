// src/components/Voter/VoterDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useBlockchain } from '../../hooks/useBlockchain';
import { CONTRACTS } from '../../config/contracts';
import './css/VoterDashboard.css';

const VoterDashboard = () => {
  const [voterInfo, setVoterInfo] = useState(null);
  const [votingStatus, setVotingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { getContract } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    const isVoter = sessionStorage.getItem('isVoter');
    if (!isVoter) {
      navigate('/voter/login', { replace: true });
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const cnic = sessionStorage.getItem('voterCnic');
      const name = sessionStorage.getItem('voterName');
      const province = sessionStorage.getItem('voterProvince');
      const constituency = sessionStorage.getItem('voterConstituency');
      
      // Get voter details from contract
      const voterContract = await getContract('VoterManagement');
      const voterDetails = await voterContract.viewVoter(cnic);
      
      setVoterInfo({
        cnic,
        name,
        province,
        constituency,
        hasVoted: voterDetails[4]
      });

      // Get voting status
      const votingMachine = await getContract('VotingMachine');
      const status = await votingMachine.getVotingStatus();
      
      setVotingStatus({
        active: status[0],
        startTime: Number(status[1]),
        endTime: Number(status[2]),
        currentTime: Number(status[3])
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!votingStatus || !votingStatus.active) return null;
    const remaining = votingStatus.endTime - votingStatus.currentTime;
    if (remaining <= 0) return 'Ended';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="voter-dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="voter-dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🗳️ Voter Dashboard</h1>
          <button onClick={handleLogout} className="logout-btn">
            Logout →
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Voter Info Card */}
        <div className="info-card voter-info-card">
          <h2>👤 Your Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">CNIC:</span>
              <span className="value">{voterInfo?.cnic}</span>
            </div>
            <div className="info-item">
              <span className="label">Name:</span>
              <span className="value">{voterInfo?.name}</span>
            </div>
            <div className="info-item">
              <span className="label">Province:</span>
              <span className="value">{voterInfo?.province}</span>
            </div>
            <div className="info-item">
              <span className="label">Constituency:</span>
              <span className="value">{voterInfo?.constituency}</span>
            </div>
            <div className="info-item full-width">
              <span className="label">Voting Status:</span>
              <span className={`badge ${voterInfo?.hasVoted ? 'voted' : 'not-voted'}`}>
                {voterInfo?.hasVoted ? '✓ Voted' : '✗ Not Voted'}
              </span>
            </div>
          </div>
        </div>

        {/* Voting Status Card */}
        <div className="info-card voting-status-card">
          <h2>⏱️ Voting Status</h2>
          <div className={`status-indicator ${votingStatus?.active ? 'active' : 'inactive'}`}>
            {votingStatus?.active ? '🟢 VOTING ACTIVE' : '🔴 VOTING INACTIVE'}
          </div>
          
          {votingStatus?.active && (
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
        </div>

        {/* Action Cards */}
        <div className="action-cards">
          <div 
            className={`action-card ${!votingStatus?.active || voterInfo?.hasVoted ? 'disabled' : ''}`}
            onClick={() => votingStatus?.active && !voterInfo?.hasVoted && navigate('/voter/cast-vote')}
          >
            <div className="action-icon">🗳️</div>
            <h3>Cast Vote</h3>
            <p>
              {!votingStatus?.active 
                ? 'Voting is not active' 
                : voterInfo?.hasVoted 
                  ? 'You have already voted' 
                  : 'Cast your vote now'}
            </p>
            {votingStatus?.active && !voterInfo?.hasVoted && (
              <button className="action-btn">Cast Vote →</button>
            )}
          </div>

          <div 
            className={`action-card ${!voterInfo?.hasVoted ? 'disabled' : ''}`}
            onClick={() => voterInfo?.hasVoted && navigate('/voter/verify-vote')}
          >
            <div className="action-icon">✓</div>
            <h3>Verify Vote</h3>
            <p>
              {voterInfo?.hasVoted 
                ? 'Verify your cast vote' 
                : 'Vote first to verify'}
            </p>
            {voterInfo?.hasVoted && (
              <button className="action-btn">Verify Vote →</button>
            )}
          </div>

          <div 
            className="action-card"
            onClick={() => navigate('/voter/view-candidates')}
          >
            <div className="action-icon">👥</div>
            <h3>View Candidates</h3>
            <p>See candidates in your constituency</p>
            <button className="action-btn">View Candidates →</button>
          </div>

          <div 
            className="action-card"
            onClick={() => navigate('/voter/results')}
          >
            <div className="action-icon">📊</div>
            <h3>View Results</h3>
            <p>Check election results</p>
            <button className="action-btn">View Results →</button>
          </div>
        </div>

        {/* Information Box */}
        <div className="info-box">
          <h3>ℹ️ Important Guidelines</h3>
          <ul>
            <li>You can only vote during the active voting period</li>
            <li>Each voter can cast only ONE vote</li>
            <li>You must register a secret key before voting</li>
            <li>Keep your secret key safe to verify your vote later</li>
            <li>You can only vote for candidates in your constituency</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoterDashboard;