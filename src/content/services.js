/**
 * Services data (single source of truth: used by tools/build-static.mjs to pre-render the HTML).
 * item = [English name, Marathi name, description]
 * @module content/services
 */
export const SERVICES = [
  {
    "group": "Video & Ads",
    "id": "video-ads",
    "items": [
      [
        "Cinematic Video Creation",
        "सिनेमॅटिक व्हिडिओ",
        "Story-driven cinematic videos for brands, events and promotions."
      ],
      [
        "Professional Advertisement Creation",
        "प्रोफेशनल जाहिरात",
        "Ad films and promos that make your business stand out."
      ],
      [
        "AI Video Ads & Reels",
        "AI व्हिडिओ ॲड्स आणि रील्स",
        "Scroll-stopping AI ads and reels for Instagram, YouTube & Facebook."
      ],
      [
        "VFX Editing",
        "VFX एडिटिंग",
        "Visual effects, transitions and colour grading with a premium finish."
      ],
      [
        "Wedding Invitation Videos & Save-the-Date Reels",
        "लग्न निमंत्रण व्हिडिओ आणि सेव्ह-द-डेट रील्स",
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
        "ग्राफिक्स डिझायनिंग",
        "Eye-catching designs for brands, campaigns and print."
      ],
      [
        "Banner Designing",
        "बॅनर डिझायनिंग",
        "Flex, hoarding and digital banners that grab attention."
      ],
      [
        "Photo Editing",
        "फोटो एडिटिंग",
        "Retouching, background changes and creative photo edits."
      ],
      [
        "Invitation Cards",
        "निमंत्रण पत्रिका",
        "Wedding, birthday and event invitations – print & digital."
      ],
      [
        "Posters & Social Media Posts",
        "पोस्टर्स आणि सोशल मीडिया पोस्ट",
        "Ready-to-post creatives for your daily marketing."
      ],
      [
        "Festival & Grand Opening Creatives",
        "सण आणि उद्घाटन डिझाइन",
        "Festival wishes and grand-opening designs for your business."
      ],
      [
        "YouTube Thumbnails & Channel Art",
        "YouTube थंबनेल आणि चॅनेल आर्ट",
        "Click-worthy thumbnails, banners and logos for your channel."
      ],
      [
        "Political & Election Campaign Creatives",
        "राजकीय व निवडणूक प्रचार डिझाइन",
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
        "लोगो डिझाइन आणि ब्रँड आयडेंटिटी",
        "Logo, colours and fonts that give your business a strong identity."
      ],
      [
        "Visiting Cards, Letterheads & Brochures",
        "व्हिजिटिंग कार्ड, लेटरहेड आणि ब्रोशर",
        "Professional print stationery that makes a great first impression."
      ],
      [
        "Restaurant Digital Menus & QR Menu Cards",
        "डिजिटल मेनू आणि QR मेनू कार्ड",
        "Attractive printed and QR-code menus for restaurants, cafés and hotels."
      ],
      [
        "AI Product Photography (e-commerce)",
        "AI प्रॉडक्ट फोटोग्राफी",
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
        "वेब डेव्हलपमेंट",
        "Fast, mobile-friendly websites that bring you customers."
      ],
      [
        "Web Hosting",
        "वेब होस्टिंग",
        "Fast, secure web hosting plans with NVMe/SSD storage, backups, CDN and free mailboxes."
      ],
      [
        "Secured System (HTTPS)",
        "सुरक्षित सिस्टम (HTTPS)",
        "SSL certificate setup and automatic renewal, so your website opens with the trusted padlock."
      ],
      [
        "Custom Software Development",
        "कस्टम सॉफ्टवेअर",
        "Software built around your workflow — billing, records, dashboards."
      ],
      [
        "Promotional Call Automation",
        "प्रमोशनल कॉल ऑटोमेशन",
        "Automated promotional calls to reach many customers at once."
      ],
      [
        "WhatsApp Automation & AI Chatbot",
        "WhatsApp ऑटोमेशन आणि AI चॅटबॉट",
        "Auto-replies, broadcasts and AI chatbots that work 24×7."
      ],
      [
        "Lead Generation",
        "लीड जनरेशन",
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
        "3D मॉडलिंग",
        "3D models and renders for buildings, products and visuals."
      ],
      [
        "Real-Estate Walkthrough Videos & 3D Floor Plans",
        "रिअल इस्टेट वॉकथ्रू व्हिडिओ आणि 3D फ्लोअर प्लॅन",
        "Walkthrough videos and 3D floor plans that help sell projects faster."
      ]
    ]
  }
];

/** WhatsApp prefill for a service enquiry. */
export const serviceMessage = (en, mr) =>
  "Hi AI Nexus × Neon AI Studio! I'm interested in " + en + ". Please share details. (नमस्कार, मला " + mr + " बद्दल माहिती हवी आहे.)";
