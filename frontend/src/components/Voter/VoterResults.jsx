import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import './css/VoterDashboard.css';

const ViewResults = () => {
  const [provinces, setProvinces] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { getContract } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    const isVoter = sessionStorage.getItem('isVoter');
    if (!isVoter) {
      navigate('/voter/login', { replace: true });
      return;
    }
    loadAllResults();
  }, [navigate]);

  const loadAllResults = async () => {
    setLoading(true);
    try {
      const geoContract = await getContract('GeographicManagement');
      const candidateContract = await getContract('CandidateManagement');
      const votingMachine = await getContract('VotingMachine');

      const provinceList = await geoContract.viewProvinces();
      const provinceData = {};

      for (const province of provinceList) {
        const constituencies = await geoContract.viewConstituenciesByProvince(province);
        provinceData[province] = [];

        for (const constituency of constituencies) {
          try {
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
                    party: candidate[5],
                    votes: 0
                  });
                }
              } catch (error) {
                // Skip invalid candidate
              }
            }

            if (constituencyCandidates.length > 0) {
              let isDeclared = false;
              let winner = null;
              let isDraw = false;

              try {
                // Check if results declared
                const winnerData = await votingMachine.getWinner(province, constituency);
                isDeclared = Boolean(winnerData[2]);
                
                if (isDeclared) {
                  // Get vote counts
                  const resultsData = await votingMachine.getResults(province, constituency);
                  
                  constituencyCandidates.forEach((candidate, index) => {
                    const voteCount = Number(resultsData[1][index] || 0);
                    candidate.votes = voteCount;
                  });

                  // Sort by votes
                  constituencyCandidates.sort((a, b) => b.votes - a.votes);

                  const winnerId = Number(winnerData[0]);
                  
                  // Check for draw situations
                  const topVote = constituencyCandidates[0]?.votes || 0;
                  const candidatesWithTopVotes = constituencyCandidates.filter(c => c.votes === topVote);
                  
                  if (winnerId === 0 || candidatesWithTopVotes.length > 1) {
                    // Draw situation: winnerId=0 from contract OR multiple candidates have same top votes
                    isDraw = true;
                    winner = null;
                  } else {
                    // Clear winner
                    winner = winnerId;
                    isDraw = false;
                  }
                  
                  console.log(`${constituency}: Declared, WinnerId=${winnerId}, TopVotes=${topVote}, TiedCount=${candidatesWithTopVotes.length}, Draw=${isDraw}`);
                }
              } catch (error) {
                isDeclared = false;
                console.log(`${constituency}: Not declared yet`);
              }

              const totalVotes = isDeclared 
                ? constituencyCandidates.reduce((sum, c) => sum + c.votes, 0)
                : 0;

              provinceData[province].push({
                constituency,
                candidates: constituencyCandidates,
                isDeclared,
                winner,
                isDraw,
                totalVotes
              });
            }
          } catch (error) {
            console.warn(`Error loading ${constituency}, ${province}:`, error);
          }
        }
      }

      setAllResults(provinceData);
      setProvinces(provinceList);

      const totalConstituencies = Object.values(provinceData).reduce((sum, consts) => sum + consts.length, 0);
      const declaredCount = Object.values(provinceData).flat().filter(r => r.isDeclared).length;

      if (totalConstituencies === 0) {
        setMessage({ type: 'info', text: 'No election results available yet' });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Loaded ${totalConstituencies} constituencies. ${declaredCount} results declared.` 
        });
      }

    } catch (error) {
      console.error('Error loading results:', error);
      setMessage({ type: 'error', text: '❌ Error loading results: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voter-container">
      <div className="voter-header">
        <button onClick={() => navigate('/voter/dashboard')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>📊 All Election Results</h1>
      </div>

      <div className="voter-content">
        {message.text && (
          <div className={`message ${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '1.2rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
            Loading all results...
          </div>
        )}

        {!loading && Object.keys(allResults).length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            background: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📊</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No Results Available</h3>
            <p style={{ color: '#999' }}>Results will appear here after elections are conducted</p>
          </div>
        )}

        {!loading && Object.keys(allResults).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {provinces.map((province) => (
              <div key={province}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {allResults[province]?.map((result, index) => (
                    <div 
                      key={index} 
                      className="voter-card"
                      style={{ 
                        border: result.isDeclared ? '2px solid #28a745' : '2px solid #ffc107',
                        background: result.isDeclared ? '#f8fff9' : '#fffef5',
                        padding: '15px'
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
                        <div>
                          <h3 style={{ margin: '0', color: '#333', fontSize: '1.1rem' }}>
                            {result.constituency}
                          </h3>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {result.isDeclared && (
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                              Votes: <strong>{result.totalVotes}</strong>
                            </span>
                          )}
                          {result.isDeclared ? (
                            <span style={{ 
                              background: '#28a745', 
                              color: 'white', 
                              padding: '4px 10px', 
                              borderRadius: '5px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}>
                              ✅ Declared
                            </span>
                          ) : (
                            <span style={{ 
                              background: '#ffc107', 
                              color: '#856404', 
                              padding: '4px 10px', 
                              borderRadius: '5px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}>
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {!result.isDeclared ? (
                        // PENDING - Show waiting message
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '40px 20px',
                          background: '#fff3cd',
                          borderRadius: '10px',
                          border: '2px solid #ffc107'
                        }}>
                          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⏳</div>
                          <h3 style={{ color: '#856404', margin: '0 0 10px 0' }}>
                            Result Not Yet Declared
                          </h3>
                          <p style={{ color: '#856404', margin: 0, fontSize: '0.95rem' }}>
                            Voting may still be in progress or results are being processed.
                            <br />
                            Please check back later for the final results.
                          </p>
                        </div>
                      ) : (
                        // DECLARED - Show full results
                        <>
                          <ul style={{ 
                            listStyle: 'none', 
                            padding: 0, 
                            margin: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            {result.candidates.map((candidate, cIndex) => {
                              const isWinner = result.winner === candidate.id;
                              const maxVotes = result.candidates[0]?.votes || 0;
                              const isTied = result.isDraw && candidate.votes === maxVotes;
                              const percentage = result.totalVotes > 0 
                                ? ((candidate.votes / result.totalVotes) * 100).toFixed(1) 
                                : 0;

                              return (
                                <li 
                                  key={candidate.id}
                                  style={{
                                    padding: '10px 12px',
                                    background: isWinner ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' : 
                                               isTied ? 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' :
                                               cIndex % 2 === 0 ? '#f8f9fa' : 'white',
                                    borderRadius: '6px',
                                    border: isWinner ? '2px solid #28a745' : 
                                           isTied ? '2px solid #ffc107' :
                                           '1px solid #e9ecef',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    minHeight: '60px',
                                    maxHeight: '60px'
                                  }}
                                >
                                  <div style={{ 
                                    fontSize: '1.5rem', 
                                    minWidth: '40px', 
                                    textAlign: 'center'
                                  }}>
                                    {isTied ? '⚖️' :
                                     isWinner ? '🥇' :
                                     cIndex === 1 && candidate.votes > 0 ? '🥈' :
                                     cIndex === 2 && candidate.votes > 0 ? '🥉' :
                                     cIndex + 1}
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                      fontSize: '1rem', 
                                      fontWeight: 'bold',
                                      color: isWinner ? '#155724' : isTied ? '#856404' : '#333',
                                      marginBottom: '3px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {candidate.name} {isWinner && '🏆'} {isTied && '⚖️'}
                                    </div>
                                    <div style={{ 
                                      display: 'flex', 
                                      gap: '10px', 
                                      alignItems: 'center',
                                      fontSize: '0.85rem'
                                    }}>
                                      <span style={{
                                        background: '#6c757d',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem'
                                      }}>
                                        {candidate.party}
                                      </span>
                                      <span style={{ color: '#888', fontSize: '0.8rem' }}>
                                        {candidate.cnic}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ 
                                    textAlign: 'right',
                                    minWidth: '80px'
                                  }}>
                                    <div style={{ 
                                      fontSize: '1.4rem', 
                                      fontWeight: 'bold',
                                      color: isWinner ? '#28a745' : isTied ? '#ffc107' : '#333',
                                      lineHeight: '1.2'
                                    }}>
                                      {candidate.votes}
                                    </div>
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#666'
                                    }}>
                                      {percentage}%
                                    </div>
                                  </div>

                                  <div style={{ minWidth: '120px' }}>
                                    <div style={{ 
                                      background: '#e9ecef', 
                                      borderRadius: '8px', 
                                      height: '16px', 
                                      overflow: 'hidden'
                                    }}>
                                      <div style={{
                                        background: isWinner ? 'linear-gradient(90deg, #28a745, #20c997)' :
                                                  isTied ? 'linear-gradient(90deg, #ffc107, #ffb700)' :
                                                  cIndex === 1 ? 'linear-gradient(90deg, #17a2b8, #138496)' :
                                                  'linear-gradient(90deg, #6c757d, #5a6268)',
                                        height: '100%',
                                        width: `${percentage}%`,
                                        transition: 'width 0.5s ease',
                                        borderRadius: '8px',
                                        minWidth: percentage > 0 ? '2px' : '0'
                                      }}></div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>

                          {/* Winner/Draw Info */}
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '10px', 
                            background: result.isDraw ? '#fff3cd' : '#d4edda',
                            borderRadius: '6px',
                            border: result.isDraw ? '2px solid #ffc107' : '1px solid #28a745',
                            textAlign: 'center',
                            fontSize: '0.9rem'
                          }}>
                            {result.isDraw ? (
                              <strong style={{ color: '#856404' }}>
                                ⚖️ DRAW - {result.candidates.filter(c => c.votes === result.candidates[0].votes).length} candidates tied with {result.candidates[0].votes} votes each
                              </strong>
                            ) : (
                              <strong style={{ color: '#155724' }}>
                                🏆 Winner: {result.candidates.find(c => c.id === result.winner)?.name}
                              </strong>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewResults;