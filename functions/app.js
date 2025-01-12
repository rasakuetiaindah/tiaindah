// require('dotenv').config();
// const createError = require('http-errors');
// const express = require('express');
// const path = require('path');
// const cookieParser = require('cookie-parser');
// const logger = require('morgan');
// const serverless = require('serverless-http');

// const indexRouter = require('../routes/index');
// const usersRouter = require('../routes/users');

// const app = express();


// // View engine setup
// // app.set('views', path.join(__dirname, '../views')); // Adjust path to views
// // app.set('view engine', 'ejs');

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, '../public'))); // Adjust path to public

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// // Catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // Error handler
// app.use(function(err, req, res, next) {
//   // Set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // Render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

// // Export the handler for Netlify Functions
// module.exports.handler = serverless(app);

require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const serverless = require('serverless-http');

const indexRouter = require('../routes/index');
const usersRouter = require('../routes/users');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json('error');
});

// Export the app as a serverless function
module.exports.handler = serverless(app);