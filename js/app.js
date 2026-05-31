/**
 * ��Ӧ���߼�
 * ·�ɡ�״̬����ͼ��Ⱦ�����ʻ�
 */

const App = {
    currentView: 'all',
    currentSort: 'updated_at',
    currentOrder: 'DESC',
    currentSearch: '',
    currentCategoryId: null,
    currentTagId: null,
    viewMode: 'list',
    categories: [],
    tags: [],
    prompts: [],
    totalPages: 1,
    currentPage: 1,

    async init() {
        this.bindEvents();
        PromptEditor.init();
        this.initTheme();
        this.initLang();
        this.initVariableModal();

        await this.loadSidebarData();
        this.navigate('all');
    },

    bindEvents() {
        document.getElementById('sidebarToggle').onclick = () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        };

        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                this.navigate(item.dataset.view);
            };
        });

        document.getElementById('btnNewPrompt').onclick = async () => {
            await PromptEditor.loadData();
            PromptEditor.openNew();
        };

        document.getElementById('btnThemeToggle').onclick = () => this.toggleTheme();
        document.getElementById('btnLangToggle').onclick = () => this.toggleLang();

        const searchInput = document.getElementById('globalSearch');
        searchInput.addEventListener('input', debounce(() => {
            this.currentSearch = searchInput.value.trim();
            this.currentPage = 1;
            this.loadPrompts();
        }, 300));

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
            }
        });

        document.getElementById('sortSelect').onchange = (e) => {
            this.currentSort = e.target.value;
            this.currentPage = 1;
            this.loadPrompts();
        };

        document.getElementById('btnListView').onclick = () => this.setViewMode('list');
        document.getElementById('btnCardView').onclick = () => this.setViewMode('card');

        document.getElementById('btnAddCategory').onclick = () => this.openCategoryModal();
        document.getElementById('categoryClose').onclick = () => this.closeCategoryModal();
        document.getElementById('categoryCancel').onclick = () => this.closeCategoryModal();
        document.getElementById('categorySave').onclick = () => this.saveCategory();

        document.getElementById('confirmClose').onclick = () => this.closeConfirm();
        document.getElementById('confirmCancel').onclick = () => this.closeConfirm();
    },

    // ---- ���� ----
    initTheme() {
        const saved = localStorage.getItem('pm-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
    },
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pm-theme', next);
    },

    // ---- ���� ----
    initLang() {
        this.updateLangLabel();
        Lang.apply();
    },
    toggleLang() {
        Lang.toggle();
        this.updateLangLabel();
        this.refreshCurrentView();
        this.loadSidebarData();
    },
    updateLangLabel() {
        document.getElementById('langLabel').textContent = Lang.current === 'en' ? 'EN' : '��';
    },

    initVariableModal() {
        document.getElementById('variableClose').onclick = () => VariableModal.close();
        document.getElementById('variableCancel').onclick = () => VariableModal.close();
        document.getElementById('variableConfirm').onclick = () => VariableModal.confirm();
    },

    // ---- ���� ----
    navigate(view) {
        this.currentView = view;
        this.currentCategoryId = null;
        this.currentTagId = null;
        this.currentSearch = '';
        this.currentPage = 1;
        document.getElementById('globalSearch').value = '';

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const active = document.querySelector(`.nav-item[data-view="${view}"]`);
        if (active) active.classList.add('active');

        const viewTitleMap = {
            all: 'viewAll',
            favorites: 'viewFavorites',
            dashboard: 'viewDashboard',
            trash: 'viewTrash',
            settings: 'viewSettings',
        };

        if (view.startsWith('category:')) {
            const id = view.split(':')[1];
            this.currentCategoryId = id;
            const cat = this.findCategory(this.categories, parseInt(id));
            document.getElementById('viewTitle').textContent = cat ? cat.name : '';
            document.querySelectorAll(`.nav-item[data-view="category:${id}"]`).forEach(el => el.classList.add('active'));
            this.loadPrompts();
        } else if (view.startsWith('tag:')) {
            const id = view.split(':')[1];
            this.currentTagId = id;
            const tag = this.tags.find(t => t.id == id);
            document.getElementById('viewTitle').textContent = tag ? '#' + tag.name : '';
            document.querySelectorAll(`.nav-item[data-view="tag:${id}"]`).forEach(el => el.classList.add('active'));
            this.loadPrompts();
        } else {
            document.getElementById('viewTitle').textContent = Lang.t(viewTitleMap[view] || view);
            if (view === 'dashboard') {
                this.showHeader(false);
                Dashboard.render();
            } else if (view === 'trash') {
                this.showHeader(false);
                this.renderTrash();
            } else if (view === 'settings') {
                this.showHeader(false);
                this.renderSettings();
            } else if (view === 'favorites') {
                this.showHeader(true);
                this.loadFavorites();
            } else {
                this.showHeader(true);
                this.loadPrompts();
            }
        }
    },

    showHeader(show) {
        document.getElementById('contentHeader').style.display = show ? 'flex' : 'none';
    },

    findCategory(tree, id) {
        for (const cat of tree) {
            if (cat.id === id) return cat;
            if (cat.children) {
                const found = this.findCategory(cat.children, id);
                if (found) return found;
            }
        }
        return null;
    },

    // ---- ���� ----
    async loadSidebarData() {
        try {
            const [cats, tags] = await Promise.all([
                CategoryAPI.list(),
                TagAPI.list(),
            ]);
            this.categories = cats;
            this.tags = tags;
            this.renderCategoryTree();
            this.renderTagCloud();
        } catch (e) { /* silent */ }
    },

    renderCategoryTree() {
        const container = document.getElementById('categoryTree');
        container.innerHTML = '';
        const renderLevel = (items, level = 0) => {
            for (const cat of items) {
                const div = document.createElement('a');
                div.className = 'nav-item' + (level > 0 ? ' child' : '');
                div.href = '#';
                div.dataset.view = `category:${cat.id}`;
                div.innerHTML = `
                    <span class="category-dot" style="background:${cat.color}"></span>
                    <span>${cat.name}</span>
                    <span class="category-count">${cat.prompt_count}</span>
                `;
                div.onclick = (e) => {
                    e.preventDefault();
                    this.navigate(`category:${cat.id}`);
                };
                container.appendChild(div);
                if (cat.children && cat.children.length > 0) {
                    renderLevel(cat.children, level + 1);
                }
            }
        };
        renderLevel(this.categories);
    },

    renderTagCloud() {
        const container = document.getElementById('tagCloud');
        container.innerHTML = '';
        for (const tag of this.tags) {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.innerHTML = `${tag.name}<span class="tag-pill-count">${tag.prompt_count}</span>`;
            pill.onclick = () => this.navigate(`tag:${tag.id}`);
            container.appendChild(pill);
        }
    },

    // ---- �б� ----
    async loadPrompts() {
        const params = {
            sort: this.currentSort,
            order: this.currentOrder,
            page: this.currentPage,
            per_page: 50,
        };
        if (this.currentSearch) params.search = this.currentSearch;
        if (this.currentCategoryId) params.category = this.currentCategoryId;
        if (this.currentTagId) params.tag = this.currentTagId;

        try {
            const result = await PromptAPI.list(params);
            this.prompts = result.items;
            this.totalPages = result.pages;
            const suffix = Lang.t('countSuffix');
            document.getElementById('promptCount').textContent = `${result.total} ${suffix}`;
            this.renderPrompts();
        } catch (e) {
            document.getElementById('contentBody').innerHTML = `<div class="empty-state"><p>${Lang.t('toastLoadFail')}</p></div>`;
        }
    },

    async loadFavorites() {
        try {
            const items = await PromptAPI.favorites();
            this.prompts = items;
            const suffix = Lang.t('countSuffix');
            document.getElementById('promptCount').textContent = `${items.length} ${suffix}`;
            this.renderPrompts();
        } catch (e) {
            document.getElementById('contentBody').innerHTML = `<div class="empty-state"><p>${Lang.t('toastLoadFail')}</p></div>`;
        }
    },

    renderPrompts() {
        const container = document.getElementById('contentBody');
        if (this.prompts.length === 0) {
            const msg = this.currentSearch ? 'emptyNoResults' : 'emptyNoPrompts';
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <p>${Lang.t(msg)}</p>
                    <button class="btn btn-primary" onclick="App.openNewPrompt()">${Lang.t('emptyCreateFirst')}</button>
                </div>
            `;
            return;
        }
        if (this.viewMode === 'card') {
            this.renderCardView(container);
        } else {
            this.renderListView(container);
        }
    },

    renderListView(container) {
        const L = Lang.t.bind(Lang);
        let html = `
            <table class="prompt-table">
                <thead><tr>
                    <th>${L('thTitle')}</th>
                    <th>${L('thCategory')}</th>
                    <th>${L('thTags')}</th>
                    <th>${L('thUsage')}</th>
                    <th>${L('thUpdated')}</th>
                    <th></th>
                </tr></thead><tbody>
        `;
        for (const p of this.prompts) {
            const tags = (p.tags || []).map(t => `<span class="table-tag">${t.name}</span>`).join('');
            const catDot = p.category_color ? `<span class="category-dot" style="background:${p.category_color}"></span>` : '';
            const safeContent = p.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
            const favTitle = p.is_favorite ? L('btnUnfavorite') : L('btnFavorite');
            html += `
                <tr onclick="App.editPrompt(${p.id})">
                    <td>
                        <div class="table-title">${p.is_favorite ? '&#9733; ' : ''}${p.title}</div>
                        <div class="table-content-preview">${truncate(p.content, 60)}</div>
                    </td>
                    <td><span class="table-category">${catDot}${p.category_name || L('uncategorized')}</span></td>
                    <td><div class="table-tags">${tags}</div></td>
                    <td><span class="table-usage">${p.usage_count}</span></td>
                    <td>${formatDate(p.updated_at)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-icon" data-i18n-title="btnCopy" title="${L('btnCopy')}" onclick="event.stopPropagation(); App.usePrompt(${p.id}, \`${safeContent}\`)">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M8 3H5a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2v-3M16 3h-2a2 2 0 00-2 2v2m4-4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                            <button class="btn-icon" title="${favTitle}" onclick="event.stopPropagation(); App.toggleFav(${p.id})">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" fill="${p.is_favorite ? 'var(--warning)' : 'none'}" stroke="currentColor" stroke-width="1.5"/></svg>
                            </button>
                            <button class="btn-icon" title="${L('btnDelete')}" onclick="event.stopPropagation(); App.deletePrompt(${p.id})">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H3.862a2 2 0 01-1.995-1.858L1 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    renderCardView(container) {
        const L = Lang.t.bind(Lang);
        let html = '<div class="card-grid">';
        for (const p of this.prompts) {
            const tags = (p.tags || []).map(t => `<span class="card-tag">${t.name}</span>`).join('');
            const safeContent = p.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
            html += `
                <div class="prompt-card" onclick="App.editPrompt(${p.id})">
                    <div class="card-header">
                        <span class="card-title">${p.title}</span>
                        <span class="card-fav ${p.is_favorite ? 'active' : ''}" onclick="event.stopPropagation(); App.toggleFav(${p.id})">&#9733;</span>
                    </div>
                    <div class="card-content">${truncate(p.content, 160)}</div>
                    <div class="card-meta"><div class="card-tags">${tags}</div></div>
                    <div class="card-footer">
                        <span class="card-category">
                            ${p.category_color ? `<span class="category-dot" style="background:${p.category_color}"></span>` : ''}
                            ${p.category_name || L('uncategorized')}
                        </span>
                        <span class="card-usage">${p.usage_count} ${L('usageCount')}</span>
                        <div class="card-actions">
                            <button class="btn-icon" title="${L('btnCopy')}" onclick="event.stopPropagation(); App.usePrompt(${p.id}, \`${safeContent}\`)">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M8 3H5a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2v-3M16 3h-2a2 2 0 00-2 2v2m4-4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                            <button class="btn-icon" title="${L('btnDelete')}" onclick="event.stopPropagation(); App.deletePrompt(${p.id})">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H3.862a2 2 0 01-1.995-1.858L1 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    setViewMode(mode) {
        this.viewMode = mode;
        document.getElementById('btnListView').classList.toggle('active', mode === 'list');
        document.getElementById('btnCardView').classList.toggle('active', mode === 'card');
        this.renderPrompts();
    },

    // ---- ���� ----
    async editPrompt(id) {
        await PromptEditor.loadData();
        PromptEditor.openEdit(id);
    },

    async openNewPrompt() {
        await PromptEditor.loadData();
        PromptEditor.openNew();
    },

    usePrompt(id, content) {
        VariableModal.open(id, content);
    },

    async toggleFav(id) {
        try {
            await PromptAPI.toggleFavorite(id);
            this.refreshCurrentView();
        } catch (e) { /* silent */ }
    },

    deletePrompt(id) {
        this.showConfirm(Lang.t('confirmDeletePromptTitle'), Lang.t('confirmDeletePrompt'), async () => {
            try {
                await PromptAPI.delete(id);
                showToast('toastDeleted', 'success');
                this.refreshCurrentView();
            } catch (e) { /* silent */ }
        });
    },

    refreshCurrentView() {
        if (this.currentView.startsWith('category:') || this.currentView.startsWith('tag:')) {
            this.loadPrompts();
        } else if (this.currentView === 'favorites') {
            this.loadFavorites();
        } else if (this.currentView === 'dashboard') {
            Dashboard.render();
        } else if (this.currentView === 'trash') {
            this.renderTrash();
        } else if (this.currentView === 'all') {
            this.loadPrompts();
        }
        this.loadSidebarData();
    },

    // ---- ����վ ----
    async renderTrash() {
        const container = document.getElementById('contentBody');
        try {
            const items = await TrashAPI.list();
            if (items.length === 0) {
                container.innerHTML = `<div class="empty-state"><p>${Lang.t('trashEmpty')}</p></div>`;
                return;
            }
            let html = '';
            for (const item of items) {
                html += `
                    <div class="trash-item">
                        <div class="trash-info">
                            <div class="trash-title">${item.title}</div>
                            <div class="trash-meta">${Lang.t('trashDeletedAt')} ${formatDate(item.deleted_at)}</div>
                        </div>
                        <div class="trash-actions">
                            <button class="btn btn-sm btn-ghost" onclick="App.restorePrompt(${item.id})">${Lang.t('btnRestore')}</button>
                            <button class="btn btn-sm btn-danger" onclick="App.permanentDelete(${item.id})">${Lang.t('btnPermanentDelete')}</button>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><p>${Lang.t('toastLoadFail')}</p></div>`;
        }
    },

    async restorePrompt(id) {
        try {
            await TrashAPI.restore(id);
            showToast('toastRestored', 'success');
            this.renderTrash();
            this.loadSidebarData();
        } catch (e) { /* silent */ }
    },

    permanentDelete(id) {
        this.showConfirm(Lang.t('confirmPermanentDeleteTitle'), Lang.t('confirmPermanentDelete'), async () => {
            try {
                await TrashAPI.permanent(id);
                showToast('toastPermanentDeleted', 'success');
                this.renderTrash();
            } catch (e) { /* silent */ }
        });
    },

    // ---- ���� ----
    renderSettings() {
        const L = Lang.t.bind(Lang);
        const container = document.getElementById('contentBody');
        container.innerHTML = `
            <div class="settings-section">
                <h4>${L('settingsImportExport')}</h4>
                <div class="settings-actions">
                    <button class="btn btn-primary" onclick="ExportAPI.json()">${L('settingsExportJSON')}</button>
                    <button class="btn btn-ghost" onclick="ExportAPI.markdown()">${L('settingsExportMD')}</button>
                    <button class="btn btn-ghost" onclick="App.openImportDialog()">${L('settingsImportJSON')}</button>
                </div>
            </div>
            <div class="settings-section">
                <h4>${L('settingsTheme')}</h4>
                <div class="settings-actions">
                    <button class="btn btn-ghost" onclick="document.documentElement.setAttribute('data-theme','light'); localStorage.setItem('pm-theme','light');">${L('settingsThemeLight')}</button>
                    <button class="btn btn-ghost" onclick="document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('pm-theme','dark');">${L('settingsThemeDark')}</button>
                </div>
            </div>
            <div class="settings-section">
                <h4>${L('settingsCategoryManage')}</h4>
                <div id="categoryManageList" style="margin-top: 12px;"></div>
            </div>
            <div class="settings-section">
                <h4>${L('settingsTagManage')}</h4>
                <div id="tagManageList" style="margin-top: 12px;"></div>
            </div>
        `;
        this.renderCategoryManageList();
        this.renderTagManageList();
    },

    renderCategoryManageList() {
        const container = document.getElementById('categoryManageList');
        if (!container) return;
        const renderLevel = (items, level = 0) => {
            let html = '';
            for (const cat of items) {
                html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;padding-left:${level * 20}px;">
                    <span class="category-dot" style="background:${cat.color}"></span>
                    <span style="flex:1;">${cat.name}</span>
                    <span style="font-size:0.8rem;color:var(--text-tertiary);">${cat.prompt_count}</span>
                    <button class="btn-icon-sm" title="Delete" onclick="App.deleteCategory(${cat.id})">
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8m0-8l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                </div>`;
                if (cat.children && cat.children.length > 0) {
                    html += renderLevel(cat.children, level + 1);
                }
            }
            return html;
        };
        container.innerHTML = renderLevel(this.categories) || `<p style="color:var(--text-tertiary)">${Lang.t('settingsNoCategory')}</p>`;
    },

    renderTagManageList() {
        const container = document.getElementById('tagManageList');
        if (!container) return;
        let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
        for (const tag of this.tags) {
            html += `<span class="tag-pill" style="cursor:pointer;">
                ${tag.name}
                <span class="tag-pill-count">${tag.prompt_count}</span>
                <span style="cursor:pointer;margin-left:2px;font-size:0.8rem;" onclick="App.deleteTag(${tag.id})">&times;</span>
            </span>`;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    openImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const result = await ImportAPI.json(data);
                showToast('toastImportOk', 'success');
                this.refreshCurrentView();
            } catch (err) {
                showToast('toastImportFail', 'error');
            }
        };
        input.click();
    },

    // ---- ������� ----
    openCategoryModal() {
        document.getElementById('categoryModalTitle').textContent = Lang.t('catModalAdd');
        document.getElementById('categoryNameInput').value = '';
        document.getElementById('categoryColorInput').value = '#6366f1';

        const select = document.getElementById('categoryParentInput');
        select.innerHTML = `<option value="">${Lang.t('catParentNone')}</option>`;
        for (const cat of this.categories) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        }

        document.getElementById('categoryModal').classList.add('open');
        document.getElementById('categoryNameInput').focus();
    },

    closeCategoryModal() {
        document.getElementById('categoryModal').classList.remove('open');
    },

    async saveCategory() {
        const name = document.getElementById('categoryNameInput').value.trim();
        if (!name) { showToast('toastCatNameRequired', 'error'); return; }
        const parentId = document.getElementById('categoryParentInput').value || null;
        const color = document.getElementById('categoryColorInput').value;

        try {
            await CategoryAPI.create({ name, parent_id: parentId, color });
            showToast('toastCatCreated', 'success');
            this.closeCategoryModal();
            this.loadSidebarData();
            if (this.currentView === 'settings') this.renderSettings();
        } catch (e) { /* silent */ }
    },

    async deleteCategory(id) {
        this.showConfirm(Lang.t('confirmDeleteCategoryTitle'), Lang.t('confirmDeleteCategory'), async () => {
            try {
                await CategoryAPI.delete(id);
                showToast('toastCatDeleted', 'success');
                this.loadSidebarData();
                if (this.currentView === 'settings') this.renderSettings();
                if (this.currentView === `category:${id}`) this.navigate('all');
            } catch (e) { /* silent */ }
        });
    },

    async deleteTag(id) {
        this.showConfirm(Lang.t('confirmDeleteTagTitle'), Lang.t('confirmDeleteTag'), async () => {
            try {
                await TagAPI.delete(id);
                showToast('toastTagDeleted', 'success');
                this.loadSidebarData();
                if (this.currentView === 'settings') this.renderSettings();
                if (this.currentView === `tag:${id}`) this.navigate('all');
            } catch (e) { /* silent */ }
        });
    },

    // ---- ȷ�ϵ��� ----
    _confirmCallback: null,
    showConfirm(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('open');
        this._confirmCallback = callback;
        document.getElementById('confirmOk').onclick = async () => {
            this.closeConfirm();
            if (this._confirmCallback) await this._confirmCallback();
        };
    },
    closeConfirm() {
        document.getElementById('confirmModal').classList.remove('open');
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
