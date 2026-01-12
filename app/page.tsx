import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// Types
type Demo = {
    id: string
    name: string
    thumbnail: string
    tech: string
    tier: string
    color: string
}

// Configuration
const HUB_PASSWORD = "admin" // CHANGE THIS
const BYPASS_KEY = "taliyo-secret-access"

async function login(formData: FormData) {
    'use server'
    const password = formData.get('password')
    if (password === HUB_PASSWORD) {
        cookies().set('hub_authenticated', 'true', { httpOnly: true, secure: true })
        redirect('/')
    }
}

async function unlockDemo(demoId: string) {
    'use server'
    const hash = crypto.createHash('md5').update(demoId).digest('hex')
    cookies().set(`access_${hash}`, 'granted', {
        httpOnly: true,
        secure: true,
        path: '/',
        maxAge: 3600
    })
    redirect(`/demos/${demoId}/`)
}

export default async function Home({ searchParams }: { searchParams: { auth?: string } }) {
    // Auth Check
    const authCookie = cookies().get('hub_authenticated') // Fixed usage
    const isAuth = authCookie?.value === 'true' || searchParams.auth === BYPASS_KEY

    // Set cookie if bypass used
    if (searchParams.auth === BYPASS_KEY && !isAuth) {
        cookies().set('hub_authenticated', 'true', { httpOnly: true, secure: true })
    }

    // Login Screen
    if (!isAuth) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
                </div>

                <div className="bg-slate-800/70 backdrop-blur-md p-10 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full z-10 text-center">
                    <div className="text-indigo-500 font-extrabold tracking-widest uppercase mb-4 text-sm">Taliyo Technologies</div>
                    <h2 className="text-3xl font-bold text-white mb-8">Hub Access</h2>

                    <form action={login} className="space-y-4">
                        <input
                            type="password"
                            name="password"
                            placeholder="Enter Access Password"
                            required
                            className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                            type="submit"
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
                        >
                            Unlock Dashboard
                        </button>
                    </form>
                    <p className="mt-8 text-xs text-slate-500">Restricted access for authorized personnel only.</p>
                </div>
            </div>
        )
    }

    // Scan Demos
    const demosDir = path.join(process.cwd(), 'demos_data')
    const demos: Demo[] = []

    if (fs.existsSync(demosDir)) {
        const folders = fs.readdirSync(demosDir)
        for (const folder of folders) {
            const fullPath = path.join(demosDir, folder)
            if (fs.statSync(fullPath).isDirectory()) {
                // Metadata logic
                let name = folder.replace(/[-_]/g, ' ')
                name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); // proper case

                let tier = 'Standard'
                let tech = 'HTML / CSS / JS'
                let color = '#6366f1' // Indigo default

                if (folder.toLowerCase().includes('starter')) {
                    tier = 'Starter'; color = '#94a3b8';
                } else if (folder.toLowerCase().includes('professional')) {
                    tier = 'Professional'; color = '#6366f1';
                } else if (folder.toLowerCase().includes('business')) {
                    tier = 'Business'; color = '#10b981';
                }

                demos.push({
                    id: folder,
                    name,
                    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426', // Placeholder or check for file
                    tech,
                    tier,
                    color
                })
            }
        }
    }

    return (
        <div className="relative min-h-screen">
            <div className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
            </div>

            <header className="pt-16 pb-8 text-center px-4">
                <div className="text-indigo-500 font-extrabold tracking-widest uppercase mb-4 text-sm">Taliyo Technologies</div>
                <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    Project Showcase
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Experience our latest digital innovations in specialized, sandboxed environments.
                </p>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {demos.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <p>No demos available. Add folders to <code>demos_data</code> to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {demos.map((demo) => (
                            <div key={demo.id} className="bg-slate-800/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden hover:-translate-y-2 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 group">
                                <img src={demo.thumbnail} alt={demo.name} className="w-full h-48 object-cover border-b border-white/5 group-hover:scale-105 transition-transform duration-500" />
                                <div className="p-6">
                                    <div className="flex gap-2 mb-4">
                                        <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-slate-300">{demo.tech}</span>
                                        <span
                                            className="px-3 py-1 rounded-full text-xs font-medium border"
                                            style={{ backgroundColor: `${demo.color}20`, color: demo.color, borderColor: `${demo.color}40` }}
                                        >
                                            {demo.tier}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{demo.name}</h3>
                                    <p className="text-slate-400 text-sm mb-6">Fully independent application with isolated environment and secure routing.</p>

                                    <form action={unlockDemo.bind(null, demo.id)}>
                                        <button
                                            type="submit"
                                            className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:brightness-110"
                                            style={{ backgroundColor: demo.color }}
                                        >
                                            Launch Demo Instance
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer className="text-center py-16 text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Taliyo Technologies. All Rights Reserved.</p>
                <p className="mt-2 opacity-50">Powered by Next.js Secure Routing</p>
            </footer>

            <script src="/advanced-protection.js"></script>
        </div>
    )
}
