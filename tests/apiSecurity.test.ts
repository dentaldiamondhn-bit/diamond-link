import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAdminGate,
  resolveInfraEndpointAccess,
  parseCommaSeparatedIds,
  unauthorizedResponse,
  forbiddenResponse,
  infraEndpointHiddenResponse,
  infraEndpointGuard,
} from '../src/lib/apiSecurity.ts';

describe('resolveAdminGate', () => {
  test('unauthorized when no session userId', () => {
    assert.equal(resolveAdminGate({ userId: null, role: 'admin' }), 'unauthorized');
    assert.equal(resolveAdminGate({ role: 'admin' }), 'unauthorized');
  });

  test('forbidden for any non-admin role including staff and uppercase variants', () => {
    assert.equal(resolveAdminGate({ userId: 'u1', role: 'staff' }), 'forbidden');
    assert.equal(resolveAdminGate({ userId: 'u1', role: 'tech_support' }), 'forbidden');
    assert.equal(resolveAdminGate({ userId: 'u1', role: 'Admin' }), 'forbidden');
    assert.equal(resolveAdminGate({ userId: 'u1' }), 'forbidden');
  });

  test('allow only for exact admin role', () => {
    assert.equal(resolveAdminGate({ userId: 'u1', role: 'admin' }), 'allow');
  });
});

describe('resolveInfraEndpointAccess', () => {
  test('deny in production regardless of secrets', () => {
    assert.equal(
      resolveInfraEndpointAccess({ nodeEnv: 'production', configuredSecret: 's', providedSecret: 's' }),
      'deny'
    );
    assert.equal(resolveInfraEndpointAccess({ nodeEnv: 'production' }), 'deny');
  });

  test('deny in non-production when no secret is configured (fail closed)', () => {
    assert.equal(
      resolveInfraEndpointAccess({ nodeEnv: 'development', configuredSecret: null, providedSecret: 'x' }),
      'deny'
    );
    assert.equal(resolveInfraEndpointAccess({ nodeEnv: 'development' }), 'deny');
  });

  test('deny on mismatched or missing provided secret', () => {
    assert.equal(
      resolveInfraEndpointAccess({ nodeEnv: 'development', configuredSecret: 's', providedSecret: 'wrong' }),
      'deny'
    );
    assert.equal(
      resolveInfraEndpointAccess({ nodeEnv: 'development', configuredSecret: 's', providedSecret: null }),
      'deny'
    );
  });

  test('allow only on exact secret match in non-production', () => {
    assert.equal(
      resolveInfraEndpointAccess({ nodeEnv: 'development', configuredSecret: 's', providedSecret: 's' }),
      'allow'
    );
  });
});

describe('parseCommaSeparatedIds', () => {
  test('splits, trims and drops empties', () => {
    assert.deepEqual(parseCommaSeparatedIds(' a , b,, c '), ['a', 'b', 'c']);
    assert.deepEqual(parseCommaSeparatedIds('a,a,B'), ['a', 'B']);
  });

  test('returns empty array for missing or empty values', () => {
    assert.deepEqual(parseCommaSeparatedIds(undefined), []);
    assert.deepEqual(parseCommaSeparatedIds(null), []);
    assert.deepEqual(parseCommaSeparatedIds(''), []);
  });
});

describe('infraEndpointGuard', () => {
  const withEnv = (env: Record<string, string | undefined>, fn: () => void) => {
    const saved = { ...env };
    const keyReassignments: string[] = [];
    for (const key of Object.keys(env)) {
      keyReassignments.push(key);
      process.env[key] = env[key];
    }
    try {
      fn();
    } finally {
      for (const key of keyReassignments) {
        if (typeof saved[key] === 'undefined') delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  };

  test('returns 404 in production (with or without secret)', () => {
    withEnv({ NODE_ENV: 'production', CRON_SECRET: 's' }, () => {
      const req = new Request('http://localhost/api/execute-sql');
      const res = infraEndpointGuard(req);
      assert.ok(res);
      assert.equal(res.status, 404);
    });
  });

  test('returns 404 in development without a matching header', () => {
    withEnv({ NODE_ENV: 'development', CRON_SECRET: 's' }, () => {
      assert.ok(infraEndpointGuard(new Request('http://localhost/api/execute-sql')));
    });
    withEnv({ NODE_ENV: 'development', CRON_SECRET: undefined }, () => {
      const req = new Request('http://localhost/api/execute-sql', {
        headers: { 'x-cron-secret': 's' },
      });
      assert.ok(infraEndpointGuard(req));
    });
  });

  test('returns null when the secret matches in non-production', () => {
    withEnv({ NODE_ENV: 'development', CRON_SECRET: 's' }, () => {
      const req = new Request('http://localhost/api/execute-sql', {
        headers: { 'x-cron-secret': 's' },
      });
      assert.equal(infraEndpointGuard(req), null);
    });
  });
});

describe('gate responses', () => {
  test('unauthorized 401 body', async () => {
    const res = unauthorizedResponse();
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: 'Unauthorized' });
  });

  test('forbidden 403 body', async () => {
    const res = forbiddenResponse();
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'Forbidden' });
  });

  test('infra hidden 404 body', async () => {
    const res = infraEndpointHiddenResponse();
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'Not found' });
  });
});
