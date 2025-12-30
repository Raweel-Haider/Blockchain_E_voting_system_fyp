// src/components/Admin/AdminDebug.jsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../../config/contracts';

const AdminDebug = () => {
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [adminInfo, setAdminInfo] = useState(null);
  const [contractsLinked, setContractsLinked] = useState(null);

  const checkAdmin = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        signer
      );

      // Check if admin exists
      const admin = await votingMachine.viewAdmin(cnic);
      setAdminInfo({
        cnic: admin[0].toString(),
        name: admin[1],
        exists: admin[2]
      });

      // Verify password
      const isValid = await votingMachine.verifyAdmin(cnic, password);
      setResult(isValid ? '✅ Valid Admin' : '❌ Invalid Password');
    } catch (error) {
      setResult('❌ Error: ' + error.message);
      console.error(error);
    }
  };

  const checkContractsLinked = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        signer
      );

      const linked = await votingMachine.contractsLinked();
      setContractsLinked(linked);

      if (linked) {
        const addresses = await votingMachine.getContractAddresses();
        console.log('Contract Addresses:', {
          geo: addresses[0],
          party: addresses[1],
          candidate: addresses[2],
          voter: addresses[3],
          voting: addresses[4],
          result: addresses[5]
        });
      }
    } catch (error) {
      console.error('Error checking contracts:', error);
      setContractsLinked(false);
    }
  };

  const addTestAdmin = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        signer
      );

      // Add admin with CNIC: 1234567890123, Name: "Test Admin", Password: "admin123"
      const tx = await votingMachine.addAdmin(
        '1234567890123',
        'Test Admin',
        'admin123'
      );
      await tx.wait();
      
      alert('✅ Test Admin Added!\nCNIC: 1234567890123\nPassword: admin123');
    } catch (error) {
      alert('❌ Error: ' + error.message);
      console.error(error);
    }
  };

  const testAddProvince = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const votingMachine = new ethers.Contract(
        CONTRACTS.VotingMachine.address,
        CONTRACTS.VotingMachine.abi,
        signer
      );

      console.log('Testing with:', { cnic, password });

      // Try adding province
      const tx = await votingMachine.admin_addProvince(
        cnic,
        password,
        'TestProvince'
      );
      await tx.wait();
      
      alert('✅ Province added successfully!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
      console.error('Full error:', error);
    }
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '12px'
    }}>
      <h1>🔧 Admin Debug Panel</h1>

      {/* Check Contracts Linked */}
      <div style={{ marginBottom: '30px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>1. Check Contracts Linked</h3>
        <button onClick={checkContractsLinked} style={{
          padding: '10px 20px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          Check Contracts
        </button>
        {contractsLinked !== null && (
          <p style={{ marginTop: '10px', fontSize: '18px', fontWeight: 'bold' }}>
            {contractsLinked ? '✅ Contracts are linked' : '❌ Contracts NOT linked'}
          </p>
        )}
      </div>

      {/* Add Test Admin */}
      <div style={{ marginBottom: '30px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>2. Add Test Admin (Owner Only)</h3>
        <p>This will add a test admin: CNIC: 1234567890123, Password: admin123</p>
        <button onClick={addTestAdmin} style={{
          padding: '10px 20px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          Add Test Admin
        </button>
      </div>

      {/* Check Admin */}
      <div style={{ marginBottom: '30px', padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
        <h3>3. Verify Admin Credentials</h3>
        <input
          type="text"
          placeholder="Enter CNIC"
          value={cnic}
          onChange={(e) => setCnic(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            border: '2px solid #ccc',
            borderRadius: '6px'
          }}
        />
        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            border: '2px solid #ccc',
            borderRadius: '6px'
          }}
        />
        <button onClick={checkAdmin} style={{
          padding: '10px 20px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          Check Admin
        </button>

        {adminInfo && (
          <div style={{ marginTop: '15px', padding: '10px', background: 'white', borderRadius: '6px' }}>
            <p><strong>CNIC:</strong> {adminInfo.cnic}</p>
            <p><strong>Name:</strong> {adminInfo.name}</p>
            <p><strong>Exists:</strong> {adminInfo.exists ? '✅ Yes' : '❌ No'}</p>
          </div>
        )}

        {result && (
          <p style={{ marginTop: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            {result}
          </p>
        )}
      </div>

      {/* Test Add Province */}
      <div style={{ padding: '15px', background: '#f8d7da', borderRadius: '8px' }}>
        <h3>4. Test Add Province</h3>
        <p>Use the CNIC and password above to test adding a province</p>
        <button onClick={testAddProvince} style={{
          padding: '10px 20px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          Test Add Province
        </button>
      </div>
    </div>
  );
};

export default AdminDebug;