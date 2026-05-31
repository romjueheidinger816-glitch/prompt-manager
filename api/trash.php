<?php
/**
 * 回收站接口处理
 */

$pdo = getDB();
$method = getMethod();
$segments = getPathSegments('/api/');
$id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
$subAction = $segments[2] ?? null;

switch ($method) {
    case 'GET':
        // 获取回收站列表
        $stmt = $pdo->query("
            SELECT p.*, c.name as category_name
            FROM prompts p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_deleted = 1
            ORDER BY p.deleted_at DESC
        ");
        jsonSuccess($stmt->fetchAll());
        break;

    case 'POST':
        if (!$id) jsonError('缺少 ID');
        if ($subAction === 'restore') {
            $pdo->prepare("UPDATE prompts SET is_deleted = 0, deleted_at = NULL WHERE id = ? AND is_deleted = 1")
                ->execute([$id]);
            jsonSuccess(null, '已恢复');
        }
        jsonError('未知操作');
        break;

    case 'DELETE':
        if (!$id) jsonError('缺少 ID');
        if ($subAction === 'permanent') {
            // 彻底删除（关联数据通过外键级联删除）
            $pdo->prepare("DELETE FROM prompts WHERE id = ? AND is_deleted = 1")->execute([$id]);
            jsonSuccess(null, '已彻底删除');
        }
        jsonError('未知操作');
        break;

    default:
        jsonError('不支持的请求方法', 405);
}
