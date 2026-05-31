<?php
/**
 * API 入口 / 路由器
 * 根据请求路径分发到对应的处理文件
 */

// CORS 头（开发环境）
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';

// 初始化数据库
initDatabase();
autoCleanTrash(getDB());

// 解析路由
$segments = getPathSegments('/api/');
if (empty($segments)) {
    jsonSuccess(['version' => '1.0.0', 'endpoints' => ['prompts', 'categories', 'tags', 'export', 'import', 'trash', 'stats']]);
}

$resource = $segments[0];

$handlers = [
    'prompts'     => __DIR__ . '/prompts.php',
    'categories'  => __DIR__ . '/categories.php',
    'tags'        => __DIR__ . '/tags.php',
    'export'      => __DIR__ . '/export.php',
    'import'      => __DIR__ . '/import.php',
    'trash'       => __DIR__ . '/trash.php',
    'stats'       => __DIR__ . '/stats.php',
];

if (isset($handlers[$resource])) {
    require $handlers[$resource];
} else {
    jsonError('接口不存在: ' . $resource, 404);
}
