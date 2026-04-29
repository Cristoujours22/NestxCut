// src/data/defaultServicios.js
/**
 * Servicios por defecto para NestxCut
 * El usuario puede editarlos o agregar más desde Settings
 * 
 * Estructura:
 * - nombre: nombre del servicio
 * - precio: valor base del servicio
 * - descripcion: descripción opcional
 * - atributos: lista de formas de cobro [{ tipo, medida?, lados? }]
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
    precio: 1500,
    descripcion: 'Pegado de canto',
    atributos: [
      { tipo: 'ml', medida: 'largo' },
      { tipo: 'cantidad' }
    ]
  },
  {
    nombre: 'Nariz',
    precio: 1200,
    descripcion: 'Nariz de recubrimiento',
    atributos: [
      { tipo: 'ml', medida: 'largo' },
      { tipo: 'lados' }
    ]
  },
  {
    nombre: 'Caja',
    precio: 5000,
    descripcion: 'Caja básica',
    atributos: [
      { tipo: 'cantidad' }
    ]
  },
  {
    nombre: 'Enchape',
    precio: 1800,
    descripcion: 'Enchape de canto',
    atributos: [
      { tipo: 'ml', medida: 'largo' },
      { tipo: 'm2' }
    ]
  },
  {
    nombre: 'Calado',
    precio: 800,
    descripcion: 'Corte especial',
    atributos: [
      { tipo: 'escala_60' },
      { tipo: 'escala_120' }
    ]
  },
  {
    nombre: 'Ranurado',
    precio: 1000,
    descripcion: 'Ranura para panel',
    atributos: [
      { tipo: 'ml', medida: 'largo' }
    ]
  },
  {
    nombre: 'Canto',
    precio: 600,
    descripcion: 'Aplicación de canto',
    atributos: [
      { tipo: 'canto', lados: ['L1', 'L2', 'A1', 'A2'] }
    ]
  },
  {
    nombre: 'Caja InglESA',
    precio: 8000,
    descripcion: 'Caja inglesa completa',
    atributos: [
      { tipo: 'cantidad' }
    ]
  },
  {
    nombre: 'Manija',
    precio: 500,
    descripcion: 'Instalación de manija',
    atributos: [
      { tipo: 'cantidad' }
    ]
  },
  {
    nombre: 'Cajón',
    precio: 6000,
    descripcion: 'Cajón completo',
    atributos: [
      { tipo: 'cantidad' }
    ]
  }
];

export default DEFAULT_SERVICIOS;
