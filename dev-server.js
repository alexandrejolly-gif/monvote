import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
async function loadEnv() {
  try {
    const envContent = await readFile(join(__dirname, '.env'), 'utf-8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
    console.log('✅ Environment variables loaded from .env');
  } catch (error) {
    console.warn('⚠️  No .env file found');
  }
}

await loadEnv();

const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle favicon.ico
  if (req.url === '/favicon.ico') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Handle API routes
  if (req.url.startsWith('/api/')) {
    try {
      // Parse URL and query params
      const urlParts = req.url.split('?');
      const pathname = urlParts[0];
      const queryString = urlParts[1] || '';
      const queryParams = {};
      if (queryString) {
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          queryParams[decodeURIComponent(key)] = decodeURIComponent(value);
        });
      }

      const apiPath = pathname.replace('/api/', '');
      const pathParts = apiPath.split('/');

      // Try to find handler with dynamic routes
      let handlerPath = null;
      let dynamicParams = {};

      // Try exact match first
      let testPath = join(__dirname, 'api', apiPath + '.js');
      try {
        await readFile(testPath);
        handlerPath = testPath;
      } catch {
        // Try with dynamic routes like [code].js, [slug].js
        for (let i = pathParts.length; i > 0; i--) {
          const baseParts = pathParts.slice(0, i - 1);
          const dynamicValue = pathParts[i - 1];
          const dynamicPath = join(__dirname, 'api', ...baseParts, '[code].js');

          try {
            await readFile(dynamicPath);
            handlerPath = dynamicPath;
            dynamicParams.code = dynamicValue;
            break;
          } catch {
            // Try other dynamic patterns
            const slugPath = join(__dirname, 'api', ...baseParts, '[slug].js');
            try {
              await readFile(slugPath);
              handlerPath = slugPath;
              dynamicParams.slug = dynamicValue;
              break;
            } catch {
              // Try [commune].js pattern
              const communePath = join(__dirname, 'api', ...baseParts, '[commune].js');
              try {
                await readFile(communePath);
                handlerPath = communePath;
                dynamicParams.commune = dynamicValue;
                break;
              } catch {
                continue;
              }
            }
          }
        }
      }

      if (!handlerPath) {
        throw new Error(`No handler found for ${pathname}`);
      }

      // Dynamic import of API handler (convert to file:// URL for Windows)
      const handlerURL = pathToFileURL(handlerPath).href;
      const handler = await import(handlerURL);
      const mockReq = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: null,
        query: { ...queryParams, ...dynamicParams }
      };

      // Read body for POST requests
      if (req.method === 'POST' || req.method === 'PUT') {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        mockReq.body = JSON.parse(Buffer.concat(chunks).toString());
      }

      const mockRes = {
        status: (code) => {
          res.statusCode = code;
          return mockRes;
        },
        setHeader: (name, value) => {
          res.setHeader(name, value);
          return mockRes;
        },
        json: (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        },
        send: (data) => {
          res.end(data);
        },
        end: (data) => {
          res.end(data);
        }
      };

      await handler.default(mockReq, mockRes);
    } catch (error) {
      console.error('API Error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Handle static files
  let filePath = join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

  // Handle admin routes
  if (req.url.startsWith('/admin')) {
    filePath = join(__dirname, 'admin', req.url === '/admin' || req.url === '/admin/' ? 'index.html' : req.url.replace('/admin/', ''));
  }

  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.statusCode = 404;
      res.end('File not found');
    } else {
      res.statusCode = 500;
      res.end('Server error');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📱 Public app: http://localhost:${PORT}`);
  console.log(`⚙️  Admin: http://localhost:${PORT}/admin`);
  console.log(`🔌 API: http://localhost:${PORT}/api/*\n`);
});
