// middleware/errorHandler.js

/**
 * ERROR HANDLER MIDDLEWARE
 *
 * Purpose: Catch ANY error thrown anywhere in your app
 * and return a clean, consistent error response.
 *
 * CRITICAL RULES:
 * 1. Must have EXACTLY 4 parameters (err, req, res, next)
 *    Express identifies error handlers by the 4 params.
 *    If you write 3 params, it won't work as error handler.
 *
 * 2. Must be registered LAST in app.js, after all routes
 *    and after the notFound middleware.
 *
 * 3. Is triggered when anyone calls next(error) with
 *    an argument, or when you throw inside an async route.
 *
 * How errors reach here:
 *   - next(new Error('something broke'))  ← explicit
 *   - throw new Error('something broke')  ← in try/catch
 */

const errorHandler = (err, req, res, next) => {

  // Log the full error to the console (server side only)
  // Never send the full stack trace to the client
  console.error('--- ERROR ---');
  console.error(`Message: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  console.error('-------------');

  /**
   * Determine the status code.
   *
   * Some errors come with a statusCode property.
   * For example: const err = new Error('Not found');
   *              err.statusCode = 404;
   *
   * If no statusCode is set, default to 500
   * (Internal Server Error)
   */
  const statusCode = err.statusCode || 500;

  /**
   * In production: hide internal error details from client
   * In development: show the actual message for debugging
   *
   * process.env.NODE_ENV is set in your .env file
   */
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: 'error',
    statusCode: statusCode,
    message: isProduction && statusCode === 500
      ? 'Internal server error'    // hide details in production
      : err.message,               // show details in development
    ...(isProduction ? {} : { stack: err.stack }) // show stack in dev only
  });
};

module.exports = errorHandler;