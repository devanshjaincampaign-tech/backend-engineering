// middleware/notFound.js

/**
 * NOT FOUND MIDDLEWARE
 *
 * Purpose: Catch requests to routes that don't exist
 * and return a proper 404 response.
 *
 * This MUST be placed after all your routes in app.js.
 * Why? Because Express matches routes top to bottom.
 * If no route matched, this middleware catches it.
 *
 * Without this: Express sends an ugly HTML error page.
 * With this: You return clean JSON that frontend can handle.
 */

const notFound = (req, res, next) => {

  // Build a helpful error message
  const error = {
    status: 404,
    error: 'Route Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    availableRoutes: [
      'GET  /api/users',
      'GET  /api/users/:id',
      'POST /api/users',
      'GET  /health'
    ]
  };

  res.status(404).json(error);
};

module.exports = notFound;