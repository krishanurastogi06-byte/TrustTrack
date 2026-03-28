const campaignService = require('../services/campaignService');
const { fail } = require('../lib/apiResponse');

/**
 * ensureCampaignOwnerOrAdmin(paramName)
 * - paramName: name of req.params field containing campaign id (default 'id' or 'campaignId')
 * Verifies that the authenticated user is the campaign owner or has role 'admin'.
 */
module.exports = function ensureCampaignOwnerOrAdmin(paramName = 'id') {
  return async function (req, res, next) {
    try {
      const user = req.user;
      if (!user) return fail(res, { status: 401, error: 'Unauthorized', code: 'AUTH_REQUIRED' });

      if (user.role === 'admin') return next();

      const campaignId = req.params[paramName];
      if (!campaignId) return fail(res, { status: 400, error: 'Missing campaign identifier', code: 'MISSING_CAMPAIGN_ID' });

      const campaign = await campaignService.getCampaignById(campaignId);
      if (!campaign) return fail(res, { status: 404, error: 'Campaign not found', code: 'CAMPAIGN_NOT_FOUND' });

      // campaign.ngo might be populated object or ObjectId
      const ownerId = campaign.ngo && campaign.ngo._id ? campaign.ngo._id.toString() : String(campaign.ngo);
      if (ownerId !== String(user.sub)) {
        return fail(res, { status: 403, error: 'Forbidden: not campaign owner', code: 'FORBIDDEN' });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};
