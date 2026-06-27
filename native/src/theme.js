// Wingman brand palette. Existing keys keep their roles (e.g. `black` is the
// primary action color) but now resolve to the brand values, so every consumer
// repoints automatically. New brand tokens are added below.
export const colors = {
  background: '#FBF1E7',   // warm cream page
  surface: '#FFFDFB',      // warm white card
  surfaceWarm: '#FBECD9',  // brand cream (active tabs, warm chips)
  text: '#1F1A17',         // charcoal ink
  muted: '#8A7C72',        // warm grey-brown
  border: '#EFE4D8',       // warm hairline
  black: '#E0447F',        // primary action = Wingman Pink
  blackPressed: '#C2356B', // pressed pink
  secondaryPressed: '#FBDAE7',
  orange: '#EF7D2A',       // tangerine
  amber: '#CD8128',        // crispy gold
  logoPink: '#E0447F',
  green: '#15803D',
  red: '#DC2626',
  slate: '#7A6E66',

  // Brand tokens
  pink: '#E0447F',
  pinkLight: '#F56A9C',
  pinkPressed: '#C2356B',
  charcoal: '#1F1A17',
  gold: '#CD8128',
  tangerine: '#EF7D2A',
  cream: '#FBECD9',
};

// Pink gradient for icon tiles / hero surfaces (use with expo-linear-gradient).
export const gradients = {
  pink: ['#F56A9C', '#E0447F'],
  pinkStart: { x: 0, y: 0 },
  pinkEnd: { x: 1, y: 1 },
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const shadow = {
  shadowColor: '#5A3A2A',
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};
