/**
 * The site's settings, in the shape of the dashboard's config/dashboard.json.
 * Scene names are the ones in data/scenes.json (from the dashboard's config/scenes/).
 */
export const config = {
  fps: 20,
  // 60 rows on every screen, so a phone shows the same composition as a monitor
  grid: { rows: 60, cellWidth: 10, cellHeight: 18 },

  /** The name that assembles itself in the sky on the home page. Keep the subtitle short. */
  title: { text: 'Vien Tran', subtitle: 'Engineer · ATL' },

  /** Salah times and the home scene follow this place. City-level coordinates are enough. */
  prayer: {
    place: 'Atlanta',
    latitude: 33.749,
    longitude: -84.388,
    timezone: 'America/New_York',
    method: 'NorthAmerica',
    madhab: 'Shafi',
  },

  /** The verses themselves are in data/verses.json (the dashboard's curated list). */
  verse: { rotateMinutes: 1 },

  /**
   * Pages, in order. `id` is the section in index.html and the address (#about).
   * The home page has a scene per prayer; the others have one scene each. A visitor can change any
   * of them with the ▣ Background box (saved in their browser only).
   */
  pages: [
    {
      id: 'home',
      label: 'Home',
      sceneByPrayer: { fajr: 'aqsa-fajr', dhuhr: 'kaaba-dhuhr', asr: 'sophia-asr', maghrib: 'madinah-maghrib', isha: 'farooq-isha' },
    },
    { id: 'about', label: 'About', subtitle: 'Vien Tran', scene: 'kazakh-meadow' },
    { id: 'experience', label: 'Experience', subtitle: 'School & work', scene: 'madinah' },
    { id: 'projects', label: 'Projects', subtitle: 'Builds', scene: 'haram-aerial' },
    { id: 'resume', label: 'Resume', subtitle: '& contact', scene: 'night-mosque' },
    { id: 'tools', label: 'Tools', subtitle: 'Browser utilities', scene: 'farooq-arch' },
  ],
}
