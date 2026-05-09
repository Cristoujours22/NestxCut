const validInvokeChannels = [
  'get-company-settings',
  'save-company-settings',
  'get-env',
  'open-external',
  'get-projects',
  'get-project',
  'save-project',
  'delete-project',
  'get-client-by-document',
  'save-client',
  'get-servicios',
  'get-servicio',
  'add-servicio',
  'update-servicio',
  'delete-servicio',
  'get-inventory-items',
  'get-inventory-purchases',
  'save-inventory-purchase',
  'receive-inventory-purchase',
  'get-inventory-providers',
  'save-inventory-provider',
  'delete-inventory-provider',
  'add-inventory-item',
  'update-inventory-item',
  'delete-inventory-item',
  'get-inventory-movements',
  'add-inventory-movement',
];

const validSendChannels = [];
const validOnChannels = [];

module.exports = {
  validInvokeChannels,
  validSendChannels,
  validOnChannels,
};
