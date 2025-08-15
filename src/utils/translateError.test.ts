import { describe, it, expect } from 'vitest';
import translateError from './translateError';

describe('translateError', () => {
  it('should translate "invalid email" error', () => {
    expect(translateError('invalid email')).toBe('電子郵件格式不正確');
  });

  it('should translate "email already in use" error', () => {
    expect(translateError('email already in use')).toBe('該電子郵件已被註冊');
  });

  it('should translate "weak password" error', () => {
    expect(translateError('weak password')).toBe('密碼強度不足，請使用更複雜的密碼');
  });

  it('should translate "invalid login credentials" error', () => {
    expect(translateError('invalid login credentials')).toBe('電子郵件或密碼錯誤');
  });

  it('should translate error messages containing keywords', () => {
    expect(translateError('User provided invalid email address.')).toBe('電子郵件格式不正確');
    expect(translateError('This email already in use by another account.')).toBe('該電子郵件已被註冊');
  });

  it('should return the original error string if no match is found', () => {
    expect(translateError('Something went wrong.')).toBe('Something went wrong.');
    expect(translateError('Network error.')).toBe('Network error.');
    expect(translateError('')).toBe('');
    expect(translateError('   ')).toBe('   ');
  });

  it('should be case-sensitive based on current implementation', () => {
    // The current implementation uses String.prototype.includes, which is case-sensitive.
    // So, "Invalid Email" will not match "invalid email".
    expect(translateError('Invalid Email')).toBe('Invalid Email');
    expect(translateError('Weak Password')).toBe('Weak Password');
  });
});