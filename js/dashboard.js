/**
 * 仪表盘 / 数据统计
 */

const Dashboard = {
    charts: {},

    async render() {
        const container = document.getElementById('contentBody');
        container.innerHTML = '<div class="dashboard" id="dashboardContent"><p style="color:var(--text-tertiary)">加载中...</p></div>';

        try {
            const stats = await StatsAPI.get();
            const el = document.getElementById('dashboardContent');
            el.innerHTML = this.buildHTML(stats);
            this.initCharts(stats);
        } catch (e) {
            container.innerHTML = '<div class="empty-state"><p>加载统计数据失败</p></div>';
        }
    },

    buildHTML(stats) {
        return `
            <!-- 统计卡片 -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--accent-light);color:var(--accent);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm-6 6h4v4H4v-4zm6 0h4v4h-4v-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.total_prompts}</div>
                    <div class="stat-label">总提示词</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--warning-light);color:var(--warning);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.favorite_count}</div>
                    <div class="stat-label">已收藏</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--success-light);color:var(--success);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.tag_count}</div>
                    <div class="stat-label">标签数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:var(--danger-light);color:var(--danger);">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="stat-value">${stats.week_usage}</div>
                    <div class="stat-label">本周使用</div>
                </div>
            </div>

            <!-- 图表 -->
            <div class="chart-section">
                <div class="chart-card">
                    <h4>分类分布</h4>
                    <div class="chart-wrapper"><canvas id="categoryChart"></canvas></div>
                </div>
                <div class="chart-card">
                    <h4>Top 10 最常用提示词</h4>
                    <div class="chart-wrapper"><canvas id="topChart"></canvas></div>
                </div>
            </div>

            <!-- 最近使用 -->
            <div class="chart-card">
                <h4>最近使用记录</h4>
                ${stats.recent_usage.length === 0
                    ? '<p style="color:var(--text-tertiary);font-size:0.9rem;">暂无使用记录</p>'
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
        // 销毁旧图表
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};

        // 分类分布饼图
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

        // Top 10 柱状图
        const topCanvas = document.getElementById('topChart');
        if (topCanvas && stats.top_prompts.length > 0) {
            this.charts.top = new Chart(topCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: stats.top_prompts.map(p => p.title.length > 12 ? p.title.substring(0, 12) + '...' : p.title),
                    datasets: [{
                        label: '使用次数',
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
