import apiClient from '../lib/axios';

const API_BASE = '/ngo';

export const ngoService = {
  /**
   * Get NGO profile
   */
  async getProfile() {
    try {
      const response = await apiClient.get(`${API_BASE}/profile`);
      return response.data?.data || response.data?.profile;
    } catch (error) {
      console.error('Failed to fetch NGO profile:', error);
      throw error;
    }
  },

  /**
   * Update NGO profile
   */
  async updateProfile(data) {
    try {
      const response = await apiClient.put(`${API_BASE}/profile`, data);
      return response.data?.data || response.data?.profile;
    } catch (error) {
      console.error('Failed to update NGO profile:', error);
      throw error;
    }
  },

  /**
   * Update NGO wallet address
   */
  async updateWalletAddress(walletAddress) {
    return ngoService.updateProfile({ walletAddress });
  },

  /**
   * Update NGO profile info (name, organization, phone)
   */
  async updateProfileInfo(profile) {
    return ngoService.updateProfile({ profile });
  },

  /**
   * Get NGO funds summary (received, pending)
   */
  async getFundsSummary() {
    try {
      const response = await apiClient.get(`${API_BASE}/funds-summary`);
      return response.data?.data || response.data?.summary;
    } catch (error) {
      console.error('Failed to fetch NGO funds summary:', error);
      throw error;
    }
  },

  /**
   * Get NGO wallet
   */
  async getWallet() {
    try {
      const response = await apiClient.get(`${API_BASE}/wallet`);
      return response.data?.data || response.data?.wallet;
    } catch (error) {
      console.error('Failed to fetch NGO wallet:', error);
      throw error;
    }
  },

  /**
   * Get NGO wallet balance
   */
  async getWalletBalance() {
    try {
      const response = await apiClient.get(`${API_BASE}/wallet/balance`);
      return response.data?.data || response.data?.balance;
    } catch (error) {
      console.error('Failed to fetch NGO wallet balance:', error);
      throw error;
    }
  },
};

export default ngoService;
