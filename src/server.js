const express = require('express');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const setupPassport = require('./auth');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(morgan('combined'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

setupPassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/index'));
app.use('/pdf', require('./routes/pdf'));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('error', { message: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`PDF QR Server running on port ${config.port}`);
  console.log(`Base URL for QR codes: ${config.baseUrl}`);
});
