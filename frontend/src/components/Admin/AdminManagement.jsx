// src/components/Admin/AdminManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';
import { parseBlockchainError, validateInputs } from '../../utils/errorHandler';
import './css/Management.css';

const AdminManagement = () => {
  const [formData, setFormData] = useState({
    cnic: '',
    name: '',
    password: ''
  });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
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
    loadAdmins();
  }, [account]);

  const loadAdmins = async () => {
  setLoadingAdmins(true);
  try {
    const votingMachine = await getContract('VotingMachine');
    
    // Get all AdminAdded events
    const addedFilter = votingMachine.filters.AdminAdded();
    const addedEvents = await votingMachine.queryFilter(addedFilter);
    
    // Get unique CNICs from all AdminAdded events
    const uniqueCnics = [...new Set(
      addedEvents.map(event => event.args.cnic.toString())
    )];
    
    // Fetch details for each admin and check if they currently exist
    const adminDetails = await Promise.all(
      uniqueCnics.map(async (cnic, index) => {
        try {
          const admin = await votingMachine.viewAdmin(cnic);
          
          // ✅ FIX: Only return admin if exists is true
          if (admin.exists) {
            return {
              id: index + 1,
              cnic: admin.cnic.toString(),
              name: admin.name,
              exists: admin.exists
            };
          }
          return null;
        } catch (error) {
          console.error(`Error loading admin ${cnic}:`, error);
          return null;
        }
      })
    );
    
    // ✅ FIX: Filter out null values (removed/non-existent admins)
    const validAdmins = adminDetails.filter(admin => admin !== null);
    setAdmins(validAdmins);
    
  } catch (error) {
    console.error('Error loading admins:', error);
    setMessage({ 
      type: 'error', 
      text: '⚠️ Could not load admin list from blockchain events' 
    });
  } finally {
    setLoadingAdmins(false);
  }
};

  const handleAddAdmin = async () => {
    // Validate all fields
    const errors = [];
    
    const cnicError = validateInputs.cnic(formData.cnic);
    if (cnicError) errors.push(cnicError);
    
    const nameError = validateInputs.name(formData.name);
    if (nameError) errors.push(nameError);
    
    const passwordError = validateInputs.password(formData.password);
    if (passwordError) errors.push(passwordError);
    
    if (errors.length > 0) {
      setMessage({ type: 'error', text: errors.join('\n') });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
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
        await votingMachine.addAdmin.estimateGas(
          formData.cnic, 
          formData.name.trim(), 
          formData.password
        );
      } catch (gasError) {
        throw gasError;
      }

      const tx = await votingMachine.addAdmin(
        formData.cnic, 
        formData.name.trim(), 
        formData.password
      );
      
      setMessage({ type: 'info', text: '⏳ Transaction submitted. Waiting for confirmation...' });
      await tx.wait();

      setMessage({ type: 'success', text: '✅ Admin added successfully!' });
      setFormData({ cnic: '', name: '', password: '' });
      
      // Reload admin list after a short delay
      setTimeout(() => loadAdmins(), 2000);
    } catch (error) {
      const friendlyError = parseBlockchainError(error);
      setMessage({ type: 'error', text: friendlyError });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminCnic) => {
  if (!window.confirm(`Remove admin with CNIC: ${adminCnic}?`)) return;

  setLoading(true);
  setMessage({ type: '', text: '' });
  
  try {
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
      await votingMachine.removeAdmin.estimateGas(adminCnic);
    } catch (gasError) {
      throw gasError;
    }

    const tx = await votingMachine.removeAdmin(adminCnic);
    
    setMessage({ type: 'info', text: '⏳ Transaction submitted. Waiting for confirmation...' });
    await tx.wait();

    setMessage({ type: 'success', text: '✅ Admin removed successfully!' });
    
    // ✅ FIX: Immediately remove from local state for instant UI update
    setAdmins(prevAdmins => prevAdmins.filter(a => a.cnic !== adminCnic));
    
    // Reload admin list after a short delay
    setTimeout(() => loadAdmins(), 2000);
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
        <h1>🔐 Admin Management</h1>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
          ⚠️ Only contract owner can add/remove admins
        </p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.text}</pre>
        </div>
      )}

      <div className="management-card">
        <h3>Add New Admin</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          Note: You must be the contract owner to add admins
        </p>
        <div className="form-grid">
          <input
            type="text"
            placeholder="Admin CNIC (e.g., 3520012345671)"
            value={formData.cnic}
            onChange={(e) => setFormData({...formData, cnic: e.target.value})}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Admin Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="input-field"
          />
          <input
            type="password"
            placeholder="Admin Password (min 6 characters)"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="input-field"
          />
        </div>
        <button
          onClick={handleAddAdmin}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Adding...' : 'Add Admin'}
        </button>
      </div>

      <div className="data-display">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Registered Admins ({admins.length})</h2>
          <button 
            onClick={loadAdmins} 
            disabled={loadingAdmins}
            className="btn-primary"
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {loadingAdmins ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
        </div>
        
        {loadingAdmins ? (
          <p className="no-data">Loading admins from blockchain...</p>
        ) : admins.length === 0 ? (
          <p className="no-data">No admins found</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CNIC</th>
                  <th>Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.cnic}>
                    <td>{admin.id}</td>
                    <td>{admin.cnic}</td>
                    <td>{admin.name}</td>
                    <td>
                      <button
                        onClick={() => handleRemoveAdmin(admin.cnic)}
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

export default AdminManagement;