function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calcularHojaPuerta(definition, config) {
  const altoVano = toNumber(definition?.vano?.altoMm);
  const anchoVano = toNumber(definition?.vano?.anchoMm);
  const descuentoAlto = toNumber(config?.geometry?.descuentoAltoPuertaMm);
  const descuentoAncho = toNumber(config?.geometry?.descuentoAnchoPuertaMm);
  const espesor = toNumber(config?.geometry?.espesorTotalPuertaMm);

  return {
    altoMm: Math.max(0, altoVano - descuentoAlto),
    anchoMm: Math.max(0, anchoVano - descuentoAncho),
    espesorMm: espesor,
  };
}

export function calcularRecibidor(definition, config, hoja) {
  const profundidadVano = toNumber(definition?.vano?.profundidadMm);
  const holgura = toNumber(config?.geometry?.holguraRecibidorMm);
  const espesorPuerta = toNumber(config?.geometry?.espesorTotalPuertaMm);
  const descuentoSuperior = toNumber(config?.geometry?.descuentoSuperiorMm);
  const altoVano = toNumber(definition?.vano?.altoMm);

  const anchoRecibidor = Math.max(0, profundidadVano - espesorPuerta - holgura);
  const largoSuperior = Math.max(0, toNumber(hoja?.anchoMm) - descuentoSuperior);

  return {
    anchoMm: anchoRecibidor,
    piezas: [
      {
        id: 'recibidor_lateral',
        detalle: 'Recibidor izquierdo y derecho',
        cantidad: 2,
        largoMm: altoVano,
        anchoMm: anchoRecibidor,
      },
      {
        id: 'recibidor_superior',
        detalle: 'Recibidor superior',
        cantidad: 1,
        largoMm: largoSuperior,
        anchoMm: anchoRecibidor,
      },
    ],
  };
}

export function calcularMarco(definition, config, hoja) {
  const profundidadVano = toNumber(definition?.vano?.profundidadMm);
  const descuentoSuperior = toNumber(config?.geometry?.descuentoSuperiorMm);
  const altoVano = toNumber(definition?.vano?.altoMm);
  const largoSuperior = Math.max(0, toNumber(hoja?.anchoMm) - descuentoSuperior);

  return {
    piezas: [
      {
        id: 'marco_lateral',
        detalle: 'Marco izquierdo y derecho',
        cantidad: 2,
        largoMm: altoVano,
        anchoMm: profundidadVano,
      },
      {
        id: 'marco_superior',
        detalle: 'Marco superior',
        cantidad: 1,
        largoMm: largoSuperior,
        anchoMm: profundidadVano,
      },
    ],
  };
}

export function calcularFondos(hoja, config) {
  const espesorA = toNumber(config?.composition?.fondoExteriorAmm);
  const espesorB = toNumber(config?.composition?.fondoExteriorBmm);

  return [
    {
      id: 'fondo_exterior_a',
      detalle: 'Fondo exterior A',
      cantidad: 1,
      largoMm: hoja.altoMm,
      anchoMm: hoja.anchoMm,
      espesorMm: espesorA,
    },
    {
      id: 'fondo_exterior_b',
      detalle: 'Fondo exterior B',
      cantidad: 1,
      largoMm: hoja.altoMm,
      anchoMm: hoja.anchoMm,
      espesorMm: espesorB,
    },
  ];
}

export function calcularBastidores(hoja, config) {
  const anchoVertical = toNumber(config?.composition?.anchoBastidorVerticalMm);
  const anchoHorizontal = toNumber(config?.composition?.anchoBastidorHorizontalMm);
  const espesor = toNumber(config?.composition?.bastidorInternoMm);
  const incluirInferior = Boolean(config?.composition?.incluirBastidorInferior);
  const incluirChapero = Boolean(config?.composition?.incluirChapero);
  const chaperoAlto = toNumber(config?.composition?.chaperoAltoMm);
  const largoHorizontal = Math.max(0, toNumber(hoja?.anchoMm) - (anchoVertical * 2));

  const piezas = [];

  if (incluirChapero && chaperoAlto > 0) {
    // Lado chapa: bastidor vertical partido en 2 por el chapero
    const altoSobreChapero = Math.max(0, hoja.altoMm - chaperoAlto);
    piezas.push({
      id: 'bastidor_vertical_chapa_sup',
      detalle: 'Bastidor vertical lado chapa (superior)',
      cantidad: 1,
      largoMm: altoSobreChapero,
      anchoMm: anchoVertical,
      espesorMm: espesor,
    });
    // Lado bisagra: bastidor vertical completo
    piezas.push({
      id: 'bastidor_vertical_bisagra',
      detalle: 'Bastidor vertical lado bisagra',
      cantidad: 1,
      largoMm: hoja.altoMm,
      anchoMm: anchoVertical,
      espesorMm: espesor,
    });
  } else {
    // Sin chapero: 2 bastidores verticales iguales
    piezas.push({
      id: 'bastidor_vertical',
      detalle: 'Bastidor vertical',
      cantidad: 2,
      largoMm: hoja.altoMm,
      anchoMm: anchoVertical,
      espesorMm: espesor,
    });
  }

  piezas.push({
    id: 'bastidor_superior',
    detalle: 'Bastidor superior',
    cantidad: 1,
    largoMm: largoHorizontal,
    anchoMm: anchoHorizontal,
    espesorMm: espesor,
  });

  if (incluirInferior) {
    piezas.push({
      id: 'bastidor_inferior',
      detalle: 'Bastidor inferior',
      cantidad: 1,
      largoMm: largoHorizontal,
      anchoMm: anchoHorizontal,
      espesorMm: espesor,
    });
  }

  return piezas;
}

export function calcularChapero(hoja, config) {
  const incluirChapero = Boolean(config?.composition?.incluirChapero);
  if (!incluirChapero) return null;

  const espesor = toNumber(config?.composition?.bastidorInternoMm);
  const alto = toNumber(config?.composition?.chaperoAltoMm);
  const ancho = toNumber(config?.composition?.chaperoAnchoMm || toNumber(config?.composition?.anchoBastidorVerticalMm));

  return {
    id: 'chapero',
    detalle: 'Chapero (refuerzo chapa)',
    cantidad: 1,
    largoMm: alto,
    anchoMm: ancho,
    espesorMm: espesor,
  };
}

export function calcularAlma(hoja, config) {
  const anchoVertical = toNumber(config?.composition?.anchoBastidorVerticalMm);
  const anchoHorizontal = toNumber(config?.composition?.anchoBastidorHorizontalMm);
  const espesor = toNumber(config?.composition?.bastidorInternoMm);

  return {
    id: 'alma_honeycomb',
    detalle: 'Alma honeycomb',
    tipo: config?.composition?.tipoAlmaDefault || 'honeycomb',
    cantidad: 1,
    altoMm: Math.max(0, hoja.altoMm - (anchoHorizontal * 2)),
    anchoMm: Math.max(0, hoja.anchoMm - (anchoVertical * 2)),
    espesorMm: espesor,
  };
}

export function calcularCanto(hoja) {
  return (toNumber(hoja?.altoMm) * 2) + (toNumber(hoja?.anchoMm) * 2);
}

export function calcularPegante(hoja, config) {
  const areaUnaCaraM2 = (toNumber(hoja?.altoMm) * toNumber(hoja?.anchoMm)) / 1000000;
  const consumoPorM2 = toNumber(config?.production?.consumoPegantePorM2);
  return {
    areaTotalPegadoM2: areaUnaCaraM2 * 2,
    cantidad: areaUnaCaraM2 * 2 * consumoPorM2,
    unidad: 'kg',
  };
}

export function calcularPuerta(definition, config) {
  const hoja = calcularHojaPuerta(definition, config);
  const recibidor = calcularRecibidor(definition, config, hoja);
  const marco = calcularMarco(definition, config, hoja);
  const fondos = calcularFondos(hoja, config);
  const bastidores = calcularBastidores(hoja, config);
  const chapero = calcularChapero(hoja, config);
  const alma = calcularAlma(hoja, config);
  const cantoLinealMm = calcularCanto(hoja);
  const pegante = calcularPegante(hoja, config);

  return {
    hoja,
    recibidor,
    marco,
    estructuraInterna: {
      fondos,
      bastidores,
      chapero,
      alma,
      canto: { linealesMm: cantoLinealMm },
      pegante,
    },
    costos: {
      materialBase: 0,
      herrajes: 0,
      servicios: 0,
      total: 0,
    },
  };
}
