const mongoose = require('mongoose');
const readline = require('readline');
const config = require('../src/config/env');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

async function run() {
  if (!config.mongoUri) {
    console.error('MONGO_URI is not set in environment.');
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri);
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);
  const user = new User({ email, passwordHash, role: 'admin', profile: { name: 'Administrator' } });
  await user.save();
  console.log('Admin created:', email, 'with password from ADMIN_PASSWORD env or fallback value.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
