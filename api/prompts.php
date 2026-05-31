<?php
/**
 * 提示词 CRUD API
 * GET    ?action=list      获取列表（支持搜索、筛选、分页）
 * GET    ?action=get       获取单条
 * POST   ?action=create    创建
 * PUT    ?action=update    更新
 * DELETE ?action=delete    删除
 * PUT    ?action=rate      评分
 * PUT    ?action=favorite  收藏/取消
 * PUT    ?action=use       记录使用次数
 * GET    ?action=stats     统计数据
 * GET    ?action=export    导出所有数据
 */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = getDB();

    switch ($action) {

        // ===== 列表查询 =====
        case 'list':
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(100, max(1, intval($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;
            $category_id = intval($_GET['category_id'] ?? 0);
            $search = trim($_GET['search'] ?? '');
            $sort = $_GET['sort'] ?? 'updated_at';
            $order = ($_GET['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
            $favorite = intval($_GET['favorite'] ?? 0);
            $tag = trim($_GET['tag'] ?? '');

            $allowedSorts = ['created_at', 'updated_at', 'rating', 'usage_count', 'title'];
            if (!in_array($sort, $allowedSorts)) $sort = 'updated_at';

            $where = [];
            $params = [];

            if ($search) {
                // 使用 FTS5 全文搜索
                $where[] = "p.id IN (SELECT rowid FROM prompts_fts WHERE prompts_fts MATCH ?)";
                $params[] = $search . '*';
            }

            if ($category_id) {
                $where[] = "p.category_id = ?";
                $params[] = $category_id;
            }

            if ($favorite) {
                $where[] = "p.is_favorite = 1";
            }

            if ($tag) {
                $where[] = "p.tags LIKE ?";
                $params[] = '%' . $tag . '%';
            }

            $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

            // 总数
            $countSql = "SELECT COUNT(*) FROM prompts p $whereClause";
            $countStmt = $db->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            // 数据
            $sql = "
                SELECT p.*, c.name as category_name, c.color as category_color
                FROM prompts p
                LEFT JOIN categories c ON c.id = p.category_id
                $whereClause
                ORDER BY $sort $order
                LIMIT ? OFFSET ?
            ";
            $params[] = $limit;
            $params[] = $offset;
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            jsonResponse([
                'data' => $stmt->fetchAll(),
                'total' => $total,
                'page' => $page,
                'pages' => ceil($total / $limit),
            ]);
            break;

        // ===== 获取单条 =====
        case 'get':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) jsonResponse(['error' => '缺少ID'], 400);

            $stmt = $db->prepare("
                SELECT p.*, c.name as category_name, c.color as category_color
                FROM prompts p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.id = ?
            ");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonResponse(['error' => '未找到'], 404);
            jsonResponse($row);
            break;

        // ===== 创建 =====
        case 'create':
            if ($method !== 'POST') jsonResponse(['error' => '方法不允许'], 405);
            $data = getRequestData();
            $title = trim($data['title'] ?? '');
            $content = trim($data['content'] ?? '');
            if ($title === '' || $content === '') {
                jsonResponse(['error' => '标题和内容不能为空'], 400);
            }

            $stmt = $db->prepare("
                INSERT INTO prompts (title, content, category_id, tags, notes)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $title,
                $content,
                $data['category_id'] ?: null,
                trim($data['tags'] ?? ''),
                trim($data['notes'] ?? ''),
            ]);

            $newId = $db->lastInsertId();
            // 获取完整记录返回
            $stmt = $db->prepare("SELECT * FROM prompts WHERE id = ?");
            $stmt->execute([$newId]);
            jsonResponse($stmt->fetch(), 201);
            break;

        // ===== 更新 =====
        case 'update':
            if ($method !== 'PUT') jsonResponse(['error' => '方法不允许'], 405);
            $data = getRequestData();
            $id = intval($data['id'] ?? 0);
            $title = trim($data['title'] ?? '');
            $content = trim($data['content'] ?? '');
            if (!$id || $title === '' || $content === '') {
                jsonResponse(['error' => '参数不完整'], 400);
            }

            $stmt = $db->prepare("
                UPDATE prompts SET
                    title = ?, content = ?, category_id = ?, tags = ?, notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([
                $title,
                $content,
                $data['category_id'] ?: null,
                trim($data['tags'] ?? ''),
                trim($data['notes'] ?? ''),
                $id,
            ]);
            jsonResponse(['message' => '更新成功']);
            break;

        // ===== 删除 =====
        case 'delete':
            if ($method !== 'DELETE') jsonResponse(['error' => '方法不允许'], 405);
            $id = intval($_GET['id'] ?? 0);
            if (!$id) jsonResponse(['error' => '缺少ID'], 400);

            $stmt = $db->prepare("DELETE FROM prompts WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['message' => '删除成功']);
            break;

        // ===== 评分 =====
        case 'rate':
            if ($method !== 'PUT') jsonResponse(['error' => '方法不允许'], 405);
            $data = getRequestData();
            $id = intval($data['id'] ?? 0);
            $rating = max(0, min(5, intval($data['rating'] ?? 0)));
            if (!$id) jsonResponse(['error' => '缺少ID'], 400);

            $stmt = $db->prepare("UPDATE prompts SET rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$rating, $id]);
            jsonResponse(['message' => '评分已更新', 'rating' => $rating]);
            break;

        // ===== 收藏 =====
        case 'favorite':
            if ($method !== 'PUT') jsonResponse(['error' => '方法不允许'], 405);
            $data = getRequestData();
            $id = intval($data['id'] ?? 0);
            if (!$id) jsonResponse(['error' => '缺少ID'], 400);

            $stmt = $db->prepare("UPDATE prompts SET is_favorite = 1 - is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$id]);
            $stmt = $db->prepare("SELECT is_favorite FROM prompts WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse($stmt->fetch());
            break;

        // ===== 使用计数 =====
        case 'use':
            if ($method !== 'PUT') jsonResponse(['error' => '方法不允许'], 405);
            $data = getRequestData();
            $id = intval($data['id'] ?? 0);
            if (!$id) jsonResponse(['error' => '缺少ID'], 400);

            $stmt = $db->prepare("UPDATE prompts SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['message' => '已记录']);
            break;

        // ===== 统计 =====
        case 'stats':
            $total = $db->query("SELECT COUNT(*) FROM prompts")->fetchColumn();
            $favorites = $db->query("SELECT COUNT(*) FROM prompts WHERE is_favorite = 1")->fetchColumn();
            $totalUsage = $db->query("SELECT COALESCE(SUM(usage_count), 0) FROM prompts")->fetchColumn();
            $avgRating = $db->query("SELECT COALESCE(AVG(rating), 0) FROM prompts WHERE rating > 0")->fetchColumn();
            $topRated = $db->query("
                SELECT p.id, p.title, p.rating, p.usage_count, c.name as category_name, c.color as category_color
                FROM prompts p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.rating > 0
                ORDER BY p.rating DESC, p.usage_count DESC
                LIMIT 5
            ")->fetchAll();
            $mostUsed = $db->query("
                SELECT p.id, p.title, p.rating, p.usage_count, c.name as category_name, c.color as category_color
                FROM prompts p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.usage_count > 0
                ORDER BY p.usage_count DESC
                LIMIT 5
            ")->fetchAll();
            $recentTags = $db->query("
                SELECT DISTINCT tags FROM prompts WHERE tags != '' ORDER BY updated_at DESC LIMIT 20
            ")->fetchAll(PDO::FETCH_COLUMN);

            // 解析所有标签
            $allTags = [];
            foreach ($recentTags as $tagStr) {
                foreach (explode(',', $tagStr) as $t) {
                    $t = trim($t);
                    if ($t !== '') $allTags[$t] = ($allTags[$t] ?? 0) + 1;
                }
            }
            arsort($allTags);

            $categoryStats = $db->query("
                SELECT c.id, c.name, c.color, COUNT(p.id) as count
                FROM categories c
                LEFT JOIN prompts p ON p.category_id = c.id
                GROUP BY c.id
                ORDER BY count DESC
            ")->fetchAll();

            jsonResponse([
                'total' => $total,
                'favorites' => $favorites,
                'totalUsage' => intval($totalUsage),
                'avgRating' => round(floatval($avgRating), 1),
                'topRated' => $topRated,
                'mostUsed' => $mostUsed,
                'tags' => array_slice($allTags, 0, 20, true),
                'categoryStats' => $categoryStats,
            ]);
            break;

        // ===== 导出 =====
        case 'export':
            $stmt = $db->query("
                SELECT p.*, c.name as category_name
                FROM prompts p
                LEFT JOIN categories c ON c.id = p.category_id
                ORDER BY p.category_id, p.title
            ");
            $prompts = $stmt->fetchAll();

            $cats = $db->query("SELECT * FROM categories ORDER BY name")->fetchAll();

            header('Content-Type: application/json; charset=utf-8');
            header('Content-Disposition: attachment; filename="prompts_export_' . date('Ymd') . '.json"');
            echo json_encode([
                'exported_at' => date('c'),
                'categories' => $cats,
                'prompts' => $prompts,
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;

        default:
            jsonResponse(['error' => '未知操作'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}
