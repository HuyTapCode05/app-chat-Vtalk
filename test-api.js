
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testMutualFriendsAPI() {
  console.log('🔍 Testing Mutual Friends API...');
  
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      emailOrPhone: 'test@example.com', 
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    const mutualResponse = await axios.get(`${BASE_URL}/api/friends/mutual/testUserId`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Mutual Friends API working:', mutualResponse.data);
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ 404 Error:', error.response.data?.message || 'Endpoint not found');
    } else if (error.response?.status === 401) {
      console.log('🔑 Authentication needed - this is expected if no test user exists');
    } else {
      console.log('❌ API Error:', error.response?.data || error.message);
    }
  }
}

async function testRoutes() {
  console.log('🔍 Testing Route Availability...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/friends/mutual/test`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Route exists (401 Unauthorized - expected without valid token)');
    } else if (error.response?.status === 404) {
      console.log('❌ Route not found - checking if routes are properly mounted...');
    } else {
      console.log('✅ Route responding:', error.response?.status);
    }
  }
}

async function runTests() {
  console.log('🚀 Running VTalk API Tests...\n');
  
  await testRoutes();
  console.log();
  await testMutualFriendsAPI();
  
  console.log('\n✨ Test completed!');
}

runTests().catch(console.error);