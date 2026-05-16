const LdapStrategy = require('passport-ldapauth');
const config = require('./config');

module.exports = function setupPassport(passport) {
  passport.use(
    new LdapStrategy({
      server: {
        url: config.ldap.url,
        bindDN: config.ldap.bindDN,
        bindCredentials: config.ldap.bindCredentials,
        searchBase: config.ldap.searchBase,
        searchFilter: config.ldap.searchFilter,
        searchScope: 'sub',
        tlsOptions: { rejectUnauthorized: false },
        // reconnect must be off for LDAPS — it breaks the TLS session on rebind
      },
    })
  );

  passport.serializeUser((user, done) => {
    done(null, {
      dn: user.dn,
      username: user.sAMAccountName,
      displayName: user.displayName || user.cn || user.sAMAccountName,
    });
  });

  passport.deserializeUser((user, done) => done(null, user));
};
