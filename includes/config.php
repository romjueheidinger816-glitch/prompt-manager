<?php
/**
 * 数据库配置文件
 * 修改此文件以适配你的环境
 */

// 数据库类型: 'sqlite' 或 'mysql'
define('DB_TYPE', 'sqlite');

// SQLite 数据库文件路径
define('DB_PATH', __DIR__ . '/../data/prompts.db');

// MySQL 配置（仅当 DB_TYPE = 'mysql' 时生效）
define('DB_HOST', 'localhost');
define('DB_NAME', 'prompt_manager');
define('DB_USER', 'root');
define('DB_PASS', '');

// 时区
date_default_timezone_set('Asia/Shanghai');

// 错误报告（生产环境请关闭）
error_reporting(E_ALL);
ini_set('display_errors', 0);
