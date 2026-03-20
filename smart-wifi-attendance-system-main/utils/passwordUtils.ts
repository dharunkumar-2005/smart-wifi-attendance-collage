/**
 * Password & Security Utilities
 * Handles OTP generation, validation, and password management
 */

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
};

/**
 * Validate OTP format (6 digits)
 */
export const validateOTP = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Simple password hashing (for demo - use proper hashing in production)
 * In production use bcrypt or argon2
 */
export const hashPassword = (password: string): string => {
  // This is a simple base64 encoding for demo purposes
  // In production, use bcrypt: import bcrypt from 'bcryptjs'
  // return await bcrypt.hash(password, 10)
  return btoa(password);
};

/**
 * Compare password with hash (for demo)
 */
export const comparePassword = (password: string, hash: string): boolean => {
  // In production: return await bcrypt.compare(password, hash)
  return btoa(password) === hash;
};

/**
 * Store OTP with expiration (used in state management)
 */
export interface StoredOTP {
  code: string;
  email: string;
  expiresAt: number; // timestamp
  attempts: number;
}

/**
 * Check if OTP is expired (5 minutes = 300000ms)
 */
export const isOTPExpired = (storedOTP: StoredOTP): boolean => {
  return Date.now() > storedOTP.expiresAt;
};

/**
 * Check remaining OTP attempts
 */
export const canAttemptOTP = (storedOTP: StoredOTP): { canAttempt: boolean; attemptsLeft: number } => {
  const maxAttempts = 3;
  const attemptsLeft = maxAttempts - storedOTP.attempts;
  
  return {
    canAttempt: attemptsLeft > 0,
    attemptsLeft: Math.max(0, attemptsLeft)
  };
};
