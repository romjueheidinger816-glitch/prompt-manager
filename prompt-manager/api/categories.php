<?php
/**
 * 分类管理 API
 * GET    ?action=list     获取所有分类
 * POST   ?action=create   创建分类
 * PUT    ?action=update   更新分类
 * DELETE ?action=delete   删除分类
 */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();

    switch ($action) {
        case 'list':
            $stmt = $db->query("
                SELECT c.*, COUNT(p.id) as prompt_count 
                FROM categories c 
                LEFT JOIN prompts p ON p.category_id = c.id 
                GROUP BY c.id 
                ORDER BY c.name
            ");
            jsonResponse($stmt->fetchAll());
            break;

        case 'create':
            if ($method !== 'POST') jsonResponse(['error' => '方法不允许'], 405);
            $data = getRequestData();
            $name = trim($data['name'] ?? '');
            $color = $data['color'] ?? '#6366f1';
            if ($name === '') jsonResponse(['error' => '分类名称不能为空'], 400);

            $stmt = $db->prepare("INSERT INTO categories (name, color) VALUES (?, ?)");
            $stmt->execute([$name, $color]);
            jsonResponse(['id' => $db->lastInsertId(), 'name' => $name, 'color' => $color], 201);
            break;

        case 'update':
            if ($method !== 'PUT') jsonResponse(['error' => '方法不允许'], 405);
            $data = getRequestData();
            $id = intval($data['id'] ?? 0);
            $name = trim($data['name'] ?? '');
            $color = $data['color'] ?? '#6366f1';
            if (!$id || $name === '') jsonResponse(['error' => '参数不完整'], 400);

            $stmt = $db->prepare("UPDATE categories SET name = ?, color = ? WHERE id = ?");
            $stmt->execute([$name, $color, $id]);
            jsonResponse(['message' => '更新成功']);
            break;

        case 'delete':
            if ($method !== 'DELETE') jsonResponse(['error' => '方法不允许'], 405);
            $id = intval($_GET['id'] ?? 0);
            if (!$id) jsonResponse(['error' => '缺少分类ID'], 400);

            $stmt = $db->prepare("DELETE FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['message' => '删除成功']);
            break;

        default:
            jsonResponse(['error' => '未知操作'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}
