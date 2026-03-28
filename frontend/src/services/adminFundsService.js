import apiClient from '../lib/axios';

const API_BASE = '/api/admin';

export const adminFundsService = {
  /**
   * Get smart contract balance
   */
  async getContractBalance() {
    try {
      const response = await apiClient.get(`${API_BASE}/contract-balance`);
      return response.data?.data || response.data?.balance;
    } catch (error) {
      console.error('Failed to fetch contract balance:', error);
      throw error;
    }
  },

  /**
   * Get campaign-wise funds details from blockchain
   */
  async getCampaignFunds() {
    try {
      const response = await apiClient.get(`${API_BASE}/campaign-funds`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch campaign funds:', error);
      throw error;
    }
  },
};

export default adminFundsService;
