// Booking State
const bookingState = {
    currentStep: 1,
    totalSteps: 5,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    userDetails: {}
};

// DOM Elements
const steps = document.querySelectorAll('.booking-step');
const stepContents = document.querySelectorAll('.step-content');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');
const bookingActions = document.getElementById('bookingActions');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeServiceSelection();
    generateCalendar();
    initializeTimeSlots();
    initializeForm();
    updateNavigation();
});

// Service Selection
function initializeServiceSelection() {
    const serviceOptions = document.querySelectorAll('.service-option');

    serviceOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove previous selection
            serviceOptions.forEach(opt => opt.classList.remove('selected'));

            // Select current
            option.classList.add('selected');

            // Store selection
            bookingState.selectedService = {
                name: option.dataset.service,
                price: option.dataset.price
            };

            // Enable next button
            btnNext.disabled = false;
        });
    });
}

// Calendar Generation
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const today = new Date();
    const daysToShow = 21; // Show next 3 weeks

    // Add day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.fontWeight = '600';
        header.style.color = 'var(--gray)';
        header.style.fontSize = '0.875rem';
        header.style.marginBottom = '0.5rem';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Calculate starting day offset
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() + 1); // Start from tomorrow
    const startDayOfWeek = firstDay.getDay();

    // Add empty cells for alignment
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        calendarGrid.appendChild(emptyCell);
    }

    // Generate calendar days
    for (let i = 0; i < daysToShow; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i + 1);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        dayElement.dataset.date = date.toISOString().split('T')[0];
        dayElement.dataset.fullDate = date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Disable weekends
        if (date.getDay() === 0 || date.getDay() === 6) {
            dayElement.classList.add('disabled');
        } else {
            dayElement.addEventListener('click', () => selectDate(dayElement));
        }

        calendarGrid.appendChild(dayElement);
    }
}

function selectDate(element) {
    if (element.classList.contains('disabled')) return;

    // Remove previous selection
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });

    // Select current
    element.classList.add('selected');

    // Store selection
    bookingState.selectedDate = {
        date: element.dataset.date,
        fullDate: element.dataset.fullDate
    };

    // Enable next button
    btnNext.disabled = false;
}

// Time Slots
function initializeTimeSlots() {
    const timeSlots = document.querySelectorAll('.time-slot');

    timeSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            if (slot.classList.contains('disabled')) return;

            // Remove previous selection
            timeSlots.forEach(s => s.classList.remove('selected'));

            // Select current
            slot.classList.add('selected');

            // Store selection
            bookingState.selectedTime = slot.dataset.time;

            // Enable next button
            btnNext.disabled = false;
        });
    });
}

// Form Handling
function initializeForm() {
    const form = document.getElementById('detailsForm');
    const inputs = form.querySelectorAll('input[required], textarea[required]');

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            validateForm();
        });
    });
}

function validateForm() {
    const form = document.getElementById('detailsForm');
    const isValid = form.checkValidity();

    if (isValid) {
        // Store form data
        const formData = new FormData(form);
        bookingState.userDetails = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            company: formData.get('company'),
            notes: formData.get('notes')
        };

        btnNext.disabled = false;
    } else {
        btnNext.disabled = true;
    }

    return isValid;
}

// Navigation
function updateNavigation() {
    // Update step indicators
    steps.forEach((step, index) => {
        const stepNumber = index + 1;

        if (stepNumber < bookingState.currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === bookingState.currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Update step content
    stepContents.forEach((content, index) => {
        if (index + 1 === bookingState.currentStep) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Update buttons
    if (bookingState.currentStep === 1) {
        btnBack.style.display = 'none';
    } else {
        btnBack.style.display = 'flex';
    }

    if (bookingState.currentStep === 5) {
        btnNext.textContent = 'Confirm Booking';
        btnNext.innerHTML = `
            Confirm Booking
            <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 10l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    } else if (bookingState.currentStep === 6) {
        bookingActions.style.display = 'none';
    } else {
        btnNext.innerHTML = `
            Next Step
            <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M8 4l8 6-8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }

    // Disable next button by default (will be enabled when user makes selection)
    if (bookingState.currentStep !== 5) {
        btnNext.disabled = true;
    }

    // Check if current step has a selection
    checkCurrentStepCompletion();
}

function checkCurrentStepCompletion() {
    switch (bookingState.currentStep) {
        case 1:
            if (bookingState.selectedService) {
                btnNext.disabled = false;
                // Re-select the service option
                const selectedOption = document.querySelector(`.service-option[data-service="${bookingState.selectedService.name}"]`);
                if (selectedOption) selectedOption.classList.add('selected');
            }
            break;
        case 2:
            if (bookingState.selectedDate) {
                btnNext.disabled = false;
                // Re-select the date
                const selectedDate = document.querySelector(`.calendar-day[data-date="${bookingState.selectedDate.date}"]`);
                if (selectedDate) selectedDate.classList.add('selected');
            }
            break;
        case 3:
            if (bookingState.selectedTime) {
                btnNext.disabled = false;
                // Re-select the time
                const selectedTime = document.querySelector(`.time-slot[data-time="${bookingState.selectedTime}"]`);
                if (selectedTime) selectedTime.classList.add('selected');
            }
            break;
        case 4:
            validateForm();
            break;
        case 5:
            updateSummary();
            btnNext.disabled = false;
            break;
    }
}

function updateSummary() {
    document.getElementById('summaryPlan').textContent =
        bookingState.selectedService?.name.charAt(0).toUpperCase() +
        bookingState.selectedService?.name.slice(1) || '-';

    document.getElementById('summaryDate').textContent =
        bookingState.selectedDate?.fullDate || '-';

    document.getElementById('summaryTime').textContent =
        bookingState.selectedTime || '-';

    document.getElementById('summaryName').textContent =
        bookingState.userDetails?.fullName || '-';

    document.getElementById('summaryEmail').textContent =
        bookingState.userDetails?.email || '-';

    document.getElementById('summaryPhone').textContent =
        bookingState.userDetails?.phone || '-';
}

// Button Event Listeners
btnNext.addEventListener('click', async () => {
    if (bookingState.currentStep === 5) {
        // Confirm booking
        await confirmBooking();
    } else {
        // Move to next step
        bookingState.currentStep++;
        updateNavigation();

        // Scroll to top of booking card
        document.querySelector('.booking-card').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
});

btnBack.addEventListener('click', () => {
    if (bookingState.currentStep > 1) {
        bookingState.currentStep--;
        updateNavigation();

        // Scroll to top of booking card
        document.querySelector('.booking-card').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
});

// Confirm Booking
async function confirmBooking() {
    // Show loading state
    btnNext.disabled = true;
    btnNext.innerHTML = `
        <svg class="btn-icon animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="50" stroke-dashoffset="25" opacity="0.3"/>
        </svg>
        Processing...
    `;

    // Simulate API call
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Log booking data (in production, send to backend)
        console.log('Booking confirmed:', bookingState);

        // Move to success step
        bookingState.currentStep = 6;
        updateNavigation();

        // Scroll to top
        document.querySelector('.booking-card').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Send confirmation email (simulated)
        sendConfirmationEmail();

    } catch (error) {
        console.error('Booking error:', error);
        alert('Sorry, there was an error processing your booking. Please try again.');
        btnNext.disabled = false;
        btnNext.innerHTML = `
            Confirm Booking
            <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 10l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
}

function sendConfirmationEmail() {
    // In production, this would call your backend API
    const emailData = {
        to: bookingState.userDetails.email,
        subject: 'Demo Booking Confirmed - Smart Inquiry Capture',
        body: `
            Dear ${bookingState.userDetails.fullName},
            
            Your demo booking has been confirmed!
            
            Plan: ${bookingState.selectedService.name}
            Date: ${bookingState.selectedDate.fullDate}
            Time: ${bookingState.selectedTime}
            
            We'll send you a calendar invite shortly.
            
            Best regards,
            Taliyo Technologies
        `
    };

    console.log('Confirmation email sent:', emailData);
}

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
    
    .animate-spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !btnNext.disabled && bookingState.currentStep !== 6) {
        btnNext.click();
    }

    if (e.key === 'Escape' && bookingState.currentStep > 1 && bookingState.currentStep !== 6) {
        btnBack.click();
    }
});

// Console log
console.log('%c📅 Booking System Initialized', 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log('Current booking state:', bookingState);
