function createLicensingApi(ipcRenderer) {
  return {
    getPlans: () => ipcRenderer.invoke('get-plans'),
    getLicenseStatus: (userId) => ipcRenderer.invoke('get-license-status', userId),
    activateLicense: (userId, licenseKey) => ipcRenderer.invoke('activate-license', userId, licenseKey),
    applyPromoCode: (code, planId) => ipcRenderer.invoke('apply-promo-code', code, planId),
    getCompanySettings: () => ipcRenderer.invoke('get-company-settings'),
    saveCompanySettings: (settings) => ipcRenderer.invoke('save-company-settings', settings),
    generateLicenseKey: () => ipcRenderer.invoke('generate-license-key'),
    getPaddleConfig: () => ipcRenderer.invoke('get-env'),
    licensingGetStatus: (payload) => ipcRenderer.invoke('licensing:getStatus', payload),
    licensingPurchase: (payload) => ipcRenderer.invoke('licensing:purchase', payload),
    licensingUpgrade: (payload) => ipcRenderer.invoke('licensing:upgrade', payload),
    licensingApplyPromo: (payload) => ipcRenderer.invoke('licensing:applyPromo', payload),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    activateLicenseAfterPayment: (paymentData) => ipcRenderer.invoke('activate-license-after-payment', paymentData),
  };
}

module.exports = { createLicensingApi };
