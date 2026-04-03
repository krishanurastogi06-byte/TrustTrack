const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';
const CAMPAIGN_ID = '69cf86f8ea04de83661eb238'; // From user's log

async function debug() {
  try {
    console.log('Logging in as NGO...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'ngo@test.com', // Assuming this exists from my previous test_full_flow
      password: 'password123'
    });
    const token = loginRes.data.accessToken;

    console.log(`Setting up milestone for campaign ${CAMPAIGN_ID}...`);
    const payload = {
      title: 'Debug Milestone ' + Date.now(),
      amountETH: 0.1,
      order: 1
    };

    const res = await axios.post(`${API_BASE}/campaigns/${CAMPAIGN_ID}/milestones`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.error('FAILED:', err.response?.status, err.response?.data || err.message);
  }
}

debug();
