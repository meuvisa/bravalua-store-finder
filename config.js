/* Demo configuration. The Maps key is public by design: protect it with an HTTP referrer
   restriction (github.io + localhost) and API restrictions in Google Cloud. */
window.BV_CONFIG = {
  apiKey: '',          /* Google Maps API key. Empty = schematic map + offline postcode search */
  mapId: '',           /* Google Map ID (Map Management). Empty = Google's DEMO_MAP_ID */
  consent: 'click',    /* 'click' = "load map" button (DSGVO); on WordPress use 'complianz' */
  privacyUrl: 'https://bravalua.de/datenschutzerklaerung/'
};
