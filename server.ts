// Simple HTTP server for the Airport Map application
// @deno-types="./deno.d.ts"
/// <reference no-default-lib="true" />
/// <reference lib="deno.window" />

const port = 8000;

// MIME types for different file extensions
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

// Simple file server handler
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  
  // Security: Prevent directory traversal
  if (pathname.includes('../') || pathname.includes('..\\')) {
    return new Response('Invalid path', { status: 400 });
  }

  // Default to index.html for client-side routing
  if (!pathname.includes('.')) {
    pathname = '/index.html';
  }

  try {
    // Try to open the file
    const filePath = `.${pathname}`;
    const file = await Deno.open(filePath, { read: true });
    const fileInfo = await file.stat();
    
    if (fileInfo.isDirectory) {
      file.close();
      return new Response('Directory listing not allowed', { status: 403 });
    }

    // Get file extension for MIME type
    const ext = pathname.slice(pathname.lastIndexOf('.'));
    const contentType = MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream';

    // Create a response with the file content
    const headers = new Headers();
    headers.set('content-type', contentType);
    headers.set('cache-control', 'public, max-age=3600');

    // For JavaScript files, ensure they're served with the correct MIME type
    if (ext.toLowerCase() === '.js' || ext.toLowerCase() === '.mjs') {
      headers.set('content-type', 'application/javascript; charset=utf-8');
    }

    // Return the file with appropriate headers
    return new Response(file.readable, { headers });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`File not found: ${pathname}`);
      return new Response('File not found', { status: 404 });
    }
    
    console.error('Error handling request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Start the server using Deno.serve
console.log(`🛫 Airport Map server running on http://localhost:${port}`);

// Use the modern Deno.serve API
Deno.serve({ port }, handleRequest);

export {}; // Make this a module