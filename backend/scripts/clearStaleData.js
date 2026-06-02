const mongoose = require('mongoose');
const config = require('../src/config/env');
const Campaign = require('../src/models/Campaign');
const Milestone = require('../src/models/Milestone');
const Donation = require('../src/models/Donation');
const Proof = require('../src/models/Proof');
const User = require('../src/models/User'); // In case we want to reset notifications

async function clearData() {
  try {
    console.log('Connecting to MongoDB at:', config.mongoUri);
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB.');

    // We only clear the collections that are tied to contract state.
    // We don't necessarily want to delete users (Admin/NGO accounts) unless specified.
    
    console.log('Clearing Campaign data...');
    await Campaign.deleteMany({});
    
    console.log('Clearing Milestone data...');
    await Milestone.deleteMany({});
    
    console.log('Clearing Donation data...');
    await Donation.deleteMany({});
    
    console.log('Clearing Proof data...');
    await Proof.deleteMany({});

    console.log('---');
    console.log('Database synchronization complete.');
    console.log('Your MongoDB is now clean and matches a fresh Hardhat node.');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing data:', err.message);
    process.exit(1);
  }
}

clearData();
