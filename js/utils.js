/**
 * ���ߺ���
 */

// Toast ��ʾ
function showToast(messageKey, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    // ֧�ִ��뷭�� key ��ԭʼ�ı�
    toast.textContent = (Lang && Lang.t(messageKey)) || messageKey;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// ���ڸ�ʽ��
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (Lang.current === 'zh') {
        if (minutes < 1) return '�ո�';
        if (minutes < 60) return minutes + ' ����ǰ';
        if (hours < 24) return hours + ' Сʱǰ';
        if (days < 7) return days + ' ��ǰ';
    } else {
        if (minutes < 1) return 'just now';
        if (minutes < 60) return minutes + ' min ago';
        if (hours < 24) return hours + 'h ago';
        if (days < 7) return days + 'd ago';
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ��ȡ�ı�
function truncate(text, maxLen = 120) {
    if (!text) return '';
    text = text.replace(/\{\{.*?\}\}/g, function(match) {
        const name = match.replace(/\{\{|\}\}/g, '').split('|')[0];
        return '{{' + name + '}}';
    });
    text = text.replace(/[#*_`~>\[\]()!]/g, '');
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

// ����
function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// �����ʾ���еı���
function extractVariables(content) {
    const regex = /\{\{(.+?)(?:\|(.+?))?\}\}/g;
    const vars = [];
    const seen = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
        const name = match[1].trim();
        const defaultValue = match[2] ? match[2].trim() : '';
        if (!seen.has(name)) {
            seen.add(name);
            vars.push({ name, defaultValue, fullMatch: match[0] });
        }
    }
    return vars;
}

// �滻����
function replaceVariables(content, values) {
    return content.replace(/\{\{(.+?)(?:\|(.+?))?\}\}/g, function(match, name) {
        const key = name.trim();
        return values[key] !== undefined ? values[key] : match;
    });
}

// ���� Markdown �еı���
function highlightVariables(html) {
    return html.replace(
        /\{\{(.+?)(?:\|(.+?))?\}\}/g,
        '<span class="var-highlight">{{$1$2}}</span>'
    );
}

// ���Ƶ�������
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('toastCopied', 'success');
        return true;
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('toastCopied', 'success');
        return true;
    }
}

// ���
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
