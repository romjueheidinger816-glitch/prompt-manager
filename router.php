<?php
/**
 * PHP built-in server router
 * Usage: php -S 0.0.0.0:8080 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API requests б· api/index.php
if (strpos($uri, '/api/') === 0 || $uri === '/api') {
    require __DIR__ . '/api/index.php';
    return true;
}

// Static files бк let the built-in server handle
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    return false;
}

// SPA fallback бк serve index.html
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
return true;
