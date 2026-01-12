import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import mime from 'mime-types'

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const segments = params.path
    if (!segments || segments.length === 0) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    const demoName = segments[0]
    const relativePath = segments.slice(1).join('/') || 'index.html' // Default to index.html if just folder

    // 1. Check Cookies for Auth
    const cookieName = `access_${require('crypto').createHash('md5').update(demoName).digest('hex')}`
    const authCookie = request.cookies.get(cookieName)

    // Check if asset is public (exception for thumbnails or specific assets if needed)
    const isPublic = relativePath.toLowerCase().endsWith('thumb.jpg');

    if (!isPublic && (!authCookie || authCookie.value !== 'granted')) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // 2. Resolve File Path
    // Using process.cwd() to get root, then demos_data
    const demosRoot = path.join(process.cwd(), 'demos_data')

    // Security: Prevent traversal
    const requestedPath = path.join(demosRoot, demoName, relativePath)
    if (!requestedPath.startsWith(demosRoot)) {
        return NextResponse.json({ error: 'Access Denied' }, { status: 403 })
    }

    // Check if it exists
    // Handle directories -> look for index.html/php (PHP not supported natively in this node logic, but we assume static now as per convert request)
    // If it was PHP, we can't easily run it. User said "convert php to next js". We assume demos are HTML/JS. 
    // If they strictly need PHP demos to run, Next.js can't execute them. Vercel PHP runtime could, but mixing them is hard.
    // Assuming demos are HTML/JS for now as per "html java css se rhega" comment.

    let filePath = requestedPath
    let stats: fs.Stats;

    try {
        if (!fs.existsSync(filePath)) {
            // Try adding index.html if it's a directory like /demos/MyDemo/
            const indexTry = path.join(filePath, 'index.html');
            if (fs.existsSync(indexTry)) {
                filePath = indexTry;
            } else {
                return NextResponse.json({ error: 'File not found' }, { status: 404 })
            }
        }

        stats = fs.statSync(filePath)
        if (stats.isDirectory()) {
            const indexTry = path.join(filePath, 'index.html');
            if (fs.existsSync(indexTry)) {
                filePath = indexTry;
            } else {
                return NextResponse.json({ error: 'Directory listing not allowed' }, { status: 403 })
            }
        }
    } catch (e) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // 3. Serve File
    const fileContent = fs.readFileSync(filePath)
    const contentType = mime.lookup(filePath) || 'application/octet-stream'

    // 4. Inject Protection JS if HTML
    if (contentType.includes('text/html')) {
        let html = fileContent.toString('utf-8')
        if (!html.includes('advanced-protection.js')) {
            const scriptTag = '<script src="/advanced-protection.js"></script>'
            if (html.includes('</body>')) {
                html = html.replace('</body>', `${scriptTag}</body>`)
            } else {
                html += scriptTag
            }
        }

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=3600'
            }
        })
    }

    return new NextResponse(fileContent, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400'
        }
    })
}
