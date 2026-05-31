<?php
/**
 * PHP 内置服务器路由
 * php -S 0.0.0.0:8080 router.php
 *
 * 将所有请求正确分发：
 * - /api/* → api/index.php
 * - 其他路径 → 返回对应静态文件，找不到则返回 index.html
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API 请求
if (strpos($uri, '/api/') === 0 || $uri === '/api') {
    require __DIR__ . '/api/index.php';
    return true;
}

// 静态文件
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    // 设置正确的 Content-Type
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
    ];
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext] . '; charset=utf-8');
    }
    return false; // 让内置服务器处理静态文件
}

// 所有其他路由返回 index.html（SPA）
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
return true;
