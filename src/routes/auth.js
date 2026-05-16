const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.render('login', { error: req.query.error || null });
});

router.post('/login', (req, res, next) => {
  if (req.body.username) {
    req.body.username = req.body.username.replace(/^.*\\/, '').replace(/@.*$/, '');
  }

  passport.authenticate('ldapauth', (err, user, info) => {
    if (err) {
      const isConnErr = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';
      console.error('[LDAP] login error for "%s": %s (code=%s)', req.body.username, err.message, err.code);
      return res.redirect('/login?error=' + (isConnErr ? 'server' : '1'));
    }
    if (!user) {
      const reason = info && info.message === 'forbidden' ? 'forbidden' : '1';
      console.warn('[LDAP] access denied for "%s" (reason=%s)', req.body.username, reason);
      return res.redirect('/login?error=' + reason);
    }

    console.log('[LDAP] authenticated:', user.sAMAccountName || user.dn);
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.redirect(returnTo);
      });
    });
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

module.exports = router;
