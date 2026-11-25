import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const port = Number(process.env.PORT || 10000)
const distDir = join(process.cwd(), 'dist')
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

createServer(async (request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify({ status: 'ok', service: 'farmacia-essencial' }))
    return
  }

  try {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname
    let filePath = join(distDir, normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, ''))
    if (!filePath.startsWith(distDir)) throw new Error('Invalid path')
    try {
      if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html')
      await stat(filePath)
    } catch {
      filePath = join(distDir, 'index.html')
    }
    const body = await readFile(filePath)
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' })
    response.end(body)
  } catch (error) {
    console.error('Server error:', error)
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Erro interno do servidor')
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Farmacia Essencial listening on port ${port}`)
})
