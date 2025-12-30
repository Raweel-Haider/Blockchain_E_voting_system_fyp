// src/components/Admin/CandidateManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';
import { parseBlockchainError, validateInputs } from '../../utils/errorHandler';
import './css/Management.css';

const CandidateManagement = () => {
  const [formData, setFormData] = useState({
    cnic: '',
    name: '',
    province: '',
    constituency: '',
    party: ''
  });
  const [provinces, setProvinces] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [parties, setParties] = useState([]);
  const [candidates, setCandidates] = useState([]);
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
    loadData();
  }, [account]);

  useEffect(() => {
    if (formData.province) {
      loadConstituencies(formData.province);
    }
  }, [formData.province]);

  const loadData = async () => {
    try {
      const geoContract = await getContract('GeographicManagement');
      const partyContract = await getContract('PartyManagement');
      
      const provinceList = await geoContract.viewProvinces();
      const partyList = await partyContract.viewParties();
      
      setProvinces(provinceList);
      setParties(partyList);
      
      await loadAllCandidates();
    } catch (error) {
      console.error('Error loading data:', error);
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

  const loadAllCandidates = async () => {
    try {
      const candidateContract = await getContract('CandidateManagement');
      const count = await candidateContract.getCandidateCount();
      const candidateList = [];
      
      for (let i = 1; i <= Number(count); i++) {
        try {
          const candidate = await candidateContract.viewCandidate(i);
          candidateList.push({
            id: Number(candidate[0]),
            cnic: candidate[1].toString(),
            name: candidate[2],
            province: candidate[3],
            constituency: candidate[4],
            party: candidate[5]
          });
        } catch (err) {
          continue;
        }
      }
      
      setCandidates(candidateList);
    } catch (error) {
      console.error('Error loading candidates:', error);
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

  const handleRegisterCandidate = async () => {
    // Validate all fields
    const errors = [];
    
    const cnicError = validateInputs.cnic(formData.cnic);
    if (cnicError) errors.push(cnicError);
    
    const nameError = validateInputs.name(formData.name);
    if (nameError) errors.push(nameError);
    
    if (!formData.province) errors.push('Province is required');
    if (!formData.constituency) errors.push('Constituency is required');
    if (!formData.party) errors.push('Party is required');
    
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
        await votingMachine.admin_registerCandidate.estimateGas(
          cnic, password,
          formData.cnic,
          formData.name.trim(),
          formData.province,
          formData.constituency,
          formData.party
        );
      } catch (gasError) {
        throw gasError;
      }

      const tx = await votingMachine.admin_registerCandidate(
        cnic, password,
        formData.cnic,
        formData.name.trim(),
        formData.province,
        formData.constituency,
        formData.party
      );
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Candidate registered successfully!' });
      setFormData({ cnic: '', name: '', province: '', constituency: '', party: '' });
      await loadAllCandidates();
    } catch (error) {
      const friendlyError = parseBlockchainError(error);
      setMessage({ type: 'error', text: friendlyError });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCandidate = async (candidateId) => {
    if (!window.confirm('Remove this candidate?')) return;

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
        await votingMachine.admin_removeCandidate.estimateGas(cnic, password, candidateId);
      } catch (gasError) {
        throw gasError;
      }

      const tx = await votingMachine.admin_removeCandidate(cnic, password, candidateId);
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Candidate removed successfully!' });
      await loadAllCandidates();
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
        <h1>👤 Candidate Management</h1>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.text}</pre>
        </div>
      )}

      <div className="management-card">
        <h3>Register New Candidate</h3>
        <div className="form-grid">
          <input
            type="text"
            placeholder="CNIC (e.g., 3520012345671)"
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
          <select
            value={formData.party}
            onChange={(e) => setFormData({...formData, party: e.target.value})}
            className="input-field"
          >
            <option value="">Select Party</option>
            {parties.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRegisterCandidate}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Registering...' : 'Register Candidate'}
        </button>
      </div>

      <div className="data-display">
        <h2>Registered Candidates ({candidates.length})</h2>
        {candidates.length === 0 ? (
          <p className="no-data">No candidates registered yet</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CNIC</th>
                  <th>Name</th>
                  <th>Province</th>
                  <th>Constituency</th>
                  <th>Party</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>{candidate.id}</td>
                    <td>{candidate.cnic}</td>
                    <td>{candidate.name}</td>
                    <td>{candidate.province}</td>
                    <td>{candidate.constituency}</td>
                    <td><span className="party-badge">{candidate.party}</span></td>
                    <td>
                      <button
                        onClick={() => handleRemoveCandidate(candidate.id)}
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

export default CandidateManagement;