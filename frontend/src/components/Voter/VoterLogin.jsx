// src/components/Voter/VoterLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useBlockchain } from '../../hooks/useBlockchain';
import { CONTRACTS } from '../../config/contracts';
import './css/VoterLogin.css';

const VoterLogin = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'reset'
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { connectWallet, getContract } = useBlockchain();
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
      const voterContract = new ethers.Contract(
        CONTRACTS.VoterManagement.address,
        CONTRACTS.VoterManagement.abi,
        wallet.signer
      );

      // Hash password for verification
      const passwordHash = ethers.keccak256(ethers.toUtf8Bytes(password));
      
      // Verify voter credentials
      const isValid = await voterContract.verifyVoterCredentials(cnic, passwordHash);

      if (!isValid) {
        throw new Error('Invalid CNIC or password');
      }

      // Get voter details
      const voterDetails = await voterContract.viewVoter(cnic);
      
      // Store voter session
      sessionStorage.setItem('isVoter', 'true');
      sessionStorage.setItem('voterCnic', cnic);
      sessionStorage.setItem('voterPassword', password);
      sessionStorage.setItem('voterWallet', wallet.account);
      sessionStorage.setItem('voterName', voterDetails[1]);
      sessionStorage.setItem('voterProvince', voterDetails[2]);
      sessionStorage.setItem('voterConstituency', voterDetails[3]);

      // Navigate to voter dashboard
      navigate('/voter/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!cnic || !currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Please fill all fields');
      }

      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password');
      }

      // Connect wallet
      const wallet = await connectWallet();
      if (!wallet) {
        throw new Error('Failed to connect wallet');
      }

      // Create contract instances
      const voterContract = new ethers.Contract(
        CONTRACTS.VoterManagement.address,
        CONTRACTS.VoterManagement.abi,
        wallet.signer
      );

      // First verify current credentials
      const currentPasswordHash = ethers.keccak256(ethers.toUtf8Bytes(currentPassword));
      const isValid = await voterContract.verifyVoterCredentials(cnic, currentPasswordHash);

      if (!isValid) {
        throw new Error('Invalid CNIC or current password');
      }

      // Check if voter exists and is registered
      const voterDetails = await voterContract.viewVoter(cnic);
      if (!voterDetails[5]) { // isRegistered
        throw new Error('Voter not found or not registered');
      }

      // Request admin authorization
      const adminCnic = prompt('Enter Admin CNIC to authorize password change:');
      const adminPassword = prompt('Enter Admin Password:');
      
      if (!adminCnic || !adminPassword) {
        throw new Error('Admin authorization required for password change');
      }

      // Use VotingMachine to change password (new method - keeps voting status)
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        wallet.signer
      );

      setSuccess('Changing password...');

      // ✅ NEW: Use the dedicated password change function
      // This keeps hasVoted, secretKey, and all other data intact
      const tx = await votingMachine.admin_changeVoterPassword(
        adminCnic,
        adminPassword,
        cnic,
        currentPasswordHash,
        newPassword
      );
      await tx.wait();

      setSuccess('✅ Password changed successfully! You can now login with your new password.');
      
      // Clear form and switch to login mode after 3 seconds
      setTimeout(() => {
        setCnic('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMode('login');
        setSuccess('');
      }, 3000);

    } catch (err) {
      console.error('Password reset error:', err);
      
      let errorMsg = err.message || 'Password reset failed';
      
      // Handle specific errors
      if (errorMsg.includes('Admin does not exist') || errorMsg.includes('Invalid password')) {
        errorMsg = 'Invalid admin credentials. Please check admin CNIC and password.';
      } else if (errorMsg.includes('Current password incorrect')) {
        errorMsg = 'Current password is incorrect. Please try again.';
      } else if (errorMsg.includes('New password must be different')) {
        errorMsg = 'New password must be different from current password.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voter-login-container">
      <div className="voter-login-card">
        <div className="login-header">
          <button onClick={() => navigate('/')} className="back-btn">
            ← Back
          </button>
          <h1>🗳️ {mode === 'login' ? 'Voter Login' : 'Change Password'}</h1>
          <p>{mode === 'login' ? 'Enter your credentials to cast your vote' : 'Update your password'}</p>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle" style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className={mode === 'login' ? 'toggle-btn active' : 'toggle-btn'}
            style={{
              padding: '10px 20px',
              margin: '0 5px',
              border: mode === 'login' ? '2px solid #4CAF50' : '1px solid #ddd',
              background: mode === 'login' ? '#4CAF50' : '#fff',
              color: mode === 'login' ? '#fff' : '#333',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: mode === 'login' ? 'bold' : 'normal'
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setMode('reset');
              setError('');
              setSuccess('');
            }}
            className={mode === 'reset' ? 'toggle-btn active' : 'toggle-btn'}
            style={{
              padding: '10px 20px',
              margin: '0 5px',
              border: mode === 'reset' ? '2px solid #4CAF50' : '1px solid #ddd',
              background: mode === 'reset' ? '#4CAF50' : '#fff',
              color: mode === 'reset' ? '#fff' : '#333',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: mode === 'reset' ? 'bold' : 'normal'
            }}
          >
            Change Password
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="cnic">CNIC Number</label>
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
        )}

        {/* Password Reset Form */}
        {mode === 'reset' && (
          <form onSubmit={handlePasswordReset} className="login-form">
            <div className="form-group">
              <label htmlFor="reset-cnic">CNIC Number</label>
              <input
                id="reset-cnic"
                type="text"
                placeholder="Enter your 13-digit CNIC"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                maxLength="13"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength="6"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength="6"
                required
              />
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="success-message" style={{
                padding: '12px',
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '5px',
                color: '#155724',
                marginBottom: '15px'
              }}>
                ✅ {success}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !cnic || !currentPassword || !newPassword || !confirmPassword}
              className="login-btn"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>

            <div className="info-box" style={{
              marginTop: '15px',
              padding: '12px',
              background: '#d1ecf1',
              border: '1px solid #17a2b8',
              borderRadius: '5px',
              fontSize: '0.9rem'
            }}>
              <strong>✅ Improved Process:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', marginBottom: 0 }}>
                <li>Admin authorization required</li>
                <li>Only 1 transaction (fast & efficient)</li>
                <li><strong>Preserves your voting status</strong></li>
                <li><strong>Keeps your vote if already cast</strong></li>
                <li><strong>No data loss</strong></li>
              </ul>
            </div>

            <div className="warning-box" style={{
              marginTop: '10px',
              padding: '12px',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '5px',
              fontSize: '0.9rem'
            }}>
              <strong>⚠️ Important:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', marginBottom: 0 }}>
                <li>You'll be prompted for admin credentials</li>
                <li>Process takes only a few seconds</li>
                <li>Your voting record remains intact</li>
                <li>Can change password even after voting</li>
              </ul>
            </div>
          </form>
        )}

        {/* Information Box */}
        <div className="login-info">
          <h3>ℹ️ Important Information</h3>
          {mode === 'login' ? (
            <ul>
              <li>You must be registered as a voter to login</li>
              <li>MetaMask wallet connection required</li>
              <li>Use your registered CNIC and password</li>
              <li>Voting is only allowed during active voting period</li>
              <li>Use "Change Password" tab to update your password</li>
            </ul>
          ) : (
            <ul>
              <li>Enter your CNIC and current password</li>
              <li>New password must be at least 6 characters</li>
              <li>Admin credentials required for authorization</li>
              <li><strong>NEW:</strong> Only changes password (no data loss)</li>
              <li><strong>NEW:</strong> Voting status preserved</li>
              <li><strong>NEW:</strong> Much faster (1 transaction)</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoterLogin;