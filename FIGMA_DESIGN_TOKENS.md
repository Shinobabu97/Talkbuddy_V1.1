# Figma Design Tokens - Comprehensive Extraction

## 📊 Summary
- **Total Colors**: 7 unique color values
- **Typography Styles**: 5 text styles found
- **Shadow Styles**: 38 shadow variations
- **Border Radius**: 1 consistent value (14px)
- **Buttons**: 9 button components
- **Input Fields**: 4 input field patterns
- **Cards**: 2 card component patterns

---

## 🎨 Colors

### Primary Colors
| Color | RGB | Hex | Usage |
|-------|-----|-----|-------|
| **White** | `rgb(255, 255, 255)` | `#FFFFFF` | Background, cards |
| **Black** | `rgb(0, 0, 0)` | `#000000` | Primary text |
| **Gray** | `rgb(196, 196, 196)` | `#C4C4C4` | UI elements, borders |

### Background Colors
- **Canvas Background**: `rgb(229, 229, 229)` | `#E5E5E5` (rgba: 0.898, 0.898, 0.898)

### Shadow Opacities
- **Light Shadow**: `rgba(0, 0, 0, 0.04)` - 4% opacity
- **Medium Shadow**: `rgba(0, 0, 0, 0.06)` - 6% opacity
- **Heavy Shadow**: `rgba(0, 0, 0, 0.115)` - 11.5% opacity
- **Very Heavy Shadow**: `rgba(0, 0, 0, 0.23)` - 23% opacity

---

## ✍️ Typography

### Font Family
- **Primary Font**: `Poppins`
- **Font Style**: `SemiBold`
- **Font Weight**: `600`

### Text Styles
All headings use consistent styling:
- **Font Size**: `24px`
- **Line Height**: `33.4px` (139.2% of font size)
- **Letter Spacing**: `0`
- **Text Align**: Left
- **Font Weight**: `600` (SemiBold)

### Sample Text Content
- "I speak..."
- "Choose your level..."
- "I want to learn..."

---

## 🎯 Border Radius

All UI elements use a consistent border radius:
- **Border Radius**: `14px`

This applies to:
- Cards
- Buttons (likely)
- Input fields (likely)
- Frames/Containers

---

## 🌑 Shadow System

The design uses a sophisticated multi-layer shadow system with three standard layers:

### Standard Card Shadow (3 layers)
```css
box-shadow: 
  0px 0px 1px rgba(0, 0, 0, 0.04),      /* Layer 1: Subtle outline */
  0px 2px 6px rgba(0, 0, 0, 0.04),      /* Layer 2: Close shadow */
  0px 16px 24px rgba(0, 0, 0, 0.06);    /* Layer 3: Deep shadow */
```

### Hero/Featured Shadow (2 layers)
```css
box-shadow: 
  0px 26.4px 54.7px rgba(0, 0, 0, 0.23),  /* Main shadow */
  0px 234px 437px rgba(0, 0, 0, 0.115);  /* Ambient shadow */
```

### Shadow Specifications
| Shadow Type | Offset X | Offset Y | Radius | Opacity |
|-------------|----------|----------|--------|---------|
| Outline | 0px | 0px | 1px | 0.04 |
| Close | 0px | 2px | 6px | 0.04 |
| Deep | 0px | 16px | 24px | 0.06 |
| Hero Main | 0px | 26.4px | 54.7px | 0.23 |
| Hero Ambient | 0px | 234px | 437px | 0.115 |

---

## 📐 Spacing & Dimensions

### Key Dimensions

#### Main Frames
- **Canvas Width**: `1600px`
- **Canvas Height**: `1200px`

#### Card Dimensions
- **Standard Card Width**: `781.22px`
- **Standard Card Height**: `616.35px`

#### Button Dimensions
- **Primary Button Width**: `313.12px`
- **Primary Button Height**: `137.86px`
- **Small Button Width**: `126.72px`
- **Small Button Height**: `63.33px`

#### Input Field Dimensions
- **Input Width**: `353.08px`
- **Input Height**: `134.01px`

#### Text Elements
- **Title Width Range**: `118px - 244px`
- **Title Height Range**: `52px - 86px`

#### Step Indicators
- **Step Indicator Width**: `64.9px`
- **Step Indicator Height**: `22.3px`

---

## 🧩 Component Patterns

### Buttons
Found 9 button instances:
1. **Primary Buttons** (Group type)
   - Dimensions: `313.12px × 137.86px`
   - Used in main screens
   
2. **Small Buttons** (Group type)
   - Dimensions: `126.72px × 63.33px`
   - Used for secondary actions

### Input Fields
Found 4 input field patterns:
- **Username Fields**: `353.08px × 134.01px`
- **Password Fields**: `353.08px × 134.01px`
- Consistent sizing across signup/login screens

### Cards
Found 2 card component patterns:

#### Card Type 1: Signup Page
- **Border Radius**: `14px`
- **Background**: White (`#FFFFFF`)
- **Shadows**: Standard 3-layer shadow system
- **Dimensions**: `781.22px × 616.35px`

#### Card Type 2: Simple Card
- **Border Radius**: `14px`
- **Background**: White (`#FFFFFF`)
- **Shadows**: None (or minimal)
- **Dimensions**: `781.22px × 616.35px`

---

## 🖼️ Screen Structure

### Identified Screens

1. **Cover/Frame 1** (`12:1314`)
   - Main landing page layout
   - Contains header, text, buttons, steps

2. **Signup Pages** (`12:1190`, `12:1584`)
   - Username and password inputs
   - Signup button
   - White card background with shadows

3. **Language Selection** (`12:2053`, `12:2403`)
   - "I want to learn..." screen
   - Language selection interface

4. **Level Selection** (`12:2136`, `12:2856`)
   - "Choose your level..." screen
   - Beginner/Intermediate/Advanced selection

5. **I Speak Selection** (`12:2203`)
   - "I speak..." screen
   - Native language selection

6. **Course Screen** (`520:3`)
   - Main course interface ("Cours")
   - Appears to be a complex layout with multiple components

---

## 🎨 Design System Patterns

### Visual Style
- **Minimalist**: Clean, white backgrounds
- **Subtle Shadows**: Sophisticated multi-layer shadow system
- **Rounded Corners**: Consistent 14px border radius
- **High Contrast**: Black text on white backgrounds
- **Gray Accents**: Light gray (`#C4C4C4`) for UI elements

### Layout Principles
- **Generous Spacing**: Large cards (781px × 616px)
- **Consistent Padding**: Uniform spacing throughout
- **Grid-Based**: Aligned to a structured layout
- **Centered Content**: Main content centered on canvas

### Interaction Patterns
- **Button Groups**: Buttons organized in groups
- **Form Inputs**: Consistent input field sizing
- **Card Hierarchy**: Different shadow levels for importance
- **Step Indicators**: Visual progress indicators (64.9px × 22.3px)

---

## 📝 Implementation Notes

### CSS Variables Suggested
```css
:root {
  /* Colors */
  --color-white: #FFFFFF;
  --color-black: #000000;
  --color-gray: #C4C4C4;
  --color-bg-canvas: #E5E5E5;
  
  /* Typography */
  --font-family: 'Poppins', sans-serif;
  --font-weight-semibold: 600;
  --font-size-heading: 24px;
  --line-height-heading: 33.4px;
  
  /* Spacing */
  --border-radius: 14px;
  --card-width: 781.22px;
  --card-height: 616.35px;
  --button-primary-width: 313.12px;
  --button-primary-height: 137.86px;
  
  /* Shadows */
  --shadow-outline: 0px 0px 1px rgba(0, 0, 0, 0.04);
  --shadow-close: 0px 2px 6px rgba(0, 0, 0, 0.04);
  --shadow-deep: 0px 16px 24px rgba(0, 0, 0, 0.06);
  --shadow-card: 0px 0px 1px rgba(0, 0, 0, 0.04),
                 0px 2px 6px rgba(0, 0, 0, 0.04),
                 0px 16px 24px rgba(0, 0, 0, 0.06);
}
```

### Tailwind Config Suggested
```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        'figma-white': '#FFFFFF',
        'figma-black': '#000000',
        'figma-gray': '#C4C4C4',
        'figma-bg': '#E5E5E5',
      },
      borderRadius: {
        'figma': '14px',
      },
      boxShadow: {
        'figma-card': '0px 0px 1px rgba(0, 0, 0, 0.04), 0px 2px 6px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.06)',
        'figma-hero': '0px 26.4px 54.7px rgba(0, 0, 0, 0.23), 0px 234px 437px rgba(0, 0, 0, 0.115)',
      },
    },
  },
}
```

---

## 🚀 Next Steps

1. ✅ Design tokens extracted
2. ⏳ Apply to Tailwind config
3. ⏳ Update component styles
4. ⏳ Implement shadow system
5. ⏳ Apply typography
6. ⏳ Update spacing and dimensions

---

*Extracted from Figma File: `bKLb4yd2c8sq1VJgpsCD9k`*
*Date: $(date)*

