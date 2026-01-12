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

    // Securely decode the path segment (Handles spaces like "Website _Business")
    const demoName = decodeURIComponent(segments[0])
    const relativePath = segments.slice(1).join('/') || 'index.html'

    // 1. Check Cookies for Auth
    const hash = require('crypto').createHash('md5').update(demoName).digest('hex')
    const cookieName = `access_${hash}`

    const authCookie = request.cookies.get(cookieName)
    const globalAuthCookie = request.cookies.get('hub_authenticated')

    // Access Granted if: 
    // - User has specific demo cookie ("granted")
    // - OR User is logged into Hub as Admin ("true")
    // - OR Asset is public (thumb.jpg)
    const isAuthorized =
        (authCookie && authCookie.value === 'granted') ||
        (globalAuthCookie && globalAuthCookie.value === 'true');

    // Check if asset is public
    const isPublic = relativePath.toLowerCase().endsWith('thumb.jpg');

    if (!isPublic && !isAuthorized) {
        // If requesting a non-HTML asset (JS/CSS), avoid Redirect loop/HTML response
        // Just return 403 so the console error is clear (Forbidden) instead of SyntaxError
        if (relativePath.endsWith('.js') || relativePath.endsWith('.css')) {
            return new NextResponse('/* Access Denied */', { status: 403, headers: { 'Content-Type': 'application/javascript' } });
        }
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
