// Translate rendered text; card keys, game rules and save data keep their canonical values.
(() => {
    const dictionary = { ...window.AOW_UI_ZH, ...window.AOW_CARD_ZH, ...window.AOW_ADVENTURE_ZH };
    const patterns = [...(window.AOW_UI_PATTERNS || []), ...(window.AOW_ADVENTURE_PATTERNS || [])]
        .map(([pattern, replacement]) => [new RegExp(pattern, 'g'), replacement]);
    const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const phrases = Object.keys(dictionary).sort((a, b) => b.length - a.length)
        .map(key => [new RegExp(`(?<![A-Za-z])${escape(key)}(?![A-Za-z])`, 'g'), dictionary[key]]);
    const textSources = new WeakMap(), attributeSources = new WeakMap();
    const skip = 'script,style,code,pre,#chat-messages,[data-i18n-skip]';
    let language = localStorage.getItem('aow-ui-language') === 'zh' ? 'zh' : 'en';
    let observer, pending = false;
    function translate(source) {
        if (language === 'en' || !source) return source;
        const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
        let value = match[2];
        if (dictionary[value] !== undefined) value = dictionary[value];
        else {
            for (const [pattern, replacement] of patterns) value = value.replace(pattern, replacement);
            for (const [pattern, replacement] of phrases) value = value.replace(pattern, () => replacement);
        }
        return match[1] + value.replace(/Lv\.?(\d+)/g, '等级$1') + match[3];
    }
    function sourceAttribute(element, name) {
        const record = attributeSources.get(element)?.[name];
        return record && element.getAttribute(name) === record.last ? record.source : element.getAttribute(name);
    }
    function refresh() {
        if (!document.createTreeWalker) return;
        observer?.disconnect();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (!node.parentElement || node.parentElement.closest(skip)) continue;
            let record = textSources.get(node);
            if (!record || node.nodeValue !== record.last) record = { source: node.nodeValue };
            record.last = translate(record.source);
            if (node.nodeValue !== record.last) node.nodeValue = record.last;
            textSources.set(node, record);
        }
        for (const element of document.querySelectorAll('[title],[aria-label],[placeholder],img[alt]')) {
            if (element.closest(skip)) continue;
            const records = attributeSources.get(element) || {};
            for (const name of ['title', 'aria-label', 'placeholder', 'alt']) {
                if (!element.hasAttribute(name)) continue;
                const current = element.getAttribute(name);
                let record = records[name];
                if (!record || current !== record.last) record = { source: current };
                record.last = translate(record.source);
                if (current !== record.last) element.setAttribute(name, record.last);
                records[name] = record;
            }
            attributeSources.set(element, records);
        }
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
        document.body.dataset.language = language;
        document.title = language === 'zh' ? '战争时代 · 战术卡牌' : 'Age of War · Tactical Cards';
        document.querySelectorAll('[data-language-choice]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.languageChoice === language));
        });
        observer?.observe(document.body, { childList: true, characterData: true, subtree: true,
            attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder', 'alt'] });
    }
    function setLanguage(next) {
        language = next === 'zh' ? 'zh' : 'en';
        localStorage.setItem('aow-ui-language', language);
        refresh();
    }
    window.AOW_I18N = { translate, sourceAttribute, refresh, setLanguage, get language() { return language; } };
    const nativeAlert = window.alert, nativeConfirm = window.confirm;
    window.alert = message => nativeAlert(translate(String(message)));
    window.confirm = message => nativeConfirm(translate(String(message)));
    function setup() {
        document.querySelectorAll('[data-language-choice]').forEach(button => {
            button.addEventListener('click', () => setLanguage(button.dataset.languageChoice));
        });
        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(() => {
                if (pending) return;
                pending = true;
                requestAnimationFrame(() => { pending = false; refresh(); });
            });
        }
        refresh();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
    else setup();
})();
