# Professional Portfolio - Maksymilian Rechnio

A cutting-edge, interactive portfolio website showcasing UX/UI design work with advanced WebGL animations and Three.js-powered visual effects. My portfolio demonstrates expertise in creative web development, interactive design, and modern front-end techniques.

## 🎯 Project Overview

This portfolio is a multipage application featuring multiple viewport sections with immersive 3D animations, custom shader effects, and interactive elements. The design emphasizes a minimalist aesthetic while showcasing technical capabilities through advanced WebGL implementations.

## ✨ Key Features

### Interactive Profile Visualization
- **Custom WebGL Shaders**: Real-time shader-based profile image rendering with fluid reveal effects
- **Mouse Trail Effects**: Dynamic liquid-like stroke animations that follow cursor movement
- **Click Ripples**: Animated ripple effects on click interactions
- **Animated Dot Matrix**: Procedurally generated animated dots revealed through fluid strokes
- **3D Shadow Effects**: Multi-layered shadow system with vertical sweep animations

### Scroll-Driven Animations
- **Waterfall Gallery**: Continuous scrolling image gallery with bidirectional flow
- **3D Portfolio Gallery**: Three.js-powered 3D scene with scroll-driven image positioning and parallax effects
- **Experience Timeline**: Animated experience entries with 3D transform effects

### User Experience
- **Custom Cursor**: Glass-morphism styled custom cursor with silhouette detection
- **Loading Screen**: Smooth loading transition
- **Responsive Navigation**: Vertical slide-out menu with smooth animations
- **Theme-Aware Favicons**: Dynamic favicon switching based on system theme preference

## 🛠️ Technologies & Frameworks

### Core Technologies
- **Three.js** (v0.160.0) - 3D graphics and WebGL rendering
- **WebGL** - Custom shader programming for advanced visual effects
- **Vanilla JavaScript** (ES6+) - No framework dependencies
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with custom properties

### Key Libraries & APIs
- **Three.js Modules**:
  - `WebGLRenderer` - High-performance rendering
  - `OrthographicCamera` / `PerspectiveCamera` - Camera systems
  - `TextureLoader` - Image texture management
  - `ShaderMaterial` - Custom GLSL shader materials
  - `PlaneGeometry` - 2D geometry for shader surfaces

## 🎨 Advanced Techniques

### Custom GLSL Shaders
- **Fragment Shaders**: Complex pixel-level effects including:
  - Procedural noise generation for organic animations
  - Multi-layer shadow rendering with blur sampling
  - Fluid stroke trail calculations with distance fields
  - Animated dot matrix with flow-based movement
  - Vertical sweep animations with smooth transitions

- **Vertex Shaders**: UV coordinate mapping for texture sampling

### WebGL Performance Optimizations
- **Efficient Trail System**: Limited trail array (20 points) with age-based fading
- **Click Ripple Pooling**: Reusable ripple effect system (5 concurrent ripples)
- **Texture Filtering**: Optimized texture sampling with LinearFilter
- **Alpha Blending**: Proper transparency handling for compositing layers

### Animation Techniques
- **RequestAnimationFrame**: Smooth 60fps animations
- **Scroll-Based Triggers**: Intersection Observer API for viewport detection
- **Easing Functions**: Custom smoothstep functions for natural motion
- **Momentum-Based Movement**: Physics-inspired cursor tracking

### Interactive Features
- **Silhouette Detection**: Canvas pixel reading for cursor interaction
- **Mouse Velocity Tracking**: Dynamic response based on movement speed
- **Parallax Effects**: Multi-layer depth simulation
- **3D Transform Calculations**: CSS transforms driven by Three.js calculations

## 📁 Project Structure

```
professional-portfolio-mrechnio-1/
├── index.html              # Main portfolio page
├── case-studies.html       # Case studies page
├── companies.html          # Companies page
├── contact.html            # Contact page
├── css/
│   └── styles.css         # Main stylesheet
├── js/
│   ├── script.js          # Main Three.js scene & shaders
│   ├── cursor.js          # Custom cursor implementation
│   ├── menu.js            # Navigation menu
│   ├── greeting-animation.js
│   ├── footer-animation.js
│   ├── tab-visibility.js
│   ├── ux-label-scroll.js
│   └── background-animation.js
├── images/
│   ├── mrech.png          # Profile image
│   ├── plus-icon.png
│   ├── white-plus-icon.png
│   └── third-page-pictures/  # Portfolio gallery images
└── favicons/
    ├── black/             # Light mode favicons
    └── white/             # Dark mode favicons
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support (Chrome, Firefox, Safari, Edge)
- Python 3.x (for local development server)
- Or any static file server

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MaksRechnio/professional-portfolio-mrechnio.git
   cd professional-portfolio-mrechnio-1
   ```

2. **Set up Python virtual environment** (optional)
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Start local server**
   ```bash
   python3 -m http.server 8000
   ```

4. **Open in browser**
   ```
   http://localhost:8000
   ```

### Alternative: Using Node.js
```bash
npx http-server -p 8000
```

## 🧭 Navigation

### Main Sections
1. **Hero Section** - Interactive profile visualization with shader effects
2. **Quote Section** - Animated text display
3. **Portfolio Gallery** - 3D scroll-driven image showcase
4. **Experience Summary** - Timeline with 3D animations
5. **Footer** - Contact information and social links

### Page Navigation
- **Case Studies** (`/case-studies.html`) - Detailed project showcases
- **Companies** (`/companies.html`) - Company collaborations
- **Contact** (`/contact.html`) - Contact form and information

## 🎭 Interactive Elements

### Profile Image Interaction
- **Hover**: Reveals animated dot matrix through fluid stroke
- **Click**: Creates expanding ripple effects
- **Movement**: Mouse trail creates liquid-like reveal paths
- **Scroll**: Vertical sweep animation cycles every 8 seconds

### Portfolio Gallery
- **Scroll**: Images position dynamically in 3D space
- **Parallax**: Multi-layer depth effect
- **Responsive**: Adapts to viewport size

## 🔧 Customization

### Shader Parameters
Edit `js/script.js` to modify:
- `revealRadiusNormalized` - Stroke width
- Trail array size and fade timing
- Ripple expansion speed
- Dot matrix density and animation speed

### Colors
Modify shader uniforms in `createShaderMaterial()`:
- Orange shadow color: `vec3(255.0/255.0, 107.0/255.0, 92.0/255.0)`
- Background color: `vec3(12.0/255.0, 4.0/255.0, 45.0/255.0)`

### Animation Timing
Adjust in shader code:
- Vertical sweep cycle: `mod(t, 8.0)` - Change 8.0 to modify duration
- Trail fade: `smoothstep(1.0, 0.3, age)` - Adjust fade curve

## 📝 Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ⚠️ Requires WebGL 2.0 support

## 📄 License

This project is a personal portfolio. All rights reserved.

## 👤 Author

**Maksymilian Rechnio**
- UX/UI Designer & Creative Advertising Strategist
- Portfolio: [View Live Site](https://your-domain.com)
- LinkedIn: [maksymilian-rechnio](https://www.linkedin.com/in/maksymilian-rechnio)

---

*Built with passion for creative web experiences and cutting-edge web technologies.*
