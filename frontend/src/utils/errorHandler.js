// src/utils/errorHandler.js

/**
 * Parse blockchain error and return user-friendly message
 */
export const parseBlockchainError = (error) => {
  console.error('Full error:', error);

  // Extract error message from various error formats
  let errorMessage = error.message || 'Unknown error occurred';

  // Check for revert reasons in error data
  if (error.data?.message) {
    errorMessage = error.data.message;
  }

  // Parse common error patterns
  if (errorMessage.includes('execution reverted')) {
    const match = errorMessage.match(/execution reverted: (.+?)(?:"|$)/);
    if (match) {
      errorMessage = match[1];
    }
  }

  // Check for error in the reason field
  if (error.reason) {
    errorMessage = error.reason;
  }

  // Map common errors to user-friendly messages
  const errorMap = {
    // Authentication errors
    'Invalid admin credentials': '❌ Invalid admin credentials. Please check your CNIC and password.',
    'Admin not found': '❌ Admin not found. Please verify your credentials.',
    'Unauthorized': '❌ You are not authorized to perform this action.',
    
    // Duplicate entry errors
    'Province already exists': '❌ This province is already registered.',
    'Constituency already exists': '❌ This constituency is already registered.',
    'Party already exists': '❌ This party is already registered.',
    'Candidate already exists': '❌ A candidate with this CNIC is already registered.',
    'Voter already registered': '❌ This voter is already registered.',
    'Admin already exists': '❌ An admin with this CNIC already exists.',
    
    // Not found errors
    'Province not found': '❌ Province not found.',
    'Constituency not found': '❌ Constituency not found.',
    'Party not found': '❌ Party not found.',
    'Candidate not found': '❌ Candidate not found.',
    'Voter not found': '❌ Voter not found.',
    
    // Validation errors
    'Invalid CNIC': '❌ Invalid CNIC format. CNIC must be 13 digits.',
    'Empty name': '❌ Name cannot be empty.',
    'Empty province': '❌ Province name cannot be empty.',
    'Empty constituency': '❌ Constituency name cannot be empty.',
    'Empty party name': '❌ Party name cannot be empty.',
    
    // Voting errors
    'Voting already active': '❌ Voting is already active.',
    'Voting not active': '❌ Voting is not active.',
    'Voting already ended': '❌ Voting has already ended.',
    'Already voted': '❌ This voter has already cast their vote.',
    'Candidate already in constituency': '❌ This party already has a candidate in this constituency.',
    
    // Network errors
    'user rejected transaction': '❌ Transaction was rejected by user.',
    'insufficient funds': '❌ Insufficient funds for gas fees.',
    'network changed': '❌ Network changed. Please reconnect.',
    
    // Gas estimation errors
    'cannot estimate gas': '❌ Transaction would fail. Please check all inputs are valid.',
    'missing revert data': '❌ Transaction validation failed. Possible reasons:\n• Invalid admin credentials\n• Duplicate entry (already exists)\n• Invalid data format\n• Candidate already registered in this constituency',
    'CALL_EXCEPTION': '❌ Transaction failed. Please verify:\n• Admin credentials are correct\n• Entry doesn\'t already exist\n• All required fields are filled correctly',
  };

  // Check if error message contains any known error
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // If no specific match, return a cleaned version
  if (errorMessage.includes('execution reverted')) {
    return '❌ Transaction failed. Please check your inputs and try again.';
  }

  // Return original message if no match
  return `❌ ${errorMessage}`;
};

/**
 * Validate form inputs before submission
 */
export const validateInputs = {
  cnic: (cnic) => {
    if (!cnic) return 'CNIC is required';
    if (!/^\d{13}$/.test(cnic)) return 'CNIC must be exactly 13 digits';
    return null;
  },
  
  name: (name) => {
    if (!name || !name.trim()) return 'Name is required';
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    return null;
  },
  
  password: (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  },
  
  province: (province) => {
    if (!province || !province.trim()) return 'Province is required';
    return null;
  },
  
  constituency: (constituency) => {
    if (!constituency || !constituency.trim()) return 'Constituency is required';
    return null;
  },
  
  party: (party) => {
    if (!party || !party.trim()) return 'Party name is required';
    return null;
  }
};

/**
 * Show validation errors
 */
export const validateForm = (fields) => {
  const errors = [];
  
  for (const [key, value] of Object.entries(fields)) {
    if (validateInputs[key]) {
      const error = validateInputs[key](value);
      if (error) errors.push(error);
    }
  }
  
  return errors.length > 0 ? errors.join('\n') : null;
};