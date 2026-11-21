/**
 * Services data (single source of truth: used by tools/build-static.mjs to pre-render the HTML).
 * item = [English name, description]
 * @module content/services
 */
export const SERVICES = [
  {
    "group": "Video & Ads",
    "id": "video-ads",
    "items": [
      [
        "Cinematic Video Creation",
        "Story-driven cinematic videos for brands, events and promotions."
      ],
      [
        "Professional Advertisement Creation",
        "Ad films and promos that make your business stand out."
      ],
      [
        "AI Video Ads & Reels",
        "Scroll-stopping AI ads and reels for Instagram, YouTube & Facebook."
      ],
      [
        "VFX Editing",
        "Visual effects, transitions and colour grading with a premium finish."
      ],
      [
        "Wedding Invitation Videos & Save-the-Date Reels",
        "Beautiful video invites and save-the-date reels to share on WhatsApp & Instagram."
      ]
    ]
  },
  {
    "group": "Graphics & Social Media",
    "id": "graphics-social-media",
    "items": [
      [
        "Graphics Designing",
        "Eye-catching designs for brands, campaigns and print."
      ],
      [
        "Banner Designing",
        "Flex, hoarding and digital banners that grab attention."
      ],
      [
        "Photo Editing",
        "Retouching, background changes and creative photo edits."
      ],
      [
        "Invitation Cards",
        "Wedding, birthday and event invitations – print & digital."
      ],
      [
        "Posters & Social Media Posts",
        "Ready-to-post creatives for your daily marketing."
      ],
      [
        "Festival & Grand Opening Creatives",
        "Festival wishes and grand-opening designs for your business."
      ],
      [
        "YouTube Thumbnails & Channel Art",
        "Click-worthy thumbnails, banners and logos for your channel."
      ],
      [
        "Political & Election Campaign Creatives",
        "Marathi banners, posts and videos for campaigns and candidates."
      ]
    ]
  },
  {
    "group": "Branding & Print",
    "id": "branding-print",
    "items": [
      [
        "Logo Design & Brand Identity Kits",
        "Logo, colours and fonts that give your business a strong identity."
      ],
      [
        "Visiting Cards, Letterheads & Brochures",
        "Professional print stationery that makes a great first impression."
      ],
      [
        "Restaurant Digital Menus & QR Menu Cards",
        "Attractive printed and QR-code menus for restaurants, cafés and hotels."
      ],
      [
        "AI Product Photography (e-commerce)",
        "Studio-quality product photos with AI for Amazon, Meesho, Instagram & your store."
      ]
    ]
  },
  {
    "group": "Tech & Automation",
    "id": "tech-automation",
    "items": [
      [
        "Web Development",
        "Fast, mobile-friendly websites that bring you customers."
      ],
      [
        "Web Hosting",
        "Fast, secure web hosting plans with NVMe/SSD storage, backups, CDN and free mailboxes."
      ],
      [
        "Secured System (HTTPS)",
        "SSL certificate setup and automatic renewal, so your website opens with the trusted padlock."
      ],
      [
        "Custom Software Development",
        "Software built around your workflow — billing, records, dashboards."
      ],
      [
        "Promotional Call Automation",
        "Automated promotional calls to reach many customers at once."
      ],
      [
        "WhatsApp Automation & AI Chatbot",
        "Auto-replies, broadcasts and AI chatbots that work 24×7."
      ],
      [
        "Lead Generation",
        "Campaigns that bring genuine enquiries to your business."
      ]
    ]
  },
  {
    "group": "3D & Real Estate",
    "id": "d-real-estate",
    "items": [
      [
        "3D Modeling",
        "3D models and renders for buildings, products and visuals."
      ],
      [
        "Real-Estate Walkthrough Videos & 3D Floor Plans",
        "Walkthrough videos and 3D floor plans that help sell projects faster."
      ]
    ]
  }
];

/** WhatsApp prefill for a service enquiry. */
export const serviceMessage = (en) =>
  "Hi Neon AI Studio × AI Nexus! I'm interested in " + en + ". Please share details.";
