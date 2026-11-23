import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { fixture } from './proof-fixture.mjs'

const [directory = 'dist', port = '4176'] = process.argv.slice(2)
const root = resolve(directory)
const types = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost')
  if (pathname.startsWith('/api/')) {
    const result = fixture(pathname.slice(4))
    response.writeHead(result.status ?? 200, { 'content-type': result.contentType ?? 'application/json' })
    response.end(result.body ?? JSON.stringify(result.json))
    return
  }

  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
  if (!file.startsWith(root + sep)) {
    response.writeHead(404).end()
    return
  }
  try {
    const bytes = await readFile(file)
    const extension = extname(file)
    const accept = request.headers['accept-encoding'] ?? ''
    const compressible = ['.css', '.js', '.html'].includes(extension)
    const encoding = compressible && accept.includes('br') ? 'br'
      : compressible && accept.includes('gzip') ? 'gzip' : null
    const payload = encoding === 'br'
      ? brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
      : encoding === 'gzip' ? gzipSync(bytes) : bytes
    response.writeHead(200, {
      'content-type': types[extension] ?? 'application/octet-stream',
      'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'vary': 'accept-encoding',
      ...(encoding ? { 'content-encoding': encoding } : {}),
    })
    response.end(payload)
  } catch {
    response.writeHead(404).end()
  }
}).listen(Number(port), '127.0.0.1')
