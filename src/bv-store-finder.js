/*
 * Bravalua Store Finder + product carousel.
 * Mounts on [data-bv-store-finder] and [data-bv-products]. Config comes from window.BV_CONFIG:
 *   apiKey    Google Maps key (restricted by domain). Empty = schematic map + offline PLZ search.
 *   mapId     Google Map ID (needed for brand-coloured pins). Defaults to Google's DEMO_MAP_ID.
 *   consent   'none' | 'click' (show a "load map" button) | 'complianz' (follow the Complianz banner).
 *   privacyUrl, lang ('de' | 'en' | 'pt', otherwise from ?lang=, saved choice or <html lang>).
 *   stores    optional list overriding the bundled stores (the WordPress plugin passes them here).
 */
(function (w, d) {
  'use strict';

  var DATA = w.BV_DATA;
  var CFG = Object.assign({ apiKey: '', mapId: '', consent: 'click', privacyUrl: 'https://bravalua.de/datenschutzerklaerung/' }, w.BV_CONFIG || {});
  var LANGS = [['de', 'Deutsch'], ['en', 'English'], ['pt', 'Português (Brasil)']];
  var BERLIN = { lat: 52.515, lng: 13.40 };
  var PIN_PATH = 'M18 2 C9 2 3 9 3 17 C3 29 18 44 18 44 C18 44 33 29 33 17 C33 9 27 2 18 2 Z';
  var PIN_SVG = '<svg viewBox="0 0 36 46" aria-hidden="true"><path d="' + PIN_PATH + '" stroke="#43291A" stroke-width="3"/><circle cx="18" cy="17" r="6" fill="#fff" stroke="#43291A" stroke-width="2.5"/></svg>';
  var ICON_SEARCH = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
  var ICON_ROUTE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';
  var ICON_LOCATE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>';
  var STORE_KEY = 'bv-lang';
  var CONSENT_KEY = 'bv-maps-consent';

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return w.localStorage.getItem(k); w.localStorage.setItem(k, v); } catch (e) { return null; } }
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function fmtKm(v, lang) {
    var n = v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    return n.toLocaleString(lang === 'en' ? 'en-GB' : lang, { maximumFractionDigits: 1 }) + ' km';
  }
  function routeUrl(s, origin) {
    var u = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(s.name + ', ' + s.street + ', ' + s.plz + ' ' + s.city);
    if (origin) u += '&origin=' + encodeURIComponent(origin.label === null ? origin.lat + ',' + origin.lng : origin.label);
    return u;
  }
  function isMobile() { return w.matchMedia('(max-width: 899px)').matches; }
  function initialLang() {
    if (CFG.lang && DATA.T[CFG.lang]) return CFG.lang;
    var q = (w.location.search.match(/[?&]lang=(de|en|pt)\b/) || [])[1];
    if (q) return q;
    var saved = store(STORE_KEY);
    if (saved && DATA.T[saved]) return saved;
    var h = (d.documentElement.lang || 'de').slice(0, 2).toLowerCase();
    return DATA.T[h] ? h : 'de';
  }

  /* Shared language state for every block on the page. */
  var lang = initialLang();
  var langListeners = [];
  function setLang(l) {
    if (l === lang) return;
    lang = l; store(STORE_KEY, l);
    langListeners.forEach(function (fn) { fn(l); });
  }
  function langButtons() {
    return '<div class="bv-langs" role="group" aria-label="Sprache / Language / Idioma">' + LANGS.map(function (l) {
      return '<button type="button" class="bv-lang" data-lang="' + l[0] + '" aria-pressed="' + (lang === l[0]) + '" aria-label="' + l[1] + '" lang="' + l[0] + '">' + l[0].toUpperCase() + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- Google Maps loading (only after consent) ---------- */
  var gmaps = null, gmapsPromise = null;
  function hasConsent() {
    if (!CFG.apiKey) return false;
    if (CFG.consent === 'none') return true;
    if (CFG.consent === 'complianz') return typeof w.cmplz_has_consent === 'function' && w.cmplz_has_consent('marketing');
    return store(CONSENT_KEY) === 'yes';
  }
  function loadGoogle() {
    if (gmapsPromise) return gmapsPromise;
    gmapsPromise = new Promise(function (resolve, reject) {
      if (w.google && w.google.maps && w.google.maps.importLibrary) return resolve();
      var cb = '__bvMapsReady' + Date.now();
      w[cb] = function () { delete w[cb]; resolve(); };
      var s = d.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CFG.apiKey) + '&v=weekly&loading=async&region=DE&language=' + lang + '&callback=' + cb;
      s.async = true;
      s.onerror = function () { gmapsPromise = null; reject(new Error('maps')); };
      d.head.appendChild(s);
    }).then(function () {
      return Promise.all(['maps', 'marker', 'places', 'geocoding'].map(function (n) { return w.google.maps.importLibrary(n); }));
    }).then(function (libs) {
      gmaps = { maps: libs[0], marker: libs[1], places: libs[2], geocoding: libs[3] };
      return gmaps;
    });
    return gmapsPromise;
  }

  /* ---------- geocoding ---------- */
  function geocodeOffline(text) {
    var s = (text || '').toLowerCase().trim();
    var m = s.match(/\b1[0-4]\d{3}\b/);
    if (m) {
      var hit = DATA.PLZ[m[0].slice(0, 4)] || DATA.PLZ[m[0].slice(0, 3)];
      if (hit) return { lat: hit[0], lng: hit[1] };
    }
    for (var k in DATA.AREAS) if (s.indexOf(k) !== -1) return { lat: DATA.AREAS[k][0], lng: DATA.AREAS[k][1] };
    return null;
  }
  function geocode(text) {
    if (!gmaps) return Promise.resolve(geocodeOffline(text));
    var g = new gmaps.geocoding.Geocoder();
    /* A bare 5-digit number is a German postcode; bias everything else towards Berlin. */
    var req = /^\s*\d{5}\s*$/.test(text)
      ? { componentRestrictions: { country: 'DE', postalCode: text.trim() } }
      : { address: text, componentRestrictions: { country: 'DE' }, bounds: { north: 52.70, south: 52.33, east: 13.77, west: 13.08 } };
    return g.geocode(req).then(function (r) {
      var loc = r.results[0] && r.results[0].geometry.location;
      return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
    }).catch(function () { return geocodeOffline(text); });
  }

  /* ---------- Store Finder ---------- */
  function StoreFinder(root) {
    this.root = root;
    this.stores = (CFG.stores && CFG.stores.length ? CFG.stores : DATA.STORES).map(function (s) {
      return Object.assign({}, s, { lat: +s.lat, lng: +s.lng });
    });
    this.origin = null;      /* { lat, lng, label } ; label null = device location */
    this.selected = null;
    this.message = '';
    this.query = '';
    this.map = null;         /* Google map renderer, once loaded */
    this.uid = 'bv' + Math.random().toString(36).slice(2, 7);
    this.build();
    var self = this;
    langListeners.push(function () { self.rebuild(); });
    if (hasConsent()) this.startGoogle();
    if (CFG.consent === 'complianz') {
      ['cmplz_status_change', 'cmplz_enable_category', 'cmplz_fire_categories'].forEach(function (ev) {
        d.addEventListener(ev, function () { if (hasConsent()) self.startGoogle(); });
      });
    }
  }

  StoreFinder.prototype.t = function () { return DATA.T[lang]; };

  StoreFinder.prototype.sorted = function () {
    var o = this.origin;
    var list = this.stores.map(function (s) { return Object.assign({}, s, { d: o ? km(o, s) : null }); });
    if (o) list.sort(function (a, b) { return a.d - b.d; });
    return list;
  };

  StoreFinder.prototype.build = function () {
    var t = this.t(), id = this.uid;
    this.root.classList.add('bv-root');
    this.root.innerHTML =
      '<section class="bv-hero" aria-labelledby="' + id + '-h"><div class="bv-wrap">' +
        '<div class="bv-hero-top">' + langButtons() + '</div>' +
        '<h2 class="bv-title" id="' + id + '-h">' + esc(t.title) + '</h2>' +
        '<p class="bv-sub">' + esc(t.sub) + '</p>' +
        '<form class="bv-form" role="search" novalidate>' +
          '<div class="bv-field">' +
            '<label class="bv-sr" for="' + id + '-q">' + esc(t.placeholder) + '</label>' +
            '<input class="bv-input" id="' + id + '-q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" ' +
              'role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + id + '-sg" placeholder="' + esc(t.placeholder) + '">' +
            '<ul class="bv-suggest" id="' + id + '-sg" role="listbox" aria-label="' + esc(t.suggestions) + '" hidden></ul>' +
          '</div>' +
          '<button type="submit" class="bv-btn-search">' + ICON_SEARCH + esc(t.search) + '</button>' +
        '</form>' +
        ('geolocation' in navigator ? '<button type="button" class="bv-locate">' + ICON_LOCATE + '<span>' + esc(t.locate) + '</span></button>' : '') +
        '<p class="bv-msg" role="status" aria-live="polite"></p>' +
      '</div></section>' +
      '<div class="bv-results bv-wrap" id="' + id + '-results">' +
        '<div class="bv-mapcol">' +
          '<div class="bv-map">' +
            '<div class="bv-map-canvas" hidden></div>' +
            '<div class="bv-schematic"></div>' +
            '<div class="bv-gate" hidden></div>' +
            '<div class="bv-sheet" role="dialog" aria-modal="false"></div>' +
          '</div>' +
          '<div class="bv-legend"></div>' +
        '</div>' +
        '<aside class="bv-listcol" aria-labelledby="' + id + '-lh"></aside>' +
      '</div>';

    this.el = {
      form: this.root.querySelector('.bv-form'),
      input: this.root.querySelector('.bv-input'),
      suggest: this.root.querySelector('.bv-suggest'),
      locate: this.root.querySelector('.bv-locate'),
      msg: this.root.querySelector('.bv-msg'),
      results: this.root.querySelector('.bv-results'),
      canvas: this.root.querySelector('.bv-map-canvas'),
      schematic: this.root.querySelector('.bv-schematic'),
      gate: this.root.querySelector('.bv-gate'),
      sheet: this.root.querySelector('.bv-sheet'),
      legend: this.root.querySelector('.bv-legend'),
      list: this.root.querySelector('.bv-listcol')
    };
    this.el.input.value = this.query;
    if (this.map) { this.el.canvas.hidden = false; this.el.schematic.hidden = true; this.el.canvas.appendChild(this.map.div); }
    this.bind();
    this.render();
  };

  /* Language change: rebuild the markup but keep the Google map instance alive. */
  StoreFinder.prototype.rebuild = function () {
    if (this.map) this.map.div.remove();
    this.build();
  };

  StoreFinder.prototype.bind = function () {
    var self = this, el = this.el;
    this.root.querySelectorAll('.bv-lang').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var active = el.suggest.querySelector('[aria-selected="true"]');
      if (active && !el.suggest.hidden) return self.pickSuggestion(+active.getAttribute('data-i'));
      self.search(el.input.value);
    });
    el.input.addEventListener('input', function () { self.query = el.input.value; self.autocomplete(); });
    el.input.addEventListener('keydown', function (e) { self.suggestKeys(e); });
    el.input.addEventListener('blur', function () { setTimeout(function () { self.closeSuggest(); }, 150); });
    if (el.locate) el.locate.addEventListener('click', function () { self.locate(); });
    this.root.addEventListener('click', function (e) {
      var sel = e.target.closest('[data-select]');
      if (sel) { self.select(sel.getAttribute('data-select'), true); return; }
      var card = e.target.closest('.bv-card');
      if (card && isMobile() && !e.target.closest('a,button')) self.select(card.getAttribute('data-id'), true);
      if (e.target.closest('.bv-sheet-close')) { self.selected = null; self.render(); }
      if (e.target.closest('.bv-gate-btn')) { store(CONSENT_KEY, 'yes'); self.startGoogle(); }
    });
  };

  /* ----- search ----- */
  StoreFinder.prototype.search = function (text, preset) {
    var self = this, t = this.t(), q = (text || '').trim();
    this.closeSuggest();
    if (!q && !preset) { this.origin = null; this.selected = null; this.message = ''; this.render(); return; }
    var p = preset ? Promise.resolve(preset) : geocode(q);
    p.then(function (g) {
      if (!g) { self.origin = null; self.selected = null; self.message = 'notFound'; self.render(); return; }
      self.origin = { lat: g.lat, lng: g.lng, label: q };
      self.message = 'found';
      self.selected = self.sorted()[0] ? self.sorted()[0].id : null;
      self.render(true);
      self.afterSearch();
    });
  };

  StoreFinder.prototype.locate = function () {
    var self = this, t = this.t(), btn = this.el.locate;
    btn.disabled = true; btn.querySelector('span').textContent = t.locating;
    navigator.geolocation.getCurrentPosition(function (p) {
      self.origin = { lat: p.coords.latitude, lng: p.coords.longitude, label: null };
      self.query = ''; self.el.input.value = '';
      self.message = 'found';
      self.selected = self.sorted()[0].id;
      self.render(true);
      self.afterSearch();
    }, function () {
      self.message = 'geoError'; self.render();
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };

  StoreFinder.prototype.afterSearch = function () {
    var el = this.el;
    if (isMobile() && !this.map) {
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (isMobile()) {
      el.input.blur();
      setTimeout(function () { el.results.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    }
  };

  /* ----- autocomplete (Places API New, only once Google is loaded) ----- */
  StoreFinder.prototype.autocomplete = function () {
    var self = this, q = this.el.input.value.trim();
    clearTimeout(this.acTimer);
    if (!gmaps || q.length < 3 || /^\d{1,5}$/.test(q)) { this.closeSuggest(); return; }
    this.acTimer = setTimeout(function () {
      if (!self.session) self.session = new gmaps.places.AutocompleteSessionToken();
      var seq = (self.acSeq = (self.acSeq || 0) + 1);
      gmaps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q, sessionToken: self.session, includedRegionCodes: ['de'], language: lang,
        locationBias: { center: BERLIN, radius: 30000 }
      }).then(function (r) {
        if (seq !== self.acSeq) return;
        self.suggestions = r.suggestions.filter(function (s) { return s.placePrediction; }).slice(0, 5);
        self.showSuggest();
      }).catch(function () { self.closeSuggest(); });
    }, 220);
  };
  StoreFinder.prototype.showSuggest = function () {
    var el = this.el, list = this.suggestions || [];
    if (!list.length) { this.closeSuggest(); return; }
    el.suggest.innerHTML = list.map(function (s, i) {
      var p = s.placePrediction;
      return '<li role="option" id="' + el.suggest.id + '-' + i + '" data-i="' + i + '" aria-selected="false"><b>' + esc(p.mainText ? p.mainText.text : p.text.text) + '</b>' +
        (p.secondaryText ? ', ' + esc(p.secondaryText.text) : '') + '</li>';
    }).join('') + '<li class="bv-powered" aria-hidden="true">Google</li>';
    el.suggest.hidden = false;
    el.input.setAttribute('aria-expanded', 'true');
    var self = this;
    el.suggest.querySelectorAll('[data-i]').forEach(function (li) {
      li.addEventListener('mousedown', function (e) { e.preventDefault(); self.pickSuggestion(+li.getAttribute('data-i')); });
    });
  };
  StoreFinder.prototype.closeSuggest = function () {
    this.el.suggest.hidden = true;
    this.el.input.setAttribute('aria-expanded', 'false');
    this.el.input.removeAttribute('aria-activedescendant');
  };
  StoreFinder.prototype.suggestKeys = function (e) {
    var items = [].slice.call(this.el.suggest.querySelectorAll('[data-i]'));
    if (this.el.suggest.hidden || !items.length) return;
    var cur = items.findIndex(function (li) { return li.getAttribute('aria-selected') === 'true'; });
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var n = e.key === 'ArrowDown' ? (cur + 1) % items.length : (cur <= 0 ? items.length - 1 : cur - 1);
      items.forEach(function (li, i) { li.setAttribute('aria-selected', i === n ? 'true' : 'false'); });
      this.el.input.setAttribute('aria-activedescendant', items[n].id);
    } else if (e.key === 'Escape') { this.closeSuggest(); }
  };
  StoreFinder.prototype.pickSuggestion = function (i) {
    var self = this, s = this.suggestions && this.suggestions[i];
    if (!s) return;
    var p = s.placePrediction, label = p.text.text;
    this.el.input.value = this.query = label;
    this.closeSuggest();
    var place = p.toPlace();
    place.fetchFields({ fields: ['location'] }).then(function () {
      self.session = null;
      var loc = place.location;
      self.search(label, loc ? { lat: loc.lat(), lng: loc.lng() } : null);
    }).catch(function () { self.session = null; self.search(label); });
  };

  /* ----- selection ----- */
  StoreFinder.prototype.select = function (id, fromUser) {
    this.selected = id;
    this.render();
    if (this.map) this.map.focus(id);
    if (!fromUser) return;
    var card = this.el.list.querySelector('.bv-card[data-id="' + id + '"]');
    var list = this.el.list.querySelector('.bv-list');
    if (isMobile()) {
      /* On the phone the sheet over the map shows the store; bring the map into view. */
      var r = this.el.results.querySelector('.bv-map').getBoundingClientRect();
      if (r.top < 0 || r.bottom > w.innerHeight) this.el.results.querySelector('.bv-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (card && list) {
      list.scrollTo({ top: card.offsetTop - list.offsetTop - 8, behavior: 'smooth' });
    }
  };

  /* ----- rendering ----- */
  StoreFinder.prototype.render = function (fit) {
    var self = this, t = this.t(), el = this.el, o = this.origin;
    var list = this.sorted();
    var nearestId = o && list[0] ? list[0].id : null;

    el.msg.textContent = this.message === 'found' ? t.found(o.label === null ? t.myLocation : o.label)
      : this.message ? t[this.message] : '';

    if (el.locate) { el.locate.disabled = false; el.locate.querySelector('span').textContent = t.locate; }

    el.legend.innerHTML =
      '<span><svg width="14" height="18" viewBox="0 0 36 46" aria-hidden="true"><path d="' + PIN_PATH + '" fill="#FCE81E" stroke="#43291A" stroke-width="3"/></svg>' + esc(t.legendStore) + '</span>' +
      '<span><i></i>' + esc(t.legendYou) + '</span>' +
      (this.map ? '' : '<span>' + esc(t.mapNote) + '</span>');

    if (!o) {
      el.list.innerHTML = '<div class="bv-empty">' + PIN_SVG.replace('<path', '<path fill="#FCE81E"') +
        '<h2 id="' + this.uid + '-lh">' + esc(t.emptyTitle) + '</h2><p>' + esc(t.emptyText) + '</p></div>';
    } else {
      el.list.innerHTML =
        '<div class="bv-list-head"><h2 id="' + this.uid + '-lh">' + list.length + ' ' + esc(t.results) + '</h2><span>' + esc(t.sortNear) + '</span></div>' +
        '<ol class="bv-list">' + list.map(function (s) { return self.cardHtml(s, s.id === nearestId); }).join('') + '</ol>';
    }

    var sel = o && list.filter(function (s) { return s.id === self.selected; })[0];
    if (sel) {
      el.sheet.innerHTML = '<div class="bv-sheet-top"><div><div class="bv-store-name">' + esc(sel.name) + (sel.id === nearestId ? ' <span class="bv-badge">' + esc(t.nearest) + '</span>' : '') + '</div>' +
        '<div class="bv-addr">' + esc(sel.street + ', ' + sel.plz + ' ' + sel.city) + ' · <b>' + fmtKm(sel.d, lang) + '</b></div></div>' +
        '<button type="button" class="bv-sheet-close" aria-label="' + esc(t.close) + '">×</button></div>' +
        '<div class="bv-actions"><a class="bv-btn-route" href="' + esc(routeUrl(sel, o)) + '" target="_blank" rel="noopener noreferrer">' + ICON_ROUTE + esc(t.openMaps) + '</a></div>';
      el.sheet.setAttribute('aria-label', sel.name);
      el.sheet.classList.add('is-open');
    } else {
      el.sheet.classList.remove('is-open');
    }

    this.renderGate();
    el.results.querySelector('.bv-map').classList.toggle('is-schematic', !this.map);
    if (this.map) this.map.update(o ? list : [], o, this.selected, fit);
    else this.renderSchematic(o ? list : [], o);
  };

  StoreFinder.prototype.cardHtml = function (s, nearest) {
    var t = this.t(), sel = s.id === this.selected;
    return '<li class="bv-card' + (sel ? ' is-sel' : '') + '" data-id="' + esc(s.id) + '">' +
      '<div class="bv-card-top"><div>' +
        '<div class="bv-store-name">' + esc(s.name) + (nearest ? ' <span class="bv-badge">' + esc(t.nearest) + '</span>' : '') + '</div>' +
        '<div class="bv-addr">' + esc(s.street + ', ' + s.plz + ' ' + s.city) + '</div>' +
      '</div>' + (s.d != null ? '<span class="bv-dist">' + fmtKm(s.d, lang) + '</span>' : '') + '</div>' +
      '<div class="bv-actions">' +
        '<button type="button" class="bv-btn-show" data-select="' + esc(s.id) + '">' + esc(t.showMap) + '</button>' +
        '<a class="bv-btn-route" href="' + esc(routeUrl(s, this.origin)) + '" target="_blank" rel="noopener noreferrer">' + ICON_ROUTE + esc(t.openMaps) + '</a>' +
      '</div></li>';
  };

  StoreFinder.prototype.renderGate = function () {
    var t = this.t(), g = this.el.gate;
    var show = !!CFG.apiKey && !this.map && CFG.consent === 'click' && !hasConsent();
    g.hidden = !show;
    if (show) {
      g.innerHTML = '<div class="bv-gate-text"><strong>' + esc(t.gateTitle) + '</strong>' + esc(t.gateText) +
        ' <a href="' + esc(CFG.privacyUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(t.privacy) + '</a></div>' +
        '<button type="button" class="bv-btn-route bv-gate-btn">' + esc(t.gateBtn) + '</button>';
    }
  };

  /* Schematic Berlin map from the approved design: used until Google Maps is allowed/configured. */
  StoreFinder.prototype.renderSchematic = function (list, o) {
    var self = this;
    function pos(p) {
      var x = (p.lng - 13.08) / 0.70 * 100, y = (52.69 - p.lat) / 0.36 * 100;
      return 'left:' + Math.max(2, Math.min(98, x)).toFixed(2) + '%;top:' + Math.max(4, Math.min(98, y)).toFixed(2) + '%';
    }
    var html = '<svg viewBox="0 0 1180 1000" aria-hidden="true">' +
      '<rect width="1180" height="1000" fill="#FFF8EA"/>' +
      '<path d="M505.7 41.7 L657.4 83.3 L741.7 166.7 L876.6 194.4 L960.9 361.1 L977.7 444.4 L1146.3 472.2 L1112.6 611.1 L1078.9 777.8 L960.9 888.9 L876.6 972.2 L758.6 833.3 L573.1 861.1 L488.9 833.3 L370.9 777.8 L168.6 833.3 L50.6 805.6 L67.4 694.4 L202.3 611.1 L84.3 472.2 L67.4 305.6 L202.3 277.8 L252.9 138.9 L354.0 83.3 Z" fill="#FFF8C4" stroke="#E8D400" stroke-width="4" stroke-linejoin="round"/>' +
      '<ellipse cx="531" cy="508" rx="194" ry="139" fill="none" stroke="#E0C9A4" stroke-width="3" stroke-dasharray="10 10"/>' +
      '<path d="M219.1 166.7 L219.1 250.0 L210.7 361.1 L202.3 430.6 L168.6 527.8 L151.7 611.1 L126.4 722.2 L101.1 805.6" fill="none" stroke="#3BA7DF" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' +
      '<path d="M1129.4 722.2 L977.7 694.4 L842.9 661.1 L758.6 611.1 L691.1 561.1 L623.7 527.8 L573.1 494.4 L522.6 472.2 L472.0 466.7 L421.4 472.2 L354.0 444.4 L269.7 430.6 L210.7 430.6" fill="none" stroke="#3BA7DF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>' +
      '<ellipse cx="295" cy="283" rx="34" ry="46" fill="#3BA7DF" opacity=".55"/><ellipse cx="961" cy="703" rx="62" ry="36" fill="#3BA7DF" opacity=".55"/>' +
      '<text x="40" y="960" font-family="Josefin Sans, sans-serif" font-size="30" font-weight="700" letter-spacing="4" fill="#B98A4A">BERLIN</text></svg>';
    if (o) html += '<div class="bv-you" style="' + pos(o) + '" aria-hidden="true"><div class="bv-dot"></div></div>';
    list.slice().reverse().forEach(function (s) {
      var sel = s.id === self.selected;
      html += '<button type="button" class="bv-spin" data-select="' + esc(s.id) + '" aria-label="' + esc(s.name + ', ' + s.street) + '" style="' + pos(s) + ';z-index:' + (sel ? 20 : 10) + '">' +
        '<span class="bv-pin' + (sel ? ' is-sel' : '') + '"><span class="bv-pin-label">' + esc(s.name) + '</span>' + PIN_SVG + '</span></button>';
    });
    this.el.schematic.innerHTML = html;
  };

  /* ----- Google map renderer ----- */
  StoreFinder.prototype.startGoogle = function () {
    var self = this;
    if (this.map || this.starting) return;
    this.starting = true;
    loadGoogle().then(function (g) {
      self.map = new GoogleMap(g, function (id) { self.select(id, true); });
      self.el.canvas.appendChild(self.map.div);
      self.el.canvas.hidden = false;
      self.el.schematic.hidden = true;
      self.starting = false;
      self.render(true);
      /* An offline search can now be refined with real geocoding. */
      if (self.origin && self.origin.label) self.search(self.origin.label);
    }).catch(function () { self.starting = false; });
  };

  function GoogleMap(g, onPick) {
    this.g = g; this.onPick = onPick; this.markers = {}; this.you = null;
    this.div = d.createElement('div');
    this.div.style.cssText = 'position:absolute;inset:0';
    this.map = new g.maps.Map(this.div, {
      center: BERLIN, zoom: 10, mapId: CFG.mapId || 'DEMO_MAP_ID',
      disableDefaultUI: true, zoomControl: true, fullscreenControl: false, clickableIcons: false,
      gestureHandling: 'cooperative'
    });
  }
  GoogleMap.prototype.pinEl = function (s) {
    var el = d.createElement('div');
    el.className = 'bv-pin';
    el.innerHTML = '<span class="bv-pin-label">' + esc(s.name) + '</span>' + PIN_SVG;
    return el;
  };
  GoogleMap.prototype.update = function (list, o, selected, fit) {
    var self = this, g = this.g, seen = {};
    list.forEach(function (s) {
      seen[s.id] = true;
      var m = self.markers[s.id];
      if (!m) {
        m = new g.marker.AdvancedMarkerElement({ map: self.map, position: { lat: s.lat, lng: s.lng }, title: s.name + ', ' + s.street, content: self.pinEl(s), gmpClickable: true });
        m.addListener('click', function () { self.onPick(s.id); });
        self.markers[s.id] = m;
      }
      var sel = s.id === selected;
      m.content.classList.toggle('is-sel', sel);
      m.zIndex = sel ? 1000 : null;
    });
    Object.keys(this.markers).forEach(function (id) { if (!seen[id]) { self.markers[id].map = null; delete self.markers[id]; } });

    if (o) {
      if (!this.you) {
        var dot = d.createElement('div'); dot.className = 'bv-dot';
        this.you = new g.marker.AdvancedMarkerElement({ map: this.map, content: dot, zIndex: 999 });
      }
      this.you.position = { lat: o.lat, lng: o.lng };
      this.you.map = this.map;
    } else if (this.you) { this.you.map = null; }

    if (fit && o && list.length) {
      /* Show the searcher plus the three nearest stores. */
      var b = new g.maps.LatLngBounds();
      b.extend(o);
      list.slice(0, 3).forEach(function (s) { b.extend({ lat: s.lat, lng: s.lng }); });
      this.map.fitBounds(b, isMobile() ? { top: 50, bottom: 140, left: 30, right: 30 } : 70);
    } else if (fit && !o) {
      this.map.setCenter(BERLIN); this.map.setZoom(10);
    }
  };
  GoogleMap.prototype.focus = function (id) {
    var m = this.markers[id];
    if (!m) return;
    this.map.panTo(m.position);
    if (this.map.getZoom() < 13) this.map.setZoom(13);
  };

  /* ---------- Product carousel ---------- */
  function Products(root) {
    this.root = root;
    var self = this;
    this.build();
    langListeners.push(function () { self.build(); });
  }
  Products.prototype.build = function () {
    var t = DATA.T[lang], id = 'bvp' + Math.random().toString(36).slice(2, 7);
    var items = DATA.PRODUCTS.map(function (p) { return Object.assign({ img: p.img }, p[lang]); });
    this.root.classList.add('bv-root');
    this.root.innerHTML = '<section class="bv-products" aria-labelledby="' + id + '"><div class="bv-wrap">' +
      '<div class="bv-products-head"><h2 id="' + id + '">' + esc(t.products) + '</h2><p>' + esc(t.productsSub) + '</p></div>' +
      '<ul class="bv-track">' + items.map(function (p, i) {
        return '<li class="bv-product" aria-label="' + esc(t.productOf(i + 1, items.length)) + '">' +
          '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" width="546" height="378" loading="lazy" decoding="async">' +
          '<div class="bv-product-body"><div><h3>' + esc(p.name) + '</h3><span class="bv-product-alt">' + esc(p.alt) + '</span></div>' +
          '<p>' + esc(p.desc) + '</p><ul class="bv-tags">' + p.tags.map(function (tg) { return '<li>' + esc(tg) + '</li>'; }).join('') + '</ul></div></li>';
      }).join('') + '</ul>' +
      '<div class="bv-carousel-nav">' +
        '<button type="button" class="bv-arrow" data-dir="-1" aria-label="' + esc(t.prev) + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></button>' +
        '<div class="bv-dots">' + items.map(function (p, i) { return '<button type="button" data-i="' + i + '" aria-label="' + esc(t.productOf(i + 1, items.length) + ': ' + p.name) + '"></button>'; }).join('') + '</div>' +
        '<button type="button" class="bv-arrow" data-dir="1" aria-label="' + esc(t.next) + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button>' +
      '</div></div></section>';

    var track = this.root.querySelector('.bv-track');
    var cards = [].slice.call(track.children);
    var dots = [].slice.call(this.root.querySelectorAll('.bv-dots button'));
    var arrows = this.root.querySelectorAll('.bv-arrow');
    function current() {
      var x = track.scrollLeft, best = 0, bd = Infinity;
      cards.forEach(function (c, i) { var dd = Math.abs(c.offsetLeft - cards[0].offsetLeft - x); if (dd < bd) { bd = dd; best = i; } });
      if (x + track.clientWidth >= track.scrollWidth - 4) best = cards.length - 1;
      return best;
    }
    function go(i) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
    }
    function sync() {
      var c = current();
      dots.forEach(function (b, i) { b.setAttribute('aria-current', i === c ? 'true' : 'false'); });
      arrows[0].disabled = track.scrollLeft <= 4;
      arrows[1].disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    track.addEventListener('scroll', sync, { passive: true });
    dots.forEach(function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-i')); }); });
    arrows.forEach(function (b) { b.addEventListener('click', function () { go(current() + +b.getAttribute('data-dir')); }); });
    w.addEventListener('resize', sync);
    sync();
  };

  /* ---------- boot ---------- */
  function boot() {
    d.querySelectorAll('[data-bv-store-finder]').forEach(function (el) { if (!el.__bv) el.__bv = new StoreFinder(el); });
    d.querySelectorAll('[data-bv-products]').forEach(function (el) { if (!el.__bv) el.__bv = new Products(el); });
    /* Language switch also applies to anything else on the page marked with data-bv-i18n. */
    function syncPage() {
      d.querySelectorAll('[data-bv-i18n]').forEach(function (el) {
        var v = el.getAttribute('data-' + lang); if (v != null) el.textContent = v;
      });
    }
    langListeners.push(syncPage); syncPage();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
