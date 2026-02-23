/**
 * @fileoverview Модуль обеспечения клиентской безопасности.
 * Обязателен к использованию перед вставкой любых пользовательских данных в DOM.
 */
const SecurityService = {
    /**
     * Санитизация строки для защиты от DOM-based XSS.
     * Преобразует опасные символы в безопасные HTML-сущности.
     * @param {string} input - Небезопасная строка от пользователя
     * @returns {string} Безопасная строка
     */
    sanitizeHTML(input) {
        if (!input) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#x27;',
            "/": '&#x2F;'
        };
        const reg = /[&<>"'/]/ig;
        return input.replace(reg, (match) => (map[match]));
    }
};

window.SecurityService = SecurityService;
