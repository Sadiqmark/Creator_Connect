import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /api/v1/health', () => {
  const app = createApp();

  it('should return 200 OK with status ok and safe metadata', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('version');

    // Ensure no secrets or credentials leaked
    expect(response.body).not.toHaveProperty('DATABASE_URL');
    expect(response.body).not.toHaveProperty('FIREBASE_PRIVATE_KEY');
    expect(response.body).not.toHaveProperty('password');
  });

  it('should return 404 for nonexistent route with standard error shape', async () => {
    const response = await request(app).get('/api/v1/nonexistent-route');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('requestId');
  });
});

describe('CORS Origin & Preflight Verification', () => {
  const app = createApp();

  it('should allow preflight OPTIONS from http://localhost:5174 with PATCH method and credentials', async () => {
    const response = await request(app)
      .options('/api/v1/creators/me')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Request-Id');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
    expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    expect(response.headers['access-control-allow-headers']).toContain('X-Request-Id');
  });

  it('should allow preflight OPTIONS from http://localhost:5173 with credentials', async () => {
    const response = await request(app)
      .options('/api/v1/creators/me')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PATCH');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should disallow unknown origins and not reflect Access-Control-Allow-Origin', async () => {
    const response = await request(app)
      .options('/api/v1/creators/me')
      .set('Origin', 'http://unauthorized-domain.com')
      .set('Access-Control-Request-Method', 'PATCH');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

