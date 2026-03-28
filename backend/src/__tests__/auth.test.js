const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const bcryptjs = require('bcryptjs');

describe('Auth API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          role: 'donor',
          profile: { name: 'Test User' },
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await User.create({
        email: 'existing@example.com',
        passwordHash: await bcryptjs.hash('pass', 10),
        role: 'donor',
      });

      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'existing@example.com',
          password: 'NewPass123!',
          role: 'donor',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should validate password requirements', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          role: 'donor',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      const hash = await bcryptjs.hash('ValidPassword123!', 10);
      await User.create({
        email: 'user@example.com',
        passwordHash: hash,
        role: 'donor',
      });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'user@example.com',
          password: 'ValidPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('user@example.com');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPassword123!',
        });

      expect(res.status).toBe(401);
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/refresh', () => {
    beforeEach(async () => {
      const hash = await bcryptjs.hash('pass', 10);
      const user = await User.create({
        email: 'user@example.com',
        passwordHash: hash,
        role: 'donor',
      });

      const loginRes = await request(app)
        .post('/api/login')
        .send({
          email: 'user@example.com',
          password: 'pass',
        });

      global.testRefreshToken = loginRes.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/refresh')
        .send({ refreshToken: global.testRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/me', () => {
    let userToken;

    beforeEach(async () => {
      const hash = await bcryptjs.hash('pass', 10);
      const user = await User.create({
        email: 'user@example.com',
        passwordHash: hash,
        role: 'donor',
      });

      const loginRes = await request(app)
        .post('/api/login')
        .send({
          email: 'user@example.com',
          password: 'pass',
        });

      userToken = loginRes.body.accessToken;
    });

    it('should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('user@example.com');
      expect(res.body.user.role).toBe('donor');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/me');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
