# 🚀 Quick Start Guide - Smart Inquiry Capture

## ⚡ Get Started in 3 Steps

### Step 1: Start the Server
```bash
cd "e:/Taliyo Tech/Taliyo Marketplace/New folder"
python -m http.server 3000
```

### Step 2: Open Your Browser
Visit: **http://localhost:3000**

### Step 3: Explore
- **Main Page**: `http://localhost:3000/index.html`
- **Booking Demo**: `http://localhost:3000/booking.html`

---

## 📝 Quick Customization Checklist

### Before Going Live:

#### 1. Update WhatsApp Number
- [ ] `index.html` - Replace `YOUR_WHATSAPP_NUMBER`
- [ ] `script.js` - Line 258

#### 2. Update Contact Info
- [ ] Email: `contact@taliyotech.com`
- [ ] Phone: `+91 YOUR_NUMBER`
- [ ] Location: Update if not Delhi

#### 3. Customize Content
- [ ] Replace demo URLs with actual links
- [ ] Update testimonials with real clients
- [ ] Add your company logo
- [ ] Update footer links

#### 4. Test Everything
- [ ] All forms submit correctly
- [ ] WhatsApp links work
- [ ] Mobile responsiveness
- [ ] All CTAs functional

---

## 🎨 Color Customization

Want to change the color scheme? Edit `styles.css` (lines 10-30):

```css
:root {
    /* Change these gradients */
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
```

---

## 📱 Test on Mobile

### Option 1: Chrome DevTools
1. Press `F12` in Chrome
2. Click device toolbar icon
3. Select mobile device

### Option 2: Local Network
1. Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Visit: `http://YOUR_IP:3000` on mobile

---

## 🔧 Common Issues & Fixes

### Server Won't Start
```bash
# Try a different port
python -m http.server 8000
```

### Page Not Loading
- Check if server is running
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito mode

### Styles Not Showing
- Ensure `styles.css` is in same folder
- Check browser console for errors (F12)

---

## 📦 Files Overview

| File | Purpose |
|------|---------|
| `index.html` | Main landing page |
| `booking.html` | Booking demo page |
| `styles.css` | All styles |
| `script.js` | Main page JS |
| `booking.js` | Booking flow JS |
| `README.md` | Full documentation |
| `PROJECT_SUMMARY.md` | Project overview |

---

## 🎯 Key Features at a Glance

✅ **Responsive Design** - Works on all devices  
✅ **Smooth Animations** - Professional feel  
✅ **Contact Form** - With validation  
✅ **Booking System** - 5-step wizard  
✅ **FAQ Accordion** - Interactive Q&A  
✅ **WhatsApp Integration** - Click-to-chat  
✅ **Mobile Menu** - Hamburger navigation  
✅ **SEO Optimized** - Meta tags included  

---

## 🚀 Deploy to Production

### Recommended Platforms:

**Netlify (Easiest)**
1. Drag & drop folder to netlify.com
2. Done! ✅

**Vercel**
1. Import from GitHub
2. Auto-deploys on push

**Traditional Hosting**
1. Upload files via FTP
2. Point domain to folder

---

## 💡 Pro Tips

1. **Test on Real Devices** - Not just browser DevTools
2. **Optimize Images** - Compress before adding
3. **Use HTTPS** - Always in production
4. **Monitor Analytics** - Track user behavior
5. **Regular Backups** - Keep copies of your work

---

## 📞 Need Help?

**Taliyo Technologies**
- 📧 contact@taliyotech.com
- 📱 WhatsApp: [Your Number]
- 🌐 taliyotechnologies.com

---

## ✨ You're All Set!

Your premium Smart Inquiry Capture website is ready to go! 🎉

**Next:** Customize, test, and deploy! 🚀

---

*Built with ❤️ by Taliyo Technologies*
