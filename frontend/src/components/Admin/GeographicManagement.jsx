// src/components/Admin/GeographicManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';
import './css/Management.css';

const GeographicManagement = () => {
  const [provinces, setProvinces] = useState([]);
  const [constituencies, setConstituencies] = useState({});
  const [selectedProvince, setSelectedProvince] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newConstituency, setNewConstituency] = useState('');
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

  const loadData = async () => {
    try {
      const geoContract = await getContract('GeographicManagement');
      const provinceList = await geoContract.viewProvinces();
      setProvinces(provinceList);

      const constData = {};
      for (const province of provinceList) {
        const consts = await geoContract.viewConstituenciesByProvince(province);
        constData[province] = consts;
      }
      setConstituencies(constData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getAdminCredentials = () => {
    const cnic = prompt('Enter Admin CNIC:');
    const password = prompt('Enter Admin Password:');
    if (!cnic || !password) throw new Error('Credentials required');
    return { cnic, password };
  };

  const handleAddProvince = async () => {
    if (!newProvince.trim()) {
      setMessage({ type: 'error', text: 'Province name required' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { cnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      const tx = await votingMachine.admin_addProvince(cnic, password, newProvince);
      await tx.wait();

      setMessage({ type: 'success', text: 'Province added successfully!' });
      setNewProvince('');
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProvince = async (province) => {
    if (!window.confirm(`Remove province "${province}"?`)) return;

    setLoading(true);
    try {
      const { cnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      const tx = await votingMachine.admin_removeProvince(cnic, password, province);
      await tx.wait();

      setMessage({ type: 'success', text: 'Province removed!' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddConstituency = async () => {
    if (!selectedProvince || !newConstituency.trim()) {
      setMessage({ type: 'error', text: 'Select province and enter constituency name' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { cnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      const tx = await votingMachine.admin_addConstituency(
        cnic, password, selectedProvince, newConstituency
      );
      await tx.wait();

      setMessage({ type: 'success', text: 'Constituency added!' });
      setNewConstituency('');
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConstituency = async (province, constituency) => {
    if (!window.confirm(`Remove "${constituency}"?`)) return;

    setLoading(true);
    try {
      const { cnic, password } = getAdminCredentials();
      const wallet = await connectWallet();
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      const tx = await votingMachine.admin_removeConstituency(
        cnic, password, province, constituency
      );
      await tx.wait();

      setMessage({ type: 'success', text: 'Constituency removed!' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
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
        <h1>🌍 Geographic Management</h1>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="management-grid-2col">
        {/* Add Province */}
        <div className="management-card">
          <h3>Add Province</h3>
          <input
            type="text"
            placeholder="Province Name"
            value={newProvince}
            onChange={(e) => setNewProvince(e.target.value)}
            className="input-field"
          />
          <button
            onClick={handleAddProvince}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Adding...' : 'Add Province'}
          </button>
        </div>

        {/* Add Constituency */}
        <div className="management-card">
          <h3>Add Constituency</h3>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="input-field"
          >
            <option value="">Select Province</option>
            {provinces.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Constituency Name"
            value={newConstituency}
            onChange={(e) => setNewConstituency(e.target.value)}
            className="input-field"
          />
          <button
            onClick={handleAddConstituency}
            disabled={loading || !selectedProvince}
            className="btn-primary"
          >
            {loading ? 'Adding...' : 'Add Constituency'}
          </button>
        </div>
      </div>

      {/* Display Provinces & Constituencies */}
      <div className="data-display">
        <h2>Provinces & Constituencies</h2>
        {provinces.length === 0 ? (
          <p className="no-data">No provinces added yet</p>
        ) : (
          provinces.map((province, idx) => (
            <div key={idx} className="province-card">
              <div className="province-header">
                <h3>{province}</h3>
                <button
                  onClick={() => handleRemoveProvince(province)}
                  className="btn-danger-sm"
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
              <div className="constituencies-list">
                {constituencies[province]?.length > 0 ? (
                  constituencies[province].map((const_, cIdx) => (
                    <div key={cIdx} className="constituency-item">
                      <span>📍 {const_}</span>
                      <button
                        onClick={() => handleRemoveConstituency(province, const_)}
                        className="btn-danger-sm"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-data-sm">No constituencies</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GeographicManagement;