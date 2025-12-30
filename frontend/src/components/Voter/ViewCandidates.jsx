// src/components/Voter/ViewCandidates.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import './css/ViewCandidates.css';

const ViewCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voterInfo, setVoterInfo] = useState(null);
  const [error, setError] = useState('');

  const { getContract } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    const isVoter = sessionStorage.getItem('isVoter');
    if (!isVoter) {
      navigate('/voter/login', { replace: true });
      return;
    }
    
    const province = sessionStorage.getItem('voterProvince');
    const constituency = sessionStorage.getItem('voterConstituency');
    
    if (!province || !constituency) {
      setError('Voter constituency information not found');
      setLoading(false);
      return;
    }
    
    setVoterInfo({ province, constituency });
    loadCandidates(province, constituency);
  }, [navigate]);

  const loadCandidates = async (province, constituency) => {
    try {
      setLoading(true);
      setError('');

      const candidateContract = await getContract('CandidateManagement');
      
      // ✅ NEW APPROACH: Get all CandidateRegistered events
      const filter = candidateContract.filters.CandidateRegistered();
      const events = await candidateContract.queryFilter(filter);
      
      // Get all candidate IDs from events
      const allCandidateIds = events.map(event => Number(event.args.candidateId));
      
      if (allCandidateIds.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      // ✅ Fetch details for each candidate and filter by constituency
      const candidateDetails = await Promise.all(
        allCandidateIds.map(async (id) => {
          try {
            const details = await candidateContract.viewCandidate(id);
            
            // Check if candidate exists and is in the voter's constituency
            const candidateProvince = details[3];
            const candidateConstituency = details[4];
            
            if (candidateProvince === province && candidateConstituency === constituency) {
              return {
                id: Number(details[0]),
                cnic: details[1].toString(),
                name: details[2],
                province: details[3],
                constituency: details[4],
                party: details[5]
              };
            }
            return null;
          } catch (error) {
            // If viewCandidate fails, candidate was removed
            console.warn(`Candidate ${id} not found (may have been removed)`);
            return null;
          }
        })
      );

      // ✅ Filter out null values (removed candidates or wrong constituency)
      const validCandidates = candidateDetails.filter(candidate => candidate !== null);
      setCandidates(validCandidates);
      
    } catch (error) {
      console.error('Error loading candidates:', error);
      setError('Failed to load candidates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (voterInfo) {
      loadCandidates(voterInfo.province, voterInfo.constituency);
    }
  };

  return (
    <div className="view-candidates-container">
      <div className="view-candidates-header">
        <button onClick={() => navigate('/voter/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>👥 View Candidates</h1>
      </div>

      <div className="view-candidates-content">
        {/* Constituency Info */}
        {voterInfo && (
          <div className="constituency-info">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Your Constituency</h2>
                <p>
                  <strong>{voterInfo.constituency}</strong>, {voterInfo.province}
                </p>
              </div>
              <button 
                onClick={handleRefresh} 
                disabled={loading}
                className="btn-primary"
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                {loading ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ 
            padding: '15px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c33'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-card">
            <div className="spinner"></div>
            <p>Loading candidates...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="no-candidates-card">
            <div className="icon">📭</div>
            <h3>No Candidates Found</h3>
            <p>There are no registered candidates in your constituency yet.</p>
            <button 
              onClick={handleRefresh}
              className="btn-primary"
              style={{ marginTop: '15px' }}
            >
              🔄 Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="candidates-count">
              <p>Total Candidates: <strong>{candidates.length}</strong></p>
            </div>

            <div className="candidates-grid">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="candidate-card">
                  <div className="candidate-header">
                    <div className="candidate-avatar">
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="candidate-basic">
                      <h3>{candidate.name}</h3>
                      <p className="candidate-id">ID: #{candidate.id}</p>
                    </div>
                  </div>

                  <div className="candidate-details">
                    <div className="detail-item">
                      <span className="icon">🎭</span>
                      <div>
                        <span className="label">Party</span>
                        <span className="value">{candidate.party}</span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="icon">📍</span>
                      <div>
                        <span className="label">Constituency</span>
                        <span className="value">{candidate.constituency}</span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="icon">🏛️</span>
                      <div>
                        <span className="label">Province</span>
                        <span className="value">{candidate.province}</span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="icon">🆔</span>
                      <div>
                        <span className="label">CNIC</span>
                        <span className="value">{candidate.cnic}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Info Card */}
        <div className="info-card">
          <h3>ℹ️ About Candidates</h3>
          <ul>
            <li>These are all registered candidates in your constituency</li>
            <li>You can only vote for candidates in your constituency</li>
            <li>Each candidate represents a political party</li>
            <li>Check candidate details before voting</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ViewCandidates;