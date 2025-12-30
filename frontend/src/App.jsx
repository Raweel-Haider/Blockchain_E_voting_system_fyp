// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Landing
import LandingPage from './components/LandingPage';

// Admin
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminManagement from './components/Admin/AdminManagement';
import GeographicManagement from './components/Admin/GeographicManagement';
import PartyManagement from './components/Admin/PartyManagement';
import CandidateManagement from './components/Admin/CandidateManagement';
import VoterManagement from './components/Admin/VoterManagement';
import VotingControl from './components/Admin/VotingControl';
import ResultsManagement from './components/Admin/ResultsManagement';
import AdminDebug from './components/Admin/AdminDebug';
import SystemHealthCheck from './components/Admin/SystemHealthCheck';


// Voter
import VoterLogin from './components/Voter/VoterLogin';
import VoterDashboard from './components/Voter/VoterDashboard';
import CastVote from './components/Voter/CastVote';
import VerifyVote from './components/Voter/VerifyVote';
import ViewCandidates from './components/Voter/ViewCandidates';
import VoterResults from './components/Voter/VoterResults';

// Public
import PublicDashboard from './components/Public/PublicDashboard';
import PublicCandidates from './components/Public/PublicCandidates';
import PublicResults from './components/Public/PublicResults';
import PublicStatus from './components/Public/PublicStatus';
import CheckCNIC from './components/Admin/CheckCNIC';


import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/debug" element={<AdminDebug />} />
        <Route path="/admin/admins" element={<AdminManagement />} />
        <Route path="/admin/geographic" element={<GeographicManagement />} />
        <Route path="/admin/parties" element={<PartyManagement />} />
        <Route path="/admin/candidates" element={<CandidateManagement />} />
        <Route path="/admin/voters" element={<VoterManagement />} />
        <Route path="/admin/voting" element={<VotingControl />} />
        <Route path="/admin/results" element={<ResultsManagement />} />
        <Route path="/admin/health-check" element={<SystemHealthCheck />} />
        <Route path="/admin/check-cnic" element={<CheckCNIC />} />

        {/* Voter Routes */}
        <Route path="/voter/login" element={<VoterLogin />} />
        <Route path="/voter/dashboard" element={<VoterDashboard />} />
        <Route path="/voter/cast-vote" element={<CastVote />} />
        <Route path="/voter/verify-vote" element={<VerifyVote />} />
        <Route path="/voter/view-candidates" element={<ViewCandidates />} />
        <Route path="/voter/results" element={<VoterResults />} />

        {/* Public Routes */}
        <Route path="/public" element={<PublicDashboard />} />
        <Route path="/public/candidates" element={<PublicCandidates />} />
        <Route path="/public/results" element={<PublicResults />} />
        <Route path="/public/status" element={<PublicStatus />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;