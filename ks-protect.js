// KS Movies — Protection Script
(function() {
    // Iframe embed protection
    try {
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
    } catch(e) {
        document.body.style.display = 'none';
    }

    // Disable right-click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    }, true);

    // Disable dev tools shortcuts
    document.addEventListener('keydown', function(e) {
        if (
            e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && [73, 74, 67].indexOf(e.keyCode) > -1) || // Ctrl+Shift+I/J/C
            (e.ctrlKey && e.keyCode === 85) // Ctrl+U
        ) {
            e.preventDefault();
        }
    }, true);
})();
