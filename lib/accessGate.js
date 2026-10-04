const crypto = require('crypto');

const ROTATION_MINUTES = 20;
const ROTATION_MS = ROTATION_MINUTES * 60 * 1000;
const GATE_SECRET = process.env.SECRET_KEY || 'taliyo-demo-gate-secret-key-2026';

function getWindowIndex(timestamp = Date.now()) {
    return Math.floor(timestamp / ROTATION_MS);
}

function getPasscodeForWindow(windowIndex) {
    const hmac = crypto.createHmac('sha256', GATE_SECRET);
    hmac.update(`taliyo-window-${windowIndex}`);
    const hash = hmac.digest('hex');
    const num = parseInt(hash.substring(0, 8), 16) % 1000000;
    return String(num).padStart(6, '0');
}

function getCurrentGateInfo() {
    const now = Date.now();
    const currentWindow = getWindowIndex(now);
    const passcode = getPasscodeForWindow(currentWindow);
    const windowEnd = (currentWindow + 1) * ROTATION_MS;
    const remainingMs = Math.max(0, windowEnd - now);
    const remainingSec = Math.floor(remainingMs / 1000);

    return {
        passcode,
        windowIndex: currentWindow,
        remainingSeconds: remainingSec,
        expiresAt: new Date(windowEnd).toISOString(),
        rotationMinutes: ROTATION_MINUTES
    };
}

function verifyPasscode(inputCode) {
    if (!inputCode) return false;
    const codeStr = String(inputCode).trim();
    const now = Date.now();
    const currentWindow = getWindowIndex(now);

    // Accept current window or previous window (grace period for window transitions)
    if (codeStr === getPasscodeForWindow(currentWindow)) return true;
    if (codeStr === getPasscodeForWindow(currentWindow - 1)) return true;
    return false;
}

function createAccessToken() {
    const expiresAt = Date.now() + ROTATION_MS;
    const signature = crypto.createHmac('sha256', GATE_SECRET)
        .update(`taliyo-token-${expiresAt}`)
        .digest('hex').substring(0, 16);
    return `${expiresAt}.${signature}`;
}

function verifyAccessToken(token) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expected = crypto.createHmac('sha256', GATE_SECRET)
        .update(`taliyo-token-${expiresAt}`)
        .digest('hex').substring(0, 16);
    return signature === expected;
}

function renderGateHTML(targetUrl, errorMessage = '') {
    const safeTarget = encodeURI(targetUrl || '/');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔒 Authorization Required — Taliyo Technologies</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #07090e;
            --surface: #0e121e;
            --surface-card: #141a2a;
            --border: rgba(255, 255, 255, 0.08);
            --accent: #6366f1;
            --accent-glow: rgba(99, 102, 241, 0.35);
            --danger: #ef4444;
            --success: #10b981;
            --text-primary: #f8fafc;
            --text-muted: #94a3b8;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }

        body {
            background: var(--bg);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background-image: 
                radial-gradient(circle at 50% 15%, rgba(99, 102, 241, 0.18) 0%, transparent 60%),
                radial-gradient(circle at 85% 85%, rgba(239, 68, 68, 0.08) 0%, transparent 50%);
        }

        .gate-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 44px 36px;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px var(--accent-glow);
            position: relative;
            overflow: hidden;
            animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .gate-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #6366f1, #ec4899, #ef4444);
        }

        .shield-icon {
            width: 72px;
            height: 72px;
            background: rgba(99, 102, 241, 0.12);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 22px;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.2);
            font-size: 32px;
        }

        .badge-alert {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            font-size: 12px;
            font-weight: 700;
            border-radius: 100px;
            margin-bottom: 16px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
            box-shadow: 0 0 8px #ef4444;
            animation: pulse 1.8s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
        }

        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 26px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
            color: #ffffff;
        }

        .subtitle {
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.6;
            margin-bottom: 28px;
        }

        .highlight-notice {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 14px;
            padding: 14px 16px;
            font-size: 13px;
            color: #cbd5e1;
            margin-bottom: 24px;
            text-align: left;
            display: flex;
            gap: 10px;
            align-items: flex-start;
        }

        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }

        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .passcode-input {
            width: 100%;
            background: var(--surface-card);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 14px 18px;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 8px;
            text-align: center;
            color: #ffffff;
            transition: all 0.2s ease;
        }

        .passcode-input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 20px var(--accent-glow);
            background: #171d30;
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 15px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 8px 24px var(--accent-glow);
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(99, 102, 241, 0.45);
        }

        .error-msg {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 18px;
            text-align: center;
            ${errorMessage ? '' : 'display: none;'}
        }

        .footer-note {
            margin-top: 24px;
            font-size: 12px;
            color: #64748b;
            line-height: 1.6;
        }

        .footer-note a {
            color: #818cf8;
            text-decoration: none;
            font-weight: 600;
        }

        .footer-note a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="gate-card">
        <div class="shield-icon">🔒</div>
        <div>
            <span class="badge-alert"><span class="pulse-dot"></span> DIRECT ACCESS RESTRICTED</span>
        </div>
        <h1>Jakar Auth Lekar Aaiye!</h1>
        <p class="subtitle">Tabhi website dikhega. Direct access block hai.</p>

        <div class="highlight-notice">
            <span style="font-size: 18px;">ℹ️</span>
            <div>
                <strong>Security Rule:</strong> Is website ka access code <strong>har 20 minute me change</strong> hota hai. Kripya authorized team / admin se current 20-min passcode lein.
            </div>
        </div>

        <div id="errorBox" class="error-msg">${errorMessage || ''}</div>

        <form method="POST" action="/api/auth/gate-verify" id="gateForm">
            <input type="hidden" name="returnUrl" value="${safeTarget}">
            <div class="form-group">
                <label class="form-label" for="passcode">Current 20-Min Passcode</label>
                <input type="text" id="passcode" name="passcode" class="passcode-input" placeholder="••••••" maxlength="6" autofocus required autocomplete="off">
            </div>
            <button type="submit" class="btn-submit">🔓 Verify & Unlock Website</button>
        </form>

        <div class="footer-note">
            Auth code chahiye? <a href="/admin" target="_blank">Admin Login</a> ya authorized person se sampark karein.
            <br>
            <span style="opacity: 0.7;">© Taliyo Technologies • Protected System</span>
        </div>
    </div>

    <script>
        const input = document.getElementById('passcode');
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\\D/g, '');
        });
    </script>
</body>
</html>`;
}

module.exports = {
    ROTATION_MINUTES,
    getCurrentGateInfo,
    verifyPasscode,
    createAccessToken,
    verifyAccessToken,
    renderGateHTML
};
