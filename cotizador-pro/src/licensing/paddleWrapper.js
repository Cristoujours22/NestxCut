/*
 * File: cotizador-pro/src/licensing/paddleWrapper.js
 * Purpose: Minimal Paddle integration wrapper (stand-in for initial scaffolding)
 * Author: DespieceAPP Automation
 * Created: 2026-04-03
 * Notes: Abstracts Paddle interactions behind simple promises for easier testing.
 */

/**
 * Simple Paddle wrapper placeholder
 */
class PaddleWrapper {
  constructor() {
    this.initialized = false;
  }

  init(config) {
    this.config = config;
    this.initialized = true;
    return Promise.resolve(true);
  }

  /**
   * Build a checkout URL for a given plan and optional promo.
   * @param {string} planId
   * @param {string=} promoCode
   * @param {object=} customerInfo
   * @returns {Promise<string>}
   */
  createCheckoutURL(planId, promoCode, customerInfo) {
    // Placeholder URL; replace with real Paddle integration
    const qp = new URLSearchParams({ planId, promoCode: promoCode || '' }).toString();
    return Promise.resolve(`https://example-paddle.checkout/?${qp}`);
  }

  onCheckoutCompleted(callback) {
    this._checkoutCallback = callback;
  }

  _emitCheckoutCompleted(data) {
    if (typeof this._checkoutCallback === 'function') {
      this._checkoutCallback(data);
    }
  }
}

module.exports = PaddleWrapper;
