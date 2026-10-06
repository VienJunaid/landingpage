/*
 * The Tools page's browse/detail switch: a grid of tool tiles, and one view per tool that swaps in
 * when you tap its tile. Each tool's own behavior (file handling, conversions, …) lives in its own
 * module (e.g. tools-pdf.js) and is wired up separately — this only decides which view is showing.
 *
 * Returns a function that resets the page back to the tile grid. app.js calls it every time the
 * Tools page is navigated to, so arriving from another page always lands on the grid, not whichever
 * tool happened to be open the last time you were here.
 */
export function initToolsHub(section) {
  if (!section) return () => {}
  const browse = section.querySelector('.tools-browse')
  const tiles = [...section.querySelectorAll('.tool-tile')]
  const views = [...section.querySelectorAll('.tool-view')]

  function show(key) {
    browse.hidden = !!key
    for (const view of views) view.hidden = view.id !== `tool-view-${key}`
  }

  for (const tile of tiles) tile.onclick = () => show(tile.dataset.tool)
  for (const back of section.querySelectorAll('.tool-back')) back.onclick = () => show(null)

  show(null)
  return () => show(null)
}
