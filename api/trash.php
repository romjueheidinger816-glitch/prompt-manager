<?php
/**
 * ����վ�ӿڴ���
 */

$pdo = getDB();
$method = getMethod();
$segments = getPathSegments('/api/');
$id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
$subAction = $segments[2] ?? null;

switch ($method) {
    case 'GET':
        // ��ȡ����վ�б�
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
        if (!$id) jsonError('ȱ�� ID');
        if ($subAction === 'restore') {
            $pdo->prepare("UPDATE prompts SET is_deleted = 0, deleted_at = NULL WHERE id = ? AND is_deleted = 1")
                ->execute([$id]);
            jsonSuccess(null, '�ѻָ�');
        }
        jsonError('δ֪����');
        break;

    case 'DELETE':
        if (!$id) jsonError('ȱ�� ID');
        if ($subAction === 'permanent') {
            // ����ɾ������������ͨ���������ɾ����
            $pdo->prepare("DELETE FROM prompts WHERE id = ? AND is_deleted = 1")->execute([$id]);
            jsonSuccess(null, '�ѳ���ɾ��');
        }
        jsonError('δ֪����');
        break;

    default:
        jsonError('��֧�ֵ����󷽷�', 405);
}
