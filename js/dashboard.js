/**
 * �Ǳ��� / ����ͳ��
 */

const Dashboard = {
    charts: {},

    async render() {
        const container = document.getElementById('contentBody');
        container.innerHTML = `<div class="dashboard" id="dashboardContent"><p style="color:var(--text-tertiary)">${Lang.t('dashLoading')}</p></div>`;

        try {
            const stats = await StatsAPI.get();
            const el = document.getElementById('dashboardContent');
            el.innerHTML = this.buildHTML(stats);
            this.initCharts(stats);
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><p>${Lang.t('toastLoadFail')}</p></div>`;
        }
    },

    buildHTML(stats) {
        const L = Lang.t.bind(Lang);
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--accent-light);color:var(--accent);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm-6 6h4v4H4v-4zm6 0h4v4h-4v-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.total_prompts}</div>
                    <div class="stat-label">${L('dashTotal')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--warning-light);color:var(--warning);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.favorite_count}</div>
                    <div class="stat-label">${L('dashFavorites')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--success-light);color:var(--success);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.tag_count}</div>
                    <div class="stat-label">${L('dashTags')}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--danger-light);color:var(--danger);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.week_usage}</div>
                    <div class="stat-label">${L('dashWeekUsage')}</div>
                </div>
            </div>

            <div class="chart-section">
                <div class="chart-card">
                    <h4>${L('dashCategoryChart')}</h4>
                    <div class="chart-wrapper"><canvas id="categoryChart"></canvas></div>
                </div>
                <div class="chart-card">
                    <h4>${L('dashTopChart')}</h4>
                    <div class="chart-wrapper"><canvas id="topChart"></canvas></div>
                </div>
            </div>

            <div class="chart-card">
                <h4>${L('dashRecentUsage')}</h4>
                ${stats.recent_usage.length === 0
                    ? `<p style="color:var(--text-tertiary);font-size:0.9rem;">${L('dashNoUsage')}</p>`
                    : '<ul class="recent-list">' + stats.recent_usage.map(r => `
                        <li class="recent-item">
                            <span class="recent-title">${r.prompt_title}</span>
                            <span class="recent-time">${formatDate(r.used_at)}</span>
                        </li>
                    `).join('') + '</ul>'
                }
            </div>
        `;
    },

    initCharts(stats) {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};

        const catCanvas = document.getElementById('categoryChart');
        if (catCanvas && stats.category_distribution.length > 0) {
            this.charts.category = new Chart(catCanvas.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: stats.category_distribution.map(c => c.name),
                    datasets: [{
                        data: stats.category_distribution.map(c => c.count),
                        backgroundColor: stats.category_distribution.map(c => c.color || '#6366f1'),
                        borderWidth: 0,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 16, usePointStyle: true, font: { size: 12 } },
                        },
                    },
                },
            });
        }

        const topCanvas = document.getElementById('topChart');
        if (topCanvas && stats.top_prompts.length > 0) {
            const maxLen = Lang.current === 'zh' ? 10 : 15;
            this.charts.top = new Chart(topCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: stats.top_prompts.map(p => p.title.length > maxLen ? p.title.substring(0, maxLen) + '...' : p.title),
                    datasets: [{
                        label: Lang.t('dashTopChart'),
                        data: stats.top_prompts.map(p => p.usage_count),
                        backgroundColor: '#748ffc',
                        borderRadius: 6,
                        barThickness: 24,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
                    },
                },
            });
        }
    },
};
