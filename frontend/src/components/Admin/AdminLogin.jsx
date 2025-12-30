import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useBlockchain } from '../../hooks/useBlockchain';
import { CONTRACTS } from '../../config/contracts';
import './css/AdminLogin.css';

const AdminLogin = () => {
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { connectWallet } = useBlockchain();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!cnic || !password) {
        throw new Error('Please enter CNIC and password');
      }

      // Connect wallet first
      const wallet = await connectWallet();
      if (!wallet) {
        throw new Error('Failed to connect wallet');
      }

      // Create contract instance
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      // Verify admin credentials
      const isValid = await votingMachine.verifyAdmin(cnic, password);

      if (!isValid) {
        throw new Error('Invalid CNIC or password');
      }

      // Store admin session
      sessionStorage.setItem('isAdmin', 'true');
      sessionStorage.setItem('adminWallet', wallet.account);
      sessionStorage.setItem('adminCnic', cnic);

      // Navigate to admin dashboard
      navigate('/admin/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="login-header">
          <button onClick={() => navigate('/')} className="back-btn">
            ← Back
          </button>
          <h1>👨‍💼 Admin Login</h1>
          <p>Access the election management system</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="cnic">Admin CNIC</label>
            <input
              id="cnic"
              type="text"
              placeholder="Enter your 13-digit CNIC"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              maxLength="13"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !cnic || !password}
            className="login-btn"
          >
            {loading ? 'Verifying...' : 'Login & Connect Wallet'}
          </button>
        </form>

        <div className="login-info">
          <h3>ℹ️ Admin Access</h3>
          <ul>
            <li>Only authorized election officials can login</li>
            <li>MetaMask wallet connection required</li>
            <li>Use your registered admin credentials</li>
            <li>All actions are recorded on the blockchain</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;