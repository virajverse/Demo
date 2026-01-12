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
        createdAt: '2026-01-10 14:30'
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
        createdAt: '2026-01-11 09:15'
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
        createdAt: '2026-01-11 16:45'
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
        createdAt: '2026-01-12 10:20'
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
        status: 'confirmed',
        createdAt: '2026-01-12 11:30'
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
// DASHBOARD FUNCTIONS
// ===================================

function loadDashboardData() {
    loadRecentBookings();
    loadActivityTimeline();
}

function loadRecentBookings() {
    const container = document.getElementById('recentBookings');
    if (!container) return;

    // Show latest 5 bookings
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

function loadAllBookings() {
    const container = document.getElementById('bookingsTable');
    if (!container) return;

    container.innerHTML = mockBookings.map(booking => `
        <tr>
            <td>${booking.reference}</td>
            <td>
                <div class="customer-info">
                    <strong>${booking.customerName}</strong>
                    <small>${booking.customerEmail}</small>
                </div>
            </td>
            <td>${booking.service}</td>
            <td>${booking.staff}</td>
            <td>${booking.date}<br><small>${booking.time}</small></td>
            <td><span class="booking-status ${booking.status}">${booking.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewBooking(${booking.id})" title="View">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="2"/>
                            <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="editBooking(${booking.id})" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteBooking(${booking.id})" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4v10h10V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewBooking(id) {
    const booking = mockBookings.find(b => b.id === id);
    if (!booking) return;

    alert(`Booking Details:\n\nReference: ${booking.reference}\nCustomer: ${booking.customerName}\nEmail: ${booking.customerEmail}\nPhone: ${booking.customerPhone}\nService: ${booking.service}\nStaff: ${booking.staff}\nDate: ${booking.date}\nTime: ${booking.time}\nStatus: ${booking.status}`);
}

function editBooking(id) {
    showNotification('Edit functionality will be available in production version', 'info');
}

function deleteBooking(id) {
    if (confirm('Are you sure you want to delete this booking?')) {
        showNotification('Booking deleted successfully', 'success');
        // In production, this would call API to delete
        setTimeout(() => {
            loadAllBookings();
        }, 500);
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    sidebar.classList.toggle('open');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('adminAuth');
        sessionStorage.removeItem('adminEmail');
        sessionStorage.removeItem('adminName');
        window.location.href = 'login.html';
    }
}

function sendTestNotification() {
    showNotification('Test notification sent successfully!', 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success'
            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #059669;"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : type === 'error'
                ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #dc2626;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
                : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #667eea;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'}
            </span>
            <span class="notification-message">${message}</span>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add notification styles dynamically
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-icon {
        font-size: 1.25rem;
    }
    
    .notification-message {
        font-weight: 600;
        color: #0f172a;
    }
    
    .notification-success {
        border-left: 4px solid #059669;
    }
    
    .notification-error {
        border-left: 4px solid #dc2626;
    }
    
    .notification-info {
        border-left: 4px solid #667eea;
    }
`;
document.head.appendChild(notificationStyles);

// ===================================
// INITIALIZE
// ===================================

console.log('%cAdmin Dashboard Loaded', 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log('%cDemo Mode: Using mock data', 'font-size: 12px; color: #64748b;');
console.log('%cBookings:', mockBookings.length, 'font-size: 12px; color: #64748b;');
