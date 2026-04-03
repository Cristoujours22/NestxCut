/*
 * File: cotizador-pro/electron/licensing/licensingService.js
 * Purpose: Skeleton LicensingService in Electron Main
 * Author: DespieceAPP Automation
 * Created: 2026-04-03
 * Notes: Centralize licensing logic in Electron Main. Renderer should only interact via IPC.
 */

/**
 * LicensingService - skeleton implementation
 * Exposes core methods that will be wired to IPC handlers in Electron Main.
 */
class LicensingService {
  constructor(db) {
    // Database instance or adapter
    this.db = db || null;
  }

  /**
   * Get current licensing status for a given company.
   * @param {string} companyId
   * @returns {Promise<object>} LicensingInfo-like payload
   */
  getStatus(companyId) {
    // Retrieve licensing status for a given company from the local store (SQLite-like)
    return new Promise((resolve, reject) => {
      const db = this.db;
      if (!db) {
        return resolve({ company: { id: companyId, name: '' }, no_license: true });
      }
      const sql = `SELECT l.*, p.name as plan_name, p.price as price
                   FROM licenses l
                   LEFT JOIN plans p ON l.plan_id = p.id
                   WHERE l.user_id = ? AND l.status = 'active'
                   ORDER BY l.created_at DESC LIMIT 1`;
      db.get(sql, [companyId], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve({ company: { id: companyId, name: '' }, no_license: true });
        const isTrialActive = Boolean(row.trial_ends_at) && new Date(row.trial_ends_at) > new Date();
        const daysRemaining = row.ends_at ? Math.ceil((new Date(row.ends_at) - new Date()) / (1000 * 60 * 60 * 24)) : undefined;
        const info = {
          company: { id: companyId, name: row.company_name || '' },
          subscription: {
            id: row.id,
            planId: row.plan_id,
            status: row.status,
            currentPeriodEnd: row.ends_at,
            trial: Boolean(row.trial_ends_at)
          },
          activePromo: undefined,
          planName: row.plan_name,
          planPrice: row.price,
          isTrialActive,
          daysRemaining,
        };
        resolve(info);
      });
    });
  }

  /**
   * Initiate a purchase flow for a company with a plan and optional promo.
   * @param {string} companyId
   * @param {string} planId
   * @param {string=} promoCode
   * @returns {Promise<{success:boolean, message?:string, subscriptionId?:string}>}
   */
  purchase(companyId, planId, promoCode) {
    // Basic implementation to create a new license for a company and plan
    return new Promise((resolve, reject) => {
      const db = this.db;
      if (!db) {
        return resolve({ success: false, message: 'DB not connected' });
      }
      // Ensure plan exists
      db.get('SELECT * FROM plans WHERE id = ?', [planId], (err, plan) => {
        if (err) return reject(err);
        if (!plan) return resolve({ success: false, message: 'Plan not found' });
        const now = new Date();
        const endsAt = new Date(now);
        endsAt.setMonth(endsAt.getMonth() + 1);
        const trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trial_days || 14));
        const licenseKey = `LIC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        db.run(
          'INSERT INTO licenses (license_key, user_id, plan_id, status, started_at, ends_at, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [licenseKey, companyId, planId, 'active', now.toISOString(), endsAt.toISOString(), trialEndsAt.toISOString()],
          function (err2) {
            if (err2) return reject(err2);
            resolve({ success: true, subscriptionId: this.lastID, license_key: licenseKey });
          }
        );
      });
    });
  }

  /**
   * Upgrade an existing subscription to a new plan.
   * @param {string} companyId
   * @param {string} newPlanId
   * @returns {Promise<{success:boolean, message?:string, subscriptionId?:string}>}
   */
  upgrade(companyId, newPlanId) {
    return new Promise((resolve, reject) => {
      const db = this.db;
      if (!db) return resolve({ success: false, message: 'DB not connected' });
      // Find current active license
      db.get('SELECT id FROM licenses WHERE user_id = ? AND status = ?', [companyId, 'active'], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve({ success: false, message: 'No active license to upgrade' });
        db.run('UPDATE licenses SET plan_id = ? WHERE id = ?', [newPlanId, row.id], (err2) => {
          if (err2) return reject(err2);
          resolve({ success: true, subscriptionId: row.id });
        });
      });
    });
  }

  /**
   * Apply a promo code to the current or new subscription.
   * @param {string} promoCode
   * @returns {Promise<{success:boolean, message?:string}>}
   */
  applyPromo(promoCode) {
    // Basic placeholder for promo validation (to be wired with server side rules)
    return Promise.resolve({ success: false, message: 'Not implemented' });
  }
}

module.exports = LicensingService;
