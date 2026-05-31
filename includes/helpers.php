<?php
/**
 * 公共辅助函数
 */

/**
 * 发送 JSON 响应并终止
 */
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * 成功响应
 */
function jsonSuccess($data = null, $message = 'ok') {
    jsonResponse(['success' => true, 'data' => $data, 'message' => $message]);
}

/**
 * 错误响应
 */
function jsonError($message, $code = 400) {
    jsonResponse(['success' => false, 'data' => null, 'message' => $message], $code);
}

/**
 * 获取请求体 JSON（兼容 PUT/POST）
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

/**
 * 获取 GET 参数（带默认值）
 */
function getParam($key, $default = null) {
    return isset($_GET[$key]) && $_GET[$key] !== '' ? $_GET[$key] : $default;
}

/**
 * 获取路径片段（用于 REST 风格路由）
 * 例如 /api/prompts/5 → ['prompts', '5']
 */
function getPathSegments($prefix = '/api/') {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pos = strpos($uri, $prefix);
    if ($pos === false) return [];
    $rest = substr($uri, $pos + strlen($prefix));
    $rest = rtrim($rest, '/');
    return $rest === '' ? [] : explode('/', $rest);
}

/**
 * 获取 HTTP 方法
 */
function getMethod() {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}

/**
 * 当前时间字符串
 */
function now() {
    return date('Y-m-d H:i:s');
}

/**
 * 自动清理30天前回收站数据
 */
function autoCleanTrash($pdo) {
    $threshold = date('Y-m-d H:i:s', strtotime('-30 days'));
    $pdo->prepare("DELETE FROM prompts WHERE is_deleted = 1 AND deleted_at < ?")
        ->execute([$threshold]);
}
