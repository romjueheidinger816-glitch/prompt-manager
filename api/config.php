<?php
/**
 * 数据库配置与连接
 */
define('DB_PATH', __DIR__ . '/data/prompts.db');

function getDB() {
    $dir = dirname(DB_PATH);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // 启用 WAL 模式提升并发性能
    $db->exec('PRAGMA journal_mode=WAL');
    return $db;
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getRequestData() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}
