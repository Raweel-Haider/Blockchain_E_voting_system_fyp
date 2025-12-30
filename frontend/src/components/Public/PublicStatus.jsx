// src/components/Public/PublicStatus.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';

const PublicStatus = () => {
  const [votingStatus, setVotingStatus] = useState({
    active: false,
    startTime: 0,
    endTime: 0,
    currentTime: 0
  });
  const [stats, setStats] = useState({
    provinces: 0,
    constituencies: 0,
    parties: 0,
    candidates: 0,
    voters: 0
  });
  const [loading, setLoading] = useState(true);

  const { getContract } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadVotingStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadVotingStatus(), loadStats()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const loadStats = async () => {
    try {
      const votingMachine = await getContract('VotingMachine');
      const statsData = await votingMachine.getTotalStats();
      
      setStats({
        provinces: Number(statsData[0]),
        constituencies: Number(statsData[1]),
        parties: Number(statsData[2]),
        candidates: Number(statsData[3]),
        voters: Number(statsData[4])
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'Not started';
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  const getProgressPercentage = () => {
    if (!votingStatus.active || votingStatus.startTime === 0) return 0;
    const total = votingStatus.endTime - votingStatus.startTime;
    const elapsed = votingStatus.currentTime - votingStatus.startTime;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const hasVotingEnded = () => {
    return !votingStatus.active && votingStatus.endTime > 0 && votingStatus.currentTime >= votingStatus.endTime;
  };

  const hasNotStarted = () => {
    return !votingStatus.active && votingStatus.startTime === 0;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        background: 'white',
        borderRadius: '15px',
        padding: '30px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ 
              padding: '10px 20px', 
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: '20px'
            }}
          >
            ← Back to Home
          </button>
          <h1 style={{ 
            color: '#333', 
            fontSize: '2.5rem', 
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            ⏱️ Voting Status
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '10px' }}>
            Live voting period information and election statistics
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
            Loading status...
          </div>
        )}

        {!loading && (
          <>
            {/* Current Status Banner */}
            <div style={{ 
              background: votingStatus.active 
                ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' 
                : hasVotingEnded()
                  ? 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)'
                  : 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
              padding: '30px',
              borderRadius: '12px',
              marginBottom: '30px',
              border: votingStatus.active 
                ? '3px solid #28a745' 
                : hasVotingEnded()
                  ? '3px solid #dc3545'
                  : '3px solid #ffc107',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                {votingStatus.active ? '🟢' : hasVotingEnded() ? '🔴' : '⚪'}
              </div>
              <h2 style={{ 
                margin: '0 0 10px 0',
                color: votingStatus.active ? '#155724' : hasVotingEnded() ? '#721c24' : '#856404',
                fontSize: '2rem'
              }}>
                {votingStatus.active ? 'VOTING IN PROGRESS' : 
                 hasVotingEnded() ? 'VOTING ENDED' : 
                 'VOTING NOT STARTED'}
              </h2>
              <p style={{ 
                margin: 0,
                color: votingStatus.active ? '#155724' : hasVotingEnded() ? '#721c24' : '#856404',
                fontSize: '1.2rem'
              }}>
                {votingStatus.active 
                  ? 'Cast your vote now before time runs out!' 
                  : hasVotingEnded()
                    ? 'Results will be declared by election authorities soon'
                    : 'Voting will begin when scheduled by authorities'}
              </p>
            </div>

            {/* Time Details */}
            {!hasNotStarted() && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                <div style={{ 
                  background: '#e3f2fd',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '2px solid #2196f3'
                }}>
                  <div style={{ fontSize: '1rem', color: '#1976d2', marginBottom: '8px', fontWeight: '600' }}>
                    🕐 Started
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#333', fontWeight: 'bold' }}>
                    {formatDate(votingStatus.startTime)}
                  </div>
                </div>

                <div style={{ 
                  background: '#fff3e0',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '2px solid #ff9800'
                }}>
                  <div style={{ fontSize: '1rem', color: '#f57c00', marginBottom: '8px', fontWeight: '600' }}>
                    🕐 Scheduled End
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#333', fontWeight: 'bold' }}>
                    {formatDate(votingStatus.endTime)}
                  </div>
                </div>

                {votingStatus.active && (
                  <div style={{ 
                    background: '#e8f5e9',
                    padding: '20px',
                    borderRadius: '10px',
                    border: '2px solid #4caf50'
                  }}>
                    <div style={{ fontSize: '1rem', color: '#388e3c', marginBottom: '8px', fontWeight: '600' }}>
                      ⏰ Time Remaining
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#2e7d32', fontWeight: 'bold' }}>
                      {getTimeRemaining()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {votingStatus.active && (
              <div style={{ marginBottom: '30px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '10px',
                  fontSize: '0.9rem',
                  color: '#666'
                }}>
                  <span>Voting Progress</span>
                  <span>{getProgressPercentage().toFixed(1)}%</span>
                </div>
                <div style={{ 
                  background: '#e9ecef', 
                  borderRadius: '12px', 
                  height: '30px', 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #28a745, #20c997)',
                    height: '100%',
                    width: `${getProgressPercentage()}%`,
                    transition: 'width 1s ease',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {getProgressPercentage() > 10 && `${getProgressPercentage().toFixed(0)}%`}
                  </div>
                </div>
              </div>
            )}

            {/* Election Statistics */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#333', marginBottom: '20px', fontSize: '1.5rem' }}>
                📊 Election Statistics
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '15px'
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '20px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.provinces}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Provinces</div>
                </div>

                <div style={{ 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  padding: '20px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.constituencies}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Constituencies</div>
                </div>

                <div style={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  padding: '20px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.parties}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Political Parties</div>
                </div>

                <div style={{ 
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  padding: '20px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.candidates}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Candidates</div>
                </div>

                <div style={{ 
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  padding: '20px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.voters}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '5px' }}>Registered Voters</div>
                </div>
              </div>
            </div>

            {/* Information Card */}
            <div style={{ 
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '10px',
              border: '2px solid #dee2e6'
            }}>
              <h3 style={{ color: '#333', marginBottom: '15px', fontSize: '1.2rem' }}>
                ℹ️ Important Information
              </h3>
              <ul style={{ color: '#666', lineHeight: '1.8', paddingLeft: '20px' }}>
                <li><strong>Live Updates:</strong> This page updates automatically every 3 seconds</li>
                <li><strong>Voting Period:</strong> Only registered voters can cast votes during active period</li>
                <li><strong>Results:</strong> Will be declared by election authorities after voting ends</li>
                <li><strong>Transparency:</strong> All votes are recorded on blockchain for verification</li>
                <li><strong>Security:</strong> Secret key system ensures vote privacy and authenticity</li>
              </ul>
            </div>

            {/* Quick Links */}
            <div style={{ 
              marginTop: '30px',
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => navigate('/public/results')}
                style={{
                  padding: '12px 30px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                📊 View Results
              </button>
              
              {votingStatus.active && (
                <button
                  onClick={() => navigate('/voter/login')}
                  style={{
                    padding: '12px 30px',
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)'
                  }}
                >
                  🗳️ Cast Your Vote
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicStatus;