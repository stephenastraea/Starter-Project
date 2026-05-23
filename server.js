import { createServer } from 'node:http';

const port = process.env.PORT || 3000;

const server = createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('hello world');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
