<?php
/**
 * 分类接口处理
 */

$pdo = getDB();
$method = getMethod();
$segments = getPathSegments('/api/');
$id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;

switch ($method) {
    case 'GET':
        // 获取分类树（含每个分类的提示词数量）
        $stmt = $pdo->query("
            SELECT c.*, COUNT(p.id) as prompt_count
            FROM categories c
            LEFT JOIN prompts p ON p.category_id = c.id AND p.is_deleted = 0
            GROUP BY c.id
            ORDER BY c.sort_order
        ");
        $all = $stmt->fetchAll();
        // 构建树形结构
        $tree = buildTree($all);
        jsonSuccess($tree);
        break;

    case 'POST':
        $input = getJsonInput();
        if (empty($input['name'])) jsonError('分类名称不能为空');
        $stmt = $pdo->prepare("INSERT INTO categories (name, parent_id, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['name'],
            $input['parent_id'] ?? null,
            $input['color'] ?? '#6366f1',
            $input['sort_order'] ?? 0,
            now(),
        ]);
        jsonSuccess(['id' => $pdo->lastInsertId()], '创建成功');
        break;

    case 'PUT':
        if (!$id) jsonError('缺少 ID');
        $input = getJsonInput();
        if (empty($input['name'])) jsonError('分类名称不能为空');
        $stmt = $pdo->prepare("UPDATE categories SET name=?, parent_id=?, color=?, sort_order=? WHERE id=?");
        $stmt->execute([
            $input['name'],
            $input['parent_id'] ?? null,
            $input['color'] ?? '#6366f1',
            $input['sort_order'] ?? 0,
            $id,
        ]);
        jsonSuccess(null, '更新成功');
        break;

    case 'DELETE':
        if (!$id) jsonError('缺少 ID');
        // 将该分类下提示词的 category_id 置空
        $pdo->prepare("UPDATE prompts SET category_id = NULL WHERE category_id = ?")->execute([$id]);
        // 将子分类的 parent_id 置空
        $pdo->prepare("UPDATE categories SET parent_id = NULL WHERE parent_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
        jsonSuccess(null, '删除成功');
        break;

    default:
        jsonError('不支持的请求方法', 405);
}

/**
 * 构建树形分类结构
 */
function buildTree($items, $parentId = null) {
    $tree = [];
    foreach ($items as $item) {
        if ($item['parent_id'] == $parentId) {
            $children = buildTree($items, $item['id']);
            $item['children'] = $children;
            $tree[] = $item;
        }
    }
    return $tree;
}
