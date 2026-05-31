/**
 * 提示词管理系统 - 前端逻辑
 */
(function () {
    'use strict';

    const API = {
        categories: 'api/categories.php',
        prompts: 'api/prompts.php',
        init: 'api/init.php',
    };

    // ---- State ----
    const state = {
        prompts: [],
        categories: [],
        currentView: 'dashboard',  // dashboard | prompts | favorites
        currentCategory: null,
        currentPage: 1,
        totalPages: 1,
        total: 0,
        search: '',
        sort: 'updated_at',
        order: 'DESC',
        editingPrompt: null,
        stats: null,
    };

    // ---- Helpers ----
    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

    async function api(url, options = {}) {
        const resp = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || '请求失败');
        return data;
    }

    function toast(msg, type = 'info') {
        const container = $('#toast-container');
        const el = document.createElement('div');
        el.className = 'toast ' + type;
        el.innerHTML = msg;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function formatDate(d) {
        if (!d) return '';
        const dt = new Date(d.replace(' ', 'T'));
        const now = new Date();
        const diff = (now - dt) / 1000;
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
        if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
        return dt.toLocaleDateString('zh-CN');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---- Data Loading ----
    async function loadCategories() {
        state.categories = await api(API.categories + '?action=list');
        renderSidebar();
    }

    async function loadPrompts() {
        const params = new URLSearchParams({
            action: 'list',
            page: state.currentPage,
            limit: 20,
            sort: state.sort,
            order: state.order,
        });

        if (state.search) params.set('search', state.search);
        if (state.currentView === 'favorites') params.set('favorite', '1');
        if (state.currentCategory) params.set('category_id', state.currentCategory);

        const result = await api(API.prompts + '?' + params.toString());
        state.prompts = result.data;
        state.totalPages = result.pages;
        state.total = result.total;
        renderPrompts();
    }

    async function loadStats() {
        state.stats = await api(API.prompts + '?action=stats');
        renderDashboard();
    }

    // ---- Rendering ----
    function renderSidebar() {
        const nav = $('#category-nav');
        // 计算每个分类的提示词数量（从 stats 或 categories 数据）
        nav.innerHTML = state.categories.map(c => `
            <div class="nav-item ${state.currentView === 'category' && state.currentCategory === c.id ? 'active' : ''}"
                 data-category="${c.id}">
                <span class="category-dot" style="background:${c.color}"></span>
                <span>${escapeHtml(c.name)}</span>
                <span class="badge">${c.prompt_count || 0}</span>
            </div>
        `).join('');

        // Bind click
        $$('#category-nav .nav-item').forEach(el => {
            el.onclick = () => {
                state.currentView = 'category';
                state.currentCategory = parseInt(el.dataset.category);
                state.currentPage = 1;
                updateNavActive();
                loadPrompts();
                showView('prompts');
            };
        });
    }

    function renderDashboard() {
        if (!state.stats) return;
        const s = state.stats;

        $('#stat-total').textContent = s.total;
        $('#stat-favorites').textContent = s.favorites;
        $('#stat-usage').textContent = s.totalUsage;
        $('#stat-rating').textContent = s.avgRating;

        // Top rated
        const topEl = $('#top-rated-list');
        topEl.innerHTML = s.topRated.length
            ? s.topRated.map(p => `
                <div class="nav-item" style="cursor:pointer" data-id="${p.id}">
                    <span style="color:#f59e0b;font-size:12px">★ ${p.rating}</span>
                    <span style="flex:1;font-size:13px">${escapeHtml(p.title)}</span>
                    <span style="font-size:11px;color:var(--text-muted)">${p.usage_count}次使用</span>
                </div>
            `).join('')
            : '<p style="font-size:13px;color:var(--text-muted);padding:8px">暂无评分数据</p>';

        $$('#top-rated-list .nav-item').forEach(el => {
            el.onclick = () => showPromptDetail(el.dataset.id);
        });

        // Most used
        const usedEl = $('#most-used-list');
        usedEl.innerHTML = s.mostUsed.length
            ? s.mostUsed.map(p => `
                <div class="nav-item" style="cursor:pointer" data-id="${p.id}">
                    <span style="font-size:13px;flex:1">${escapeHtml(p.title)}</span>
                    <span style="font-size:12px;color:var(--accent)">${p.usage_count}次</span>
                </div>
            `).join('')
            : '<p style="font-size:13px;color:var(--text-muted);padding:8px">暂无使用数据</p>';

        $$('#most-used-list .nav-item').forEach(el => {
            el.onclick = () => showPromptDetail(el.dataset.id);
        });

        // Tags
        const tagsEl = $('#tags-cloud');
        const tags = s.tags || {};
        const tagKeys = Object.keys(tags);
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4', '#ef4444'];
        tagsEl.innerHTML = tagKeys.length
            ? tagKeys.map((t, i) => `
                <span class="tag" style="background:${colors[i % colors.length]}15;color:${colors[i % colors.length]}" data-tag="${escapeHtml(t)}">${escapeHtml(t)} (${tags[t]})</span>
            `).join('')
            : '<p style="font-size:13px;color:var(--text-muted)">暂无标签</p>';

        $$('#tags-cloud .tag').forEach(el => {
            el.onclick = () => {
                state.search = el.dataset.tag;
                state.currentView = 'prompts';
                state.currentPage = 1;
                $('#search-input').value = state.search;
                updateNavActive();
                showView('prompts');
                loadPrompts();
            };
        });

        // Category distribution
        const catEl = $('#category-dist');
        const maxCount = Math.max(1, ...s.categoryStats.map(c => c.count));
        catEl.innerHTML = s.categoryStats.map(c => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:12px;width:80px;color:var(--text-dim)">${escapeHtml(c.name)}</span>
                <div style="flex:1;height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${(c.count / maxCount * 100)}%;background:${c.color};border-radius:3px;transition:width 0.4s"></div>
                </div>
                <span style="font-size:12px;color:var(--text-muted);width:30px;text-align:right">${c.count}</span>
            </div>
        `).join('');
    }

    function renderPrompts() {
        const container = $('#prompts-grid');

        if (state.prompts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <div class="empty-icon">📝</div>
                    <p>${state.search ? '没有找到匹配的提示词' : '还没有提示词，点击右上角添加第一条吧'}</p>
                </div>
            `;
        } else {
            container.innerHTML = state.prompts.map(p => `
                <div class="prompt-card" data-id="${p.id}">
                    <div class="prompt-card-header">
                        <h3 title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h3>
                        <button class="fav-btn ${p.is_favorite ? 'active' : ''}" data-id="${p.id}" title="收藏">
                            ${p.is_favorite ? '★' : '☆'}
                        </button>
                    </div>
                    <div class="prompt-content-preview">${escapeHtml(p.content)}</div>
                    <div class="prompt-card-meta">
                        ${p.category_name
                            ? `<span class="category-tag" style="background:${p.category_color}20;color:${p.category_color}">${escapeHtml(p.category_name)}</span>`
                            : ''}
                        ${p.tags ? p.tags.split(',').slice(0, 3).map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('') : ''}
                        <span class="meta-item" style="margin-left:auto">
                            ${p.usage_count > 0 ? `📊 ${p.usage_count}` : ''}
                        </span>
                        <span class="meta-item">🕐 ${formatDate(p.updated_at)}</span>
                    </div>
                    <div class="prompt-card-footer">
                        <div class="stars">
                            ${[1,2,3,4,5].map(i => `<button class="star ${i <= p.rating ? 'filled' : ''}" data-id="${p.id}" data-rating="${i}">★</button>`).join('')}
                        </div>
                        <div class="actions">
                            <button class="btn-icon copy-btn" data-id="${p.id}" title="复制内容">📋</button>
                            <button class="btn-icon edit-btn" data-id="${p.id}" title="编辑">✏️</button>
                            <button class="btn-icon delete-btn" data-id="${p.id}" title="删除">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Bind events
        $$('.fav-btn').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); toggleFavorite(el.dataset.id); };
        });

        $$('.star').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); ratePrompt(el.dataset.id, el.dataset.rating); };
        });

        $$('.copy-btn').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); copyPrompt(el.dataset.id); };
        });

        $$('.edit-btn').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); editPrompt(el.dataset.id); };
        });

        $$('.delete-btn').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); confirmDelete(el.dataset.id); };
        });

        $$('.prompt-card').forEach(el => {
            el.addEventListener('dblclick', () => showPromptDetail(el.dataset.id));
        });

        renderPagination();
    }

    function renderPagination() {
        const container = $('#pagination');
        if (state.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `<button class="page-btn" ${state.currentPage <= 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}">‹ 上一页</button>`;

        const start = Math.max(1, state.currentPage - 2);
        const end = Math.min(state.totalPages, state.currentPage + 2);

        if (start > 1) html += `<button class="page-btn" data-page="1">1</button>`;
        if (start > 2) html += `<span style="color:var(--text-muted)">...</span>`;

        for (let i = start; i <= end; i++) {
            html += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (end < state.totalPages - 1) html += `<span style="color:var(--text-muted)">...</span>`;
        if (end < state.totalPages) html += `<button class="page-btn" data-page="${state.totalPages}">${state.totalPages}</button>`;

        html += `<button class="page-btn" ${state.currentPage >= state.totalPages ? 'disabled' : ''} data-page="${state.currentPage + 1}">下一页 ›</button>`;

        container.innerHTML = html;
        $$('.page-btn').forEach(el => {
            el.onclick = () => {
                if (!el.disabled) {
                    state.currentPage = parseInt(el.dataset.page);
                    loadPrompts();
                }
            };
        });
    }

    // ---- Views ----
    function showView(view) {
        $$('.view-panel').forEach(el => el.style.display = 'none');
        $(`#view-${view}`).style.display = 'block';

        if (view === 'dashboard') loadStats();
        if (view === 'prompts') loadPrompts();
    }

    function updateNavActive() {
        $$('.nav-item').forEach(el => el.classList.remove('active'));

        if (state.currentView === 'dashboard') {
            $('#nav-dashboard').classList.add('active');
        } else if (state.currentView === 'favorites') {
            $('#nav-favorites').classList.add('active');
        } else if (state.currentView === 'prompts' && !state.currentCategory) {
            $('#nav-all').classList.add('active');
        } else if (state.currentView === 'category') {
            const el = $(`#category-nav .nav-item[data-category="${state.currentCategory}"]`);
            if (el) el.classList.add('active');
        }
    }

    // ---- CRUD Actions ----
    async function toggleFavorite(id) {
        await api(API.prompts + '?action=favorite', {
            method: 'PUT',
            body: JSON.stringify({ id: parseInt(id) }),
        });
        loadPrompts();
        loadCategories();
    }

    async function ratePrompt(id, rating) {
        await api(API.prompts + '?action=rate', {
            method: 'PUT',
            body: JSON.stringify({ id: parseInt(id), rating: parseInt(rating) }),
        });
        loadPrompts();
    }

    async function copyPrompt(id) {
        const prompt = state.prompts.find(p => p.id == id);
        if (!prompt) return;

        try {
            await navigator.clipboard.writeText(prompt.content);
            toast('已复制到剪贴板', 'success');
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = prompt.content;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            toast('已复制到剪贴板', 'success');
        }

        // Record usage
        await api(API.prompts + '?action=use', {
            method: 'PUT',
            body: JSON.stringify({ id: parseInt(id) }),
        });
    }

    function editPrompt(id) {
        const prompt = state.prompts.find(p => p.id == id);
        if (!prompt) {
            // Fetch from API
            api(API.prompts + '?action=get&id=' + id).then(p => {
                state.editingPrompt = p;
                openPromptModal(p);
            });
            return;
        }
        state.editingPrompt = prompt;
        openPromptModal(prompt);
    }

    function confirmDelete(id) {
        const overlay = $('#confirm-overlay');
        overlay.classList.add('show');
        overlay.dataset.targetId = id;
    }

    async function deletePrompt(id) {
        await api(API.prompts + '?action=delete&id=' + id, { method: 'DELETE' });
        toast('已删除', 'success');
        loadPrompts();
        loadCategories();
    }

    async function savePrompt(data) {
        if (data.id) {
            await api(API.prompts + '?action=update', {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            toast('更新成功', 'success');
        } else {
            await api(API.prompts + '?action=create', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            toast('创建成功', 'success');
        }
        loadPrompts();
        loadCategories();
    }

    async function showPromptDetail(id) {
        const p = await api(API.prompts + '?action=get&id=' + id);
        const overlay = $('#detail-overlay');
        const content = $('#detail-body');

        content.innerHTML = `
            <h2 style="font-size:18px;margin-bottom:14px">${escapeHtml(p.title)}</h2>
            ${p.category_name ? `<span class="category-tag" style="background:${p.category_color}20;color:${p.category_color};margin-bottom:12px;display:inline-block">${escapeHtml(p.category_name)}</span>` : ''}
            <div class="detail-content">${escapeHtml(p.content)}</div>
            ${p.notes ? `<div style="margin-top:12px"><strong style="font-size:12px;color:var(--text-muted)">备注</strong><p style="font-size:13px;color:var(--text-dim);margin-top:4px">${escapeHtml(p.notes)}</p></div>` : ''}
            ${p.tags ? `<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">${p.tags.split(',').map(t => `<span class="tag">${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
            <div class="detail-meta">
                <span class="meta-item">⭐ ${p.rating || 0}/5</span>
                <span class="meta-item">📊 使用 ${p.usage_count} 次</span>
                <span class="meta-item">🕐 更新于 ${formatDate(p.updated_at)}</span>
                <span class="meta-item">📅 创建于 ${formatDate(p.created_at)}</span>
            </div>
        `;

        // 设置详情页按钮
        $('#detail-copy-btn').onclick = () => {
            copyPrompt(p.id);
        };
        $('#detail-edit-btn').onclick = () => {
            overlay.classList.remove('show');
            editPrompt(p.id);
        };

        overlay.classList.add('show');
    }

    // ---- Prompt Modal ----
    function openPromptModal(prompt = null) {
        const overlay = $('#prompt-overlay');
        const form = $('#prompt-form');

        form.reset();
        form.elements.id.value = prompt?.id || '';
        form.elements.title.value = prompt?.title || '';
        form.elements.content.value = prompt?.content || '';
        form.elements.category_id.value = prompt?.category_id || '';
        form.elements.tags.value = prompt?.tags || '';
        form.elements.notes.value = prompt?.notes || '';

        $('#prompt-modal-title').textContent = prompt ? '编辑提示词' : '新建提示词';
        overlay.classList.add('show');
        form.elements.title.focus();
    }

    // ---- Category Modal ----
    function openCategoryModal() {
        const overlay = $('#category-overlay');
        renderCategoryList();
        overlay.classList.add('show');
    }

    function renderCategoryList() {
        const container = $('#category-manage-list');
        container.innerHTML = state.categories.map(c => `
            <div class="category-manage-row" data-id="${c.id}">
                <input type="color" value="${c.color}" data-id="${c.id}" class="cat-color-input" />
                <span class="cat-name">${escapeHtml(c.name)}</span>
                <span class="cat-count">${c.prompt_count || 0}</span>
                <button class="btn-icon cat-delete-btn" data-id="${c.id}" title="删除">🗑️</button>
            </div>
        `).join('');

        $$('.cat-color-input').forEach(el => {
            el.onchange = async () => {
                const cat = state.categories.find(c => c.id == el.dataset.id);
                if (!cat) return;
                await api(API.categories + '?action=update', {
                    method: 'PUT',
                    body: JSON.stringify({ id: parseInt(el.dataset.id), name: cat.name, color: el.value }),
                });
                loadCategories();
            };
        });

        $$('.cat-delete-btn').forEach(el => {
            el.onclick = async () => {
                if (!confirm('确定删除此分类？该分类下的提示词不会被删除。')) return;
                await api(API.categories + '?action=delete&id=' + el.dataset.id, { method: 'DELETE' });
                loadCategories();
                renderCategoryList();
                toast('分类已删除', 'success');
            };
        });
    }

    async function addCategory() {
        const input = $('#new-category-name');
        const color = $('#new-category-color');
        const name = input.value.trim();
        if (!name) return;

        try {
            await api(API.categories + '?action=create', {
                method: 'POST',
                body: JSON.stringify({ name, color: color.value }),
            });
            input.value = '';
            toast('分类已添加', 'success');
            loadCategories();
            renderCategoryList();
        } catch (e) {
            toast(e.message, 'error');
        }
    }

    // ---- Init ----
    async function init() {
        // Initialize database
        try {
            await api(API.init);
        } catch (e) {
            // May already be initialized
            console.log('Init:', e.message);
        }

        await loadCategories();

        // Sidebar nav bindings
        $('#nav-dashboard').onclick = () => {
            state.currentView = 'dashboard';
            state.currentCategory = null;
            updateNavActive();
            showView('dashboard');
        };

        $('#nav-all').onclick = () => {
            state.currentView = 'prompts';
            state.currentCategory = null;
            state.currentPage = 1;
            updateNavActive();
            showView('prompts');
        };

        $('#nav-favorites').onclick = () => {
            state.currentView = 'favorites';
            state.currentCategory = null;
            state.currentPage = 1;
            updateNavActive();
            showView('prompts');
        };

        // Search
        let searchTimer;
        $('#search-input').oninput = (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.search = e.target.value.trim();
                state.currentPage = 1;
                state.currentView = 'prompts';
                updateNavActive();
                showView('prompts');
            }, 300);
        };

        // Sort
        $('#sort-select').onchange = (e) => {
            const [sort, order] = e.target.value.split('-');
            state.sort = sort;
            state.order = order;
            state.currentPage = 1;
            loadPrompts();
        };

        // New prompt button
        $('#btn-new-prompt').onclick = () => {
            state.editingPrompt = null;
            openPromptModal();
        };

        // Prompt form submit
        $('#prompt-form').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd);
            data.id = data.id ? parseInt(data.id) : null;
            data.category_id = data.category_id ? parseInt(data.category_id) : null;
            try {
                await savePrompt(data);
                $('#prompt-overlay').classList.remove('show');
            } catch (err) {
                toast(err.message, 'error');
            }
        };

        // Modal close buttons
        $$('[data-close]').forEach(el => {
            el.onclick = () => {
                el.closest('.modal-overlay').classList.remove('show');
            };
        });

        // Confirm delete
        $('#confirm-yes').onclick = async () => {
            const overlay = $('#confirm-overlay');
            const id = overlay.dataset.targetId;
            overlay.classList.remove('show');
            await deletePrompt(id);
        };

        $('#confirm-no').onclick = () => {
            $('#confirm-overlay').classList.remove('show');
        };

        // Category management
        $('#btn-manage-categories').onclick = openCategoryModal;
        $('#btn-add-category').onclick = addCategory;
        $('#new-category-name').onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
        };

        // Export
        $('#btn-export').onclick = () => {
            window.open(API.prompts + '?action=export', '_blank');
        };

        // Mobile menu
        $('#mobile-menu-btn').onclick = () => {
            $('#sidebar').classList.toggle('open');
        };

        // Close sidebar on content click (mobile)
        $('.main').onclick = () => {
            $('#sidebar').classList.remove('open');
        };

        // Close modals on overlay click
        $$('.modal-overlay').forEach(overlay => {
            overlay.onclick = (e) => {
                if (e.target === overlay) overlay.classList.remove('show');
            };
        });

        // Keyboard: Esc to close modals
        document.onkeydown = (e) => {
            if (e.key === 'Escape') {
                $$('.modal-overlay.show').forEach(el => el.classList.remove('show'));
            }
        };

        // Initial view

        // Theme toggle
        $('#theme-toggle').onclick = () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('promptvault-theme', next);
        };

        showView('dashboard');
        updateNavActive();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
