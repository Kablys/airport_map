import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer, Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookup } from 'mrmime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try to use the specified port, or find an available one
const getPort = (defaultPort = 8000) => {
  const server = new Server();
  return new Promise<number>((resolve) => {
    server.listen(defaultPort, '0.0.0.0', () => {
      const address = server.address();
      const port = typeof address === 'string' ? defaultPort : address?.port || defaultPort;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // If the port is in use, try the next one
      resolve(getPort(defaultPort + 1));
    });
  });
};

const PORT = process.env.PORT ? parseInt(process.env.PORT) : await getPort();

/**
 * Serves static files with proper MIME types and caching headers
 */
async function serveStaticFile(filePath: string): Promise<Response> {
  try {
    // Handle directory requests by appending index.html
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      // Update stats for the new file path
      await stat(filePath);
    }

    const ext = path.extname(filePath).toLowerCase();
    let mimeType = lookup(ext);

    // Set proper MIME types for common file types
    if (!mimeType) {
      if (ext === '.js') {
        mimeType = 'application/javascript';
      } else if (ext === '.css') {
        mimeType = 'text/css';
      } else if (ext === '.json') {
        mimeType = 'application/json';
      } else if (ext === '.html') {
        mimeType = 'text/html';
      } else if (ext === '.svg') {
        mimeType = 'image/svg+xml';
      } else {
        mimeType = 'application/octet-stream';
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    };

    // For JavaScript files, add CORS headers if needed
    if (ext === '.js') {
      headers['Access-Control-Allow-Origin'] = '*';
    }

    const fileStream = createReadStream(filePath);

    return new Response(fileStream as any, {
      headers,
    });
  } catch (error: unknown) {
    console.error('Error serving file:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return new Response('Not Found', { status: 404 });
    }
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

// Determine if we're in development mode
const isDev = process.env.NODE_ENV !== 'production';

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Bad Request');
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;

    // Default to index.html for root path
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // In development, serve from root directory
    // In production, serve from dist directory
    const basePath = isDev ? process.cwd() : path.join(process.cwd(), 'dist');
    let filePath = path.join(basePath, pathname);

    // Special handling for service worker in development
    if (isDev && pathname.endsWith('service-worker.js')) {
      filePath = path.join(process.cwd(), 'dist', 'service-worker.js');
    }

    // Try to serve the file
    try {
      const response = await serveStaticFile(filePath);

      // Set CORS headers
      const headers: Record<string, string> = {
        ...Object.fromEntries(response.headers.entries()),
        'Access-Control-Allow-Origin': '*',
      };

      // Special headers for service worker
      if (pathname.endsWith('service-worker.js')) {
        headers['Service-Worker-Allowed'] = '/';
        headers['Content-Type'] = 'application/javascript';
      }

      // Copy response headers
      for (const [key, value] of Object.entries(headers)) {
        if (value) {
          res.setHeader(key, value);
        }
      }

      res.statusCode = response.status;

      // Handle the response body
      if (response.body) {
        const reader = response.body.getReader();

        const write = async () => {
          try {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(value);
            write();
          } catch (error) {
            console.error('Error writing response:', error);
            res.end();
          }
        };

        write();
      } else {
        res.end();
      }
    } catch (error) {
      console.error('Error serving file:', error);
      res.statusCode = 404;
      res.end('Not Found');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
