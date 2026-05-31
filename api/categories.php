<?php
/**
 * ����ӿڴ���
 */

$pdo = getDB();
$method = getMethod();
$segments = getPathSegments('/api/');
$id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;

switch ($method) {
    case 'GET':
        // ��ȡ����������ÿ���������ʾ��������
        $stmt = $pdo->query("
            SELECT c.*, COUNT(p.id) as prompt_count
            FROM categories c
            LEFT JOIN prompts p ON p.category_id = c.id AND p.is_deleted = 0
            GROUP BY c.id
            ORDER BY c.sort_order
        ");
        $all = $stmt->fetchAll();
        // �������νṹ
        $tree = buildTree($all);
        jsonSuccess($tree);
        break;

    case 'POST':
        $input = getJsonInput();
        if (empty($input['name'])) jsonError('�������Ʋ���Ϊ��');
        $stmt = $pdo->prepare("INSERT INTO categories (name, parent_id, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['name'],
            $input['parent_id'] ?? null,
            $input['color'] ?? '#6366f1',
            $input['sort_order'] ?? 0,
            now(),
        ]);
        jsonSuccess(['id' => $pdo->lastInsertId()], '�����ɹ�');
        break;

    case 'PUT':
        if (!$id) jsonError('ȱ�� ID');
        $input = getJsonInput();
        if (empty($input['name'])) jsonError('�������Ʋ���Ϊ��');
        $stmt = $pdo->prepare("UPDATE categories SET name=?, parent_id=?, color=?, sort_order=? WHERE id=?");
        $stmt->execute([
            $input['name'],
            $input['parent_id'] ?? null,
            $input['color'] ?? '#6366f1',
            $input['sort_order'] ?? 0,
            $id,
        ]);
        jsonSuccess(null, '���³ɹ�');
        break;

    case 'DELETE':
        if (!$id) jsonError('ȱ�� ID');
        // ���÷�������ʾ�ʵ� category_id �ÿ�
        $pdo->prepare("UPDATE prompts SET category_id = NULL WHERE category_id = ?")->execute([$id]);
        // ���ӷ���� parent_id �ÿ�
        $pdo->prepare("UPDATE categories SET parent_id = NULL WHERE parent_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
        jsonSuccess(null, 'ɾ���ɹ�');
        break;

    default:
        jsonError('��֧�ֵ����󷽷�', 405);
}

/**
 * �������η���ṹ
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
