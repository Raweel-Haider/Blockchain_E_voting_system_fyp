// src/components/Public/PublicCandidates.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';

const PublicCandidates = () => {
  const [provinces, setProvinces] = useState([]);
  const [allCandidates, setAllCandidates] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { getContract } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    loadAllCandidates();
  }, []);

  const loadAllCandidates = async () => {
    setLoading(true);
    try {
      const geoContract = await getContract('GeographicManagement');
      const candidateContract = await getContract('CandidateManagement');

      // Get all provinces
      const provinceList = await geoContract.viewProvinces();
      
      const candidatesByProvince = {};

      // For each province, get constituencies and candidates
      for (const province of provinceList) {
        const constituencies = await geoContract.viewConstituenciesByProvince(province);
        candidatesByProvince[province] = [];

        for (const constituency of constituencies) {
          try {
            // Get candidates using events
            const filter = candidateContract.filters.CandidateRegistered();
            const events = await candidateContract.queryFilter(filter);
            const allCandidateIds = events.map(event => Number(event.args.candidateId));

            const constituencyCandidates = [];

            for (const id of allCandidateIds) {
              try {
                const candidate = await candidateContract.viewCandidate(id);
                const candidateProvince = candidate[3];
                const candidateConstituency = candidate[4];

                if (candidateProvince === province && candidateConstituency === constituency) {
                  constituencyCandidates.push({
                    id: Number(candidate[0]),
                    cnic: candidate[1].toString(),
                    name: candidate[2],
                    party: candidate[5]
                  });
                }
              } catch (error) {
                // Skip invalid candidate
              }
            }

            if (constituencyCandidates.length > 0) {
              candidatesByProvince[province].push({
                constituency,
                candidates: constituencyCandidates
              });
            }
          } catch (error) {
            console.warn(`Error loading ${constituency}, ${province}:`, error);
          }
        }
      }

      setAllCandidates(candidatesByProvince);
      setProvinces(provinceList);

      const totalCandidates = Object.values(candidatesByProvince)
        .flat()
        .reduce((sum, c) => sum + c.candidates.length, 0);

      if (totalCandidates === 0) {
        setMessage({ type: 'info', text: 'No candidates registered yet' });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Total ${totalCandidates} candidates across ${provinceList.length} provinces` 
        });
      }

    } catch (error) {
      console.error('Error loading candidates:', error);
      setMessage({ type: 'error', text: '❌ Error loading candidates: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '1400px', 
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
            👥 All Registered Candidates
          </h1>
          <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '10px' }}>
            Complete list of candidates participating in the election
          </p>
        </div>

        {message.text && (
          <div style={{
            padding: '15px 20px',
            background: message.type === 'success' ? '#d4edda' : 
                       message.type === 'error' ? '#f8d7da' : '#d1ecf1',
            color: message.type === 'success' ? '#155724' : 
                   message.type === 'error' ? '#721c24' : '#0c5460',
            borderRadius: '8px',
            marginBottom: '20px',
            border: `2px solid ${message.type === 'success' ? '#28a745' : 
                                 message.type === 'error' ? '#dc3545' : '#17a2b8'}`
          }}>
            {message.text}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
            Loading all candidates...
          </div>
        )}

        {!loading && Object.keys(allCandidates).length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px',
            background: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>👥</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Candidates Yet</h3>
            <p style={{ color: '#999' }}>
              Candidates will appear here once registration begins
            </p>
          </div>
        )}

        {!loading && Object.keys(allCandidates).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {provinces.map((province) => (
              allCandidates[province]?.length > 0 && (
                <div key={province}>
                  {/* Province Header */}
                  <h2 style={{ 
                    margin: '0 0 15px 0', 
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '1.3rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    📍 {province}
                  </h2>

                  {/* Constituencies under this province */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {allCandidates[province].map((constituencyData, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          border: '2px solid #e9ecef',
                          background: 'white',
                          padding: '15px',
                          borderRadius: '10px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                      >
                        {/* Constituency Header */}
                        <div style={{ 
                          borderBottom: '2px solid #e9ecef', 
                          paddingBottom: '10px', 
                          marginBottom: '15px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <h3 style={{ margin: '0', color: '#333', fontSize: '1.1rem' }}>
                            {constituencyData.constituency}
                          </h3>
                          <span style={{ 
                            background: '#667eea',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}>
                            {constituencyData.candidates.length} Candidates
                          </span>
                        </div>

                        {/* Candidates List */}
                        <ul style={{ 
                          listStyle: 'none', 
                          padding: 0, 
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {constituencyData.candidates.map((candidate, cIndex) => (
                            <li 
                              key={candidate.id}
                              style={{
                                padding: '12px 15px',
                                background: cIndex % 2 === 0 ? '#f8f9fa' : 'white',
                                borderRadius: '6px',
                                border: '1px solid #e9ecef',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                minHeight: '65px',
                                transition: 'all 0.2s ease',
                                cursor: 'default'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e3f2fd';
                                e.currentTarget.style.borderColor = '#2196f3';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = cIndex % 2 === 0 ? '#f8f9fa' : 'white';
                                e.currentTarget.style.borderColor = '#e9ecef';
                              }}
                            >
                              {/* Number */}
                              <div style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 'bold',
                                minWidth: '40px', 
                                textAlign: 'center',
                                color: '#667eea'
                              }}>
                                {cIndex + 1}
                              </div>

                              {/* Candidate Icon */}
                              <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                color: 'white',
                                fontWeight: 'bold'
                              }}>
                                {candidate.name.charAt(0).toUpperCase()}
                              </div>

                              {/* Candidate Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '1.1rem', 
                                  fontWeight: 'bold',
                                  color: '#333',
                                  marginBottom: '5px'
                                }}>
                                  {candidate.name}
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '12px', 
                                  alignItems: 'center',
                                  fontSize: '0.9rem',
                                  flexWrap: 'wrap'
                                }}>
                                  <span style={{
                                    background: '#6c757d',
                                    color: 'white',
                                    padding: '3px 10px',
                                    borderRadius: '5px',
                                    fontSize: '0.85rem',
                                    fontWeight: '600'
                                  }}>
                                    🎭 {candidate.party}
                                  </span>
                                  <span style={{ 
                                    color: '#666',
                                    fontSize: '0.85rem'
                                  }}>
                                    📋 CNIC: {candidate.cnic}
                                  </span>
                                </div>
                              </div>

                              {/* Candidate ID Badge */}
                              <div style={{
                                background: '#e9ecef',
                                color: '#495057',
                                padding: '8px 15px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                minWidth: '60px',
                                textAlign: 'center'
                              }}>
                                ID: {candidate.id}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && Object.keys(allCandidates).length > 0 && (
          <div style={{ 
            marginTop: '30px',
            padding: '20px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '10px',
            border: '2px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 Summary</h3>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
                  {provinces.length}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Provinces</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#764ba2' }}>
                  {Object.values(allCandidates).flat().length}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Constituencies</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                  {Object.values(allCandidates)
                    .flat()
                    .reduce((sum, c) => sum + c.candidates.length, 0)}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Total Candidates</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCandidates;