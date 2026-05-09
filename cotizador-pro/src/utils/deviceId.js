/**
 * HID legacy basado en fingerprint de renderer.
 * Se mantiene solo para migración retrocompatible.
 */
export const generateLegacyDeviceId = () => {
  try {
    const deviceInfo = [
      typeof navigator !== 'undefined' ? (navigator.platform || 'unknown') : 'unknown',
      typeof navigator !== 'undefined' ? (navigator.userAgent || 'unknown') : 'unknown',
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '1920x1080',
      new Date().getTimezoneOffset().toString()
    ].join('|')

    let hash = 0
    for (let i = 0; i < deviceInfo.length; i++) {
      const char = deviceInfo.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    const uniqueId = Math.abs(hash).toString(16).padStart(12, '0').toUpperCase()
    return `HID-${uniqueId}`
  } catch (err) {
    console.error('[DeviceId] Legacy error:', err)
    return `HID-${Date.now().toString(16).toUpperCase()}`
  }
}

export const getDeviceIds = async () => {
  const legacyHid = generateLegacyDeviceId()

  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getStableHid) {
      const stableHid = await window.electronAPI.getStableHid()
      return {
        hid: stableHid || legacyHid,
        stableHid: stableHid || legacyHid,
        legacyHid,
      }
    }
  } catch (err) {
    console.error('[DeviceId] Stable HID error:', err)
  }

  return {
    hid: legacyHid,
    stableHid: legacyHid,
    legacyHid,
  }
}

export const generateDeviceId = () => generateLegacyDeviceId()

export const getDeviceId = async () => {
  const ids = await getDeviceIds()
  return ids.hid
}
