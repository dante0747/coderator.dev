#!/usr/bin/env node
'use strict';

/**
 * Minimal static file server for local preview.
 * Serves the dist/ directory at http://localhost:3000
 *
 * Usage:  node serve.js          (default port 3000)
 *         PORT=8080 node serve.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function send(res, status, filePath) {
  const body = fs.readFileSync(filePath);
  res.writeHead(status, {
    'Content-Type':   mimeFor(filePath),
    'Content-Length': body.length,
    'Cache-Control':  'no-cache',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // Strip query string
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let target   = path.join(DIST, urlPath);

  // Directory → try index.html inside it
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }

  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    send(res, 200, target);
    return;
  }

  // Serve custom 404 page
  const notFoundPage = path.join(DIST, '404.html');
  if (fs.existsSync(notFoundPage)) {
    send(res, 404, notFoundPage);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 – Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🌐  Serving http://localhost:${PORT}\n`);
  console.log('    Press Ctrl+C to stop.\n');
});

