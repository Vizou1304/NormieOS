// renderer/core/notifications.js

window._notifLog   = window._notifLog   || [];
window._notifUnread = window._notifUnread || 0;

export class NormieNotifier {
    constructor() {}

    showNotif(type, message, appTarget, priority = 'normal') {
        window._notifLog.unshift({ timestamp: Date.now(), message, type, appTarget: appTarget || null, priority });
        if (window._notifLog.length > 20) window._notifLog.length = 20;
        window._notifUnread++;
        window._onNewNotif?.();

        // low: log only — no bubble, no voice
        if (priority !== 'low' && window.showSpeechBubble) {
            window._bubbleQueue = window._bubbleQueue || [];
            window._bubbleBusy  = window._bubbleBusy  || false;
            window._bubbleGen   = window._bubbleGen   || 0;

            const _show = (msg, tp) => {
                const normie = document.getElementById('desktop-normie') || document.querySelector('.normie-alpha');
                if (!normie || normie.getBoundingClientRect().width === 0) {
                    window._bubbleQueue.unshift({ message: msg, type: tp, priority: 'normal' });
                    setTimeout(() => {
                        if (!window._bubbleBusy && window._bubbleQueue.length) {
                            const n = window._bubbleQueue.shift();
                            _show(n.message, n.type);
                        }
                    }, 1000);
                    return;
                }

                const gen = ++window._bubbleGen;
                window._bubbleBusy = true;
                window.showSpeechBubble(msg, tp);
                window.normieSpeak?.(msg);

                const _advance = () => {
                    if (window._bubbleGen !== gen) return; // stale — interrupted
                    window._bubbleBusy = false;
                    window._onBubbleDismissed?.();
                };

                window._onBubbleDismissed = () => {
                    if (window._bubbleQueue.length) {
                        const n = window._bubbleQueue.shift();
                        _show(n.message, n.type);
                    }
                };

                if (window.NORMIE_VOICE_ENABLED) {
                    const safetyTimer = setTimeout(_advance, 12000);
                    window.electronAPI?.onTtsFinished?.(() => {
                        clearTimeout(safetyTimer);
                        setTimeout(_advance, 300);
                    });
                } else {
                    setTimeout(_advance, 2000);
                }
            };

            if (priority === 'critical' || priority === 'high') {
                // invalidate current bubble's _advance via new gen, show immediately
                window._bubbleBusy = false;
                _show(message, type);
            } else if (window._bubbleBusy) {
                window._bubbleQueue.push({ message, type, priority });
            } else {
                _show(message, type);
            }
        }

        if (appTarget) this._setBadge(appTarget);
        window.clearNotifBadge = (t) => this._clearBadge(t);
    }

    _setBadge(appTarget) {
        const btn = document.querySelector(`.sm-app-btn[data-native="${appTarget}"]`);
        if (!btn) return;
        if (!btn.querySelector('.notif-badge')) {
            const dot = document.createElement('span');
            dot.className = 'notif-badge';
            dot.style.cssText = 'position:absolute;top:2px;right:2px;width:6px;height:6px;background:#e3e5e4;display:block;';
            btn.style.position = 'relative';
            btn.appendChild(dot);
        }
    }

    _clearBadge(appTarget) {
        const dot = document.querySelector(`.sm-app-btn[data-native="${appTarget}"] .notif-badge`);
        if (dot) dot.remove();
    }


}
