// src/components/Admin/PartyManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';
import { parseBlockchainError, validateInputs } from '../../utils/errorHandler';
import './css/Management.css';

const PartyManagement = () => {
  const [parties, setParties] = useState([]);
  const [newParty, setNewParty] = useState('');
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
    loadParties();
  }, [account]);

  const loadParties = async () => {
    try {
      const partyContract = await getContract('PartyManagement');
      const partyList = await partyContract.viewParties();
      setParties(partyList);
    } catch (error) {
      console.error('Error loading parties:', error);
    }
  };

  const getAdminCredentials = () => {
    const cnic = prompt('Enter Admin CNIC:');
    const password = prompt('Enter Admin Password:');
    if (!cnic || !password) throw new Error('Credentials required');
    
    // Validate credentials format
    const cnicError = validateInputs.cnic(cnic);
    if (cnicError) throw new Error(cnicError);
    
    return { cnic, password };
  };

  const handleAddParty = async () => {
    // Validate party name
    const partyError = validateInputs.party(newParty);
    if (partyError) {
      setMessage({ type: 'error', text: partyError });
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

      // Try to estimate gas first to catch errors early
      try {
        await votingMachine.admin_addParty.estimateGas(cnic, password, newParty.trim());
      } catch (gasError) {
        throw gasError;
      }

      const tx = await votingMachine.admin_addParty(cnic, password, newParty.trim());
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Party added successfully!' });
      setNewParty('');
      await loadParties();
    } catch (error) {
      const friendlyError = parseBlockchainError(error);
      setMessage({ type: 'error', text: friendlyError });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParty = async (partyName) => {
    if (!window.confirm(`Remove party "${partyName}"?`)) return;

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
        await votingMachine.admin_removeParty.estimateGas(cnic, password, partyName);
      } catch (gasError) {
        throw gasError;
      }

      const tx = await votingMachine.admin_removeParty(cnic, password, partyName);
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Party removed successfully!' });
      await loadParties();
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
        <h1>🎭 Party Management</h1>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.text}</pre>
        </div>
      )}

      <div className="management-card">
        <h3>Add New Party</h3>
        <div className="form-inline">
          <input
            type="text"
            placeholder="Party Name (e.g., PTI, PMLN, PPP)"
            value={newParty}
            onChange={(e) => setNewParty(e.target.value)}
            className="input-field"
          />
          <button
            onClick={handleAddParty}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Adding...' : 'Add Party'}
          </button>
        </div>
      </div>

      <div className="data-display">
        <h2>Registered Parties ({parties.length})</h2>
        {parties.length === 0 ? (
          <p className="no-data">No parties registered yet</p>
        ) : (
          <div className="party-grid">
            {parties.map((party, idx) => (
              <div key={idx} className="party-card">
                <div className="party-icon">🎭</div>
                <h3>{party}</h3>
                <button
                  onClick={() => handleRemoveParty(party)}
                  className="btn-danger"
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyManagement;