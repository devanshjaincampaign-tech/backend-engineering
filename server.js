// server.js
// Raw Node.js HTTP server — no frameworks
const http = require('http');

const server = http.createServer((req, res) => {

  // Log every incoming request
  console.log(`${new Date().toISOString()} — ${req.method} ${req.url}`);

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString()
    }));
    return; // stop here — don't fall through to 404
  }

  if (req.method === 'GET' && req.url === '/hello') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Hello from raw Node.js!' }));
    return;
  }

  // Default — 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Route not found' }));
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});