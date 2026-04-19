// src/data/defaultServicios.js
/**
 * Servicios por defecto para NestxCut
 * El usuario puede editarlos o agregar más desde Settings
 * 
 * Estructura:
 * - nombre: nombre del servicio
 * - descripcion: descripción opcional
 * - atributos: lista de formas de cobro [{ tipo, precio, medida?, lados? }]
 * 
 * Tipos de atributo:
 * - unidad: por unidad
 * - ml: metro lineal (medida: largo, ancho, suma)
 * - m2: metro cuadrado
 * - cantidad: cantidad específica (x1, x2, x3)
 * - lados: lados (2L, 3L, 4L)
 * - canto: cantos marcados (L1, L2, A1, A2)
 * - escala_60: escala hasta 60cm
 * - escala_120: escala hasta 120cm
 */

export const DEFAULT_SERVICIOS = [
  {
    nombre: 'Pegado',
    descripcion: 'Pegado de canto',
    atributos: [
      { tipo: 'ml', precio: 1500, medida: 'largo' },
      { tipo: 'cantidad', precio: 800 }
    ]
  },
  {
    nombre: 'Nariz',
    descripcion: 'Nariz de recubrimiento',
    atributos: [
      { tipo: 'ml', precio: 1200, medida: 'largo' },
      { tipo: 'lados', precio: 500 }
    ]
  },
  {
    nombre: 'Caja',
    descripcion: 'Caja básica',
    atributos: [
      { tipo: 'cantidad', precio: 5000 }
    ]
  },
  {
    nombre: 'Enchape',
    descripcion: 'Enchape de canto',
    atributos: [
      { tipo: 'ml', precio: 1800, medida: 'largo' },
      { tipo: 'm2', precio: 25000 }
    ]
  },
  {
    nombre: 'Calado',
    descripcion: 'Corte especial',
    atributos: [
      { tipo: 'escala_60', precio: 800 },
      { tipo: 'escala_120', precio: 1200 }
    ]
  },
  {
    nombre: 'Ranurado',
    descripcion: 'Ranura para panel',
    atributos: [
      { tipo: 'ml', precio: 1000, medida: 'largo' }
    ]
  },
  {
    nombre: 'Canto',
    descripcion: 'Aplicación de canto',
    atributos: [
      { tipo: 'canto', precio: 600, lados: ['L1', 'L2', 'A1', 'A2'] }
    ]
  },
  {
    nombre: 'Caja InglESA',
    descripcion: 'Caja inglesa completa',
    atributos: [
      { tipo: 'cantidad', precio: 8000 }
    ]
  },
  {
    nombre: 'Manija',
    descripcion: 'Instalación de manija',
    atributos: [
      { tipo: 'cantidad', precio: 500 }
    ]
  },
  {
    nombre: 'Cajón',
    descripcion: 'Cajón completo',
    atributos: [
      { tipo: 'cantidad', precio: 6000 }
    ]
  }
];

export default DEFAULT_SERVICIOS;