<?php
/**
 * ��ǩ�ӿڴ���
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
        if (empty($input['name'])) jsonError('��ǩ������Ϊ��');
        $input['name'] = trim($input['name']);
        // ����ظ�
        $check = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
        $check->execute([$input['name']]);
        if ($check->fetch()) jsonError('��ǩ�Ѵ���');
        $pdo->prepare("INSERT INTO tags (name, created_at) VALUES (?, ?)")
            ->execute([$input['name'], now()]);
        jsonSuccess(['id' => $pdo->lastInsertId()], '�����ɹ�');
        break;

    case 'DELETE':
        if (!$id) jsonError('ȱ�� ID');
        $pdo->prepare("DELETE FROM prompt_tags WHERE tag_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM tags WHERE id = ?")->execute([$id]);
        jsonSuccess(null, 'ɾ���ɹ�');
        break;

    default:
        jsonError('��֧�ֵ����󷽷�', 405);
}
