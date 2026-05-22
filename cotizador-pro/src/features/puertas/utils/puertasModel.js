import { DEFAULT_PUERTA_CONFIG, DEFAULT_PUERTA_DRAFT } from '../config/puertasConfig';

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createPuertaConfig(overrides = {}) {
  return {
    ...cloneDeep(DEFAULT_PUERTA_CONFIG),
    ...overrides,
    geometry: {
      ...cloneDeep(DEFAULT_PUERTA_CONFIG.geometry),
      ...(overrides.geometry || {}),
    },
    composition: {
      ...cloneDeep(DEFAULT_PUERTA_CONFIG.composition),
      ...(overrides.composition || {}),
    },
    production: {
      ...cloneDeep(DEFAULT_PUERTA_CONFIG.production),
      ...(overrides.production || {}),
    },
  };
}

export function createPuertaDraft(overrides = {}) {
  return {
    ...cloneDeep(DEFAULT_PUERTA_DRAFT),
    ...overrides,
    material: {
      ...cloneDeep(DEFAULT_PUERTA_DRAFT.material),
      ...(overrides.material || {}),
    },
    vano: {
      ...cloneDeep(DEFAULT_PUERTA_DRAFT.vano),
      ...(overrides.vano || {}),
    },
  };
}
