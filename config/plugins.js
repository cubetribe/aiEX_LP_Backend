module.exports = {
  // Explicitly disable problematic plugins
  documentation: {
    enabled: false,
  },
  
  graphql: {
    enabled: false,
  },
  
  // Keep other essential plugins
  'users-permissions': {
    enabled: true,
  },
  
  i18n: {
    enabled: true,
  },
};