// ===================================
// ADMIN DASHBOARD JAVASCRIPT
// Mock Data & Functionality (Demo Mode)
// ===================================

// Mock Data
const mockBookings = [
    {
        id: 1,
        reference: 'BK-2026-001',
        customerName: 'Rajesh Kumar',
        customerEmail: 'rajesh@example.com',
        customerPhone: '+91 98765 43210',
        service: 'Business',
        staff: 'Priya Sharma',
        date: '2026-01-15',
        time: '10:00 AM',
        status: 'confirmed',
        createdAt: '2026-01-10 14:30',
        aiScore: 'hot'
    },
    {
        id: 2,
        reference: 'BK-2026-002',
        customerName: 'Amit Patel',
        customerEmail: 'amit@example.com',
        customerPhone: '+91 98765 43211',
        service: 'Professional',
        staff: 'Neha Singh',
        date: '2026-01-16',
        time: '2:00 PM',
        status: 'pending',
        createdAt: '2026-01-11 09:15',
        aiScore: 'warm'
    },
    {
        id: 3,
        reference: 'BK-2026-003',
        customerName: 'Priya Verma',
        customerEmail: 'priya@example.com',
        customerPhone: '+91 98765 43212',
        service: 'Starter',
        staff: 'Rahul Mehta',
        date: '2026-01-17',
        time: '11:30 AM',
        status: 'confirmed',
        createdAt: '2026-01-11 16:45',
        aiScore: 'hot'
    },
    {
        id: 4,
        reference: 'BK-2026-004',
        customerName: 'Sanjay Gupta',
        customerEmail: 'sanjay@example.com',
        customerPhone: '+91 98765 43213',
        service: 'Business',
        staff: 'Priya Sharma',
        date: '2026-01-18',
        time: '3:30 PM',
        status: 'pending',
        createdAt: '2026-01-12 10:20',
        aiScore: 'cold'
    },
    {
        id: 5,
        reference: 'BK-2026-005',
        customerName: 'Anita Desai',
        customerEmail: 'anita@example.com',
        customerPhone: '+91 98765 43214',
        service: 'Professional',
        staff: 'Vikram Shah',
        date: '2026-01-19',
        time: '1:00 PM',
        status: 'completed',
        createdAt: '2026-01-12 11:30',
        aiScore: 'warm'
    }
];

const mockStaff = [
    {
        id: 1,
        name: 'Priya Sharma',
        role: 'Senior Consultant',
        email: 'priya@taliyotech.com',
        phone: '+91 98765 43210',
        specialization: 'Business Strategy',
        available: true,
        bookings: 8,
        rating: 4.9,
        experience: '5 years'
    },
    {
        id: 2,
        name: 'Neha Singh',
        role: 'Professional Advisor',
        email: 'neha@taliyotech.com',
        phone: '+91 98765 43211',
        specialization: 'Technical Consulting',
        available: true,
        bookings: 6,
        rating: 4.7,
        experience: '3 years'
    },
    {
        id: 3,
        name: 'Rahul Mehta',
        role: 'Starter Support',
        email: 'rahul@taliyotech.com',
        phone: '+91 98765 43212',
        specialization: 'Customer Success',
        available: false,
        bookings: 4,
        rating: 4.5,
        experience: '2 years'
    },
    {
        id: 4,
        name: 'Vikram Shah',
        role: 'Lead Consultant',
        email: 'vikram@taliyotech.com',
        phone: '+91 98765 43213',
        specialization: 'Enterprise Solutions',
        available: true,
        bookings: 10,
        rating: 5.0,
        experience: '7 years'
    },
    {
        id: 5,
        name: 'Anjali Reddy',
        role: 'Business Analyst',
        email: 'anjali@taliyotech.com',
        phone: '+91 98765 43214',
        specialization: 'Data Analytics',
        available: true,
        bookings: 5,
        rating: 4.8,
        experience: '4 years'
    }
];

const mockActivity = [
    {
        type: 'booking',
        title: 'New booking received',
        description: 'Anita Desai booked Professional plan',
        time: '2 hours ago',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #667eea;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>'
    },
    {
        type: 'confirmation',
        title: 'Booking confirmed',
        description: 'WhatsApp confirmation sent to Sanjay Gupta',
        time: '4 hours ago',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #059669;"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    },
    {
        type: 'staff',
        title: 'Staff availability updated',
        description: 'Priya Sharma updated working hours',
        time: '6 hours ago',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #764ba2;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    },
    {
        type: 'reminder',
        title: 'Reminder sent',
        description: '24h reminder sent to Rajesh Kumar',
        time: '8 hours ago',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #d97706;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>'
    },
    {
        type: 'booking',
        title: 'Booking completed',
        description: 'Meeting with Amit Patel completed',
        time: '1 day ago',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #059669;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
    }
];

// ===================================
// SECURITY & AUTHENTICATION
// ===================================

function checkAuth() {
    // Skip if on login page
    if (window.location.pathname.endsWith('login.html')) {
        return;
    }

    // Check for auth token/flag in session
    if (sessionStorage.getItem('adminAuth') !== 'true') {
        console.warn('Unauthorized access. Redirecting to login.');
        window.location.href = 'login.html';
    }
}

// ===================================
// DASHBOARD FUNCTIONS
// ===================================

function loadDashboardData() {
    loadRecentBookings();
    loadActivityTimeline();
}

function loadRecentBookings() {
    const container = document.getElementById('recentBookings');
    if (!container) return;

    const recentBookings = mockBookings.slice(0, 5);

    container.innerHTML = recentBookings.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <h4>${booking.customerName}</h4>
                <p>${booking.service} • ${booking.date} at ${booking.time}</p>
            </div>
            <span class="booking-status ${booking.status}">${booking.status}</span>
        </div>
    `).join('');
}

function loadActivityTimeline() {
    const container = document.getElementById('activityTimeline');
    if (!container) return;

    container.innerHTML = mockActivity.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// ===================================
// BOOKINGS PAGE FUNCTIONS
// ===================================

function loadBookingsCards() {
    const container = document.getElementById('bookingsGrid');
    if (!container) return;

    container.innerHTML = mockBookings.map(booking => `
        <div class="booking-card">
            <div class="booking-card-header">
                <div>
                    <span class="booking-reference">${booking.reference}</span>
                    <span class="ai-score-badge ${booking.aiScore}">${booking.aiScore}</span>
                </div>
                <span class="booking-status ${booking.status}">${booking.status}</span>
            </div>
            
            <div class="booking-customer">
                <div class="customer-avatar">${booking.customerName.split(' ').map(n => n[0]).join('')}</div>
                <div>
                    <h4>${booking.customerName}</h4>
                    <p>${booking.customerEmail}</p>
                    <p>${booking.customerPhone}</p>
                </div>
            </div>

            <div class="booking-details">
                <div class="detail-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v6l3 3" stroke="currentColor" stroke-width="2"/>
                        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${booking.date} at ${booking.time}</span>
                </div>
                <div class="detail-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${booking.service}</span>
                </div>
                <div class="detail-row">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="2"/>
                        <path d="M2 14c0-3 2-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${booking.staff}</span>
                </div>
            </div>

            <div class="booking-actions">
                <button class="btn-action" onclick="viewBooking(${booking.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="2"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    View
                </button>
                <button class="btn-action primary" onclick="editBooking(${booking.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Edit
                </button>
            </div>
        </div>
    `).join('');
}

function viewBooking(id) {
    const booking = mockBookings.find(b => b.id === id);
    if (!booking) return;

    showNotification(`Viewing booking: ${booking.reference}`, 'info');
}

function editBooking(id) {
    showNotification('Edit functionality will be available in production', 'info');
}

// ===================================
// STAFF PAGE FUNCTIONS
// ===================================

function loadStaffCards() {
    const container = document.getElementById('staffGrid');
    if (!container) return;

    container.innerHTML = mockStaff.map(staff => `
        <div class="staff-card-modern">
            <div class="staff-card-header">
                <div class="staff-avatar-large">
                    ${staff.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div class="staff-status ${staff.available ? 'online' : 'offline'}">
                    <span></span>
                    ${staff.available ? 'Available' : 'Offline'}
                </div>
            </div>

            <div class="staff-info-section">
                <h3>${staff.name}</h3>
                <p class="staff-role-badge">${staff.role}</p>
                
                <div class="staff-rating">
                    <span class="rating-stars">★★★★★</span>
                    <span class="rating-value">${staff.rating}</span>
                </div>
            </div>

            <div class="staff-stats">
                <div class="stat-item">
                    <span class="stat-label">Active Bookings</span>
                    <span class="stat-value">${staff.bookings}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Experience</span>
                    <span class="stat-value">${staff.experience}</span>
                </div>
            </div>

            <div class="staff-details-list">
                <div class="detail-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 5l6 4 6-4M2 5v8h12V5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${staff.email}</span>
                </div>
                <div class="detail-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 3h2l1 4-2 2c1 2 3 4 5 5l2-2 4 1v2a2 2 0 01-2 2C6 15 1 10 1 4a2 2 0 012-2z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${staff.phone}</span>
                </div>
                <div class="detail-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>${staff.specialization}</span>
                </div>
            </div>

            <div class="staff-actions-modern">
                <button class="btn-staff-action" onclick="editStaff(${staff.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Edit
                </button>
                <button class="btn-staff-action secondary" onclick="viewSchedule(${staff.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    Schedule
                </button>
            </div>
        </div>
    `).join('');
}

function editStaff(id) {
    showNotification('Edit staff functionality will be available in production', 'info');
}

function viewSchedule(id) {
    showNotification('Viewing staff schedule...', 'info');
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('adminAuth');
        sessionStorage.removeItem('adminEmail');
        sessionStorage.removeItem('adminName');
        window.location.href = 'login.html';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success'
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : type === 'error'
                ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
                : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'}
            </span>
            <span class="notification-message">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===================================
// INITIALIZE
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    const page = document.body.getAttribute('data-page');

    if (page === 'dashboard') {
        loadDashboardData();
    } else if (page === 'bookings') {
        loadBookingsCards();
    } else if (page === 'staff') {
        loadStaffCards();
    }

    console.log(`%cAdmin Panel: ${page || 'Unknown'} Loaded`, 'font-size: 14px; color: #667eea;');
});
