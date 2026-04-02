// ── KS MOVIES PWA AUTO-INJECT ──
// Include this in every HTML page - it handles manifest, meta tags, SW registration
(function() {
  // Add manifest link
  if (!document.querySelector('link[rel="manifest"]')) {
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
  }

  // Theme color
  if (!document.querySelector('meta[name="theme-color"]')) {
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#e50914';
    document.head.appendChild(meta);
  }

  // Apple mobile capable
  var appleMeta = [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'KS Movies' },
    { name: 'mobile-web-app-capable', content: 'yes' }
  ];
  appleMeta.forEach(function(m) {
    if (!document.querySelector('meta[name="' + m.name + '"]')) {
      var el = document.createElement('meta');
      el.name = m.name;
      el.content = m.content;
      document.head.appendChild(el);
    }
  });

  // Apple touch icon
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    var icon = document.createElement('link');
    icon.rel = 'apple-touch-icon';
    icon.href = '/icons/icon-192.png';
    document.head.appendChild(icon);
  }

  // Viewport (ensure correct)
  var vp = document.querySelector('meta[name="viewport"]');
  if (!vp) {
    vp = document.createElement('meta');
    vp.name = 'viewport';
    document.head.appendChild(vp);
  }
  vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

})();
