<?php
/**
 * 导入接口处理
 */

$pdo = getDB();
$method = getMethod();

if ($method !== 'POST') jsonError('仅支持 POST 请求', 405);

$input = getJsonInput();
if (empty($input['prompts']) || !is_array($input['prompts'])) {
    jsonError('无效的导入数据，需要 prompts 数组');
}

$imported = 0;
$skipped = 0;

foreach ($input['prompts'] as $item) {
    if (empty($item['title']) || empty($item['content'])) {
        $skipped++;
        continue;
    }

    // 检查是否已存在同名提示词
    $check = $pdo->prepare("SELECT id FROM prompts WHERE title = ? AND is_deleted = 0");
    $check->execute([$item['title']]);
    if ($check->fetch()) {
        $skipped++;
        continue;
    }

    // 查找或创建分类
    $categoryId = null;
    if (!empty($item['category'])) {
        $catStmt = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
        $catStmt->execute([$item['category']]);
        $cat = $catStmt->fetch();
        if ($cat) {
            $categoryId = $cat['id'];
        } else {
            $pdo->prepare("INSERT INTO categories (name, created_at) VALUES (?, ?)")
                ->execute([$item['category'], now()]);
            $categoryId = $pdo->lastInsertId();
        }
    }

    // 插入提示词
    $stmt = $pdo->prepare("INSERT INTO prompts (title, content, category_id, is_favorite, usage_count, created_at, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $item['title'],
        $item['content'],
        $categoryId,
        $item['is_favorite'] ?? 0,
        $item['usage_count'] ?? 0,
        $item['created_at'] ?? now(),
        $item['updated_at'] ?? now(),
    ]);
    $promptId = $pdo->lastInsertId();

    // 处理标签
    if (!empty($item['tags']) && is_array($item['tags'])) {
        foreach ($item['tags'] as $tagName) {
            $tagName = trim($tagName);
            if (empty($tagName)) continue;
            $pdo->prepare("INSERT OR IGNORE INTO tags (name, created_at) VALUES (?, ?)")->execute([$tagName, now()]);
            $tagId = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
            $tagId->execute([$tagName]);
            $tid = $tagId->fetchColumn();
            if ($tid) {
                $pdo->prepare("INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)")
                    ->execute([$promptId, $tid]);
            }
        }
    }

    $imported++;
}

jsonSuccess(['imported' => $imported, 'skipped' => $skipped], "导入完成：成功 $imported 条，跳过 $skipped 条");
