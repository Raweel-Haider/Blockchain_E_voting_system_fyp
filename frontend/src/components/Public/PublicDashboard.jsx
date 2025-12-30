// src/components/Public/PublicDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '../../config/contracts';
import './css/PublicDashboard.css';

const PublicDashboard = () => {
  const [stats, setStats] = useState(null);
  const [votingStatus, setVotingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    try {
      setLoading(true);

      // Create read-only provider
      const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      
      // Create contract instances (read-only)
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        provider
      );

      // Get stats
      const statsData = await votingMachine.getTotalStats();
      setStats({
        provinces: Number(statsData[0]),
        constituencies: Number(statsData[1]),
        parties: Number(statsData[2]),
        candidates: Number(statsData[3]),
        voters: Number(statsData[4])
      });

      // Get voting status
      const status = await votingMachine.getVotingStatus();
      setVotingStatus({
        active: status[0],
        startTime: Number(status[1]),
        endTime: Number(status[2]),
        currentTime: Number(status[3])
      });

    } catch (error) {
      console.error('Error loading public data:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="public-dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="public-dashboard-container">
      <div className="public-header">
        <button onClick={() => navigate('/')} className="btn-home">
          ← Home
        </button>
        <div className="header-content">
          <h1>👥 Public Access Portal</h1>
          <p>View election information and results</p>
        </div>
      </div>

      <div className="public-content">
        {/* Voting Status Card */}
        <div className="status-card">
          <h2>⏱️ Current Voting Status</h2>
          <div className={`status-badge ${votingStatus?.active ? 'active' : 'inactive'}`}>
            {votingStatus?.active ? '🟢 VOTING ACTIVE' : '🔴 VOTING INACTIVE'}
          </div>
          
          {votingStatus?.active && (
            <div className="status-details">
              <div className="detail-row">
                <span className="label">Started:</span>
                <span className="value">{formatDate(votingStatus.startTime)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Ends:</span>
                <span className="value">{formatDate(votingStatus.endTime)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Time Remaining:</span>
                <span className="value highlight">{getTimeRemaining()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏛️</div>
            <div className="stat-value">{stats?.provinces || 0}</div>
            <div className="stat-label">Provinces</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📍</div>
            <div className="stat-value">{stats?.constituencies || 0}</div>
            <div className="stat-label">Constituencies</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎭</div>
            <div className="stat-value">{stats?.parties || 0}</div>
            <div className="stat-label">Political Parties</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-value">{stats?.candidates || 0}</div>
            <div className="stat-label">Candidates</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🗳️</div>
            <div className="stat-value">{stats?.voters || 0}</div>
            <div className="stat-label">Registered Voters</div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="access-cards">
          <div className="access-card" onClick={() => navigate('/public/status')}>
            <div className="access-icon">⏱️</div>
            <h3>Voting Status</h3>
            <p>Real-time voting period information</p>
            <button className="access-btn">View Status →</button>
          </div>

          <div className="access-card" onClick={() => navigate('/public/candidates')}>
            <div className="access-icon">👥</div>
            <h3>View Candidates</h3>
            <p>Browse all registered candidates</p>
            <button className="access-btn">View Candidates →</button>
          </div>

          <div className="access-card" onClick={() => navigate('/public/results')}>
            <div className="access-icon">📊</div>
            <h3>Election Results</h3>
            <p>View declared election results</p>
            <button className="access-btn">View Results →</button>
          </div>
        </div>

        {/* Information Box */}
        <div className="info-box">
          <h3>ℹ️ About This System</h3>
          <ul>
            <li>🔗 Powered by blockchain technology for transparency</li>
            <li>🔒 Secure and immutable voting records</li>
            <li>👁️ Public can view all election information</li>
            <li>✅ Results are permanently recorded on the blockchain</li>
            <li>🌐 Network: {NETWORK.name}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PublicDashboard;