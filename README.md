# Bravalua Store Finder (Prototyp)

Store finder for bravalua.de: search by postcode or address, Google Maps with brand pins,
stores sorted by distance, directions link, DE / EN / PT, and a swipeable product section on mobile.

- `index.html`: demo page (header/footer only for the demo; on WordPress the theme provides them)
- `src/bv-store-finder.js` + `.css`: the block, scoped under `.bv-root`
- `src/bv-data.js`: stores, products and texts
- `config.js`: Google Maps key, Map ID and consent mode

Without a Maps key the block falls back to a schematic Berlin map and an offline postcode lookup.
