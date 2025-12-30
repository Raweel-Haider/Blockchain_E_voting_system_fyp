// src/components/Admin/ResultsManagement.jsx - FIXED: Allow re-declaration after reset
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';
import './css/Management.css';

const ResultsManagement = () => {
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [constituencies, setConstituencies] = useState([]);
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [voteCounts, setVoteCounts] = useState({});
  const [totalVoterCount, setTotalVoterCount] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  const [winner, setWinner] = useState(null);
  const [isDeclared, setIsDeclared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [votingStatus, setVotingStatus] = useState({ active: false, endTime: 0, currentTime: 0 });
  const [adminCredentials, setAdminCredentials] = useState(null);

  const { account, getContract, connectWallet } = useBlockchain();
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdmin');
    if (!isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    loadProvinces();
    loadVotingStatus();
    
    const interval = setInterval(loadVotingStatus, 5000);
    return () => clearInterval(interval);
  }, [account]);

  useEffect(() => {
    if (selectedProvince) {
      loadConstituencies(selectedProvince);
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedProvince && selectedConstituency) {
      // ✅ Auto-load whenever constituency changes (no manual reload needed)
      loadConstituencyData();
    }
  }, [selectedProvince, selectedConstituency, votingStatus]); // ✅ Also reload when voting status changes

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

  const loadProvinces = async () => {
    try {
      const geoContract = await getContract('GeographicManagement');
      const provinceList = await geoContract.viewProvinces();
      setProvinces(provinceList);
    } catch (error) {
      console.error('Error loading provinces:', error);
    }
  };

  const loadConstituencies = async (province) => {
    try {
      const geoContract = await getContract('GeographicManagement');
      const consts = await geoContract.viewConstituenciesByProvince(province);
      setConstituencies(consts);
      setSelectedConstituency('');
    } catch (error) {
      console.error('Error loading constituencies:', error);
    }
  };

  const loadConstituencyData = async () => {
    try {
      setMessage({ type: 'info', text: 'Loading constituency data...' });

      const candidateContract = await getContract('CandidateManagement');
      const filter = candidateContract.filters.CandidateRegistered();
      const events = await candidateContract.queryFilter(filter);

      const allCandidateIds = events.map(event => Number(event.args.candidateId));

      const candidateDetails = await Promise.all(
        allCandidateIds.map(async (id) => {
          try {
            const candidate = await candidateContract.viewCandidate(id);
            const candidateProvince = candidate[3];
            const candidateConstituency = candidate[4];

            if (candidateProvince === selectedProvince && candidateConstituency === selectedConstituency) {
              return {
                id: Number(candidate[0]),
                cnic: candidate[1].toString(),
                name: candidate[2],
                province: candidate[3],
                constituency: candidate[4],
                party: candidate[5]
              };
            }
            return null;
          } catch (error) {
            return null;
          }
        })
      );

      const validCandidates = candidateDetails.filter(c => c !== null);
      setCandidates(validCandidates);

      if (validCandidates.length === 0) {
        setMessage({ type: 'warning', text: 'No candidates in this constituency' });
        return;
      }

      // ✅ FIX: Check if results already declared for THIS election cycle
      const votingMachine = await getContract('VotingMachine');
      
      try {
        const winnerData = await votingMachine.getWinner(selectedProvince, selectedConstituency);
        
        // ✅ CRITICAL: Check isDeclared flag (index 2)
        const isDeclaredOnBlockchain = Boolean(winnerData[2]);
        
        if (isDeclaredOnBlockchain) {
          // Results ARE declared on blockchain
          const resultsData = await votingMachine.getResults(selectedProvince, selectedConstituency);
          
          const results = {};
          validCandidates.forEach((candidate, index) => {
            results[candidate.id] = Number(resultsData[1][index] || 0);
          });
          setVoteCounts(results);
          setIsDeclared(true);
          
          // ✅ Check if winner exists (winnerId > 0) or if it's a draw (winnerId = 0)
          const winnerId = Number(winnerData[0]);
          const winnerCandidate = winnerId > 0 
            ? validCandidates.find(c => c.id === winnerId) 
            : null;
          
          setWinner(winnerCandidate);
          
          await calculateVoterStats();
          
          console.log(`✅ ${selectedConstituency}, ${selectedProvince}: Already declared. WinnerId=${winnerId}, IsWinner=${winnerCandidate ? 'Yes' : 'Draw'}`);
          
          // ✅ Show appropriate message
          if (winnerCandidate) {
            setMessage({ 
              type: 'success', 
              text: `✅ Result Already Declared\n\n🏆 Winner: ${winnerCandidate.name} (${winnerCandidate.party})\n\n⚠️ Results are final and cannot be changed or re-declared for this election.\n\n💡 To conduct new election: Reset system from Voting Control` 
            });
          } else {
            // winnerId = 0 means DRAW was officially declared
            setMessage({ 
              type: 'success', 
              text: `✅ Result Already Declared\n\n⚖️ DRAW - Multiple candidates tied with equal votes\n\n⚠️ Results are final and cannot be changed or re-declared for this election.\n\n💡 To conduct new election: Reset system from Voting Control` 
            });
          }
          return;
        }
      } catch (error) {
        // ✅ No results found means fresh slate - allow declaration
        console.log(`⏳ ${selectedConstituency}, ${selectedProvince}: Not declared yet (${error.message})`);
      }
      
      // ✅ Not declared - fresh state - AUTO LOAD vote counts if voting ended
      setWinner(null);
      setIsDeclared(false);
      
      if (votingStatus.active) {
        setVoteCounts({});
        setMessage({ type: 'info', text: '⏳ Voting is currently active. Wait for voting to end.' });
      } else if (votingStatus.endTime > 0) {
        // ✅ AUTO-LOAD vote counts when voting has ended
        setMessage({ type: 'info', text: '🔄 Auto-loading vote counts from blockchain...' });
        await handleLoadVoteCounts();
      } else {
        setVoteCounts({});
        setMessage({ type: 'info', text: '📊 No election conducted yet. Start voting first.' });
      }
      
    } catch (error) {
      console.error('Error loading constituency data:', error);
      setMessage({ type: 'error', text: 'Error loading data: ' + error.message });
    }
  };

  const calculateVoterStats = async () => {
    try {
      const voterContract = await getContract('VoterManagement');
      const filter = voterContract.filters.VoterRegistered();
      const events = await voterContract.queryFilter(filter);
      const allVoterCnics = [...new Set(events.map(event => event.args.cnic.toString()))];

      let constituencyVoters = 0;
      let constituencyVoted = 0;

      for (const cnic of allVoterCnics) {
        try {
          const voter = await voterContract.viewVoter(cnic);
          const voterProvince = voter[2];
          const voterConstituency = voter[3];
          const hasVoted = voter[4];
          const isRegistered = voter[5];

          if (isRegistered && 
              voterProvince === selectedProvince && 
              voterConstituency === selectedConstituency) {
            constituencyVoters++;
            if (hasVoted) constituencyVoted++;
          }
        } catch (error) {
          console.warn(`⚠️ Error checking voter ${cnic}`);
        }
      }

      setTotalVoterCount(constituencyVoters);
      setVotedCount(constituencyVoted);
    } catch (error) {
      console.error('Error calculating voter stats:', error);
    }
  };

  const getAdminCredentials = () => {
    if (adminCredentials) {
      return adminCredentials;
    }
    
    const cnic = prompt('Enter Admin CNIC:');
    const password = prompt('Enter Admin Password:');
    
    if (!cnic || !password) {
      throw new Error('Credentials required');
    }
    
    const credentials = { cnic, password };
    setAdminCredentials(credentials);
    return credentials;
  };

  const handleLoadVoteCounts = async () => {
    if (votingStatus.active) {
      setMessage({ type: 'warning', text: '⏳ Cannot load vote counts while voting is active' });
      return;
    }

    setLoadingVotes(true);

    try {
      const votingProcess = await getContract('VotingProcess');
      const voterContract = await getContract('VoterManagement');

      const filter = voterContract.filters.VoterRegistered();
      const events = await voterContract.queryFilter(filter);
      const allVoterCnics = [...new Set(events.map(event => event.args.cnic.toString()))];

      const counts = {};
      candidates.forEach(c => counts[c.id] = 0);

      let constituencyVoters = 0;
      let constituencyVoted = 0;

      for (const cnic of allVoterCnics) {
        try {
          const voter = await voterContract.viewVoter(cnic);
          const voterProvince = voter[2];
          const voterConstituency = voter[3];
          const hasVoted = voter[4];
          const isRegistered = voter[5];

          if (isRegistered && 
              voterProvince === selectedProvince && 
              voterConstituency === selectedConstituency) {
            constituencyVoters++;
            
            if (hasVoted) {
              constituencyVoted++;
              
              try {
                const votedForCandidateId = await votingProcess.getVoterVote(cnic);
                const candidateId = Number(votedForCandidateId);
                
                if (candidateId > 0 && counts[candidateId] !== undefined) {
                  counts[candidateId]++;
                }
              } catch (error) {
                console.warn(`Could not get vote for voter ${cnic}`);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error checking voter ${cnic}`);
        }
      }

      setVoteCounts(counts);
      setTotalVoterCount(constituencyVoters);
      setVotedCount(constituencyVoted);

      const totalVotes = Object.values(counts).reduce((sum, v) => sum + v, 0);
      
      setMessage({ 
        type: 'success', 
        text: `✅ Vote counting complete!\n\n📊 ${constituencyVoted} votes cast by ${constituencyVoters} registered voters\n📈 Total counted: ${totalVotes} votes\n\n👉 Review results and click "Declare Result" to finalize` 
      });

    } catch (error) {
      console.error('Error loading votes:', error);
      setMessage({ type: 'error', text: '❌ Error: ' + (error.reason || error.message) });
    } finally {
      setLoadingVotes(false);
    }
  };

  const handleDeclareWinner = async () => {
    // ✅ CRITICAL: Check if THIS SPECIFIC CONSTITUENCY is already declared
    // Note: We check per-constituency, not global - each constituency declares separately
    if (isDeclared) {
      setMessage({ 
        type: 'error', 
        text: `❌ RESULT ALREADY DECLARED\n\nConstituency: ${selectedConstituency}, ${selectedProvince}\n\nThis specific constituency already has declared results for the current election cycle.\n\n⛔ Results CANNOT be changed or re-declared for the same election.\n⛔ Each constituency can be declared only ONCE per election.\n\n👉 To conduct a NEW election:\n   1. Go to Voting Control\n   2. Click "Reset for New Election"\n   3. This will clear ALL constituency results\n   4. Start new voting period\n   5. Then declare results for each constituency again` 
      });
      return;
    }

    // ✅ DOUBLE CHECK: Verify THIS CONSTITUENCY on blockchain before proceeding
    try {
      const votingMachine = await getContract('VotingMachine');
      const winnerData = await votingMachine.getWinner(selectedProvince, selectedConstituency);
      
      if (winnerData[2]) { // isDeclared = true for THIS constituency
        setIsDeclared(true); // Update local state for THIS constituency
        
        // Check if it's a draw or has winner
        const winnerId = Number(winnerData[0]);
        const winnerCandidate = winnerId > 0 
          ? candidates.find(c => c.id === winnerId) 
          : null;
        
        setWinner(winnerCandidate);
        
        setMessage({ 
          type: 'error', 
          text: `❌ RESULT ALREADY DECLARED ON BLOCKCHAIN\n\nConstituency: ${selectedConstituency}, ${selectedProvince}\n${winnerCandidate ? `🏆 Winner: ${winnerCandidate.name} (${winnerCandidate.party})` : '⚖️ Draw - Multiple candidates tied'}\n\n⛔ This constituency already has results on blockchain.\n⛔ Duplicate declaration is NOT ALLOWED.\n⛔ Each constituency declares only ONCE per election.\n\n💡 Other constituencies can still be declared separately.\n\n👉 To conduct a NEW election:\n   1. Go to Voting Control\n   2. Click "Reset for New Election"\n   3. This clears ALL constituency results\n   4. Then declare all constituencies again` 
        });
        return;
      }
    } catch (error) {
      // No results on blockchain for THIS constituency yet - proceed with declaration
      console.log(`No blockchain results yet for ${selectedConstituency}, ${selectedProvince} - proceeding`);
    }

    if (votingStatus.active) {
      setMessage({ type: 'error', text: '❌ Cannot declare results while voting is active. Stop voting first.' });
      return;
    }

    if (Object.keys(voteCounts).length === 0) {
      setMessage({ type: 'error', text: '❌ No vote data. Click "Load Vote Counts" first.' });
      return;
    }

    const sortedCandidates = candidates
      .map(c => ({ ...c, votes: voteCounts[c.id] || 0 }))
      .sort((a, b) => b.votes - a.votes);

    const topVotes = sortedCandidates[0]?.votes || 0;
    const topCandidates = sortedCandidates.filter(c => c.votes === topVotes);

    let resultMessage = '';
    let isDraw = false;
    
    if (topVotes === 0) {
      isDraw = true;
      resultMessage = `📊 DRAW - NO VOTES CAST\n\nAll candidates: 0 votes`;
    } else if (topCandidates.length > 1) {
      isDraw = true;
      resultMessage = `⚖️ DRAW - TIE SITUATION\n\n${topCandidates.length} candidates tied with ${topVotes} vote${topVotes > 1 ? 's' : ''}`;
    } else {
      const winner = sortedCandidates[0];
      resultMessage = `🏆 WINNER\n\n${winner.name} (${winner.party})\n${winner.votes} vote${winner.votes > 1 ? 's' : ''}`;
    }

    const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + v, 0);
    const turnout = totalVoterCount > 0 ? ((totalVotes / totalVoterCount) * 100).toFixed(1) : 0;

    const confirmMessage = `Declare Result for ${selectedConstituency}, ${selectedProvince}?\n\n${resultMessage}\n\n📊 Total: ${totalVotes} votes\n📋 Voters: ${totalVoterCount}\n📈 Turnout: ${turnout}%\n\n⚠️ This is FINAL and CANNOT be changed for this election!\n⚠️ Results will be publicly visible!\n⚠️ Cannot be re-declared until system is reset for new election!`;

    if (!window.confirm(confirmMessage)) return;

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

      setMessage({ type: 'info', text: '⏳ Submitting vote counts to blockchain...' });
      
      const candidateIds = candidates.map(c => c.id);
      const counts = candidates.map(c => voteCounts[c.id] || 0);
      
      const enterTx = await votingMachine.admin_enterVoteCounts(cnic, password, candidateIds, counts);
      await enterTx.wait();

      if (!isDraw) {
        setMessage({ type: 'info', text: '⏳ Declaring winner...' });
        
        try {
          const declareTx = await votingMachine.admin_declareWinner(cnic, password, selectedProvince, selectedConstituency);
          await declareTx.wait();
          
          const winnerCandidate = sortedCandidates[0];
          setWinner(winnerCandidate);
          setMessage({ 
            type: 'success', 
            text: `✅ WINNER DECLARED!\n\n🏆 ${winnerCandidate.name} (${winnerCandidate.party})\n📊 ${winnerCandidate.votes} vote${winnerCandidate.votes > 1 ? 's' : ''}\n\n✨ Results are now public!\n⚠️ Results are final for this election!\n\n💡 To conduct new election: Reset system from Voting Control` 
          });
        } catch (declareError) {
          console.warn('Declare winner failed (likely a draw):', declareError);
          setMessage({ 
            type: 'success', 
            text: `✅ DRAW RESULT SAVED!\n\n${resultMessage}\n\n✨ Results are now public!\n⚠️ Results are final for this election!\n\n💡 To conduct new election: Reset system from Voting Control` 
          });
        }
      } else {
        setMessage({ 
          type: 'success', 
          text: `✅ DRAW RESULT SAVED!\n\n${resultMessage}\n\n✨ Results are now public!\n⚠️ Results are final for this election!\n\n💡 To conduct new election: Reset system from Voting Control` 
        });
      }

      // ✅ Mark as declared for current election
      setIsDeclared(true);
      setAdminCredentials(null);

    } catch (error) {
      console.error('Error declaring result:', error);
      
      let errorMsg = error.message || 'Unknown error';
      
      if (errorMsg.includes('Result already declared')) {
        errorMsg = '❌ RESULT ALREADY DECLARED\n\nThis constituency already has declared results for this election cycle.\n\nResults cannot be re-declared.\n\n👉 To conduct new election: Reset system from Voting Control';
        setIsDeclared(true);
      } else if (errorMsg.includes('Voting is active') || errorMsg.includes('still in progress')) {
        errorMsg = '❌ Cannot declare results while voting is active';
      } else if (errorMsg.includes('missing revert data')) {
        errorMsg = '❌ Transaction failed. Possible reasons:\n• Result may already be declared\n• Check if voting has ended\n• Verify admin credentials are correct';
      }
      
      setMessage({ type: 'error', text: errorMsg });
      setAdminCredentials(null);
    } finally {
      setLoading(false);
    }
  };

  const getVotePercentage = (votes) => {
    const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + v, 0);
    if (totalVotes === 0) return '0.0';
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  const getProgressWidth = (votes) => {
    const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + v, 0);
    if (totalVotes === 0) return 0;
    return ((votes / totalVotes) * 100).toFixed(1);
  };

  const getTurnoutPercentage = () => {
    if (totalVoterCount === 0) return 0;
    return ((votedCount / totalVoterCount) * 100).toFixed(1);
  };

  const votingHasEnded = () => {
    return !votingStatus.active && votingStatus.endTime > 0;
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          ← Back
        </button>
        <h1>📊 Results Management</h1>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{message.text}</pre>
        </div>
      )}

      {votingStatus.active && (
        <div style={{ 
          background: '#fff3cd', 
          border: '2px solid #ffc107', 
          padding: '15px 20px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>⏳ Voting is Currently Active</h3>
          <p style={{ margin: 0, color: '#856404' }}>
            Results cannot be declared until voting ends.
          </p>
        </div>
      )}

      {votingHasEnded() && !isDeclared && (
        <div style={{ 
          background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)', 
          border: '2px solid #28a745', 
          padding: '15px 20px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Voting Period Ended</h3>
          <p style={{ margin: 0, color: '#155724' }}>
            All votes recorded on blockchain. Load counts and declare results.
          </p>
        </div>
      )}

      <div className="management-card">
        <h3>Select Constituency</h3>
        <div className="form-inline">
          <select
            value={selectedProvince}
            onChange={(e) => {
              setSelectedProvince(e.target.value);
              setWinner(null);
              setIsDeclared(false);
              setVoteCounts({});
              setAdminCredentials(null);
            }}
            className="input-field"
          >
            <option value="">Select Province</option>
            {provinces.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={selectedConstituency}
            onChange={(e) => {
              setSelectedConstituency(e.target.value);
              setWinner(null);
              setIsDeclared(false);
              setVoteCounts({});
              setAdminCredentials(null);
            }}
            className="input-field"
            disabled={!selectedProvince}
          >
            <option value="">Select Constituency</option>
            {constituencies.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedProvince && selectedConstituency && candidates.length > 0 && (
        <>
          <div className="management-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📊 {isDeclared ? 'Final' : 'Current'} Statistics</h3>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>{totalVoterCount}</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Registered Voters</div>
              </div>
              <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388e3c' }}>{votedCount}</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Votes Cast</div>
              </div>
              <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>{totalVoterCount - votedCount}</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Did Not Vote</div>
              </div>
              <div style={{ background: '#f3e5f5', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7b1fa2' }}>{getTurnoutPercentage()}%</div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Turnout</div>
              </div>
            </div>
          </div>

          <div className="management-card">
            <h3>🗳️ {isDeclared ? 'Final Results' : 'Vote Count'}</h3>
            
            {!votingHasEnded() && !isDeclared && (
              <div style={{ 
                background: '#fff3cd', 
                padding: '30px', 
                borderRadius: '10px', 
                textAlign: 'center',
                border: '2px solid #ffc107'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
                <h3 style={{ color: '#856404', margin: '0 0 10px 0' }}>
                  {votingStatus.active ? 'Voting In Progress' : 'No Election Data'}
                </h3>
                <p style={{ color: '#856404', margin: 0 }}>
                  {votingStatus.active 
                    ? 'Results will be available after voting ends'
                    : 'Start voting to begin election'}
                </p>
              </div>
            )}

            {votingHasEnded() && Object.keys(voteCounts).length > 0 && (
              <>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Candidate</th>
                        <th>Party</th>
                        <th>Votes</th>
                        <th>%</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates
                        .map(c => ({ ...c, votes: voteCounts[c.id] || 0 }))
                        .sort((a, b) => b.votes - a.votes)
                        .map((candidate, index) => {
                          const allCandidates = candidates.map(c => ({ ...c, votes: voteCounts[c.id] || 0 }));
                          const maxVotes = Math.max(...allCandidates.map(c => c.votes));
                          const isTop = candidate.votes === maxVotes && maxVotes > 0;
                          const topCount = allCandidates.filter(c => c.votes === maxVotes).length;
                          
                          const percentage = getVotePercentage(candidate.votes);
                          const progressWidth = getProgressWidth(candidate.votes);

                          return (
                            <tr key={candidate.id} className={isTop && topCount === 1 && isDeclared ? 'winner-row' : ''}>
                              <td>
                                <div style={{ fontSize: '1.5rem' }}>
                                  {maxVotes === 0 ? '⚖️' :
                                    isTop && topCount > 1 ? '⚖️' :
                                      index === 0 ? '🥇' :
                                        index === 1 ? '🥈' :
                                          index === 2 ? '🥉' :
                                            index + 1}
                                </div>
                              </td>
                              <td><strong>{candidate.name}</strong></td>
                              <td><span className="party-badge">{candidate.party}</span></td>
                              <td>
                                <strong style={{
                                  fontSize: '1.3rem',
                                  color: isTop && candidate.votes > 0 ? '#28a745' : '#333'
                                }}>
                                  {candidate.votes}
                                </strong>
                              </td>
                              <td><strong>{percentage}%</strong></td>
                              <td>
                                <div style={{ background: '#e9ecef', borderRadius: '10px', height: '25px', overflow: 'hidden', minWidth: '150px' }}>
                                  <div style={{
                                    background: isTop && candidate.votes > 0 ? 'linear-gradient(90deg, #28a745, #20c997)' :
                                      index === 1 ? 'linear-gradient(90deg, #17a2b8, #138496)' :
                                        'linear-gradient(90deg, #6c757d, #5a6268)',
                                    height: '100%',
                                    width: `${progressWidth}%`,
                                    transition: 'width 0.5s',
                                    borderRadius: '10px',
                                    minWidth: progressWidth > 0 ? '2px' : '0'
                                  }}></div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {!isDeclared && (
                  <button
                    onClick={handleDeclareWinner}
                    disabled={loading}
                    className="btn-success"
                    style={{ marginTop: '20px', width: '100%', padding: '15px', fontSize: '1.1rem' }}
                  >
                    {loading ? '⏳ Processing...' : '🏆 Declare Result'}
                  </button>
                )}

                {isDeclared && winner && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)', 
                    padding: '20px', 
                    borderRadius: '10px', 
                    marginTop: '20px', 
                    textAlign: 'center', 
                    border: '3px solid #28a745' 
                  }}>
                    <h3 style={{ color: '#155724', margin: '0 0 10px 0' }}>🏆 Winner Declared</h3>
                    <p style={{ color: '#155724', fontSize: '1.1rem', margin: 0 }}>
                      {winner.name} ({winner.party}) - {voteCounts[winner.id]} votes
                      <br />
                      <small>Results are final for this election. Reset system for new election.</small>
                    </p>
                  </div>
                )}

                {isDeclared && !winner && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)', 
                    padding: '20px', 
                    borderRadius: '10px', 
                    marginTop: '20px', 
                    textAlign: 'center', 
                    border: '3px solid #ffc107' 
                  }}>
                    <h3 style={{ color: '#856404', margin: '0 0 10px 0' }}>⚖️ Draw Result Declared</h3>
                    <p style={{ color: '#856404', fontSize: '1.1rem', margin: 0 }}>
                      Multiple candidates tied with equal votes
                      <br />
                      <small>Results are final for this election. Reset system for new election.</small>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {selectedProvince && selectedConstituency && candidates.length === 0 && (
        <div className="info-card">
          <p>❌ No candidates registered in this constituency</p>
        </div>
      )}

      <div className="info-card">
        <h3>ℹ️ How It Works - Per-Constituency Declaration</h3>
        <ul>
          <li><strong>Step 1:</strong> Select province and constituency</li>
          <li><strong>Step 2:</strong> Wait for voting to end (or stop it manually)</li>
          <li><strong>Step 3:</strong> ✅ Vote counts load AUTOMATICALLY after voting ends</li>
          <li><strong>Step 4:</strong> Review the vote counts and percentages</li>
          <li><strong>Step 5:</strong> Click "Declare Result" to finalize (one-time admin auth)</li>
          <li><strong>📍 Per-Constituency:</strong> Each constituency is declared SEPARATELY</li>
          <li><strong>✅ Independent:</strong> Declaring Constituency-A does NOT affect Constituency-B</li>
          <li><strong>⚠️ Once Per Election:</strong> Each constituency can be declared ONCE per election cycle</li>
          <li><strong>⚠️ Final:</strong> Once declared, that constituency's results are locked for current election</li>
          <li><strong>🔄 After Reset:</strong> "Reset for New Election" clears ALL constituencies:</li>
          <li style={{ paddingLeft: '20px' }}>• Clears all constituency results (allows re-declaration)</li>
          <li style={{ paddingLeft: '20px' }}>• Resets all voter voting status (hasVoted = false)</li>
          <li style={{ paddingLeft: '20px' }}>• Keeps voter accounts & passwords intact</li>
          <li style={{ paddingLeft: '20px' }}>• Prepares system for fresh election cycle</li>
          <li><strong>✅ New Election:</strong> After reset, ALL constituencies can be declared again</li>
          <li><strong>🎯 Workflow Example:</strong></li>
          <li style={{ paddingLeft: '20px' }}>1. Declare NA-1 → ✅ Success</li>
          <li style={{ paddingLeft: '20px' }}>2. Try declare NA-1 again → ❌ Blocked</li>
          <li style={{ paddingLeft: '20px' }}>3. Declare NA-2 → ✅ Success (independent)</li>
          <li style={{ paddingLeft: '20px' }}>4. Reset for new election → 🔄 Clears all</li>
          <li style={{ paddingLeft: '20px' }}>5. Declare NA-1 again → ✅ Success (new election)</li>
          <li><strong>Credentials:</strong> Admin credentials asked only ONCE per session</li>
          <li><strong>🔄 Auto-Refresh:</strong> Data automatically reloads when you select different constituency</li>
        </ul>
      </div>
    </div>
  );
};

export default ResultsManagement;