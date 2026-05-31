<?php
/**
 * 导出接口处理
 */

$pdo = getDB();
$segments = getPathSegments('/api/');
$format = $segments[1] ?? 'json';

// 获取全部非删除的提示词（含标签）
$stmt = $pdo->query("
    SELECT p.*, c.name as category_name,
           GROUP_CONCAT(t.name) as tag_names
    FROM prompts p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.is_deleted = 0
    GROUP BY p.id
    ORDER BY p.category_id, p.title
");
$prompts = $stmt->fetchAll();

switch ($format) {
    case 'json':
        $export = [];
        foreach ($prompts as $p) {
            $export[] = [
                'title' => $p['title'],
                'content' => $p['content'],
                'category' => $p['category_name'] ?? '未分类',
                'tags' => $p['tag_names'] ? explode(',', $p['tag_names']) : [],
                'is_favorite' => (bool)$p['is_favorite'],
                'usage_count' => (int)$p['usage_count'],
                'created_at' => $p['created_at'],
                'updated_at' => $p['updated_at'],
            ];
        }
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="prompts_export_' . date('Ymd_His') . '.json"');
        echo json_encode(['version' => '1.0', 'exported_at' => now(), 'prompts' => $export], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        break;

    case 'markdown':
        $md = "# 提示词导出\n\n";
        $md .= "> 导出时间：" . now() . "\n\n";
        $currentCat = '';
        foreach ($prompts as $p) {
            $cat = $p['category_name'] ?? '未分类';
            if ($cat !== $currentCat) {
                $md .= "\n## $cat\n\n";
                $currentCat = $cat;
            }
            $md .= "### " . $p['title'] . "\n\n";
            if ($p['tag_names']) $md .= "**标签**: " . $p['tag_names'] . "\n\n";
            $md .= $p['content'] . "\n\n";
            $md .= "---\n\n";
        }
        header('Content-Type: text/markdown; charset=utf-8');
        header('Content-Disposition: attachment; filename="prompts_export_' . date('Ymd_His') . '.md"');
        echo $md;
        break;

    default:
        jsonError('不支持的导出格式: ' . $format);
}
