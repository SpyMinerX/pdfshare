require('dotenv').config();

const port = process.env.PORT || 3000;

module.exports = {
  port,
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  isProduction: process.env.NODE_ENV === 'production',
  baseUrl: process.env.BASE_URL || `http://localhost:${port}`,

  ldap: {
    url: process.env.LDAP_URL,
    bindDN: process.env.LDAP_BIND_DN,
    bindCredentials: process.env.LDAP_BIND_CREDENTIALS,
    searchBase: process.env.LDAP_SEARCH_BASE,
    searchFilter: process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})',
    allowedGroup: process.env.LDAP_ALLOWED_GROUP || null,
  },

};
