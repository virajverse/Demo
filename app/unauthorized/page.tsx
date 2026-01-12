import Link from 'next/link'

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <svg width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            </div>

            <div className="bg-slate-800/70 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl max-w-lg w-full z-10">
                <div className="flex justify-center mb-6">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-pink-500 mb-4">
                    Access Denied
                </h1>
                <p className="text-slate-400 mb-8 text-lg">
                    This demo is restricted or has expired. Please access it through the official Taliyo Technologies Hub to authorize your session.
                </p>
                <Link
                    href="https://taliyotechnologies.com"
                    className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                    Return to Home
                </Link>
            </div>
        </div>
    )
}
