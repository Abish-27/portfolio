// x and widths are in px (screen-space). yOffset is px below the section top.
// Keep values within typical viewport widths (we’ll make it responsive later).

export const LEVEL = {
  hero: {
    platforms: [
      { x: 60,  w: 220, yOffset: 260 },
      { x: 360, w: 180, yOffset: 340 },
    ],
    ladders: [{ x: 140, w: 50, from: 'hero', to: 'about' }],
  },

  about: {
    platforms: [
      { x: 80,  w: 200, yOffset: 240 },
      { x: 320, w: 160, yOffset: 320 },
      { x: 560, w: 200, yOffset: 260 },
    ],
    ladders: [{ x: 140, w: 50, from: 'about', to: 'projects' }],
  },

  projects: {
    platforms: [
      { x: 70,  w: 160, yOffset: 260 },
      { x: 280, w: 220, yOffset: 360 },
      { x: 560, w: 180, yOffset: 300 },
    ],
    ladders: [{ x: 140, w: 50, from: 'projects', to: 'skills' }],
  },

  skills: {
    platforms: [
      { x: 90,  w: 240, yOffset: 260 },
      { x: 390, w: 160, yOffset: 330 },
      { x: 600, w: 160, yOffset: 250 },
    ],
    ladders: [{ x: 140, w: 50, from: 'skills', to: 'contact' }],
  },

  contact: {
    platforms: [
      { x: 120, w: 260, yOffset: 280 },
      { x: 460, w: 240, yOffset: 340 },
    ],
    ladders: [],
  },
}
