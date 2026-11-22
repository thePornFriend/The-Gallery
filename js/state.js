const state = {
  selectedGalleryValues: new Set(),
  colorFilter: { active: false, colorActive: false, hue: 0, lumActive: false, luminance: 0.5, minSimilarity: 90 },
  triggerFilter: () => {},
  chiaroscuroActive: false,
  currentNeonColor: '#FF0080',
  neonController: null,
  CHIARO_YELLOW: '#7A6500',
  STUDIO_GROUPS: {
    'Aylo (aka. MindGeek)' : ['Brazzers', 'Digital Playground', 'Letsdoit Channels', 'Mofos', 'Reality Kings', 'Twistys', 'Sweetheart Video', 'Sweet Sinner', 'Family Sinners'],
    'Adult Time' : ['21Naturals', 'Girlsway', 'Lez Be Bad', 'Joymii'],
    'Euphoria' : ['Angels Love', 'Nancy Love', 'Sensual Love', 'Ultra Films', 'WowGirls'],
    'Letsdoit Channels' : ['A Girl Knows', 'Her Limit', 'Horny Hostel', 'Latina Milf', 'Letsdoit', 'The White Boxxx'],
    'MetArt Network' : ['Domai', 'Eternal Desire', 'MetArt', 'MetArt X', 'SexArt', 'Straplez', 'Stunning 18', 'TLE|The Life Erotic', 'Viv Thomas'],
    'Mile High Media' : ['EroticaX', 'HardX'],
    'New Sensations' : ['Hotwife XXX', 'Family XXX' ],
    'Nubiles Porn': ['Bratty Sis', 'Cheating Sis', 'Cum Swapping Sis', 'Family Swap', 'Moms Teach Sex', 'My Family Pies', 'Step Siblings Caught'],
    'Vixen Media Group': ['Blacked', 'Deeper', 'MILFY', 'Slayed', 'Tushy', 'Vixen','Wifey']
  }
};

console.log("state Letsdoit updated");
