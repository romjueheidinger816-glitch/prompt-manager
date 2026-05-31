<?php
/**
 * ��ʾ�ʽӿڴ���
 * GET    /api/prompts          - �б�
 * GET    /api/prompts/{id}     - ����
 * POST   /api/prompts          - ����
 * PUT    /api/prompts/{id}     - ����
 * DELETE /api/prompts/{id}     - ��ɾ��
 * POST   /api/prompts/{id}/use     - ��¼ʹ��
 * GET    /api/prompts/favorites    - �ղ��б�
 * POST   /api/prompts/{id}/favorite - �л��ղ�
 */

$pdo = getDB();
$method = getMethod();
$segments = getPathSegments('/api/');
// segments[0] = 'prompts', segments[1] = id or 'favorites', segments[2] = action

$action = $segments[1] ?? null;
$subAction = $segments[2] ?? null;

// ����·����/api/prompts/favorites
if ($action === 'favorites' && $method === 'GET') {
    $stmt = $pdo->prepare("
        SELECT p.*, c.name as category_name, c.color as category_color,
               GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.id) as tag_ids
        FROM prompts p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.is_favorite = 1 AND p.is_deleted = 0
        GROUP BY p.id
        ORDER BY p.updated_at DESC
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['tags'] = parseTags($row);
    }
    jsonSuccess($rows);
}

// ���²�����Ҫ���� id
$id = is_numeric($action) ? (int)$action : null;

switch ($method) {
    case 'GET':
        if ($id) {
            // ��ȡ��������
            $stmt = $pdo->prepare("
                SELECT p.*, c.name as category_name, c.color as category_color,
                       GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.id) as tag_ids
                FROM prompts p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
                LEFT JOIN tags t ON pt.tag_id = t.id
                WHERE p.id = ? AND p.is_deleted = 0
                GROUP BY p.id
            ");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonError('��ʾ�ʲ�����', 404);
            $row['tags'] = parseTags($row);
            jsonSuccess($row);
        } else {
            // �б��ѯ����������ɸѡ������
            $search   = getParam('search');
            $category = getParam('category');
            $tag      = getParam('tag');
            $sort     = getParam('sort', 'updated_at');
            $order    = getParam('order', 'DESC');
            $page     = max(1, (int)getParam('page', 1));
            $perPage  = min(100, max(1, (int)getParam('per_page', 50)));

            $where = ["p.is_deleted = 0"];
            $params = [];

            if ($search) {
                $where[] = "(p.title LIKE ? OR p.content LIKE ? OR EXISTS (
                    SELECT 1 FROM prompt_tags pt2 JOIN tags t2 ON pt2.tag_id = t2.id
                    WHERE pt2.prompt_id = p.id AND t2.name LIKE ?
                ))";
                $s = "%$search%";
                $params = array_merge($params, [$s, $s, $s]);
            }

            if ($category) {
                $where[] = "p.category_id = ?";
                $params[] = $category;
            }

            if ($tag) {
                $tagIds = explode(',', $tag);
                $placeholders = implode(',', array_fill(0, count($tagIds), '?'));
                $where[] = "EXISTS (
                    SELECT 1 FROM prompt_tags pt3 WHERE pt3.prompt_id = p.id AND pt3.tag_id IN ($placeholders)
                )";
                $params = array_merge($params, $tagIds);
            }

            $allowedSorts = ['created_at', 'updated_at', 'usage_count', 'title'];
            if (!in_array($sort, $allowedSorts)) $sort = 'updated_at';
            $order = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';

            $offset = ($page - 1) * $perPage;
            $whereSQL = implode(' AND ', $where);

            // ����
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM prompts p WHERE $whereSQL");
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            // ����
            $sql = "
                SELECT p.*, c.name as category_name, c.color as category_color,
                       GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.id) as tag_ids
                FROM prompts p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
                LEFT JOIN tags t ON pt.tag_id = t.id
                WHERE $whereSQL
                GROUP BY p.id
                ORDER BY p.$sort $order
                LIMIT $perPage OFFSET $offset
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            foreach ($rows as &$row) {
                $row['tags'] = parseTags($row);
            }

            jsonSuccess([
                'items' => $rows,
                'total' => (int)$total,
                'page' => $page,
                'per_page' => $perPage,
                'pages' => ceil($total / $perPage),
            ]);
        }
        break;

    case 'POST':
        if ($id && $subAction === 'use') {
            // ��¼ʹ��
            $pdo->prepare("UPDATE prompts SET usage_count = usage_count + 1 WHERE id = ? AND is_deleted = 0")
                ->execute([$id]);
            $input = getJsonInput();
            $pdo->prepare("INSERT INTO usage_logs (prompt_id, variables_used) VALUES (?, ?)")
                ->execute([$id, isset($input['variables']) ? json_encode($input['variables'], JSON_UNESCAPED_UNICODE) : null]);
            jsonSuccess(null, '�Ѽ�¼ʹ��');
        }

        if ($id && $subAction === 'favorite') {
            // �л��ղ�
            $stmt = $pdo->prepare("SELECT is_favorite FROM prompts WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonError('��ʾ�ʲ�����', 404);
            $newVal = $row['is_favorite'] ? 0 : 1;
            $pdo->prepare("UPDATE prompts SET is_favorite = ? WHERE id = ?")->execute([$newVal, $id]);
            jsonSuccess(['is_favorite' => $newVal], $newVal ? '���ղ�' : '��ȡ���ղ�');
        }

        // ������ʾ��
        $input = getJsonInput();
        if (empty($input['title'])) jsonError('���ⲻ��Ϊ��');
        if (empty($input['content'])) jsonError('���ݲ���Ϊ��');

        $stmt = $pdo->prepare("INSERT INTO prompts (title, content, category_id, is_favorite, created_at, updated_at)
                               VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['title'],
            $input['content'],
            $input['category_id'] ?? null,
            $input['is_favorite'] ?? 0,
            now(),
            now(),
        ]);
        $newId = $pdo->lastInsertId();

        // �����ǩ����
        if (!empty($input['tags']) && is_array($input['tags'])) {
            savePromptTags($pdo, $newId, $input['tags']);
        }

        jsonSuccess(['id' => $newId], '�����ɹ�');
        break;

    case 'PUT':
        if (!$id) jsonError('ȱ�� ID');
        $input = getJsonInput();
        if (empty($input['title'])) jsonError('���ⲻ��Ϊ��');
        if (empty($input['content'])) jsonError('���ݲ���Ϊ��');

        $stmt = $pdo->prepare("UPDATE prompts SET title=?, content=?, category_id=?, is_favorite=?, updated_at=? WHERE id=? AND is_deleted=0");
        $stmt->execute([
            $input['title'],
            $input['content'],
            $input['category_id'] ?? null,
            $input['is_favorite'] ?? 0,
            now(),
            $id,
        ]);

        // ���±�ǩ
        if (isset($input['tags']) && is_array($input['tags'])) {
            $pdo->prepare("DELETE FROM prompt_tags WHERE prompt_id = ?")->execute([$id]);
            savePromptTags($pdo, $id, $input['tags']);
        }

        jsonSuccess(null, '���³ɹ�');
        break;

    case 'DELETE':
        if (!$id) jsonError('ȱ�� ID');
        $pdo->prepare("UPDATE prompts SET is_deleted = 1, deleted_at = ? WHERE id = ?")
            ->execute([now(), $id]);
        jsonSuccess(null, '����������վ');
        break;

    default:
        jsonError('��֧�ֵ����󷽷�', 405);
}

/**
 * ������ǩ����
 */
function parseTags($row) {
    $tags = [];
    if (!empty($row['tag_names'])) {
        $names = explode(',', $row['tag_names']);
        $ids = explode(',', $row['tag_ids']);
        for ($i = 0; $i < count($names); $i++) {
            $tags[] = ['id' => (int)$ids[$i], 'name' => $names[$i]];
        }
    }
    return $tags;
}

/**
 * ������ʾ�ʱ�ǩ�������Զ������±�ǩ��
 */
function savePromptTags($pdo, $promptId, $tags) {
    foreach ($tags as $tag) {
        if (is_numeric($tag)) {
            // ���б�ǩ ID
            $pdo->prepare("INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)")
                ->execute([$promptId, (int)$tag]);
        } elseif (is_string($tag) && $tag !== '') {
            // ��ǩ�����Զ�����
            $pdo->prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)")->execute([$tag]);
            $tagId = $pdo->prepare("SELECT id FROM tags WHERE name = ?");
            $tagId->execute([$tag]);
            $tid = $tagId->fetchColumn();
            if ($tid) {
                $pdo->prepare("INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)")
                    ->execute([$promptId, $tid]);
            }
        } elseif (is_array($tag) && isset($tag['id'])) {
            $pdo->prepare("INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)")
                ->execute([$promptId, (int)$tag['id']]);
        }
    }
}
