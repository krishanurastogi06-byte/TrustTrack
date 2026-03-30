// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Donation is Ownable, ReentrancyGuard {
    mapping(uint256 => uint256) public campaignFunds;
    mapping(uint256 => mapping(address => uint256)) public donorCampaignTotals;
    mapping(uint256 => address payable) public campaignNgoWallet;
    mapping(uint256 => uint256) public milestoneToCampaign;
    mapping(uint256 => uint256) public milestoneReleaseAmount;
    mapping(uint256 => bool) public milestoneReleased;

    uint256 public totalDonated;
    uint256 public totalReleased;
    uint256 private nextCampaignId = 1;
    uint256 private nextMilestoneId = 1;

    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 campaignTotal,
        uint256 timestamp
    );

    event FundsReleased(
        uint256 indexed milestoneId,
        uint256 indexed campaignId,
        address indexed ngo,
        uint256 amount,
        uint256 timestamp
    );

    event CampaignRegistered(uint256 indexed campaignId, address indexed ngo, uint256 timestamp);
    event MilestoneRegistered(
        uint256 indexed milestoneId,
        uint256 indexed campaignId,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    function donate(uint256 campaignId) external payable nonReentrant {
        require(campaignId > 0, "Invalid campaignId");
        require(msg.value > 0, "Donation amount must be greater than zero");

        campaignFunds[campaignId] += msg.value;
        donorCampaignTotals[campaignId][msg.sender] += msg.value;
        totalDonated += msg.value;

        emit DonationReceived(campaignId, msg.sender, msg.value, campaignFunds[campaignId], block.timestamp);
    }

    function registerCampaign(address payable ngo) external onlyOwner returns (uint256) {
        require(ngo != address(0), "Invalid NGO address");

        uint256 campaignId = nextCampaignId;
        nextCampaignId += 1;
        campaignNgoWallet[campaignId] = ngo;
        emit CampaignRegistered(campaignId, ngo, block.timestamp);
        
        return campaignId;
    }

    function registerMilestone(uint256 campaignId, uint256 amountWei) external onlyOwner returns (uint256) {
        require(campaignId > 0, "Invalid campaignId");
        require(amountWei > 0, "Invalid milestone amount");
        require(campaignNgoWallet[campaignId] != address(0), "Campaign NGO wallet not registered");

        uint256 milestoneId = nextMilestoneId;
        nextMilestoneId += 1;
        milestoneToCampaign[milestoneId] = campaignId;
        milestoneReleaseAmount[milestoneId] = amountWei;
        milestoneReleased[milestoneId] = false;

        emit MilestoneRegistered(milestoneId, campaignId, amountWei, block.timestamp);
        
        return milestoneId;
    }

    function releaseFunds(uint256 milestoneId) external onlyOwner nonReentrant {
        require(milestoneId > 0, "Invalid milestoneId");

        uint256 campaignId = milestoneToCampaign[milestoneId];
        require(campaignId > 0, "Milestone not registered");
        require(!milestoneReleased[milestoneId], "Milestone already released");

        address payable ngo = campaignNgoWallet[campaignId];
        require(ngo != address(0), "NGO wallet not configured");

        uint256 amount = milestoneReleaseAmount[milestoneId];
        require(amount > 0, "Milestone amount not configured");
        require(campaignFunds[campaignId] >= amount, "Insufficient campaign escrow funds");

        campaignFunds[campaignId] -= amount;
        milestoneReleased[milestoneId] = true;
        totalReleased += amount;

        (bool success, ) = ngo.call{value: amount}("");
        require(success, "Fund release failed");

        emit FundsReleased(milestoneId, campaignId, ngo, amount, block.timestamp);
    }

    function getCampaignFunds(uint256 campaignId) external view returns (uint256) {
        return campaignFunds[campaignId];
    }

    function getDonorCampaignTotal(uint256 campaignId, address donor) external view returns (uint256) {
        return donorCampaignTotals[campaignId][donor];
    }
}