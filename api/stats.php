<?php
/**
 * 统计接口处理
 */

$pdo = getDB();

// 总提示词数量
$totalStmt = $pdo->query("SELECT COUNT(*) FROM prompts WHERE is_deleted = 0");
$total = $totalStmt->fetchColumn();

// 各分类数量分布
$catStats = $pdo->query("
    SELECT c.name, c.color, COUNT(p.id) as count
    FROM categories c
    LEFT JOIN prompts p ON p.category_id = c.id AND p.is_deleted = 0
    GROUP BY c.id
    HAVING count > 0
    ORDER BY count DESC
")->fetchAll();

// 最常用的 Top 10
$topPrompts = $pdo->query("
    SELECT p.id, p.title, p.usage_count, c.name as category_name
    FROM prompts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_deleted = 0 AND p.usage_count > 0
    ORDER BY p.usage_count DESC
    LIMIT 10
")->fetchAll();

// 最近使用记录（最近20条）
$recentLogs = $pdo->query("
    SELECT ul.used_at, ul.variables_used, p.title as prompt_title, p.id as prompt_id
    FROM usage_logs ul
    JOIN prompts p ON ul.prompt_id = p.id
    ORDER BY ul.used_at DESC
    LIMIT 20
")->fetchAll();

// 本周使用次数
$weekStart = date('Y-m-d 00:00:00', strtotime('monday this week'));
$weekStmt = $pdo->prepare("SELECT COUNT(*) FROM usage_logs WHERE used_at >= ?");
$weekStmt->execute([$weekStart]);
$weekUsage = $weekStmt->fetchColumn();

// 收藏数量
$favStmt = $pdo->query("SELECT COUNT(*) FROM prompts WHERE is_favorite = 1 AND is_deleted = 0");
$favCount = $favStmt->fetchColumn();

// 标签数量
$tagStmt = $pdo->query("SELECT COUNT(*) FROM tags");
$tagCount = $tagStmt->fetchColumn();

jsonSuccess([
    'total_prompts' => (int)$total,
    'favorite_count' => (int)$favCount,
    'tag_count' => (int)$tagCount,
    'week_usage' => (int)$weekUsage,
    'category_distribution' => $catStats,
    'top_prompts' => $topPrompts,
    'recent_usage' => $recentLogs,
]);
