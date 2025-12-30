// src/components/LandingPage.jsx
import { useNavigate } from 'react-router-dom';
import './css/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <h1>🗳️ Blockchain E-Voting System</h1>
          <p className="tagline">Secure, Transparent, Democratic</p>
        </div>

        <div className="role-selection">
          <h2>Select Your Role</h2>
          
          <div className="role-cards">
            {/* Admin Card */}
            <div className="role-card admin-card" onClick={() => navigate('/admin/login')}>
              <div className="role-icon">👨‍💼</div>
              <h3>Admin Login</h3>
              <p>System Management</p>
              <ul className="role-features">
                <li>Manage geographic data</li>
                <li>Register candidates & voters</li>
                <li>Control voting process</li>
                <li>Declare results</li>
              </ul>
              <div className="role-auth">
                <span className="auth-badge">🔐 CNIC + Password</span>
              </div>
              <button className="role-btn admin-btn">Login as Admin →</button>
            </div>

            {/* Voter Card */}
            <div className="role-card voter-card" onClick={() => navigate('/voter/login')}>
              <div className="role-icon">🗳️</div>
              <h3>Voter Login</h3>
              <p>Cast Your Vote</p>
              <ul className="role-features">
                <li>Register secret key</li>
                <li>Cast your vote securely</li>
                <li>Verify your vote</li>
                <li>View voting status</li>
              </ul>
              <div className="role-auth">
                <span className="auth-badge">🔐 CNIC + Password</span>
              </div>
              <button className="role-btn voter-btn">Login as Voter →</button>
            </div>

            {/* Public/Resident Card */}
            <div className="role-card public-card" onClick={() => navigate('/public')}>
              <div className="role-icon">👥</div>
              <h3>Public Access</h3>
              <p>View Information</p>
              <ul className="role-features">
                <li>View voting status</li>
                <li>Check election results</li>
                <li>View candidates</li>
                <li>View constituencies</li>
              </ul>
              <div className="role-auth">
                <span className="auth-badge no-auth">🌐 No Authentication</span>
              </div>
              <button className="role-btn public-btn">Enter as Resident →</button>
            </div>
          </div>
        </div>

        <div className="landing-footer">
          <p>🔒 Powered by Blockchain Technology</p>
          <p className="network-info">Network: Sepolia Testnet</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;