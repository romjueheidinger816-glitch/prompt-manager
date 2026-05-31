/**
 * 提示词编辑器组件
 * 处理弹窗编辑、标签输入、Markdown 预览、变量高亮
 */

const PromptEditor = {
    currentEditId: null,
    currentTags: [],    // [{id, name}]
    allTags: [],        // 全部标签（用于联想）
    allCategories: [],  // 全部分类

    init() {
        // 弹窗关闭
        document.getElementById('editorClose').onclick = () => this.close();
        document.getElementById('editorCancel').onclick = () => this.close();

        // 保存
        document.getElementById('editorSave').onclick = () => this.save();

        // Markdown 预览（实时）
        const contentEl = document.getElementById('editorContent');
        contentEl.addEventListener('input', debounce(() => this.updatePreview(), 200));

        // 标签输入
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

    // 加载依赖数据
    async loadData() {
        try {
            const [cats, tags] = await Promise.all([
                CategoryAPI.list(),
                TagAPI.list(),
            ]);
            this.allCategories = this.flattenCategories(cats);
            this.allTags = tags;
        } catch (e) { /* 静默 */ }
    },

    // 将树形分类展平为一维（含缩进前缀）
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

    // 打开新建
    openNew() {
        this.currentEditId = null;
        this.currentTags = [];
        document.getElementById('editorTitle').textContent = '新建提示词';
        document.getElementById('editorTitleInput').value = '';
        document.getElementById('editorContent').value = '';
        this.populateCategorySelect();
        document.getElementById('editorCategory').value = '';
        this.renderTags();
        this.updatePreview();
        this.open();
    },

    // 打开编辑
    async openEdit(id) {
        await this.loadData();
        try {
            const prompt = await PromptAPI.get(id);
            this.currentEditId = id;
            this.currentTags = prompt.tags || [];
            document.getElementById('editorTitle').textContent = '编辑提示词';
            document.getElementById('editorTitleInput').value = prompt.title;
            document.getElementById('editorContent').value = prompt.content;
            this.populateCategorySelect();
            document.getElementById('editorCategory').value = prompt.category_id || '';
            this.renderTags();
            this.updatePreview();
            this.open();
        } catch (e) {
            showToast('加载提示词失败', 'error');
        }
    },

    // 填充分类下拉
    populateCategorySelect() {
        const select = document.getElementById('editorCategory');
        select.innerHTML = '<option value="">未分类</option>';
        for (const cat of this.allCategories) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        }
    },

    // 显示/隐藏弹窗
    open() {
        document.getElementById('editorModal').classList.add('open');
        document.getElementById('editorTitleInput').focus();
    },
    close() {
        document.getElementById('editorModal').classList.remove('open');
    },

    // 保存
    async save() {
        const title = document.getElementById('editorTitleInput').value.trim();
        const content = document.getElementById('editorContent').value.trim();
        const categoryId = document.getElementById('editorCategory').value || null;

        if (!title) { showToast('请输入标题', 'error'); return; }
        if (!content) { showToast('请输入内容', 'error'); return; }

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
                showToast('更新成功', 'success');
            } else {
                await PromptAPI.create(data);
                showToast('创建成功', 'success');
            }
            this.close();
            // 刷新列表
            if (typeof App !== 'undefined') App.refreshCurrentView();
        } catch (e) {
            // 错误已在 api.js 中处理
        }
    },

    // ---- 标签输入 ----
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
        // 检查是否已有该标签
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
            // 显示常用标签
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
            suggestionsEl.innerHTML = `<div class="tag-suggestion-item" onmousedown="PromptEditor.addTag('${input.value}'); document.getElementById('editorTagInput').value = '';">创建标签 "${input.value}"</div>`;
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

    // ---- 预览 ----
    updatePreview() {
        const content = document.getElementById('editorContent').value;
        const previewEl = document.querySelector('#editorPreview .preview-content');
        let html = '';
        if (typeof marked !== 'undefined') {
            html = marked.parse(content);
        } else {
            html = content.replace(/\n/g, '<br>');
        }
        // 高亮变量
        html = highlightVariables(html);
        previewEl.innerHTML = html;
    },
};

/**
 * 变量填写弹窗
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
            // 无变量，直接复制
            this.copyAndRecord(content, {});
            return;
        }

        const fieldsEl = document.getElementById('variableFields');
        fieldsEl.innerHTML = '';
        this.variables.forEach(v => {
            const div = document.createElement('div');
            div.className = 'variable-field';
            div.innerHTML = `
                <label><span class="var-name">{{${v.name}}}</span>${v.defaultValue ? ' 默认值: ' + v.defaultValue : ''}</label>
                <input type="text" data-var="${v.name}" value="${v.defaultValue}" placeholder="请输入 ${v.name}">
            `;
            fieldsEl.appendChild(div);
        });

        document.getElementById('variableModal').classList.add('open');
        // 自动聚焦第一个输入
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
            } catch (e) { /* 静默 */ }
        }
        if (typeof App !== 'undefined') App.refreshCurrentView();
    },
};
