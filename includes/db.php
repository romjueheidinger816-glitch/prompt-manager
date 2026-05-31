<?php
/**
 * 数据库连接与初始化
 * 首次运行时自动建表并插入示例数据
 */

require_once __DIR__ . '/config.php';

/**
 * 获取数据库连接（单例）
 */
function getDB() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    if (DB_TYPE === 'sqlite') {
        $dir = dirname(DB_PATH);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->exec('PRAGMA journal_mode=WAL');
        $pdo->exec('PRAGMA foreign_keys=ON');
    } else {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

/**
 * 检查表是否存在，不存在则建表并填充数据
 */
function initDatabase() {
    $pdo = getDB();

    // 检查是否已初始化
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM categories");
        if ($stmt->fetchColumn() > 0) return; // 已有数据，跳过
    } catch (Exception $e) {
        // 表不存在，继续创建
    }

    // 创建表
    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        color VARCHAR(7) DEFAULT '#6366f1',
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category_id INTEGER DEFAULT NULL,
        is_favorite INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (prompt_id, tag_id),
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id INTEGER NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        variables_used TEXT DEFAULT NULL,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    )");

    // 填充示例数据
    seedData($pdo);
}

/**
 * 填充预设分类、标签和示例提示词
 */
function seedData($pdo) {
    // 预设分类（含子分类）
    $categories = [
        ['写作', '#6366f1', 1],
        ['编程', '#10b981', 2],
        ['翻译', '#f59e0b', 3],
        ['分析', '#ef4444', 4],
        ['创意', '#8b5cf6', 5],
    ];
    foreach ($categories as $c) {
        $pdo->prepare("INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)")
            ->execute($c);
    }

    // 子分类
    $subCategories = [
        ['文章写作', 1, '#818cf8', 1],
        ['邮件撰写', 1, '#a78bfa', 2],
        ['Python', 2, '#34d399', 1],
        ['JavaScript', 2, '#6ee7b7', 2],
        ['SQL', 2, '#a7f3d0', 3],
    ];
    foreach ($subCategories as $sc) {
        $pdo->prepare("INSERT INTO categories (name, parent_id, color, sort_order) VALUES (?, ?, ?, ?)")
            ->execute($sc);
    }

    // 预设标签
    $tags = ['GPT', 'Claude', '通用', '高效', '模板', '日常', '工作', '学习', '创意写作', '代码生成'];
    foreach ($tags as $t) {
        $pdo->prepare("INSERT INTO tags (name) VALUES (?)")->execute([$t]);
    }

    // 示例提示词
    $prompts = [
        ['文章写作助手', '请帮我写一篇关于{{topic|人工智能}}的文章。\n\n要求：\n- 目标读者：{{audience|技术爱好者}}\n- 字数：约{{word_count|1000}}字\n- 风格：{{style|专业但易懂}}\n- 包含引言、正文和总结', 7, 1],
        ['代码审查专家', '请审查以下{{language|Python}}代码，从以下角度给出建议：\n\n1. 代码质量和可读性\n2. 性能优化\n3. 安全隐患\n4. 最佳实践\n\n代码如下：\n```{{language|Python}}\n{{code}}\n```', 3, 1],
        ['英文翻译官', '请将以下中文翻译为{{target_language|英文}}，要求：\n- 保持原文语气和风格\n- 使用地道的表达方式\n- 如有专业术语请标注\n\n原文：\n{{text}}', 4, 0],
        ['数据分析报告', '请分析以下数据并生成报告：\n\n数据描述：{{data_description}}\n分析目标：{{goal|找出关键趋势}}\n\n请包含：\n1. 数据概览\n2. 关键发现\n3. 趋势分析\n4. 建议行动', 5, 0],
        ['创意头脑风暴', '请围绕{{topic}}进行创意头脑风暴：\n\n目标受众：{{audience|年轻用户}}\n创意数量：{{count|10}}个\n创意类型：{{type|营销方案}}\n\n每个创意请包含：标题、简述、可行性评估', 6, 1],
        ['Python 函数生成', '请编写一个{{language|Python}}函数，功能描述如下：\n\n功能：{{description}}\n输入参数：{{params}}\n返回值：{{return_value}}\n\n要求：\n- 添加类型注解\n- 包含 docstring\n- 添加必要的异常处理\n- 编写对应的单元测试', 9, 0],
        ['SQL 查询优化', '请优化以下 SQL 查询：\n\n```sql\n{{sql_query}}\n```\n\n表结构描述：{{table_description}}\n数据量级：{{data_size|百万级}}\n\n请提供：\n1. 优化后的 SQL\n2. 建议添加的索引\n3. 性能对比分析', 11, 0],
        ['邮件回复模板', '请帮我回复以下邮件：\n\n收到的邮件：\n{{received_email}}\n\n回复语气：{{tone|专业友好}}\n关键点：{{key_points}}\n\n请确保回复得体、简洁、有条理。', 8, 1],
        ['Bug 诊断专家', '请帮我诊断以下 Bug：\n\n错误信息：\n{{error_message}}\n\n相关代码：\n```\n{{code}}\n```\n\n运行环境：{{environment|Node.js 18}}\n\n请提供：\n1. 错误原因分析\n2. 修复方案\n3. 预防措施', 3, 0],
        ['API 文档生成', '请为以下 API 生成文档：\n\n端点：{{endpoint}}\n方法：{{method|GET}}\n描述：{{description}}\n\n请包含：\n- 请求参数（含类型和必填说明）\n- 响应格式（含示例）\n- 错误码说明\n- 使用示例（curl 命令）', 3, 0],
        ['学习计划制定', '请为我制定一份{{subject}}学习计划：\n\n当前水平：{{level|初学者}}\n目标水平：{{target|中级}}\n可用时间：{{duration|30天}}\n每天可投入：{{daily_hours|2小时}}\n\n请包含每日学习内容和练习任务。', 12, 0],
        ['正则表达式生成', '请生成匹配以下规则的正则表达式：\n\n规则描述：{{description}}\n目标语言：{{language|JavaScript}}\n\n请提供：\n1. 正则表达式\n2. 逐段解释\n3. 测试用例（匹配和不匹配的例子）', 4, 0],
    ];

    foreach ($prompts as $p) {
        $stmt = $pdo->prepare("INSERT INTO prompts (title, content, category_id, is_favorite) VALUES (?, ?, ?, ?)");
        $stmt->execute($p);
        $promptId = $pdo->lastInsertId();

        // 给每个提示词分配 2-3 个标签
        $tagCount = rand(2, 3);
        $tagIds = range(1, count($tags));
        shuffle($tagIds);
        $tagIds = array_slice($tagIds, 0, $tagCount);
        foreach ($tagIds as $tid) {
            $pdo->prepare("INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)")
                ->execute([$promptId, $tid]);
        }
    }
}
