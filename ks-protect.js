// KS Movies - Page Protection
try {
    if (window.self !== window.top) window.top.location = window.self.location;
} catch(e) {
    document.body.style.display = 'none';
}
document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, true);
document.addEventListener('keydown', function(e) {
    if (e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && [73, 74, 67].indexOf(e.keyCode) > -1) ||
        (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
    }
}, true);
