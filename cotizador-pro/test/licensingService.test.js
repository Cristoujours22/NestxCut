/*
 * File: cotizador-pro/test/licensingService.test.js
 * Purpose: Unit tests for LicensingService (getStatus, purchase)
 * Author: DespieceAPP Automation
 * Created: 2026-04-03
 * Notes: Tests cover happy paths and error handling for licensing service.
 *        Run with: node --test cotizador-pro/test/licensingService.test.js
 */

const { describe, it, mock } = require('node:test');
const assert = require('node:assert');
const LicensingService = require('../electron/licensing/licensingService.cjs');

describe('LicensingService', () => {
  // Mock DB with methods get and run
  const createMockDb = (responses = {}) => ({
    get: (sql, params, cb) => {
      const key = `${sql}_${params.join('_')}`;
      const result = responses[key] || responses.default || null;
      setTimeout(() => cb(null, result), 0);
    },
    run: (sql, params, cb) => {
      setTimeout(() => cb(null, { lastID: 123 }), 0);
    },
  });

  it('getStatus returns no_license when no active license exists', async () => {
    const mockDb = createMockDb({ default: null });
    const service = new LicensingService(mockDb);

    const result = await service.getStatus('company-001');

    assert.strictEqual(result.no_license, true);
    assert.strictEqual(result.company.id, 'company-001');
  });

  it('getStatus returns license info when active license exists', async () => {
    const mockDb = createMockDb({
      [`SELECT l.*, p.name as plan_name, p.price as price FROM licenses l LEFT JOIN plans p ON l.plan_id = p.id WHERE l.user_id = ? AND l.status = 'active' ORDER BY l.created_at DESC LIMIT 1_company-001`]: {
        id: 5,
        user_id: 'company-001',
        plan_id: 1,
        status: 'active',
        ends_at: '2026-05-01',
        trial_ends_at: '2026-04-15',
        plan_name: 'Pro Monthly',
        price: 29.99,
      },
    });
    const service = new LicensingService(mockDb);

    const result = await service.getStatus('company-001');

    assert.strictEqual(result.no_license, undefined);
    assert.strictEqual(result.subscription.id, 5);
    assert.strictEqual(result.subscription.status, 'active');
    assert.strictEqual(result.planName, 'Pro Monthly');
    assert.strictEqual(result.planPrice, 29.99);
  });

  it('purchase creates a new license successfully', async () => {
    const mockDb = createMockDb({
      [`SELECT * FROM plans WHERE id = ?_1`]: {
        id: 1,
        name: 'Pro Monthly',
        price: 29.99,
        trial_days: 14,
      },
    });
    const service = new LicensingService(mockDb);

    const result = await service.purchase('company-001', 1);

    assert.strictEqual(result.success, true);
    assert.strictEqual(typeof result.subscriptionId, 'number');
    assert.strictEqual(typeof result.license_key, 'string');
  });

  it('purchase fails when plan does not exist', async () => {
    const mockDb = createMockDb({ default: null });
    const service = new LicensingService(mockDb);

    const result = await service.purchase('company-001', 999);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message, 'Plan not found');
  });

  it('upgrade changes plan of existing active license', async () => {
    const mockDb = createMockDb({
      [`SELECT id FROM licenses WHERE user_id = ? AND status = ?_company-001_active`]: { id: 5 },
    });
    const service = new LicensingService(mockDb);

    const result = await service.upgrade('company-001', 2);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.subscriptionId, 5);
  });

  it('upgrade fails when no active license exists', async () => {
    const mockDb = createMockDb({ default: null });
    const service = new LicensingService(mockDb);

    const result = await service.upgrade('company-001', 2);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message, 'No active license to upgrade');
  });
});