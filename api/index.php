<?php
/**
 * API Router
 */

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/helpers.php';

// Init database and clean trash
try {
    initDatabase();
    autoCleanTrash(getDB());
} catch (Exception $e) {
    jsonError('Database error: ' . $e->getMessage(), 500);
}

// Parse route
$segments = getPathSegments('/api/');

// Health check: GET /api/
if (empty($segments)) {
    jsonSuccess([
        'status' => 'ok',
        'version' => '1.0.0',
        'php' => phpversion(),
        'endpoints' => ['prompts', 'categories', 'tags', 'export', 'import', 'trash', 'stats'],
    ]);
}

$resource = $segments[0];

$handlers = [
    'prompts'    => __DIR__ . '/prompts.php',
    'categories' => __DIR__ . '/categories.php',
    'tags'       => __DIR__ . '/tags.php',
    'export'     => __DIR__ . '/export.php',
    'import'     => __DIR__ . '/import.php',
    'trash'      => __DIR__ . '/trash.php',
    'stats'      => __DIR__ . '/stats.php',
];

if (isset($handlers[$resource]) && file_exists($handlers[$resource])) {
    require $handlers[$resource];
} else {
    jsonError('Endpoint not found: ' . $resource, 404);
}
