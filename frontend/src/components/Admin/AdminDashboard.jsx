// src/components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import './css/AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    provinces: 0,
    constituencies: 0,
    parties: 0,
    candidates: 0,
    voters: 0
  });
  const [votingStatus, setVotingStatus] = useState({
    active: false,
    startTime: 0,
    endTime: 0
  });
  const [loading, setLoading] = useState(true);

  const { account, getContract } = useBlockchain();
  const navigate = useNavigate();

  // Check if admin is logged in
  useEffect(() => {
  const isAdmin = sessionStorage.getItem('isAdmin');
  if (!isAdmin) {
    navigate('/admin/login', { replace: true });
  }
}, [navigate]);


  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('Loading dashboard stats...');
        
        if (!account) {
          console.log('No account connected yet');
          return;
        }
        
        const votingMachine = await getContract('VotingMachine');
        console.log('VotingMachine contract:', votingMachine.target);
        
        // Get total stats
        console.log('Fetching total stats...');
        const totalStats = await votingMachine.getTotalStats();
        console.log('Total stats received:', totalStats);
        
        setStats({
          provinces: Number(totalStats[0]),
          constituencies: Number(totalStats[1]),
          parties: Number(totalStats[2]),
          candidates: Number(totalStats[3]),
          voters: Number(totalStats[4])
        });

        // Get voting status
        console.log('Fetching voting status...');
        const status = await votingMachine.getVotingStatus();
        console.log('Voting status received:', status);
        
        setVotingStatus({
          active: status[0],
          startTime: Number(status[1]),
          endTime: Number(status[2])
        });

        console.log('Dashboard loaded successfully!');
        setLoading(false);
      } catch (error) {
        console.error('Error loading stats:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          data: error.data
        });
        
        // Show error to user but still show dashboard
        alert('Error loading data: ' + error.message);
        setLoading(false);
      }
    };

    if (account) {
      loadStats();
    }
  }, [account, getContract]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
        <button 
          onClick={() => setLoading(false)}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Skip Loading (Show Dashboard Anyway)
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🗳️ Admin Dashboard</h1>
          <div className="header-actions">
            <span className="account-badge">{account?.slice(0, 6)}...{account?.slice(-4)}</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-info">
            <h3>{stats.provinces}</h3>
            <p>Provinces</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-info">
            <h3>{stats.constituencies}</h3>
            <p>Constituencies</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎭</div>
          <div className="stat-info">
            <h3>{stats.parties}</h3>
            <p>Parties</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-info">
            <h3>{stats.candidates}</h3>
            <p>Candidates</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🗳️</div>
          <div className="stat-info">
            <h3>{stats.voters}</h3>
            <p>Voters</p>
          </div>
        </div>
      </div>

      {/* Voting Status */}
      <div className="voting-status">
        <h2>Voting Status</h2>
        <div className={`status-badge ${votingStatus.active ? 'active' : 'inactive'}`}>
          {votingStatus.active ? '🟢 Active' : '🔴 Inactive'}
        </div>
        {votingStatus.active && (
          <p>
            Started: {new Date(votingStatus.startTime * 1000).toLocaleString()}<br />
            Ends: {new Date(votingStatus.endTime * 1000).toLocaleString()}
          </p>
        )}
      </div>

      {/* Management Sections */}
      <div className="management-grid">
        <div className="management-card" onClick={() => navigate('/admin/geographic')}>
          <h3>🌍 Geographic Management</h3>
          <p>Manage provinces and constituencies</p>
          <button className="btn-manage">Manage →</button>
        </div>

        <div className="management-card" onClick={() => navigate('/admin/parties')}>
          <h3>🎭 Party Management</h3>
          <p>Add and manage political parties</p>
          <button className="btn-manage">Manage →</button>
        </div>

        <div className="management-card" onClick={() => navigate('/admin/candidates')}>
          <h3>👤 Candidate Management</h3>
          <p>Register and manage candidates</p>
          <button className="btn-manage">Manage →</button>
        </div>

        <div className="management-card" onClick={() => navigate('/admin/voters')}>
          <h3>🗳️ Voter Management</h3>
          <p>Register and manage voters</p>
          <button className="btn-manage">Manage →</button>
        </div>

        <div className="management-card" onClick={() => navigate('/admin/voting')}>
          <h3>⏱️ Voting Control</h3>
          <p>Start, stop, and monitor voting</p>
          <button className="btn-manage">Control →</button>
        </div>

        <div className="management-card" onClick={() => navigate('/admin/results')}>
          <h3>📊 Results Management</h3>
          <p>Count votes and declare winners</p>
          <button className="btn-manage">View →</button>
        </div>

        {/* ✅ NEW: Admin Management Card */}
        <div className="management-card" onClick={() => navigate('/admin/admins')}>
          <h3>🔐 Admin Management</h3>
          <p>Add and remove system administrators</p>
          <button className="btn-manage">Manage →</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;