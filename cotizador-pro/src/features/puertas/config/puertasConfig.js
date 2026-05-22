export const PUERTAS_TABS = [
  { id: 'nueva', label: 'Nueva puerta', icon: 'add_box' },
  { id: 'historial', label: 'Historial', icon: 'history' },
  { id: 'configuracion', label: 'Configuración', icon: 'tune' },
  { id: 'sobrantes', label: 'Sobrantes', icon: 'inventory' },
];

export const DEFAULT_PUERTA_CONFIG = {
  geometry: {
    espesorTotalPuertaMm: 40,
    descuentoAltoPuertaMm: 30,
    descuentoAnchoPuertaMm: 35,
    descuentoSuperiorMm: 30,
    holguraRecibidorMm: 10,
  },
  composition: {
    fondoExteriorAmm: 6,
    fondoExteriorBmm: 6,
    bastidorInternoMm: 28,
    anchoBastidorVerticalMm: 80,
    anchoBastidorHorizontalMm: 80,
    incluirBastidorInferior: true,
    tipoAlmaDefault: 'honeycomb',
  },
  production: {
    consumoPegantePorM2: 0,
    usarNestingParaFondos: true,
  },
};

export const DEFAULT_PUERTA_DRAFT = {
  nombre: '',
  tipoPuerta: 'entamborada',
  cantidad: 1,
  material: {
    materialId: null,
    nombre: '',
    color: '',
  },
  insumosSeleccionados: {
    bastidorItemId: null,
    peganteItemId: null,
    honeycombItemId: null,
    cantoItemId: null,
  },
  serviciosSeleccionados: [],
  herrajesSeleccionados: [],
  vano: {
    altoMm: 2340,
    anchoMm: 860,
    profundidadMm: 120,
  },
};
