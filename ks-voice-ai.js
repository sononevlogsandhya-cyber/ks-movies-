// KS Movies — Voice AI Module (stub)
// Referenced by player.html and user.html
window.KSVoiceAI = (function() {
    let recognition = null;
    let isListening = false;

    function isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    function init(onResult, onEnd) {
        if (!isSupported()) return null;
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = 'hi-IN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = function(e) {
            const transcript = e.results[0][0].transcript;
            if (typeof onResult === 'function') onResult(transcript);
        };
        recognition.onend = function() {
            isListening = false;
            if (typeof onEnd === 'function') onEnd();
        };
        recognition.onerror = function() {
            isListening = false;
            if (typeof onEnd === 'function') onEnd();
        };
        return recognition;
    }

    function start(onResult, onEnd) {
        if (!isSupported()) return false;
        if (!recognition) init(onResult, onEnd);
        try {
            recognition.start();
            isListening = true;
            return true;
        } catch(e) { return false; }
    }

    function stop() {
        if (recognition && isListening) {
            try { recognition.stop(); } catch(e) {}
            isListening = false;
        }
    }

    function toggle(onResult, onEnd) {
        if (isListening) { stop(); return false; }
        else { return start(onResult, onEnd); }
    }

    return { init, start, stop, toggle, isSupported, isListening: function() { return isListening; } };
})();
