// Keep the English edition's progress and AI data separate from the Chinese edition.
const englishStorage = {
    getItem(key) {
        return localStorage.getItem('aow-en:' + key);
    },
    setItem(key, value) {
        localStorage.setItem('aow-en:' + key, value);
    },
    removeItem(key) {
        localStorage.removeItem('aow-en:' + key);
    },
    key(index) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('aow-en:')) keys.push(key.slice(7));
        }
        return keys[index] ?? null;
    },
    get length() {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('aow-en:')) count++;
        }
        return count;
    },
    clear() {
        while (this.length) this.removeItem(this.key(0));
    }
};
