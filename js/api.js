/**
 * API 请求封装
 * 统一处理请求和错误
 */

const API_BASE = 'api';

async function apiRequest(path, options = {}) {
    const url = `${API_BASE}/${path}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const res = await fetch(url, config);
        const data = await res.json();
        if (!data.success) {
            showToast(data.message || '请求失败', 'error');
            throw new Error(data.message);
        }
        return data.data;
    } catch (err) {
        if (err.message && !err.message.includes('请求失败')) {
            showToast('网络错误，请检查连接', 'error');
        }
        throw err;
    }
}

// ---- 提示词 API ----
const PromptAPI = {
    list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest(`prompts${qs ? '?' + qs : ''}`);
    },
    get: (id) => apiRequest(`prompts/${id}`),
    create: (data) => apiRequest('prompts', { method: 'POST', body: data }),
    update: (id, data) => apiRequest(`prompts/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiRequest(`prompts/${id}`, { method: 'DELETE' }),
    recordUse: (id, variables) => apiRequest(`prompts/${id}/use`, { method: 'POST', body: { variables } }),
    favorites: () => apiRequest('prompts/favorites'),
    toggleFavorite: (id) => apiRequest(`prompts/${id}/favorite`, { method: 'POST' }),
};

// ---- 分类 API ----
const CategoryAPI = {
    list: () => apiRequest('categories'),
    create: (data) => apiRequest('categories', { method: 'POST', body: data }),
    update: (id, data) => apiRequest(`categories/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiRequest(`categories/${id}`, { method: 'DELETE' }),
};

// ---- 标签 API ----
const TagAPI = {
    list: () => apiRequest('tags'),
    create: (data) => apiRequest('tags', { method: 'POST', body: data }),
    delete: (id) => apiRequest(`tags/${id}`, { method: 'DELETE' }),
};

// ---- 导入导出 API ----
const ExportAPI = {
    json: () => {
        window.open(`${API_BASE}/export/json`, '_blank');
    },
    markdown: () => {
        window.open(`${API_BASE}/export/markdown`, '_blank');
    },
};

const ImportAPI = {
    json: (data) => apiRequest('import/json', { method: 'POST', body: data }),
};

// ---- 回收站 API ----
const TrashAPI = {
    list: () => apiRequest('trash'),
    restore: (id) => apiRequest(`trash/${id}/restore`, { method: 'POST' }),
    permanent: (id) => apiRequest(`trash/${id}/permanent`, { method: 'DELETE' }),
};

// ---- 统计 API ----
const StatsAPI = {
    get: () => apiRequest('stats'),
};
