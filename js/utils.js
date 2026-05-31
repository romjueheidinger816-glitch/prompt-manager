/**
 * 工具函数
 */

// Toast 提示
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

// 日期格式化
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + ' 分钟前';
    if (hours < 24) return hours + ' 小时前';
    if (days < 7) return days + ' 天前';

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// 截取文本
function truncate(text, maxLen = 120) {
    if (!text) return '';
    text = text.replace(/\{\{.*?\}\}/g, function(match) {
        // 展示变量时保留变量名
        const name = match.replace(/\{\{|\}\}/g, '').split('|')[0];
        return '{{' + name + '}}';
    });
    // 去除 Markdown 语法符号（简单处理）
    text = text.replace(/[#*_`~>\[\]()!]/g, '');
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

// 防抖
function debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// 检测提示词中的变量
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

// 替换变量
function replaceVariables(content, values) {
    return content.replace(/\{\{(.+?)(?:\|(.+?))?\}\}/g, function(match, name) {
        const key = name.trim();
        return values[key] !== undefined ? values[key] : match;
    });
}

// 高亮 Markdown 中的变量
function highlightVariables(html) {
    return html.replace(
        /\{\{(.+?)(?:\|(.+?))?\}\}/g,
        '<span class="var-highlight">{{$1$2}}</span>'
    );
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板', 'success');
        return true;
    } catch (e) {
        // 降级方案
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已复制到剪贴板', 'success');
        return true;
    }
}

// 深拷贝
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
