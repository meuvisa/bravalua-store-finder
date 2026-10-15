/* Demo configuration. The Maps key is public by design: protect it with an HTTP referrer
   restriction (github.io + localhost) and API restrictions in Google Cloud. */
window.BV_CONFIG = {
  apiKey: '',          /* set in config.local.js (local) or by the deploy from the MAPS_API_KEY secret */
  mapId: 'e0d1d183b3639e866afbe755', /* Map ID "bravalua-store-finder" (project bravalua-demo) */
  defaultLang: 'pt',   /* first visit opens in Portuguese; switch order is PT, DE, EN */
  syncHtmlLang: true,
  heroLangs: false,    /* the demo shows DE/EN/PT in the header instead */
  consent: 'none',     /* demo loads the map directly; on bravalua.de use 'complianz' (follows the cookie banner) */
  privacyUrl: 'https://bravalua.de/datenschutzerklaerung/'
};
