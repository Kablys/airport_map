import { serve } from "https://deno.land/std@0.220.1/http/server.ts";
import { serveDir } from "https://deno.land/std@0.220.1/http/file_server.ts";
import { join } from "https://deno.land/std@0.220.1/path/mod.ts";

const port = 8000;

/**
 * Serves the Airport Map application using Deno's HTTP server
 * 
 * @param req - The HTTP request
 * @returns Response object
 */
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Serve static files from the current directory
  return await serveDir(req, {
    fsRoot: Deno.cwd(),
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
}

console.log(`HTTP server running at http://localhost:${port}`);
await serve(handler, { port });