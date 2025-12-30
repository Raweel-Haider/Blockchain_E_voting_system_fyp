// src/components/Admin/VoterManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';
import { parseBlockchainError, validateInputs } from '../../utils/errorHandler';
import './css/Management.css';

const VoterManagement = () => {
  const [formData, setFormData] = useState({
    cnic: '',
    name: '',
    province: '',
    constituency: '',
    password: ''
  });
  const [provinces, setProvinces] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [voterCount, setVoterCount] = useState(0);
  const [searchCnic, setSearchCnic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingVoters, setLoadingVoters] = useState(false);
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
    loadData();
  }, [account]);

  useEffect(() => {
    if (formData.province) {
      loadConstituencies(formData.province);
    }
  }, [formData.province]);

  useEffect(() => {
    // Filter voters based on search CNIC
    if (searchCnic.trim()) {
      const filtered = voters.filter(voter => 
        voter.cnic.includes(searchCnic.trim())
      );
      setFilteredVoters(filtered);
    } else {
      setFilteredVoters(voters);
    }
  }, [searchCnic, voters]);

  const loadData = async () => {
    try {
      const geoContract = await getContract('GeographicManagement');
      const voterContract = await getContract('VoterManagement');
      
      const provinceList = await geoContract.viewProvinces();
      setProvinces(provinceList);
      
      const count = await voterContract.getVoterCount();
      setVoterCount(Number(count));
      
      // Load all voters
      await loadAllVoters();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadAllVoters = async () => {
    setLoadingVoters(true);
    try {
      const voterContract = await getContract('VoterManagement');
      
      // Get all VoterRegistered events
      const filter = voterContract.filters.VoterRegistered();
      const events = await voterContract.queryFilter(filter);
      
      // Get unique CNICs from registration events
      const uniqueCnics = [...new Set(events.map(event => event.args.cnic.toString()))];
      
      // Fetch details for each voter and check if they're still registered
      const voterDetails = await Promise.all(
        uniqueCnics.map(async (cnic) => {
          try {
            const voter = await voterContract.viewVoter(cnic);
            
            // ✅ FIX: Only return voter if isRegistered is true
            // voter[5] is isRegistered field
            if (voter[5]) {
              return {
                cnic: voter[0].toString(),
                name: voter[1],
                province: voter[2],
                constituency: voter[3],
                hasVoted: voter[4],
                isRegistered: voter[5]
              };
            }
            return null;
          } catch (error) {
            // If viewVoter fails, voter doesn't exist or was deleted
            console.error(`Error loading voter ${cnic}:`, error);
            return null;
          }
        })
      );
      
      // ✅ FIX: Filter out null values (removed/non-existent voters)
      const validVoters = voterDetails.filter(voter => voter !== null);
      setVoters(validVoters);
      setFilteredVoters(validVoters);
      
    } catch (error) {
      console.error('Error loading voters:', error);
      setMessage({ 
        type: 'error', 
        text: '⚠️ Could not load voter list from blockchain' 
      });
    } finally {
      setLoadingVoters(false);
    }
  };

  const loadConstituencies = async (province) => {
    try {
      const geoContract = await getContract('GeographicManagement');
      const consts = await geoContract.viewConstituenciesByProvince(province);
      setConstituencies(consts);
    } catch (error) {
      console.error('Error loading constituencies:', error);
    }
  };

  const getAdminCredentials = () => {
    const cnic = prompt('Enter Admin CNIC:');
    const password = prompt('Enter Admin Password:');
    if (!cnic || !password) throw new Error('Credentials required');
    
    const cnicError = validateInputs.cnic(cnic);
    if (cnicError) throw new Error(cnicError);
    
    return { cnic, password };
  };

  const handleRegisterVoter = async () => {
    // Validate all fields
    const errors = [];
    
    const cnicError = validateInputs.cnic(formData.cnic);
    if (cnicError) errors.push(cnicError);
    
    const nameError = validateInputs.name(formData.name);
    if (nameError) errors.push(nameError);
    
    if (!formData.province) errors.push('Province is required');
    if (!formData.constituency) errors.push('Constituency is required');
    
    const passwordError = validateInputs.password(formData.password);
    if (passwordError) errors.push(passwordError);
    
    if (errors.length > 0) {
      setMessage({ type: 'error', text: errors.join('\n') });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { cnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      
      if (!wallet) {
        throw new Error('Failed to connect wallet');
      }

      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      // Try to estimate gas first
      try {
        await votingMachine.admin_registerVoter.estimateGas(
          cnic, password,
          formData.cnic,
          formData.name.trim(),
          formData.province,
          formData.constituency,
          formData.password
        );
      } catch (gasError) {
        throw gasError;
      }

      const tx = await votingMachine.admin_registerVoter(
        cnic, password,
        formData.cnic,
        formData.name.trim(),
        formData.province,
        formData.constituency,
        formData.password
      );
      
      setMessage({ type: 'info', text: '⏳ Transaction submitted. Waiting for confirmation...' });
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Voter registered successfully!' });
      setFormData({ cnic: '', name: '', province: '', constituency: '', password: '' });
      
      // ✅ FIX: Clear search when registering new voter
      setSearchCnic('');
      
      // Reload voters after short delay
      setTimeout(() => loadAllVoters(), 2000);
      await loadData();
    } catch (error) {
      const friendlyError = parseBlockchainError(error);
      setMessage({ type: 'error', text: friendlyError });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVoter = async (voterCnic) => {
    if (!window.confirm(`Remove voter with CNIC: ${voterCnic}?`)) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const { cnic: adminCnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      
      if (!wallet) {
        throw new Error('Failed to connect wallet');
      }

      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      // Try to estimate gas first
      try {
        await votingMachine.admin_removeVoter.estimateGas(adminCnic, password, voterCnic);
      } catch (gasError) {
        throw gasError;
      }

      const tx = await votingMachine.admin_removeVoter(adminCnic, password, voterCnic);
      
      setMessage({ type: 'info', text: '⏳ Transaction submitted. Waiting for confirmation...' });
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Voter removed successfully!' });
      
      // ✅ FIX: Immediately remove from local state for instant UI update
      setVoters(prevVoters => prevVoters.filter(v => v.cnic !== voterCnic));
      setFilteredVoters(prevFiltered => prevFiltered.filter(v => v.cnic !== voterCnic));
      
      // Reload data to ensure consistency
      setTimeout(() => loadAllVoters(), 2000);
      await loadData();
    } catch (error) {
      const friendlyError = parseBlockchainError(error);
      setMessage({ type: 'error', text: friendlyError });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="management-container">
      <div className="management-header">
        <button onClick={() => navigate('/admin/dashboard')} className="btn-back">
          ← Back
        </button>
        <h1>🗳️ Voter Management</h1>
        <div className="stat-badge">Total Voters: {voterCount}</div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.text}</pre>
        </div>
      )}

      {/* Register Voter */}
      <div className="management-card">
        <h3>Register New Voter</h3>
        <div className="form-grid">
          <input
            type="text"
            placeholder="CNIC (13 digits, e.g., 3520012345671)"
            value={formData.cnic}
            onChange={(e) => setFormData({...formData, cnic: e.target.value})}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="input-field"
          />
          <select
            value={formData.province}
            onChange={(e) => setFormData({...formData, province: e.target.value, constituency: ''})}
            className="input-field"
          >
            <option value="">Select Province</option>
            {provinces.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={formData.constituency}
            onChange={(e) => setFormData({...formData, constituency: e.target.value})}
            className="input-field"
            disabled={!formData.province}
          >
            <option value="">Select Constituency</option>
            {constituencies.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="password"
            placeholder="Voter Password (min 6 chars)"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="input-field"
          />
        </div>
        <button
          onClick={handleRegisterVoter}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Registering...' : 'Register Voter'}
        </button>
      </div>

      {/* All Voters List */}
      <div className="data-display">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>All Voters ({filteredVoters.length})</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by CNIC"
              value={searchCnic}
              onChange={(e) => setSearchCnic(e.target.value)}
              className="input-field"
              style={{ width: '200px', margin: 0 }}
            />
            <button 
              onClick={loadAllVoters} 
              disabled={loadingVoters}
              className="btn-primary"
              style={{ fontSize: '14px', padding: '8px 16px' }}
            >
              {loadingVoters ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        
        {loadingVoters ? (
          <p className="no-data">Loading voters from blockchain...</p>
        ) : filteredVoters.length === 0 ? (
          <p className="no-data">
            {searchCnic ? `No voters found with CNIC containing "${searchCnic}"` : 'No voters registered yet'}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CNIC</th>
                  <th>Name</th>
                  <th>Province</th>
                  <th>Constituency</th>
                  <th>Voted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVoters.map((voter, index) => (
                  <tr key={voter.cnic}>
                    <td>{index + 1}</td>
                    <td>{voter.cnic}</td>
                    <td>{voter.name}</td>
                    <td>{voter.province}</td>
                    <td>{voter.constituency}</td>
                    <td>
                      <span className={voter.hasVoted ? 'badge-success' : 'badge-pending'}>
                        {voter.hasVoted ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleRemoveVoter(voter.cnic)}
                        className="btn-danger-sm"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterManagement;