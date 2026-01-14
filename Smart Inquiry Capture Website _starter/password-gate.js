// ===================================
// INTERACTIVE PASSWORD GATE SYSTEM
// Taliyo Technologies - Anti-Clone Protection
// ===================================

(function () {
    'use strict';

    // Check if already authenticated in this session
    if (sessionStorage.getItem('taliyoAuth') === 'authenticated') {
        return; // Allow access
    }

    // Password configuration - CHANGE THESE FOR EACH CLIENT
    const PASSWORD_CONFIG = {
        steps: [
            { type: 'number', value: '7', instruction: 'Click on number 7' },
            { type: 'number', value: '8', instruction: 'Click on number 8' },
            { type: 'letter', value: 'A', instruction: 'Click on letter A' },
            { type: 'number', value: '3', instruction: 'Click on number 3' }
        ],
        maxAttempts: 3,
        lockoutTime: 300000 // 5 minutes in milliseconds
    };

    let currentStep = 0;
    let attempts = 0;
    let isLocked = false;

    // Create password gate overlay
    function createPasswordGate() {
        const overlay = document.createElement('div');
        overlay.id = 'taliyo-password-gate';
        overlay.innerHTML = `
            <style>
                #taliyo-password-gate {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    z-index: 999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                
                .password-container {
                    background: white;
                    border-radius: 2rem;
                    padding: 3rem;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    animation: slideIn 0.5s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .password-logo {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                }
                
                .password-title {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: #0f172a;
                    margin-bottom: 0.5rem;
                }
                
                .password-subtitle {
                    font-size: 1rem;
                    color: #64748b;
                    margin-bottom: 2rem;
                }
                
                .password-instruction {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background: rgba(102, 126, 234, 0.1);
                    border-radius: 1rem;
                    animation: pulse 2s ease-in-out infinite;
                }
                
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.05);
                    }
                }
                
                .password-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .password-button {
                    aspect-ratio: 1;
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 1rem;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #0f172a;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .password-button:hover {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
                }
                
                .password-button:active {
                    transform: translateY(-2px);
                }
                
                .password-button.correct {
                    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                    color: white;
                    border-color: #43e97b;
                    animation: correctAnim 0.5s ease-out;
                }
                
                @keyframes correctAnim {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.2);
                    }
                }
                
                .password-button.wrong {
                    background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                    color: white;
                    border-color: #f5576c;
                    animation: shake 0.5s ease-out;
                }
                
                @keyframes shake {
                    0%, 100% {
                        transform: translateX(0);
                    }
                    25% {
                        transform: translateX(-10px);
                    }
                    75% {
                        transform: translateX(10px);
                    }
                }
                
                .password-progress {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }
                
                .progress-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #e2e8f0;
                    transition: all 0.3s ease;
                }
                
                .progress-dot.completed {
                    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                    transform: scale(1.2);
                }
                
                .password-footer {
                    font-size: 0.875rem;
                    color: #94a3b8;
                    margin-top: 2rem;
                }
                
                .locked-message {
                    color: #f5576c;
                    font-weight: 600;
                    margin-top: 1rem;
                }
                
                @media (max-width: 768px) {
                    .password-container {
                        padding: 2rem 1.5rem;
                    }
                    
                    .password-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 0.75rem;
                    }
                    
                    .password-button {
                        font-size: 1.25rem;
                    }
                }
            </style>
            
            <div class="password-container">
                <div class="password-logo">🔒</div>
                <h1 class="password-title">Access Protected</h1>
                <p class="password-subtitle">This website is protected by Taliyo Technologies</p>
                
                <div class="password-progress" id="passwordProgress"></div>
                
                <div class="password-instruction" id="passwordInstruction">
                    Click on number 7
                </div>
                
                <div class="password-grid" id="passwordGrid"></div>
                
                <div class="password-footer">
                    © 2026 Taliyo Technologies<br>
                    <span id="attemptsLeft">Attempts remaining: 3</span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        initializePasswordGate();
    }

    // Initialize password gate
    function initializePasswordGate() {
        renderProgressDots();
        renderPasswordGrid();
        updateInstruction();
    }

    // Render progress dots
    function renderProgressDots() {
        const progressContainer = document.getElementById('passwordProgress');
        progressContainer.innerHTML = '';

        PASSWORD_CONFIG.steps.forEach((step, index) => {
            const dot = document.createElement('div');
            dot.className = 'progress-dot';
            if (index < currentStep) {
                dot.classList.add('completed');
            }
            progressContainer.appendChild(dot);
        });
    }

    // Render password grid
    function renderPasswordGrid() {
        const grid = document.getElementById('passwordGrid');
        grid.innerHTML = '';

        // Create array of all possible values
        const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];

        // Combine and shuffle
        const allValues = [...numbers, ...letters];
        const shuffled = allValues.sort(() => Math.random() - 0.5);

        // Take first 15 values
        const displayValues = shuffled.slice(0, 15);

        // Ensure current answer is included
        const currentAnswer = PASSWORD_CONFIG.steps[currentStep].value;
        if (!displayValues.includes(currentAnswer)) {
            displayValues[Math.floor(Math.random() * displayValues.length)] = currentAnswer;
        }

        // Shuffle again
        displayValues.sort(() => Math.random() - 0.5);

        // Create buttons
        displayValues.forEach(value => {
            const button = document.createElement('button');
            button.className = 'password-button';
            button.textContent = value;
            button.onclick = () => handlePasswordClick(value, button);
            grid.appendChild(button);
        });
    }

    // Update instruction
    function updateInstruction() {
        const instruction = document.getElementById('passwordInstruction');
        if (currentStep < PASSWORD_CONFIG.steps.length) {
            instruction.textContent = PASSWORD_CONFIG.steps[currentStep].instruction;
        }
    }

    // Handle password click
    function handlePasswordClick(value, button) {
        if (isLocked) return;

        const correctAnswer = PASSWORD_CONFIG.steps[currentStep].value;

        if (value === correctAnswer) {
            // Correct answer
            button.classList.add('correct');

            setTimeout(() => {
                currentStep++;

                if (currentStep >= PASSWORD_CONFIG.steps.length) {
                    // All steps completed
                    unlockWebsite();
                } else {
                    // Move to next step
                    renderProgressDots();
                    renderPasswordGrid();
                    updateInstruction();
                }
            }, 500);

        } else {
            // Wrong answer
            button.classList.add('wrong');
            attempts++;

            const attemptsLeft = PASSWORD_CONFIG.maxAttempts - attempts;
            document.getElementById('attemptsLeft').textContent = `Attempts remaining: ${attemptsLeft}`;

            if (attempts >= PASSWORD_CONFIG.maxAttempts) {
                lockWebsite();
            }

            setTimeout(() => {
                button.classList.remove('wrong');
            }, 500);
        }
    }

    // Unlock website
    function unlockWebsite() {
        const overlay = document.getElementById('taliyo-password-gate');
        overlay.style.animation = 'slideOut 0.5s ease-out forwards';

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideOut {
                to {
                    opacity: 0;
                    transform: scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = '';
            sessionStorage.setItem('taliyoAuth', 'authenticated');

            // Show success message
            showSuccessMessage();
        }, 500);
    }

    // Lock website
    function lockWebsite() {
        isLocked = true;
        const container = document.querySelector('.password-container');

        container.innerHTML = `
            <div class="password-logo">🚫</div>
            <h1 class="password-title">Access Denied</h1>
            <p class="password-subtitle">Too many incorrect attempts</p>
            <div class="locked-message">
                This website has been locked for 5 minutes.<br>
                Please try again later.
            </div>
            <div class="password-footer" style="margin-top: 2rem;">
                © 2026 Taliyo Technologies<br>
                Unauthorized access is prohibited.
            </div>
        `;

        // Store lockout time
        localStorage.setItem('taliyoLockout', Date.now() + PASSWORD_CONFIG.lockoutTime);

        // Reload page after lockout time
        setTimeout(() => {
            location.reload();
        }, PASSWORD_CONFIG.lockoutTime);
    }

    // Show success message
    function showSuccessMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(67, 233, 123, 0.3);
            z-index: 999999;
            font-family: Inter, sans-serif;
            font-weight: 600;
            animation: slideInRight 0.5s ease-out;
        `;
        message.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 1.5rem;">✅</span>
                <span>Access Granted! Welcome to the website.</span>
            </div>
        `;

        document.body.appendChild(message);

        setTimeout(() => {
            message.style.animation = 'slideInRight 0.5s ease-out reverse';
            setTimeout(() => message.remove(), 500);
        }, 3000);
    }

    // Check if currently locked out
    function checkLockout() {
        const lockoutTime = localStorage.getItem('taliyoLockout');
        if (lockoutTime && Date.now() < parseInt(lockoutTime)) {
            return true;
        }
        localStorage.removeItem('taliyoLockout');
        return false;
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!checkLockout()) {
                createPasswordGate();
            } else {
                // Show lockout message
                createPasswordGate();
                lockWebsite();
            }
        });
    } else {
        if (!checkLockout()) {
            createPasswordGate();
        } else {
            createPasswordGate();
            lockWebsite();
        }
    }

})();

console.log('%c🔒 Password Gate Active', 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log('%cWebsite protected by Taliyo Technologies', 'font-size: 12px; color: #64748b;');
