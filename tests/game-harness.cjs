const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the scripts shipped by game.html, without copying any game rules.
// This small DOM implements the surfaces used by the game; browser QA still
// covers layout, real input, network and browser-specific behavior separately.
function snapshotSources() {
    const root = path.resolve(__dirname, '..');
    const sources = { 'game.html': fs.readFileSync(path.join(root, 'game.html'), 'utf8') };
    for (const [, source] of sources['game.html'].matchAll(/<script[^>]*src=["']([^"']+)/gi)) {
        const file = source.split(/[?#]/)[0];
        sources[file] = fs.readFileSync(path.join(root, file), 'utf8');
    }
    return sources;
}
function loadGame({ seed = 1, boot = true, storage = new Map(), sources = snapshotSources(), search = '' } = {}) {
    const html = sources['game.html'];
    const errors = [], logs = [], alerts = [], timers = new Map();
    let nextTimer = 1, now = 0, randomState = seed >>> 0;
    const random = () => {
        randomState += 0x6D2B79F5;
        let n = randomState;
        n = Math.imul(n ^ n >>> 15, n | 1);
        n ^= n + Math.imul(n ^ n >>> 7, n | 61);
        return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
    const listeners = new Map();
    const observers = new Set();
    function attributeChanged(target, attributeName) {
        for (const observer of observers) {
            const options = observer.targets.get(target);
            if (!options?.attributes || (options.attributeFilter && !options.attributeFilter.includes(attributeName))) continue;
            observer.records.push({ type: 'attributes', target, attributeName });
            if (observer.queued) continue;
            observer.queued = true;
            Promise.resolve().then(() => {
                observer.queued = false;
                const records = observer.records.splice(0);
                if (records.length) observer.callback(records, observer);
            });
        }
    }
    class MutationObserver {
        constructor(callback) { this.callback = callback; this.targets = new Map(); this.records = []; observers.add(this); }
        observe(target, options) { this.targets.set(target, options); }
        disconnect() { this.targets.clear(); this.records = []; observers.delete(this); }
    }
    class Element {
        constructor(tag = 'div') {
            this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {};
            this.style = {}; this.id = ''; this.className = ''; this.value = '';
            this.events = new Map(); this._html = ''; this._text = '';
            this.disabled = false; this.hidden = false; this.open = false;
            this.classList = {
                add: (...values) => this.className = [...new Set([...this.className.split(/\s+/), ...values])].filter(Boolean).join(' '),
                remove: (...values) => this.className = this.className.split(/\s+/).filter(x => !values.includes(x)).join(' '),
                contains: value => this.className.split(/\s+/).includes(value),
                toggle: (value, force) => {
                    const include = force ?? !this.classList.contains(value);
                    this.classList[include ? 'add' : 'remove'](value); return include;
                }
            };
        }
        get children() { return this._childNodes.filter(child => child.tagName !== '#TEXT'); }
        set children(value) { this._childNodes = value; }
        appendChild(child) {
            if (child.parentNode) child.parentNode.removeChild(child);
            child.parentNode = this; this._childNodes.push(child); return child;
        }
        append(...children) { children.forEach(child => this.appendChild(child)); }
        replaceChildren(...children) { this.textContent = ''; this.append(...children); }
        removeChild(child) { this._childNodes = this._childNodes.filter(x => x !== child); child.parentNode = null; }
        remove() { if (this.parentNode) this.parentNode.removeChild(this); }
        set innerHTML(value) { this._html = value; this._text = ''; this.children = []; parseHTML(String(value), this); }
        get innerHTML() { return this._html; }
        set textContent(value) { this._text = String(value); this._html = ''; this.children = []; }
        get textContent() { return this._text + this._childNodes.map(child => child.textContent).join(''); }
        set style(value) {
            const properties = typeof value === 'string'
                ? { cssText: value, ...Object.fromEntries(value.split(';').filter(part => part.includes(':')).map(part => {
                    const colon = part.indexOf(':');
                    return [part.slice(0, colon).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), part.slice(colon + 1).trim()];
                })) }
                : value;
            this._style = new Proxy(properties, { set: (target, key, next) => {
                target[key] = next; attributeChanged(this, 'style'); return true;
            } });
            attributeChanged(this, 'style');
        }
        get style() { return this._style; }
        insertAdjacentHTML(_position, value) { parseHTML(value, this); }
        setAttribute(key, value) {
            if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
            else if (key === 'class') this.className = value;
            else if (['disabled', 'hidden', 'open'].includes(key)) this[key] = true;
            else this[key] = value;
        }
        getAttribute(key) {
            if (key.startsWith('data-')) return this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] ?? null;
            if (['disabled', 'hidden', 'open'].includes(key)) return this[key] ? '' : null;
            return (key === 'class' ? this.className : this[key]) ?? null;
        }
        removeAttribute(key) {
            if (key.startsWith('data-')) delete this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
            else if (['disabled', 'hidden', 'open'].includes(key)) this[key] = false;
            else delete this[key];
        }
        addEventListener(type, fn) { if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push(fn); }
        removeEventListener(type, fn) { this.events.set(type, (this.events.get(type) || []).filter(x => x !== fn)); }
        dispatchEvent(event) {
            event.target ??= this; event.currentTarget = this;
            event.preventDefault ??= () => {}; event.stopPropagation ??= () => {};
            if (typeof this['on' + event.type] === 'function') this['on' + event.type](event);
            else if (typeof this['on' + event.type] === 'string') vm.runInContext(`(function(event) { ${this['on' + event.type]} })`, context).call(this, event);
            for (const fn of this.events.get(event.type) || []) fn(event);
            return true;
        }
        focus() { document.activeElement = this; }
        click() {
            if (this.disabled) return;
            this.dispatchEvent({ type: 'click' });
        }
        getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }; }
        querySelectorAll(selector) {
            const selectors = selector.split(',').map(s => s.trim());
            const result = [];
            const visit = node => {
                for (const child of node.children) {
                    if (selectors.some(s => matchesSelector(child, s))) result.push(child);
                    visit(child);
                }
            };
            visit(this); return result;
        }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        matches(selector) { return selector.split(',').some(part => matchesSelector(this, part.trim())); }
    }
    function matchesSimple(node, selector) {
        const tag = selector.match(/^[\w-]+/);
        if (tag && node.tagName !== tag[0].toUpperCase()) return false;
        for (const [, id] of selector.matchAll(/#([\w-]+)/g)) if (node.id !== id) return false;
        for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!node.classList.contains(name)) return false;
        for (const [, key, value] of selector.matchAll(/\[([\w-]+)=["']?([^\]"']+)["']?\]/g)) {
            const actual = key.startsWith('data-') ? node.dataset[key.slice(5)] : node[key];
            if (String(actual) !== value) return false;
        }
        return true;
    }
    function matchesSelector(node, selector) {
        const parts = selector.split(/\s+/);
        if (!matchesSimple(node, parts.pop())) return false;
        let ancestor = node.parentNode;
        while (parts.length) {
            const part = parts.pop();
            while (ancestor && !matchesSimple(ancestor, part)) ancestor = ancestor.parentNode;
            if (!ancestor) return false;
            ancestor = ancestor.parentNode;
        }
        return true;
    }
    function parseHTML(source, parent) {
        const stack = [parent];
        source = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
        for (const token of source.matchAll(/<(\/?)(([a-z][\w-]*))\b([^>]*)>|([^<]+)/gi)) {
            if (token[5] !== undefined) {
                const text = new Element('#text');
                text.textContent = token[5].replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[0-9a-f]+|\d+);/gi, entity => {
                    const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': '\u00a0' };
                    if (named[entity]) return named[entity];
                    const value = entity.slice(2, -1);
                    return String.fromCodePoint(value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value));
                });
                stack.at(-1).appendChild(text);
                continue;
            }
            const closing = token[1], tag = token[2].toLowerCase();
            if (closing) {
                const index = stack.findLastIndex(el => el.tagName === tag.toUpperCase());
                if (index > 0) stack.length = index;
                continue;
            }
            const element = new Element(tag);
            for (const [, key, a, b, c] of token[4].matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) element.setAttribute(key, a ?? b ?? c ?? '');
            stack.at(-1).appendChild(element);
            if (!['meta', 'link', 'input', 'img', 'br', 'hr', 'source'].includes(tag)) stack.push(element);
        }
    }
    const document = new Element('document');
    parseHTML(html, document);
    const body = document.querySelector('body');
    document.body = null; document.head = document.querySelector('head'); document.readyState = 'loading';
    document.createElement = tag => new Element(tag);
    document.getElementById = id => document.querySelector('#' + id);
    const math = Object.create(Math); math.random = random;
    const sandbox = {
        document, MutationObserver, Math: math, URLSearchParams, TextEncoder, TextDecoder, Blob, Uint8Array,
        URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
        location: { search, hostname: 'localhost', protocol: 'http:', href: 'http://localhost/game.html' + search },
        console: Object.fromEntries(['log', 'warn', 'error', 'info', 'debug'].map(kind => [kind, (...args) => logs.push({ kind, args })])),
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key), clear: () => storage.clear() },
        alert: message => alerts.push(message), confirm: () => true,
        btoa: value => Buffer.from(value, 'binary').toString('base64'),
        atob: value => Buffer.from(value, 'base64').toString('binary'),
        setTimeout(fn, delay = 0, ...args) { const id = nextTimer++; timers.set(id, { due: now + Number(delay), fn, args }); return id; },
        clearTimeout: id => timers.delete(id),
        setInterval(fn, delay = 0, ...args) { const id = nextTimer++; timers.set(id, { due: now + Number(delay), interval: Number(delay), fn, args }); return id; },
        clearInterval: id => timers.delete(id),
        addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
        requestAnimationFrame: fn => sandbox.setTimeout(fn, 16),
        performance: { now: () => now },
        WebSocket: class { static OPEN = 1; constructor(url) { this.url = url; this.readyState = 0; } send() {} close() {} },
        navigator: {}, innerWidth: 1920, innerHeight: 1080
    };
    sandbox.window = sandbox; sandbox.globalThis = sandbox;
    const context = vm.createContext(sandbox);
    const evaluate = code => vm.runInContext(code, context, { timeout: 2000 });
    const deferred = [];
    function executeScript(match) {
        const src = match[1].match(/src=["']([^"']+)/)?.[1]?.split(/[?#]/)[0];
        try { vm.runInContext(src ? sources[src] : match[2], context, { filename: src || 'game.html:inline', timeout: 2000 }); }
        catch (error) { errors.push(error); }
    }
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bdefer\b/.test(match[1])) { deferred.push(match); continue; }
        if (match.index > html.search(/<body\b/i)) document.body = body;
        executeScript(match);
    }
    document.body = body;
    deferred.forEach(executeScript);
    if (boot) {
        document.readyState = 'interactive';
        for (const fn of [...(listeners.get('DOMContentLoaded') || []), ...(document.events.get('DOMContentLoaded') || [])]) {
            try { fn(); } catch (error) { errors.push(error); }
        }
        document.readyState = 'complete';
        try { sandbox.onload?.(); } catch (error) { errors.push(error); }
    }
    async function tick() {
        await Promise.resolve();
        const entry = [...timers].sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
        if (!entry) return false;
        const [id, timer] = entry; timers.delete(id); now = timer.due;
        if (timer.interval !== undefined) timers.set(id, { ...timer, due: now + timer.interval });
        try {
            const result = timer.fn(...timer.args);
            if (result?.catch) result.catch(error => errors.push(error));
        } catch (error) { errors.push(error); }
        // Attack animation continuations may await more than one microtask.
        for (let i = 0; i < 8; i++) await Promise.resolve();
        return true;
    }
    async function drainUntil(predicate, { maxSteps = 20000, maxTurns = 200 } = {}) {
        for (let steps = 0; steps < maxSteps; steps++) {
            if (predicate()) return { reason: 'condition', steps, virtualMs: now };
            if (errors.length) return { reason: 'error', steps, virtualMs: now };
            if (evaluate('gameState.turnCount') >= maxTurns) return { reason: 'turn-limit', steps, virtualMs: now };
            if (!await tick()) return { reason: 'no-timers', steps, virtualMs: now };
        }
        return { reason: 'step-limit', steps: maxSteps, virtualMs: now };
    }
    return { context, evaluate, document, errors, logs, alerts, timers, storage, tick, drainUntil };
}

module.exports = { loadGame, snapshotSources };
