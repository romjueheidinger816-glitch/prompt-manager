<?php
/**
 * ������������
 */

/**
 * ���� JSON ��Ӧ����ֹ
 */
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * �ɹ���Ӧ
 */
function jsonSuccess($data = null, $message = 'ok') {
    jsonResponse(['success' => true, 'data' => $data, 'message' => $message]);
}

/**
 * ������Ӧ
 */
function jsonError($message, $code = 400) {
    jsonResponse(['success' => false, 'data' => null, 'message' => $message], $code);
}

/**
 * ��ȡ������ JSON������ PUT/POST��
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

/**
 * ��ȡ GET ��������Ĭ��ֵ��
 */
function getParam($key, $default = null) {
    return isset($_GET[$key]) && $_GET[$key] !== '' ? $_GET[$key] : $default;
}

/**
 * ��ȡ·��Ƭ�Σ����� REST ���·�ɣ�
 * ���� /api/prompts/5 �� ['prompts', '5']
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
 * ��ȡ HTTP ����
 */
function getMethod() {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}

/**
 * ��ǰʱ���ַ���
 */
function now() {
    return date('Y-m-d H:i:s');
}

/**
 * �Զ�����30��ǰ����վ����
 */
function autoCleanTrash($pdo) {
    $threshold = date('Y-m-d H:i:s', strtotime('-30 days'));
    $pdo->prepare("DELETE FROM prompts WHERE is_deleted = 1 AND deleted_at < ?")
        ->execute([$threshold]);
}
