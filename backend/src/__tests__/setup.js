const mongoose = require('mongoose');

beforeAll(async () => {
  // Use in-memory MongoDB or test instance
  const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/trusttrack-test';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
});

afterEach(async () => {
  // Clear all collections after each test
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const collection of collections) {
    await mongoose.connection.collection(collection.name).deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});
