/* Bravalua Store Finder: data (stores, products, texts in DE/EN/PT). */
(function (w) {
  'use strict';

  /* Coordinates geocoded from the full address (OpenStreetMap, Oct 2026). */
  var STORES = [
    { id: 's1', name: 'Edeka', street: 'Clayallee 328-334', plz: '14169', city: 'Berlin', lat: 52.43772, lng: 13.26309 },
    { id: 's2', name: 'Edeka', street: 'Hultschiner Damm 75-81', plz: '12623', city: 'Berlin', lat: 52.48214, lng: 13.60070 },
    { id: 's3', name: 'Edeka', street: 'Mahlsdorfer Str. 34-38', plz: '12555', city: 'Berlin', lat: 52.46574, lng: 13.58490 },
    { id: 's4', name: 'Edeka', street: 'Kottbusser Damm 5', plz: '10967', city: 'Berlin', lat: 52.49448, lng: 13.42070 },
    { id: 's5', name: 'Edeka', street: 'Garbátyplatz 1', plz: '13187', city: 'Berlin', lat: 52.56719, lng: 13.41050 },
    { id: 's6', name: 'Edeka', street: 'Kurfürstendamm 129d', plz: '10711', city: 'Berlin', lat: 52.49677, lng: 13.29025 },
    { id: 's7', name: 'Edeka', street: 'Berliner Str. 96', plz: '13507', city: 'Berlin', lat: 52.58909, lng: 13.28485 },
    { id: 's8', name: 'Latino Point', street: 'Dircksenstraße 45', plz: '10178', city: 'Berlin', lat: 52.52358, lng: 13.40554 },
    { id: 's9', name: 'Casa Brasil', street: 'Husemannstraße 29', plz: '10435', city: 'Berlin', lat: 52.53943, lng: 13.41767 }
  ];

  /* Offline fallback (no Google Maps yet): approximate centres of Berlin postcode areas and districts. */
  var PLZ = {
    '101': [52.527, 13.392], '102': [52.512, 13.445], '103': [52.515, 13.495], '104': [52.540, 13.420],
    '105': [52.527, 13.340], '106': [52.508, 13.310], '107': [52.490, 13.320], '108': [52.485, 13.355],
    '109': [52.495, 13.400], '120': [52.475, 13.440], '121': [52.460, 13.385], '122': [52.445, 13.320],
    '123': [52.430, 13.460], '124': [52.450, 13.510], '125': [52.440, 13.590], '126': [52.535, 13.580],
    '130': [52.555, 13.480], '131': [52.580, 13.410], '133': [52.550, 13.360], '134': [52.590, 13.330],
    '1350': [52.600, 13.270], '1358': [52.535, 13.200], '1359': [52.530, 13.180], '136': [52.540, 13.190],
    '140': [52.515, 13.265], '141': [52.435, 13.230]
  };
  var AREAS = {
    'mitte': [52.520, 13.400], 'kreuzberg': [52.497, 13.411], 'friedrichshain': [52.512, 13.452],
    'prenzlauer berg': [52.539, 13.424], 'neukölln': [52.476, 13.438], 'neukoelln': [52.476, 13.438],
    'charlottenburg': [52.516, 13.304], 'wilmersdorf': [52.487, 13.320], 'schöneberg': [52.482, 13.353],
    'schoeneberg': [52.482, 13.353], 'tempelhof': [52.466, 13.385], 'steglitz': [52.456, 13.320],
    'zehlendorf': [52.434, 13.259], 'spandau': [52.536, 13.200], 'reinickendorf': [52.588, 13.326],
    'tegel': [52.588, 13.285], 'pankow': [52.569, 13.402], 'wedding': [52.548, 13.360],
    'moabit': [52.527, 13.340], 'lichtenberg': [52.515, 13.495], 'treptow': [52.480, 13.475],
    'köpenick': [52.445, 13.578], 'koepenick': [52.445, 13.578], 'marzahn': [52.545, 13.560],
    'hellersdorf': [52.534, 13.606], 'mahlsdorf': [52.504, 13.613], 'weißensee': [52.553, 13.466],
    'alexanderplatz': [52.521, 13.413], 'halensee': [52.497, 13.293], 'dahlem': [52.457, 13.287]
  };

  var IMG = 'assets/produtos/';
  var PRODUCTS = [
    { img: IMG + 'pao-de-queijo.png',
      de: { name: 'Käsebrötchen', alt: 'Pão de Queijo', desc: 'Das Kultgebäck aus Minas Gerais: kleine Käsebrötchen aus Maniokmehl, außen knusprig, innen weich und herrlich käsig. Einfach im Ofen aufbacken.', tags: ['Glutenfrei', 'Vegetarisch', 'Ohne Konservierungsstoffe', 'Zum Aufbacken'] },
      en: { name: 'Cheese bread', alt: 'Pão de Queijo', desc: 'The iconic snack from Minas Gerais: small cheese breads made with cassava flour, crisp outside, soft and cheesy inside. Simply bake in the oven.', tags: ['Gluten-free', 'Vegetarian', 'No preservatives', 'Oven-bake'] },
      pt: { name: 'Pão de Queijo', alt: 'Käsebrötchen', desc: 'O clássico mineiro: pãezinhos de polvilho com queijo, crocantes por fora e macios por dentro. É só assar no forno.', tags: ['Sem glúten', 'Vegetariano', 'Sem conservantes', 'Para assar'] } },
    { img: IMG + 'coxinha.png',
      de: { name: 'Hähnchenkroketten', alt: 'Coxinha de Frango', desc: 'Brasiliens beliebtester Snack: knusprig panierter Teig in Tropfenform, gefüllt mit gewürztem, gezupftem Hähnchen.', tags: ['Tiefkühlkost', 'ca. 11 Stk.'] },
      en: { name: 'Chicken croquettes', alt: 'Coxinha de Frango', desc: 'Brazil’s favourite snack: a crispy, breaded teardrop-shaped dough filled with seasoned shredded chicken.', tags: ['Frozen', 'approx. 11 pcs'] },
      pt: { name: 'Coxinha de Frango', alt: 'Hähnchenkroketten', desc: 'O salgado preferido do Brasil: massa empanada e crocante em formato de gota, recheada com frango desfiado e temperado.', tags: ['Congelado', 'aprox. 11 unid.'] } },
    { img: IMG + 'massa-de-pastel.png',
      de: { name: 'Teig für Pastel de Feira', alt: 'Massa de Pastel', desc: 'Der Teig für den Marktklassiker: einfach füllen, ob mit Käse, Fleisch oder Palmherz, und goldbraun frittieren.', tags: ['Tiefkühlkost', 'Zum Frittieren'] },
      en: { name: 'Pastel de Feira dough', alt: 'Massa de Pastel', desc: 'The dough for Brazil’s street-market favourite: fill it with cheese, meat or heart of palm and fry until golden.', tags: ['Frozen', 'For frying'] },
      pt: { name: 'Massa de Pastel de Feira', alt: 'Teig für Pastel', desc: 'A massa do pastel de feira: recheie com queijo, carne ou palmito e frite até dourar.', tags: ['Congelado', 'Para fritar'] } },
    { img: IMG + 'bolinha-de-queijo.png',
      de: { name: 'Käsebällchen', alt: 'Bolinha de Queijo', desc: 'Goldbraun panierte Bällchen mit cremig-zartschmelzender Käsefüllung. Perfekt als Snack oder für die Party.', tags: ['Tiefkühlkost', 'ca. 12 Stk.'] },
      en: { name: 'Cheese balls', alt: 'Bolinha de Queijo', desc: 'Golden breaded bites with a creamy, melting cheese filling. Perfect as a snack or for parties.', tags: ['Frozen', 'approx. 12 pcs'] },
      pt: { name: 'Bolinha de Queijo', alt: 'Käsebällchen', desc: 'Bolinhas empanadas e douradas com recheio cremoso de queijo derretido. Perfeitas para o lanche ou a festa.', tags: ['Congelado', 'aprox. 12 unid.'] } },
    { img: IMG + 'mini-churros.png',
      de: { name: 'Mini-Churros', alt: 'mit Milchkaramell', desc: 'Kleine, knusprige Churros mit Zimtzucker und einer Füllung aus cremigem Milchkaramell (Doce de Leite).', tags: ['Tiefkühlkost', 'ca. 8 Stk.', 'Neu'] },
      en: { name: 'Mini churros', alt: 'with dulce de leche', desc: 'Small, crunchy churros with cinnamon sugar and a creamy dulce de leche (doce de leite) filling.', tags: ['Frozen', 'approx. 8 pcs', 'New'] },
      pt: { name: 'Mini Churros', alt: 'com doce de leite', desc: 'Churrinhos crocantes com açúcar e canela, recheados com doce de leite cremoso.', tags: ['Congelado', 'aprox. 8 unid.', 'Novidade'] } },
    { img: IMG + 'kibe.png',
      de: { name: 'Rinderkroketten', alt: 'Kibe', desc: 'Würzige Kroketten aus Rindfleisch und Weizenschrot, verfeinert mit frischer Minze. Ein Stück arabisch-brasilianischer Tradition.', tags: ['Tiefkühlkost', 'ca. 8 Stk.', 'Neu'] },
      en: { name: 'Beef croquettes', alt: 'Kibe', desc: 'Spiced croquettes of beef and bulgur wheat with a touch of fresh mint. An Arab-Brazilian classic.', tags: ['Frozen', 'approx. 8 pcs', 'New'] },
      pt: { name: 'Kibe', alt: 'Rinderkroketten', desc: 'Quibe de carne bovina e trigo com hortelã. Um clássico da culinária árabe-brasileira.', tags: ['Congelado', 'aprox. 8 unid.', 'Novidade'] } }
  ];

  var T = {
    de: {
      title: 'Finde Bravalua in deiner Nähe',
      sub: 'Gib deine Postleitzahl oder Adresse ein – wir zeigen dir die nächsten Geschäfte mit brasilianischen Spezialitäten von Bravalua.',
      placeholder: 'PLZ oder Adresse, z. B. 10967 oder Kreuzberg', search: 'Suchen',
      locate: 'Meinen Standort verwenden', locating: 'Standort wird ermittelt …', myLocation: 'Dein Standort',
      geoError: 'Dein Standort ist gerade nicht verfügbar. Gib bitte deine PLZ oder Adresse ein.',
      results: 'Geschäfte', sortNear: 'nach Entfernung', nearest: 'Am nächsten',
      showMap: 'Auf Karte zeigen', openMaps: 'Route in Google Maps',
      emptyTitle: 'Wo bist du?', emptyText: 'Gib oben deine PLZ oder Adresse ein. Dann zeigen wir dir die Bravalua-Geschäfte in deiner Nähe auf der Karte.',
      legendStore: 'Geschäft', legendYou: 'Deine Suche', mapNote: 'Karte: Berlin (schematisch)',
      found: function (n) { return 'Ergebnisse sortiert nach Entfernung zu „' + n + '“.'; },
      notFound: 'Adresse nicht gefunden', notFoundHint: 'Probier es mit deiner PLZ oder einem Bezirk, zum Beispiel:',
      geoErrorTitle: 'Standort nicht verfügbar',
      outside: 'Noch nicht in deiner Region', outsideHint: 'Bravalua gibt es bisher in Berliner Geschäften. Probier eine Berliner PLZ oder einen Bezirk:',
      gateTitle: 'Google Maps laden?', gateText: 'Zum Anzeigen der Karte werden Daten an Google übertragen. Mehr dazu in unserer Datenschutzerklärung.',
      gateBtn: 'Karte laden', privacy: 'Datenschutzerklärung', close: 'Schließen', suggestions: 'Vorschläge',
      products: 'Unsere Produkte', productsSub: 'Brasilianische Spezialitäten, Made in Germany: tiefgekühlt, schnell zubereitet und so lecker wie in Brasilien. Erhältlich in den Geschäften auf der Karte oben.',
      prev: 'Vorheriges Produkt', next: 'Nächstes Produkt', productOf: function (i, n) { return 'Produkt ' + i + ' von ' + n; }
    },
    en: {
      title: 'Find Bravalua near you',
      sub: 'Enter your postcode or address and we will show you the nearest stores carrying Bravalua’s Brazilian specialties.',
      placeholder: 'Postcode or address, e.g. 10967 or Kreuzberg', search: 'Search',
      locate: 'Use my location', locating: 'Finding your location …', myLocation: 'Your location',
      geoError: 'Your location isn’t available right now. Please enter your postcode or address.',
      results: 'Stores', sortNear: 'by distance', nearest: 'Nearest',
      showMap: 'Show on map', openMaps: 'Directions in Google Maps',
      emptyTitle: 'Where are you?', emptyText: 'Enter your postcode or address above and we will show you the Bravalua stores near you on the map.',
      legendStore: 'Store', legendYou: 'Your search', mapNote: 'Map: Berlin (schematic)',
      found: function (n) { return 'Results sorted by distance from “' + n + '”.'; },
      notFound: 'Address not found', notFoundHint: 'Try your postcode or a district, for example:',
      geoErrorTitle: 'Location not available',
      outside: 'Not in your area yet', outsideHint: 'Bravalua is currently sold in Berlin stores. Try a Berlin postcode or district:',
      gateTitle: 'Load Google Maps?', gateText: 'Showing the map sends data to Google. See our privacy policy for details.',
      gateBtn: 'Load map', privacy: 'Privacy policy', close: 'Close', suggestions: 'Suggestions',
      products: 'Our products', productsSub: 'Brazilian specialties, made in Germany: frozen, quick to prepare and as tasty as in Brazil. Available at the stores on the map above.',
      prev: 'Previous product', next: 'Next product', productOf: function (i, n) { return 'Product ' + i + ' of ' + n; }
    },
    pt: {
      title: 'Encontre a Bravalua perto de você',
      sub: 'Digite seu CEP (PLZ) ou endereço e mostramos as lojas mais próximas com as delícias brasileiras da Bravalua.',
      placeholder: 'CEP ou endereço, ex.: 10967 ou Kreuzberg', search: 'Buscar',
      locate: 'Usar minha localização', locating: 'Buscando sua localização …', myLocation: 'Sua localização',
      geoError: 'Não conseguimos acessar sua localização agora. Digite seu CEP ou endereço.',
      results: 'Lojas', sortNear: 'por distância', nearest: 'Mais próxima',
      showMap: 'Ver no mapa', openMaps: 'Rota no Google Maps',
      emptyTitle: 'Onde você está?', emptyText: 'Digite seu CEP ou endereço acima e mostramos no mapa as lojas Bravalua perto de você.',
      legendStore: 'Loja', legendYou: 'Sua busca', mapNote: 'Mapa: Berlim (esquemático)',
      found: function (n) { return 'Resultados ordenados pela distância de “' + n + '”.'; },
      notFound: 'Endereço não encontrado', notFoundHint: 'Tente seu CEP (PLZ) ou um bairro, por exemplo:',
      geoErrorTitle: 'Localização indisponível',
      outside: 'Ainda não chegamos à sua região', outsideHint: 'Por enquanto a Bravalua está em lojas de Berlim. Tente um CEP ou bairro de Berlim:',
      gateTitle: 'Carregar o Google Maps?', gateText: 'Para mostrar o mapa, dados são enviados ao Google. Veja nossa política de privacidade.',
      gateBtn: 'Carregar mapa', privacy: 'Política de privacidade', close: 'Fechar', suggestions: 'Sugestões',
      products: 'Nossos produtos', productsSub: 'Delícias brasileiras feitas na Alemanha: congeladas, práticas de preparar e com o sabor do Brasil. À venda nas lojas do mapa acima.',
      prev: 'Produto anterior', next: 'Próximo produto', productOf: function (i, n) { return 'Produto ' + i + ' de ' + n; }
    }
  };

  w.BV_DATA = { STORES: STORES, PLZ: PLZ, AREAS: AREAS, PRODUCTS: PRODUCTS, T: T };
})(window);
