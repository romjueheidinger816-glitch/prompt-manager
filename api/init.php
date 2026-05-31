<?php
/**
 * 数据库初始化 - 创建表结构
 */
require_once __DIR__ . '/config.php';

try {
    $db = getDB();

    // 分类表
    $db->exec("
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT DEFAULT '#6366f1',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // 提示词表
    $db->exec("
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category_id INTEGER,
            tags TEXT DEFAULT '',
            rating INTEGER DEFAULT 0,
            usage_count INTEGER DEFAULT 0,
            is_favorite INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
    ");

    // 全文搜索索引
    $db->exec("
        CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
            title, content, tags, notes,
            content='prompts',
            content_rowid='id'
        )
    ");

    // 触发器：插入时同步 FTS
    $db->exec("
        CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
            INSERT INTO prompts_fts(rowid, title, content, tags, notes)
            VALUES (new.id, new.title, new.content, new.tags, new.notes);
        END
    ");

    // 触发器：更新时同步 FTS
    $db->exec("
        CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
            INSERT INTO prompts_fts(prompts_fts, rowid, title, content, tags, notes)
            VALUES ('delete', old.id, old.title, old.content, old.tags, old.notes);
            INSERT INTO prompts_fts(rowid, title, content, tags, notes)
            VALUES (new.id, new.title, new.content, new.tags, new.notes);
        END
    ");

    // 触发器：删除时同步 FTS
    $db->exec("
        CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
            INSERT INTO prompts_fts(prompts_fts, rowid, title, content, tags, notes)
            VALUES ('delete', old.id, old.title, old.content, old.tags, old.notes);
        END
    ");

    // 插入默认分类
    $defaultCategories = [
        ['写作助手', '#6366f1'],
        ['编程开发', '#10b981'],
        ['数据分析', '#f59e0b'],
        ['创意设计', '#ec4899'],
        ['翻译语言', '#3b82f6'],
        ['商务办公', '#8b5cf6'],
        ['学习教育', '#06b6d4'],
        ['其他', '#6b7280'],
    ];

    $stmt = $db->prepare("INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)");
    foreach ($defaultCategories as $cat) {
        $stmt->execute($cat);
    }

    jsonResponse(['message' => '数据库初始化成功']);

} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}
