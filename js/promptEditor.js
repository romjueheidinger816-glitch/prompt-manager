/**
 * ��ʾ�ʱ༭����� + ������д����
 */

const PromptEditor = {
    currentEditId: null,
    currentTags: [],
    allTags: [],
    allCategories: [],

    init() {
        document.getElementById('editorClose').onclick = () => this.close();
        document.getElementById('editorCancel').onclick = () => this.close();
        document.getElementById('editorSave').onclick = () => this.save();

        const contentEl = document.getElementById('editorContent');
        contentEl.addEventListener('input', debounce(() => this.updatePreview(), 200));

        const tagInput = document.getElementById('editorTagInput');
        tagInput.addEventListener('keydown', (e) => this.onTagKeydown(e));
        tagInput.addEventListener('input', () => this.onTagInput());
        tagInput.addEventListener('focus', () => this.onTagInput());
        tagInput.addEventListener('blur', () => {
            setTimeout(() => {
                document.getElementById('tagSuggestions').style.display = 'none';
            }, 200);
        });
    },

    async loadData() {
        try {
            const [cats, tags] = await Promise.all([
                CategoryAPI.list(),
                TagAPI.list(),
            ]);
            this.allCategories = this.flattenCategories(cats);
            this.allTags = tags;
        } catch (e) { /* silent */ }
    },

    flattenCategories(tree, prefix = '') {
        const result = [];
        for (const cat of tree) {
            result.push({ id: cat.id, name: prefix + cat.name, color: cat.color });
            if (cat.children && cat.children.length > 0) {
                result.push(...this.flattenCategories(cat.children, prefix + '  '));
            }
        }
        return result;
    },

    openNew() {
        this.currentEditId = null;
        this.currentTags = [];
        document.getElementById('editorTitle').textContent = Lang.t('editorNew');
        document.getElementById('editorTitleInput').value = '';
        document.getElementById('editorContent').value = '';
        this.populateCategorySelect();
        document.getElementById('editorCategory').value = '';
        this.renderTags();
        this.updatePreview();
        this.open();
    },

    async openEdit(id) {
        await this.loadData();
        try {
            const prompt = await PromptAPI.get(id);
            this.currentEditId = id;
            this.currentTags = prompt.tags || [];
            document.getElementById('editorTitle').textContent = Lang.t('editorEdit');
            document.getElementById('editorTitleInput').value = prompt.title;
            document.getElementById('editorContent').value = prompt.content;
            this.populateCategorySelect();
            document.getElementById('editorCategory').value = prompt.category_id || '';
            this.renderTags();
            this.updatePreview();
            this.open();
        } catch (e) {
            showToast('toastLoadFail', 'error');
        }
    },

    populateCategorySelect() {
        const select = document.getElementById('editorCategory');
        select.innerHTML = `<option value="">${Lang.t('editorCategoryNone')}</option>`;
        for (const cat of this.allCategories) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        }
    },

    open() {
        document.getElementById('editorModal').classList.add('open');
        document.getElementById('editorTitleInput').focus();
    },
    close() {
        document.getElementById('editorModal').classList.remove('open');
    },

    async save() {
        const title = document.getElementById('editorTitleInput').value.trim();
        const content = document.getElementById('editorContent').value.trim();
        const categoryId = document.getElementById('editorCategory').value || null;

        if (!title) { showToast('toastTitleRequired', 'error'); return; }
        if (!content) { showToast('toastContentRequired', 'error'); return; }

        const tagIds = this.currentTags.filter(t => t.id).map(t => t.id);
        const tagNames = this.currentTags.filter(t => !t.id).map(t => t.name);

        const data = {
            title,
            content,
            category_id: categoryId,
            tags: [...tagIds, ...tagNames],
            is_favorite: 0,
        };

        try {
            if (this.currentEditId) {
                await PromptAPI.update(this.currentEditId, data);
                showToast('toastUpdated', 'success');
            } else {
                await PromptAPI.create(data);
                showToast('toastCreated', 'success');
            }
            this.close();
            if (typeof App !== 'undefined') App.refreshCurrentView();
        } catch (e) { /* handled in api.js */ }
    },

    // ---- ��ǩ ----
    renderTags() {
        const container = document.getElementById('editorTagsDisplay');
        container.innerHTML = '';
        this.currentTags.forEach((tag, idx) => {
            const el = document.createElement('span');
            el.className = 'tag-input-tag';
            el.innerHTML = `<span>${tag.name}</span><button onclick="PromptEditor.removeTag(${idx})">&times;</button>`;
            container.appendChild(el);
        });
    },

    addTag(name) {
        name = name.trim();
        if (!name) return;
        if (this.currentTags.find(t => t.name === name)) return;
        const existing = this.allTags.find(t => t.name === name);
        this.currentTags.push(existing ? { id: existing.id, name: existing.name } : { name });
        this.renderTags();
    },

    removeTag(idx) {
        this.currentTags.splice(idx, 1);
        this.renderTags();
    },

    onTagKeydown(e) {
        const input = e.target;
        if (e.key === 'Enter') {
            e.preventDefault();
            const suggestions = document.getElementById('tagSuggestions');
            const highlighted = suggestions.querySelector('.highlighted');
            if (highlighted) {
                this.addTag(highlighted.dataset.name);
                highlighted.classList.remove('highlighted');
            } else {
                this.addTag(input.value);
            }
            input.value = '';
            document.getElementById('tagSuggestions').style.display = 'none';
        } else if (e.key === 'Backspace' && input.value === '' && this.currentTags.length > 0) {
            this.currentTags.pop();
            this.renderTags();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
        }
    },

    onTagInput() {
        const input = document.getElementById('editorTagInput');
        const val = input.value.trim().toLowerCase();
        const suggestionsEl = document.getElementById('tagSuggestions');

        if (!val) {
            const available = this.allTags.filter(t => !this.currentTags.find(ct => ct.name === t.name));
            if (available.length === 0) { suggestionsEl.style.display = 'none'; return; }
            suggestionsEl.innerHTML = available.slice(0, 8).map(t =>
                `<div class="tag-suggestion-item" data-name="${t.name}" onmousedown="PromptEditor.addTag('${t.name}'); document.getElementById('editorTagInput').value = '';">${t.name}</div>`
            ).join('');
            suggestionsEl.style.display = 'block';
            return;
        }

        const filtered = this.allTags.filter(t =>
            t.name.toLowerCase().includes(val) && !this.currentTags.find(ct => ct.name === t.name)
        );

        if (filtered.length === 0) {
            suggestionsEl.innerHTML = `<div class="tag-suggestion-item" onmousedown="PromptEditor.addTag('${input.value}'); document.getElementById('editorTagInput').value = '';">${Lang.t('createTagLabel')} "${input.value}"</div>`;
        } else {
            suggestionsEl.innerHTML = filtered.map(t =>
                `<div class="tag-suggestion-item" data-name="${t.name}" onmousedown="PromptEditor.addTag('${t.name}'); document.getElementById('editorTagInput').value = '';">${t.name}</div>`
            ).join('');
        }
        suggestionsEl.style.display = 'block';
    },

    navigateSuggestions(dir) {
        const suggestions = document.getElementById('tagSuggestions');
        const items = suggestions.querySelectorAll('.tag-suggestion-item');
        if (items.length === 0) return;
        let current = -1;
        items.forEach((item, i) => { if (item.classList.contains('highlighted')) current = i; });
        items.forEach(item => item.classList.remove('highlighted'));
        let next = current + dir;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        items[next].classList.add('highlighted');
    },

    updatePreview() {
        const content = document.getElementById('editorContent').value;
        const previewEl = document.querySelector('#editorPreview .preview-content');
        let html = '';
        if (typeof marked !== 'undefined') {
            html = marked.parse(content);
        } else {
            html = content.replace(/\n/g, '<br>');
        }
        html = highlightVariables(html);
        previewEl.innerHTML = html;
    },
};

/**
 * ������д����
 */
const VariableModal = {
    variables: [],
    originalContent: '',
    promptId: null,

    open(promptId, content) {
        this.promptId = promptId;
        this.originalContent = content;
        this.variables = extractVariables(content);

        if (this.variables.length === 0) {
            this.copyAndRecord(content, {});
            return;
        }

        const fieldsEl = document.getElementById('variableFields');
        fieldsEl.innerHTML = '';
        this.variables.forEach(v => {
            const div = document.createElement('div');
            div.className = 'variable-field';
            const defaultHint = v.defaultValue ? ` (${v.defaultValue})` : '';
            div.innerHTML = `
                <label><span class="var-name">{{${v.name}}}</span>${defaultHint}</label>
                <input type="text" data-var="${v.name}" value="${v.defaultValue}" placeholder="${Lang.t('varModalPlaceholder')} ${v.name}">
            `;
            fieldsEl.appendChild(div);
        });

        document.getElementById('variableModal').classList.add('open');
        const firstInput = fieldsEl.querySelector('input');
        if (firstInput) firstInput.focus();
    },

    close() {
        document.getElementById('variableModal').classList.remove('open');
    },

    async confirm() {
        const values = {};
        document.querySelectorAll('#variableFields input[data-var]').forEach(input => {
            values[input.dataset.var] = input.value;
        });
        const finalText = replaceVariables(this.originalContent, values);
        await this.copyAndRecord(finalText, values);
        this.close();
    },

    async copyAndRecord(text, variables) {
        await copyToClipboard(text);
        if (this.promptId) {
            try {
                await PromptAPI.recordUse(this.promptId, variables);
            } catch (e) { /* silent */ }
        }
        if (typeof App !== 'undefined') App.refreshCurrentView();
    },
};
