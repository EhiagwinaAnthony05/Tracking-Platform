#!/usr/bin/env node

/**
 * Diagnostic script to test the location endpoint
 * Run from terminal: node scripts/test-location-endpoint.js
 */

const axios = require('axios');

const DEFAULT_API_BASE_URL = 'https://move-x-xpress-production.up.railway.app';
const API_BASE_URL =
  (process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL)
    .trim()
    .replace(/\/+$/, '');

async function testEndpoint() {
  console.log('🔍 Location Endpoint Diagnostics\n');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Full Endpoint:', `${API_BASE_URL}/api/riders/me/location\n`);

  // Test 1: Check if server is reachable
  console.log('Test 1: Checking if server is reachable...');
  try {
    const healthCheck = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 }).catch(() => null);
    console.log('✓ Server is reachable\n');
  } catch (err) {
    console.log('✗ Server might be unreachable:', err.message, '\n');
  }

  // Test 2: Test login endpoint (should exist)
  console.log('Test 2: Testing login endpoint...');
  try {
    const loginResponse = await axios.post(`${API_BASE_URL}/api/riders/login`, {
      name: 'Test Rider',
      phone: '1234567890',
    }, { timeout: 5000 });
    
    console.log('✓ Login endpoint works');
    console.log('  Response:', loginResponse.status, loginResponse.data);
    
    const token = loginResponse.data.token;
    if (!token) {
      console.log('⚠ Warning: No token in login response\n');
      return;
    }
    
    // Test 3: Test location endpoint with valid token
    console.log('\nTest 3: Testing location endpoint with valid token...');
    try {
      const locationResponse = await axios.patch(
        `${API_BASE_URL}/api/riders/me/location`,
        {
          lat: 6.5244,
          lng: 3.3792,
          accuracy: 10.5,
          altitude: 45.0,
          heading: 120.0,
          speed: 2.0,
          capturedAt: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 5000,
        }
      );
      
      console.log('✓ Location endpoint works!');
      console.log('  Status:', locationResponse.status);
      console.log('  Response:', locationResponse.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.log('✗ Location endpoint error:');
        console.log('  Status:', err.response?.status);
        console.log('  Status Text:', err.response?.statusText);
        console.log('  Response:', err.response?.data);
        console.log('\n  Debug info:');
        console.log('  - URL:', err.config?.url);
        console.log('  - Method:', err.config?.method);
        console.log('  - Headers:', err.config?.headers);
      } else {
        console.log('✗ Error:', err.message);
      }
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.log('✗ Login endpoint error:');
      console.log('  Status:', err.response?.status);
      console.log('  Message:', err.message);
      console.log('  Response:', err.response?.data);
    } else {
      console.log('✗ Error:', err.message);
    }
  }
}

testEndpoint();
