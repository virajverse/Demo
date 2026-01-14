# Smart Inquiry Capture Website

A premium, modern website for the **Smart Inquiry Capture** service - a turnkey website and backend solution that captures incoming inquiries, qualifies leads automatically, and converts high-intent prospects into scheduled appointments.

## 🌟 Features

### Design & UX
- **Premium Modern Design** with vibrant gradients and glassmorphism effects
- **Fully Responsive** - Mobile-first approach with perfect rendering on all devices
- **Smooth Animations** - Micro-interactions and scroll-triggered animations
- **Accessibility** - WCAG compliant with keyboard navigation support
- **SEO Optimized** - Proper meta tags, semantic HTML, and heading structure

### Sections
1. **Hero Section** - Eye-catching landing with animated background orbs and key statistics
2. **Features Grid** - 6 feature cards highlighting core capabilities
3. **How It Works** - Interactive timeline showing the 4-step process
4. **Pricing Plans** - 3 tiers (Starter, Business, Professional) with detailed features
5. **Testimonials** - Customer success stories with ratings
6. **FAQ Accordion** - Common questions with expandable answers
7. **CTA Section** - Compelling call-to-action with WhatsApp integration
8. **Contact Form** - Fully functional form with validation
9. **Footer** - Comprehensive navigation and company information

### Interactive Features
- Sticky navigation with scroll effects
- Mobile hamburger menu
- Smooth scroll to sections
- FAQ accordion functionality
- Form validation with real-time feedback
- Notification system for user feedback
- Intersection Observer animations
- WhatsApp integration

## 📋 Pricing Tiers

### Starter Plan
- **Price**: ₹12,000 - ₹25,000
- **Delivery**: 5-7 days
- **Ideal for**: Solo providers and small teams
- **Includes**: 
  - Branded 3-4 page website
  - Simple inquiry form
  - WhatsApp click-to-chat
  - Google Calendar sync (single provider)
  - Mobile-first responsive design

### Business Plan (Recommended)
- **Price**: ₹30,000 - ₹65,000
- **Delivery**: 10-14 days
- **Ideal for**: Growing teams with automation needs
- **Includes**:
  - 6-8 page website + booking flow
  - Multi-staff scheduling
  - WhatsApp automation flows
  - Email + SMS reminders
  - Admin dashboard with analytics
  - Up to 5 staff calendars
  - 1-month support post-launch

### Professional Plan
- **Price**: ₹90,000 - ₹1,80,000
- **Delivery**: 21-30 days
- **Ideal for**: Enterprise-grade requirements
- **Includes**:
  - Full custom website + booking engine
  - WhatsApp Business API integration
  - AI lead qualification & scoring
  - CRM two-way sync (HubSpot/Zoho)
  - Multi-location & multi-role support
  - Advanced analytics & LTV forecasting
  - 2 months premium support + 99.9% uptime

## 🚀 Getting Started

### Prerequisites
- Python 3.x (for local server)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone or download** the project files to your local machine

2. **Navigate to the project directory**:
   ```bash
   cd "e:/Taliyo Tech/Taliyo Marketplace/New folder"
   ```

3. **Start the local server**:
   ```bash
   python -m http.server 3000
   ```

4. **Open your browser** and visit:
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
New folder/
│
├── index.html          # Main HTML file with all sections
├── styles.css          # Comprehensive CSS with design system
├── script.js           # JavaScript for interactivity
└── README.md           # This file
```

## 🎨 Design System

### Color Palette
- **Primary Gradient**: `#667eea → #764ba2` (Purple)
- **Secondary Gradient**: `#f093fb → #f5576c` (Pink)
- **Accent Gradient**: `#4facfe → #00f2fe` (Blue)
- **Success Gradient**: `#43e97b → #38f9d7` (Green)

### Typography
- **Primary Font**: Inter (Body text)
- **Display Font**: Outfit (Headings)

### Spacing System
- XS: 0.5rem
- SM: 1rem
- MD: 1.5rem
- LG: 2rem
- XL: 3rem
- 2XL: 4rem
- 3XL: 6rem

## 🔧 Customization

### Update WhatsApp Number
Replace `YOUR_WHATSAPP_NUMBER` in the following files:
- `index.html` - Line with WhatsApp links
- `script.js` - Line 258 in the `openWhatsApp()` function

### Update Contact Information
Edit the contact details in `index.html`:
- Email: Line with `contact@taliyotech.com`
- Phone: Line with `+91 YOUR_NUMBER`
- Location: Line with `Delhi, India`

### Modify Pricing
Update pricing information in the pricing section of `index.html` (lines with pricing cards)

### Change Colors
Modify CSS variables in `styles.css` under the `:root` selector

## 📱 Responsive Breakpoints

- **Desktop**: 1280px and above
- **Tablet**: 768px - 1279px
- **Mobile**: Below 768px

## ✨ Key Features Implementation

### Smooth Scroll Navigation
All anchor links automatically scroll smoothly to their target sections with proper offset for the fixed navbar.

### FAQ Accordion
Click any FAQ question to expand/collapse the answer. Only one answer is shown at a time.

### Contact Form
- Real-time validation
- Visual feedback (green/red borders)
- Success/error notifications
- Form reset after submission

### Animations
- Scroll-triggered fade-in animations for cards
- Floating background orbs
- Hover effects on all interactive elements
- Loading states for form submission

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📊 Performance

- Optimized CSS with minimal specificity
- Debounced scroll events
- Intersection Observer for efficient animations
- Lazy loading support for images
- Minimal JavaScript bundle

## 🔒 Security Considerations

When deploying to production:
1. Implement proper form backend with CSRF protection
2. Add rate limiting to prevent spam
3. Sanitize all user inputs
4. Use HTTPS for all connections
5. Implement proper WhatsApp Business API authentication

## 📝 Next Steps for Production

1. **Backend Integration**
   - Set up form submission endpoint
   - Implement email notifications
   - Connect to CRM system

2. **WhatsApp Integration**
   - Set up WhatsApp Business API
   - Configure message templates
   - Implement webhook handlers

3. **Analytics**
   - Add Google Analytics
   - Implement conversion tracking
   - Set up heatmaps (Hotjar, etc.)

4. **Hosting**
   - Choose hosting provider (Netlify, Vercel, AWS)
   - Configure custom domain
   - Set up SSL certificate
   - Configure CDN for assets

5. **SEO**
   - Submit sitemap to Google
   - Optimize meta descriptions
   - Add Open Graph tags
   - Implement structured data

## 🎯 Conversion Optimization

The website is designed with conversion in mind:
- Clear CTAs above the fold
- Social proof (testimonials, stats)
- Urgency indicators (delivery times)
- Trust signals (client count)
- Multiple contact points
- Easy-to-understand pricing
- FAQ to address objections

## 📞 Support

For questions or support:
- **Email**: contact@taliyotech.com
- **WhatsApp**: [Update with your number]
- **Website**: https://taliyotechnologies.com

## 📄 License

© 2026 Taliyo Technologies. All rights reserved.

---

**Built with ❤️ by Taliyo Technologies**

Transform inquiries into confirmed bookings with intelligent automation.
