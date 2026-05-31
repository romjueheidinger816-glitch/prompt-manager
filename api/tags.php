<?php
/**
 * 标签接口处理
 */

$pdo = getDB();
$method = getMethod();
$segments = getPathSegments('/api/');
$id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("
            SELECT t.*, COUNT(pt.prompt_id) as prompt_count
            FROM tags t
            LEFT JOIN prompt_tags pt ON t.id = pt.tag_id
            LEFT JOIN prompts p ON pt.prompt_id = p.id AND p.is_deleted = 0
            GROUP BY t.id
            ORDER BY t.name
        ");
        jsonSuccess($stmt->fetchAll());
        break;

    case 'POST':
        $input = getJsonInput();
        if (empty($input['name'])) jsonError('标签名不能为空');
        $input['name'] = trim($input['name']);
        // 检查重复
        $check = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
        $check->execute([$input['name']]);
        if ($check->fetch()) jsonError('标签已存在');
        $pdo->prepare("INSERT INTO tags (name, created_at) VALUES (?, ?)")
            ->execute([$input['name'], now()]);
        jsonSuccess(['id' => $pdo->lastInsertId()], '创建成功');
        break;

    case 'DELETE':
        if (!$id) jsonError('缺少 ID');
        $pdo->prepare("DELETE FROM prompt_tags WHERE tag_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM tags WHERE id = ?")->execute([$id]);
        jsonSuccess(null, '删除成功');
        break;

    default:
        jsonError('不支持的请求方法', 405);
}
