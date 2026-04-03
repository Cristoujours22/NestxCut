/**
 * Utilidad pura para calcular los totales de piezas y ocurrencias de servicios
 * extrayendo la engorrosa lógica de búsqueda de strings y fórmulas matemáticas.
 * 
 * @param {Array} despieces Array con los objetos de despieces (pestañas y sus filas)
 * @param {Array} services Lista de servicios disponibles con sus reglas de tipoCobro
 * @returns {Object} { totalPieces: number, serviceCounts: Object }
 */

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const detectarCantidadUnidad = (detalle, nombreOriginal, nomenclatura) => {
    const detalleLower = detalle.toLowerCase();
    const baseNombre = escapeRegExp(nombreOriginal.toLowerCase());
    const baseNom = escapeRegExp(nomenclatura.toLowerCase());
    
    // Crear un regex unificado que busque el servicio con posibles cantidades
    // Formatos válidos: "caja", "caja 2", "2 cajas", "caja x2", "caja 2L", "caja 4L", "caja x4", "4L caja", "caja4L"
    const serviceRegexStr = baseNombre === baseNom ? baseNombre : `${baseNombre}|${baseNom}`;
    
    // Usar un Set para evitar contar el mismo match múltiples veces
    const matchedPositions = new Set();
    const positionValues = new Map(); // Guardar el valor de cada posición
    
    // Regex para: número + servicio (ej: "2 cajas", "2caja", "2L caja")
    const regexNumeroAntes = new RegExp(`(\\d+)(?:L)?\\s*(${serviceRegexStr})`, 'gi');
    let match;
    while ((match = regexNumeroAntes.exec(detalleLower)) !== null) {
        const cantidad = parseInt(match[1], 10) || 1;
        const pos = match.index;
        if (!matchedPositions.has(pos)) {
            matchedPositions.add(pos);
            positionValues.set(pos, cantidad);
        }
    }
    
    // Regex para: servicio + número (ej: "caja 2", "caja x2", "caja 2L", "caja4L")
    const regexNumeroDespues = new RegExp(`(${serviceRegexStr})(?:\\s*(?:x)?(\\d+)(?:L)?)?`, 'gi');
    while ((match = regexNumeroDespues.exec(detalleLower)) !== null) {
        const pos = match.index;
        if (!matchedPositions.has(pos)) {
            matchedPositions.add(pos);
            const cantidad = match[2] ? parseInt(match[2], 10) : 1;
            positionValues.set(pos, cantidad);
        }
    }
    
    // Regex especial para servicios como CAJA que pueden tener variantes 2L, 3L, 4L con texto entre medio
    // Ejemplo: "Ref_ CAJA CEF 3L/15*100/490" → detectar "CAJA 3L"
    // Este regex SOBRESCRIBE la cantidad anterior (para evitar duplicar cuenta)
    if (baseNombre.includes('caja') || baseNom.includes('caja')) {
        const variantRegex = new RegExp(`(${serviceRegexStr})[^\\d]*(\\d+)L`, 'gi');
        while ((match = variantRegex.exec(detalleLower)) !== null) {
            const cantidad = parseInt(match[2], 10) || 1;
            const pos = match.index;
            // Sobrescribir en lugar de sumar (prioridad al regex variant con número)
            positionValues.set(pos, cantidad);
        }
    }
    
    // Calcular total basado en los valores de cada posición
    let total = 0;
    positionValues.forEach((cantidad) => {
        total += cantidad;
    });
    
    // Si no se contó nada, verificar si el servicio existe sin cantidad específica
    if (total === 0) {
        const simpleRegex = new RegExp(`(${serviceRegexStr})`, 'i');
        if (simpleRegex.test(detalleLower)) {
            total = 1;
        }
    }
    
    return total;
};

export const calcularTotalesDespiece = (despieces, services) => {
    let piecesCount = 0;
    const sCounts = {};

    // Inicializar contadores de servicios a 0
    services.forEach(service => {
        sCounts[service.nomenclatura] = 0;
    });

    // Sumar filas de TODOS los despieces de forma segura
    despieces.forEach(despiece => {
        (despiece.filas || []).forEach(row => {
            const cant = parseInt(row?.cant, 10);
            if (!isNaN(cant) && cant > 0) {
                piecesCount += cant;

                // Contar servicios en el detalle usando nombre original o nomenclatura
                const detalle = row?.detalle ? row.detalle.toLowerCase() : '';
                services.forEach(service => {
                    const isCalado = service.nomenclatura.toLowerCase() === 'calado' || service.nombreOriginal.toLowerCase().includes('calado');
                    const isCurva = service.nomenclatura.toLowerCase() === 'cscurva1' || service.nombreOriginal.toLowerCase() === 'curva';
                    
                    let serviceTotalInRow = 0;

                    if (isCalado) {
                        const baseName = escapeRegExp(service.nombreOriginal.toLowerCase());
                        const baseNom = escapeRegExp(service.nomenclatura.toLowerCase());
                        const baseRegexStr = baseName === baseNom ? baseName : `${baseName}|${baseNom}`;
                        
                        // Usar Set para evitar contar el mismo match múltiples veces
                        const processedMatches = new Set();
                        
                        // Regex 1: buscar "calado" con número antes (ej: "2 calado", "2L calado")
                        const regexNumAntes = new RegExp(`(\\d+)(?:L)?\\s*(${baseRegexStr})`, 'gi');
                        let match;
                        while ((match = regexNumAntes.exec(detalle)) !== null) {
                            const pos = match.index;
                            if (!processedMatches.has(pos)) {
                                processedMatches.add(pos);
                                const cantidad = parseInt(match[1], 10) || 1;
                                serviceTotalInRow += cantidad;
                            }
                        }
                        
                        // Regex 2: buscar "calado" solo o con número después (ej: "calado", "calado 2", "calado x2", "calado 2L")
                        const regexDespues = new RegExp(`(${baseRegexStr})(?:\\s*(?:x)?(\\d+)(?:L)?)?`, 'gi');
                        while ((match = regexDespues.exec(detalle)) !== null) {
                            const pos = match.index;
                            if (!processedMatches.has(pos)) {
                                processedMatches.add(pos);
                                if (match[2]) {
                                    const cantidad = parseInt(match[2], 10);
                                    serviceTotalInRow += cantidad;
                                } else {
                                    serviceTotalInRow += 1;
                                }
                            }
                        }
                        
                        // Si no se contó nada, verificar si existe "calado" sin cantidad
                        if (serviceTotalInRow === 0) {
                            const simpleRegex = new RegExp(`(${baseRegexStr})`, 'i');
                            if (simpleRegex.test(detalle)) {
                                serviceTotalInRow = 1;
                            }
                        }
                    } else if (isCurva) {
                        const baseName = escapeRegExp(service.nombreOriginal.toLowerCase());
                        const baseNom = escapeRegExp(service.nomenclatura.toLowerCase());
                        const baseRegexStr = baseName === baseNom ? baseName : `${baseName}|${baseNom}`;
                        
                        // Usar Set para evitar contar el mismo match múltiples veces
                        const processedMatches = new Set();
                        
                        // Regex 1: buscar "curva" con número antes (ej: "2 curva", "2curva")
                        const regexNumAntes = new RegExp(`(\\d+)(?:L)?\\s*(${baseRegexStr})`, 'gi');
                        let match;
                        while ((match = regexNumAntes.exec(detalle)) !== null) {
                            const pos = match.index;
                            if (!processedMatches.has(pos)) {
                                processedMatches.add(pos);
                                const cantidad = parseInt(match[1], 10) || 1;
                                serviceTotalInRow += cantidad;
                            }
                        }
                        
                        // Regex 2: buscar "curva" solo o con número después (ej: "curva", "curva 2", "curva x2", "curva 2L")
                        const regexDespues = new RegExp(`(${baseRegexStr})(?:\\s*(?:x)?(\\d+)(?:L)?)?`, 'gi');
                        while ((match = regexDespues.exec(detalle)) !== null) {
                            const pos = match.index;
                            if (!processedMatches.has(pos)) {
                                processedMatches.add(pos);
                                if (match[2]) {
                                    const cantidad = parseInt(match[2], 10);
                                    serviceTotalInRow += cantidad;
                                } else {
                                    serviceTotalInRow += 1;
                                }
                            }
                        }
                        
                        // Si no se contó nada, verificar si existe "curva" sin cantidad
                        if (serviceTotalInRow === 0) {
                            const simpleRegex = new RegExp(`(${baseRegexStr})`, 'i');
                            if (simpleRegex.test(detalle)) {
                                serviceTotalInRow = 1;
                            }
                        }
                        
                        // Limitar a máximo 4 curvas por fila (solo hay 4 lados)
                        if (serviceTotalInRow > 4) {
                            serviceTotalInRow = 4;
                        }
                    } else {
                        // Lógica estándar para el resto de los servicios
                        const isNariz = service.nomenclatura.toLowerCase() === 'nar' || service.nombreOriginal.toLowerCase().includes('nariz') || service.nombreOriginal.toLowerCase().includes('narices') || service.nombreOriginal.toLowerCase().includes('nar');
                        const isSenchaManual = service.nomenclatura.toUpperCase() === 'SENCHAMANUAL' || service.nombreOriginal.toLowerCase().includes('enchape a pieza especial');
                        const isPerbis = service.nomenclatura.toUpperCase() === 'PERBIS' || service.nombreOriginal.toLowerCase().includes('perbis');
                        const isSanduche = service.nombreOriginal.toLowerCase().includes('sanduche') || service.nombreOriginal.toLowerCase().includes('clavillo') || service.nombreOriginal.toLowerCase().includes('sandu');
                        const isRanuraFo = service.nomenclatura.toUpperCase() === 'CSRANUFO' || service.nombreOriginal.toLowerCase().includes('ranurafo');
                        const isEngna = service.nomenclatura.toUpperCase() === 'ENGNA' || service.nombreOriginal.toLowerCase().includes('engorde');

                        const regexNombre = new RegExp(escapeRegExp(service.nombreOriginal.toLowerCase()), 'gi');
                        const regexNom = new RegExp(escapeRegExp(service.nomenclatura.toLowerCase()), 'gi');

                        const matchesNombre = detalle.match(regexNombre);
                        const matchesNom = detalle.match(regexNom);
                        
                        let count = 0;
                        // Flexibilizamos la búsqueda para que baste con "nar" o "nariz"
                        // ya que la nomenclatura "NARIZ, ENGRUESE" casi nunca se escribe textualmente.
                        if (isNariz) {
                            const basicNarRegex = /nar(?:iz(?:es)?)?/gi;
                            count = (detalle.match(basicNarRegex) || []).length;
                        } else if (isSenchaManual) {
                            const basicSenchaRegex = /(?:senchamanual|enchape manual|manigaveta|manichaflan)/gi;
                            count = (detalle.match(basicSenchaRegex) || []).length;
                            
                            // Revisión automática si no hay texto relevante, pero cumple la regla <= 119
                            if (count === 0) {
                                const localL = parseFloat(row.largo) || 0;
                                const localA = parseFloat(row.ancho) || 0;
                                if ((localL > 0 && localL <= 119) || (localA > 0 && localA <= 119)) {
                                    const vc = ['1', '2', '3', '4'];
                                    if (vc.includes(String(row.l1)) || vc.includes(String(row.l2)) || vc.includes(String(row.a1)) || vc.includes(String(row.a2))) {
                                        count = 1;
                                    }
                                }
                            }
                        } else if (isPerbis) {
                            const perbisRegex = /(\d+)\s*perbis/gi;
                            let matchResult;
                            let foundAny = false;
                            while ((matchResult = perbisRegex.exec(detalle)) !== null) {
                                count += parseInt(matchResult[1], 10);
                                foundAny = true;
                            }
                            if (!foundAny) {
                                const basicPerbisRegex = /perbis/gi;
                                count = (detalle.match(basicPerbisRegex) || []).length;
                            }
                        } else if (isSanduche) {
                            // Detección por nomenclatura exacta del servicio
                            const nomenclLower = service.nomenclatura.toLowerCase();
                            const regex = new RegExp(escapeRegExp(nomenclLower), 'i');
                            const hasThisService = regex.test(detalle);
                            count = hasThisService ? 1 : 0;
                        } else if (isRanuraFo) {
                            const ranuraFoRegex = /(?:csranufo|ranurafo|ranurafos|ranufo|ranufos)/gi;
                            count = (detalle.match(ranuraFoRegex) || []).length;
                        } else if (service.tipoCobro === 'unidad') {
                            count = detectarCantidadUnidad(detalle, service.nombreOriginal, service.nomenclatura);
                        } else if (service.nombreOriginal.toLowerCase() === service.nomenclatura.toLowerCase()) {
                            count = matchesNombre ? matchesNombre.length : 0;
                        } else {
                            count = (matchesNombre ? matchesNombre.length : 0) + (matchesNom ? matchesNom.length : 0);
                        }

                        const detLower = detalle.toLowerCase();
                        const isEnchapeButtonActive = detLower.includes('senchamanual') || detLower.includes('enchape manual');
                        const isNarizButtonActive = detLower.includes('nar');
                        // EngNA button detection
                        const isEngnaButtonActive = isEngna && (
                            detLower.includes('engna') || 
                            detLower.includes('engorde') ||
                            (service.aliases && service.aliases.some(a => detLower.includes(a.toLowerCase())))
                        );

                        let forceNariz = isNariz && count === 0 && row.narizCobro !== undefined && row.narizCobro !== '' && isNarizButtonActive;
                        let forceSencha = isSenchaManual && count === 0 && row.enchapeCobro !== undefined && row.enchapeCobro !== '' && isEnchapeButtonActive;
                        let forceEngna = isEngna && count === 0 && row.engnaCobro !== undefined && row.engnaCobro !== '' && isEngnaButtonActive;

                        if (count > 0 || forceNariz || forceSencha || forceEngna) {
                            if (forceNariz || forceSencha) count = 1;
                            const l = parseFloat(row.largo) || 0;
                            const a = parseFloat(row.ancho) || 0;
                            let m = 1;

                            if (isNariz) {
                                // Regex estandarizada para Narices (independiente de nomenclatura de Admin)
                                const baseName = escapeRegExp(service.nombreOriginal.toLowerCase());
                                const baseNom = escapeRegExp(service.nomenclatura.toLowerCase());
                        const baseRegexStr = baseName === baseNom ? baseName : `${baseName}|${baseNom}`;
                                const regexNarizOld = new RegExp(`(${baseRegexStr})(?:\\s*(\\d+)(?:L)?)?`, 'gi');
                                let totalNarizUnits = 0;
                                
                                // Prioridad 1: Sintaxis explícita inyectada por el Modal internamente (Solo si le corresponde a Nariz)
                                if (row.narizCobro !== undefined && row.narizCobro !== '' && isNarizButtonActive) {
                                    totalNarizUnits += parseFloat(row.narizCobro) || 0;
                                }

                                // Prioridad 2: Cálculo algorítmico (Cantos o Literales). Se suma al valor manual si existe.
                                let matchOld;
                                let explicitLiteralsFound = false;
                                while ((matchOld = regexNarizOld.exec(detalle)) !== null) {
                                    let localUnits = 0; // 0 unidades por defecto al mencionar "nariz" (solo activa el servicio en modal)
                                    if (matchOld[1]) { // Captura el número después de la palabra base, ej. "nariz 3L" -> 3
                                        localUnits = parseInt(matchOld[1], 10);
                                        explicitLiteralsFound = true;
                                    }
                                    totalNarizUnits += localUnits;
                                }
                                
                                // Nueva regla: Sumar longitudes de cantos (3 o 4) en milímetros
                                let cantosNarizMm = 0;
                                const validCantosNariz = ['3', '4'];
                                
                                if (validCantosNariz.includes(String(row.l1))) cantosNarizMm += l;
                                if (validCantosNariz.includes(String(row.l2))) cantosNarizMm += l;
                                if (validCantosNariz.includes(String(row.a1))) cantosNarizMm += a;
                                if (validCantosNariz.includes(String(row.a2))) cantosNarizMm += a;
                                
                                // Si se encontró "nariz" en el texto pero sin un número explícito multiplicador (ej. "nariz 3L"),
                                // y hay cantos marcados, calculamos las unidades de Nariz basadas en Metros Lineales (ML) redondeando hacia arriba.
                                if (cantosNarizMm > 0 && !explicitLiteralsFound) {
                                    let unidadesPorMedida = Math.ceil(cantosNarizMm / 1000);
                                    totalNarizUnits += unidadesPorMedida;
                                }
                                
                                serviceTotalInRow += (totalNarizUnits * 1); // 1 = tipo unidad

                            } else if (isSenchaManual) {
                                let totalSenchaMm = 0;
                                
                                // Auto-sum para partes pequeñas <= 119 con cantos '1', '2', '3', '4'
                                const validCantos = ['1', '2', '3', '4'];
                                if (l > 0 && l <= 119) {
                                    if (validCantos.includes(String(row.l1))) totalSenchaMm += l;
                                    if (validCantos.includes(String(row.l2))) totalSenchaMm += l;
                                }
                                if (a > 0 && a <= 119) {
                                    if (validCantos.includes(String(row.a1))) totalSenchaMm += a;
                                    if (validCantos.includes(String(row.a2))) totalSenchaMm += a;
                                }

                                // Lógica de NARIZ para SENCHAMANUAL: cantos 3 o 4 suman milímetros como ML
                                const validCantosNariz = ['3', '4'];
                                let cantosSenchaMm = 0;
                                if (validCantosNariz.includes(String(row.l1))) cantosSenchaMm += l;
                                if (validCantosNariz.includes(String(row.l2))) cantosSenchaMm += l;
                                if (validCantosNariz.includes(String(row.a1))) cantosSenchaMm += a;
                                if (validCantosNariz.includes(String(row.a2))) cantosSenchaMm += a;
                                if (cantosSenchaMm > 0) {
                                    totalSenchaMm += cantosSenchaMm;
                                }

                                // Suma adicional por Circulo (Perimetro completo en mm)
                                const hasCirculo = detalle.toLowerCase().includes('circulo');
                                if (hasCirculo) {
                                    totalSenchaMm += (l * 2) + (a * 2);
                                }

                                // Suma exacta extraida de manigavetas/manichaflan
                                const regexMani = /(?:manigaveta|manichaflan)[\s/xX]*(\d+(?:\.\d+)?)/gi;
                                let matchMani;
                                while ((matchMani = regexMani.exec(detalle)) !== null) {
                                    totalSenchaMm += parseFloat(matchMani[1]) || 0;
                                }

                                // Si el operario usó el botón de Enchape Manual oculto (Solo si le corresponde a Enchape y NO es círculo)
                                if (row.enchapeCobro !== undefined && row.enchapeCobro !== '' && isEnchapeButtonActive && !hasCirculo) {
                                    totalSenchaMm += parseFloat(row.enchapeCobro) || 0;
                                }

                                // Sumamos los milimetros totales convertidos a Metros Lineales.
                                serviceTotalInRow += (totalSenchaMm / 1000); 

                            } else if (isEngna) {
                                // ENGNA (Engorde Nariz): misma lógica que Nariz
                                const baseName = escapeRegExp(service.nombreOriginal.toLowerCase());
                                const baseNom = escapeRegExp(service.nomenclatura.toLowerCase());
                                // Incluir aliases en la detección
                                const aliases = service.aliases || [];
                                const aliasesStr = aliases.map(a => escapeRegExp(a.toLowerCase())).join('|');
                                const baseRegexStr = aliasesStr ? `${baseName}|${baseNom}|${aliasesStr}` : (baseName === baseNom ? baseName : `${baseName}|${baseNom}`);
                                
                                const regexEngnaOld = new RegExp(`(${baseRegexStr})(?:\\s*(\\d+)(?:L)?)?`, 'gi');
                                let totalEngnaUnits = 0;
                                
                                // Alias detection helper
                                const hasEngnaKeyword = (text) => {
                                    const textLower = text.toLowerCase();
                                    if (textLower.includes('engna')) return true;
                                    if (textLower.includes('engorde')) return true;
                                    if (service.nomenclatura.toLowerCase().includes(textLower)) return true;
                                    if (service.nombreOriginal.toLowerCase().includes(textLower)) return true;
                                    if (aliases.some(a => textLower.includes(a.toLowerCase()))) return true;
                                    return false;
                                };
                                const isEngnaButtonActive = hasEngnaKeyword(detalle);
                                
                                // Prioridad 1: Valor manual del modal
                                if (row.engnaCobro !== undefined && row.engnaCobro !== '' && isEngnaButtonActive) {
                                    totalEngnaUnits += parseFloat(row.engnaCobro) || 0;
                                }
                                
                                // Prioridad 2: Cálculo algorítmico (Cantos o Literales)
                                let matchEngna;
                                let explicitLiteralsEngnaFound = false;
                                while ((matchEngna = regexEngnaOld.exec(detalle)) !== null) {
                                    let localUnits = 0;
                                    if (matchEngna[1]) {
                                        localUnits = parseInt(matchEngna[1], 10);
                                        explicitLiteralsEngnaFound = true;
                                    }
                                    totalEngnaUnits += localUnits;
                                }
                                
                                // Calcular por cantos 3 o 4
                                let cantosEngnaMm = 0;
                                const validCantosEngna = ['3', '4'];
                                if (validCantosEngna.includes(String(row.l1))) cantosEngnaMm += l;
                                if (validCantosEngna.includes(String(row.l2))) cantosEngnaMm += l;
                                if (validCantosEngna.includes(String(row.a1))) cantosEngnaMm += a;
                                if (validCantosEngna.includes(String(row.a2))) cantosEngnaMm += a;
                                
                                if (cantosEngnaMm > 0 && !explicitLiteralsEngnaFound) {
                                    let unidadesPorMedida = Math.ceil(cantosEngnaMm / 1000);
                                    totalEngnaUnits += unidadesPorMedida;
                                }
                                
                                serviceTotalInRow += (totalEngnaUnits * 1);

                            } else if (isSanduche) {
                                // SANDUCHE (SRREPEGA, SERVREME): solo cobra cuando hay cantos 3 o 4 marcados
                                const validCantosNariz = ['3', '4'];
                                let cantosSanducheMm = 0;
                                if (validCantosNariz.includes(String(row.l1))) cantosSanducheMm += l;
                                if (validCantosNariz.includes(String(row.l2))) cantosSanducheMm += l;
                                if (validCantosNariz.includes(String(row.a1))) cantosSanducheMm += a;
                                if (validCantosNariz.includes(String(row.a2))) cantosSanducheMm += a;
                                
                                // Solo cobra si hay cantos 3 o 4
                                if (cantosSanducheMm > 0) {
                                    serviceTotalInRow += (cantosSanducheMm / 1000);
                                }

                            } else {
                                switch (service.tipoCobro) {
                                    case 'ml_largo': m = l / 1000; break;
                                    case 'ml_ancho': m = a / 1000; break;
                                    case 'ml_largo_ancho': m = (l + a) / 1000; break;
                                    case 'ml_perimetro': m = ((l * 2) + (a * 2)) / 1000; break;
                                    case 'm2': m = (l / 1000) * (a / 1000); break;
                                    case 'escala_60': m = Math.ceil(Math.max(l, a) / 600) || 1; break;
                                    case 'unidad':
                                    default: m = 1; break;
                                }
                                serviceTotalInRow += (count * m);
                            }
                        }
                    }

                    if (serviceTotalInRow > 0) {
                        sCounts[service.nomenclatura] += (serviceTotalInRow * cant);
                    }
                });
            }
        });
    });

    // Redondear SENCHAMANUAL a unidades al final del despiece
    Object.keys(sCounts).forEach(key => {
        if (key === 'SENCHAMANUAL') {
            sCounts[key] = Math.ceil(sCounts[key] || 0);
        }
    });

    return { totalPieces: piecesCount, serviceCounts: sCounts };
};

// ==================== DESPiece AUTOMÁTICO ====================

export const MODOS_DESPECIE = {
    COCINA: {
        id: 'cocina',
        nombre: 'Cocina Lineal',
        opciones: [
            { id: 1, nombre: 'Opción 1' },
            { id: 2, nombre: 'Opción 2' },
            { id: 3, nombre: 'Opción 3' }
        ]
    },
    CLOSET: {
        id: 'closet',
        nombre: 'Closet Lineal',
        opciones: [
            { id: 1, nombre: 'Opción 1' },
            { id: 2, nombre: 'Opción 2' },
            { id: 3, nombre: 'Opción 3' }
        ]
    },
    CENTRO_TV: {
        id: 'centro_tv',
        nombre: 'Centro de TV',
        opciones: [
            { id: 1, nombre: 'Opción 1' },
            { id: 2, nombre: 'Opción 2' },
            { id: 3, nombre: 'Opción 3' }
        ]
    },
    ESCRITORIO: {
        id: 'escritorio',
        nombre: 'Escritorio Lineal',
        opciones: [
            { id: 1, nombre: 'Opción 1' },
            { id: 2, nombre: 'Opción 2' },
            { id: 3, nombre: 'Opción 3' }
        ]
    }
};

// ==================== REGLAS POR MODO ====================
// EDITAR AQUÍ LAS REGLAS PARA CADA MODO Y OPCIÓN
// Formato: { l1: '1'/'2'/'', l2: '1'/'2'/'', a1: '1'/'2'/'', a2: '1'/'2'/'' }
// '' = sin canto, '1' = canto fino, '2' = canto grueso

const REGLAS_COCINA = {
    1: { // Opción 1: Canto en 1 lado (para muebles altos ancho <= 370)
        Lateral: { l1: '', l2: '1', a1: '', a2: '' },       // Laterales/Divisiones <= 370mm
        ItemPrincipal: { l1: '', l2: '1', a1: '', a2: '' },     // Laterales/Divisiones
        Refuerzo: { l1: '', l2: '1', a1: '', a2: '' },            // Refuerzos
        Base: { l1: '', l2: '1', a1: '1', a2: '1' },              // Base
        Entrepaño: { l1: '', l2: '1', a1: '', a2: '' },           // Entrepaño
        PanelPuerta: { l1: '2', l2: '2', a1: '2', a2: '2' }       // Puertas/Paneles
    },
    2: { // Opción 2: Canto en 1 lado para muebles altos, 2 lados para muebles bajos
        Lateral: { l1: '', l2: '1', a1: '', a2: '' },            // Laterales/Divisiones ancho <= 370mm
        LateralAncho: { l1: '', l2: '1', a1: '1', a2: '' },      // Laterales/Divisiones ancho >= 400mm
        ItemPrincipal: { l1: '', l2: '1', a1: '', a2: '' },     // Laterales/Divisiones
        Refuerzo: { l1: '', l2: '1', a1: '', a2: '' },            // Refuerzos
        Base: { l1: '', l2: '1', a1: '1', a2: '1' },              // Base
        Entrepaño: { l1: '', l2: '1', a1: '', a2: '' },           // Entrepaño
        PanelPuerta: { l1: '2', l2: '2', a1: '2', a2: '2' }       // Puertas/Paneles
    },
    3: { // Opción 3: Canto en todos lados
        ItemPrincipal: { l1: '1', l2: '1', a1: '1', a2: '1' },   // Laterales/Divisores
        Refuerzo: { l1: '1', l2: '1', a1: '1', a2: '1' },         // Refuerzos
        Base: { l1: '1', l2: '1', a1: '1', a2: '1' },             // Base
        Entrepaño: { l1: '1', l2: '1', a1: '1', a2: '1' },        // Entrepaño
        PanelPuerta: { l1: '2', l2: '2', a1: '2', a2: '2' }       // Puertas/Paneles
    }
};

const REGLAS_CLOSET = {
    1: { // Opción 1
        ItemPrincipal: { l1: '1', l2: '', a1: '', a2: '' },
        Refuerzo: { l1: '1', l2: '', a1: '', a2: '' },
        Base: { l1: '1', l2: '', a1: '', a2: '' },
        PanelPuerta: { l1: '1', l2: '', a1: '', a2: '' }
    },
    2: { // Opción 2
        ItemPrincipal: { l1: '1', l2: '1', a1: '', a2: '' },
        Refuerzo: { l1: '1', l2: '1', a1: '', a2: '' },
        Base: { l1: '1', l2: '1', a1: '', a2: '' },
        PanelPuerta: { l1: '1', l2: '1', a1: '', a2: '' }
    },
    3: { // Opción 3
        ItemPrincipal: { l1: '1', l2: '1', a1: '1', a2: '1' },
        Refuerzo: { l1: '1', l2: '1', a1: '1', a2: '1' },
        Base: { l1: '1', l2: '1', a1: '1', a2: '1' },
        PanelPuerta: { l1: '2', l2: '2', a1: '2', a2: '2' }
    }
};

const REGLAS_CENTRO_TV = {
    1: { // Opción 1
        ItemPrincipal: { l1: '1', l2: '', a1: '', a2: '' },
        Refuerzo: { l1: '1', l2: '', a1: '', a2: '' },
        Base: { l1: '1', l2: '', a1: '', a2: '' },
        PanelPuerta: { l1: '1', l2: '', a1: '', a2: '' }
    },
    2: { // Opción 2
        ItemPrincipal: { l1: '1', l2: '1', a1: '', a2: '' },
        Refuerzo: { l1: '1', l2: '1', a1: '', a2: '' },
        Base: { l1: '1', l2: '1', a1: '', a2: '' },
        PanelPuerta: { l1: '1', l2: '1', a1: '', a2: '' }
    },
    3: { // Opción 3
        ItemPrincipal: { l1: '1', l2: '1', a1: '1', a2: '1' },
        Refuerzo: { l1: '1', l2: '1', a1: '1', a2: '1' },
        Base: { l1: '1', l2: '1', a1: '1', a2: '1' },
        PanelPuerta: { l1: '2', l2: '2', a1: '2', a2: '2' }
    }
};

const REGLAS_ESCRITORIO = {
    1: { // Opción 1
        ItemPrincipal: { l1: '1', l2: '', a1: '', a2: '' },
        Refuerzo: { l1: '1', l2: '', a1: '', a2: '' },
        Base: { l1: '1', l2: '', a1: '', a2: '' },
        PanelPuerta: { l1: '1', l2: '', a1: '', a2: '' }
    },
    2: { // Opción 2
        ItemPrincipal: { l1: '1', l2: '1', a1: '', a2: '' },
        Refuerzo: { l1: '1', l2: '1', a1: '', a2: '' },
        Base: { l1: '1', l2: '1', a1: '', a2: '' },
        PanelPuerta: { l1: '1', l2: '1', a1: '', a2: '' }
    },
    3: { // Opción 3
        ItemPrincipal: { l1: '1', l2: '1', a1: '1', a2: '1' },
        Refuerzo: { l1: '1', l2: '1', a1: '1', a2: '1' },
        Base: { l1: '1', l2: '1', a1: '1', a2: '1' },
        PanelPuerta: { l1: '2', l2: '2', a1: '2', a2: '2' }
    }
};

const REGLAS_POR_MODO = {
    COCINA: REGLAS_COCINA,
    CLOSET: REGLAS_CLOSET,
    CENTRO_TV: REGLAS_CENTRO_TV,
    ESCRITORIO: REGLAS_ESCRITORIO
};

const ITEMS_ENTREPANO = ['ENTREPANO', 'ENTREP;A', 'REPISA'];
const ITEMS_REFUERZO = ['REFUERZO_SUPERIOR', 'REFUERZO_TRASERO', 'TRAVESSA_CONNARIZ_VERTICAL', 'TRAVESSA_CONNARIZ_HORIZONTAL', 'COMP REF', 'COMPREF'];
const ITEMS_BASE = ['BASE'];
const ITEMS_PANEL_PUERTA = ['PANELCAJON', 'PUERTA'];
const ITEMS_LATERAL_DIVISION = ['LATERAL', 'LAT_IZQ', 'LAT_DER', 'DIVISIÓN', 'DIVISION', 'DIV'];

export const aplicarDespieceAutomatico = (filas, modo, opcion, reglasPersonalizadas = null) => {
    if (!filas || !Array.isArray(filas) || !modo || opcion < 1 || opcion > 3) {
        return filas;
    }

    // Normalizar modo a mayúsculas para acceder a las reglas correctamente
    const modoMayus = modo.toUpperCase();
    
    // Si hay reglas personalizadas del usuario, usarlas en lugar de las predefinidas
    if (reglasPersonalizadas && Array.isArray(reglasPersonalizadas) && reglasPersonalizadas.length > 0) {
        return filas.map(fila => {
            const detalle = (fila.detalle || '').toUpperCase();
            
            // Buscar si la pieza coincide con algún tipo definido por el usuario
            const reglaEncontrada = reglasPersonalizadas.find(regla => 
                detalle.includes(regla.tipo.toUpperCase())
            );
            
            if (reglaEncontrada) {
                return {
                    ...fila,
                    l1: reglaEncontrada.l1 ? '1' : '',
                    l2: reglaEncontrada.l2 ? '1' : '',
                    a1: reglaEncontrada.a1 ? '1' : '',
                    a2: reglaEncontrada.a2 ? '1' : '',
                };
            }
            
            return fila;
        });
    }
    
    // Obtener las reglas para el modo seleccionado (lógica original)
    const reglasModo = REGLAS_POR_MODO[modoMayus];
    if (!reglasModo) {
        return filas;
    }

    const reglasOpcion = reglasModo[opcion];
    if (!reglasOpcion) {
        return filas;
    }

    return filas.map(fila => {
        const detalle = (fila.detalle || '').toUpperCase();
        const ancho = parseInt(fila.ancho, 10) || 0;
        
        const esEntrepaño = ITEMS_ENTREPANO.some(item => detalle.includes(item));
        const esRefuerzo = ITEMS_REFUERZO.some(item => detalle.includes(item));
        const esBase = ITEMS_BASE.some(item => detalle.includes(item));
        const esPanelPuerta = ITEMS_PANEL_PUERTA.some(item => detalle.includes(item));
        const esLateralDivision = ITEMS_LATERAL_DIVISION.some(item => detalle.includes(item));
        
        // Determinar qué tipo de regla aplicar
        // Laterales/Divisiones tienen lógica especial según ancho y opción
        let tipo = 'ItemPrincipal';
        
        if (esPanelPuerta) {
            tipo = 'PanelPuerta';
        } else if (esRefuerzo) {
            tipo = 'Refuerzo';
        } else if (esBase) {
            tipo = 'Base';
        } else if (esEntrepaño) {
            tipo = 'Entrepaño';
        } else if (esLateralDivision) {
            // Laterales/Divisiones: lógica especial según ancho
            // Si ancho >= 400mm, aplica regla de 2 lados (para opción 1, 2 y 3)
            // Si ancho < 400mm, aplica regla de 1 lado
            if (ancho >= 400) {
                tipo = 'LateralAncho';
            } else {
                tipo = 'Lateral';
            }
        }
        
        // Obtener la regla específica
        const regla = reglasOpcion[tipo] || reglasOpcion.ItemPrincipal || { l1: '', l2: '', a1: '', a2: '' };
        
        return { 
            ...fila, 
            l1: regla.l1 || '', 
            l2: regla.l2 || '', 
            a1: regla.a1 || '', 
            a2: regla.a2 || '' 
        };
    });
};

export const getVistaPreviaDespieceAuto = (filas, modo, opcion) => {
    if (!filas || !Array.isArray(filas)) return [];
    
    // Normalizar modo a mayúsculas para acceder a las reglas correctamente
    const modoMayus = modo ? modo.toUpperCase() : '';
    
    const reglasModo = REGLAS_POR_MODO[modoMayus];
    if (!reglasModo) return [];
    
    const reglasOpcion = reglasModo[opcion];
    if (!reglasOpcion) return [];
    
    const examples = [];
    
    // Tipos a mostrar en la vista previa
    const tiposMostrar = ['Lateral', 'LateralAncho', 'Refuerzo', 'Base', 'Entrepaño', 'PanelPuerta'];
    
    tiposMostrar.forEach(tipo => {
        const regla = reglasOpcion[tipo];
        if (regla) {
            // Mapear nombres para mostrar
            const nombreMostrar = tipo === 'Lateral' ? 'Lateral/División' 
                : tipo === 'LateralAncho' ? 'Lateral/División'
                : tipo === 'PanelPuerta' ? 'Panel/Puerta' 
                : tipo;
            
            examples.push({ 
                tipo: nombreMostrar, 
                l1: regla.l1 || '', 
                l2: regla.l2 || '', 
                a1: regla.a1 || '', 
                a2: regla.a2 || '' 
            });
        }
    });
    
    return examples;
};
