# ShelfCheck

A phone web app (PWA): scan a food barcode and get a report on CO₂, food miles, nutrition, how processed it is, whether it's healthy, whether the name is misleading, and whether the price is normal. Germany by default; any EU country or the UK can be chosen in Settings.

Data comes from [Open Food Facts](https://world.openfoodfacts.org) and [Open Prices](https://prices.openfoodfacts.org). The AI check is optional: paste a Claude API key in Settings to enable it.

## Run
```sh
npm start        # serves on http://localhost:8000 (python3 -m http.server)
npm test         # node --test
```
The camera needs HTTPS. To use it on your phone, host the folder on GitHub Pages (or any static host), open it in Chrome on Android, then choose **⋮ → Add to Home screen**.

## Adding a report section
1. Create `src/sections/my-check.js`:
   ```js
   export default {
     id: 'my-check',
     title: 'My check',
     inputs: [{ key: 'note', label: 'Optional field' }], // optional: fields shown on the card, saved per barcode
     async run({ product, settings, input, history, services }) {
       return { status: 'good' | 'warn' | 'bad' | 'info', summary: '…', details: ['…'] }; // or null to hide
     },
   };
   ```
2. Add it to the list in `src/sections/index.js`.
3. Add the file to `SHELL` in `sw.js` so it works offline.

Sections read only the normalised `Product` from `src/sources/openfoodfacts.js` (`normalise()`), never raw Open Food Facts fields. If a section throws, it shows "Unavailable" and the rest of the report still renders.
