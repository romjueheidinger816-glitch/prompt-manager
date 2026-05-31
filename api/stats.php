<?php
/**
 * ͳ�ƽӿڴ���
 */

$pdo = getDB();

// ����ʾ������
$totalStmt = $pdo->query("SELECT COUNT(*) FROM prompts WHERE is_deleted = 0");
$total = $totalStmt->fetchColumn();

// �����������ֲ�
$catStats = $pdo->query("
    SELECT c.name, c.color, COUNT(p.id) as count
    FROM categories c
    LEFT JOIN prompts p ON p.category_id = c.id AND p.is_deleted = 0
    GROUP BY c.id
    HAVING count > 0
    ORDER BY count DESC
")->fetchAll();

// ��õ� Top 10
$topPrompts = $pdo->query("
    SELECT p.id, p.title, p.usage_count, c.name as category_name
    FROM prompts p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_deleted = 0 AND p.usage_count > 0
    ORDER BY p.usage_count DESC
    LIMIT 10
")->fetchAll();

// ���ʹ�ü�¼�����20����
$recentLogs = $pdo->query("
    SELECT ul.used_at, ul.variables_used, p.title as prompt_title, p.id as prompt_id
    FROM usage_logs ul
    JOIN prompts p ON ul.prompt_id = p.id
    ORDER BY ul.used_at DESC
    LIMIT 20
")->fetchAll();

// ����ʹ�ô���
$weekStart = date('Y-m-d 00:00:00', strtotime('monday this week'));
$weekStmt = $pdo->prepare("SELECT COUNT(*) FROM usage_logs WHERE used_at >= ?");
$weekStmt->execute([$weekStart]);
$weekUsage = $weekStmt->fetchColumn();

// �ղ�����
$favStmt = $pdo->query("SELECT COUNT(*) FROM prompts WHERE is_favorite = 1 AND is_deleted = 0");
$favCount = $favStmt->fetchColumn();

// ��ǩ����
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
