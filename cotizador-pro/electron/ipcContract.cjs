/*
 * File: cotizador-pro/electron/ipcContract.cjs
 * Purpose: IPC contract definitions for the licensing domain (CommonJS)
 * Author: DespieceAPP Automation
 * Created: 2026-04-03
 * Notes:
 * - Defines message schemas for IPC communication between Renderer (UI)
 *   and Electron Main process.
 * - Versioning: All messages include a `version` field for forward compatibility.
 * - Rationale: Centralizing IPC contract prevents drift between UI handlers and Main.
 */

const IPC_CHANNELS = Object.freeze({
  LICENSING_GET_STATUS: 'licensing:getStatus',
  LICENSING_PURCHASE: 'licensing:purchase',
  LICENSING_UPGRADE: 'licensing:upgrade',
  LICENSING_APPLY_PROMO: 'licensing:applyPromo',
});

const CONTRACT_VERSION = '1.0.0';

function withVersion(payload) {
  return { ...payload, version: CONTRACT_VERSION };
}

function isVersioned(payload) {
  return payload && typeof payload.version === 'string' && payload.version.startsWith(CONTRACT_VERSION);
}

module.exports = {
  IPC_CHANNELS,
  CONTRACT_VERSION,
  withVersion,
  isVersioned,
};