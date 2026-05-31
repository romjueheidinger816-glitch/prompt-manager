<?php
/**
 * ���ݿ������ļ�
 * �޸Ĵ��ļ���������Ļ���
 */

// ���ݿ�����: 'sqlite' �� 'mysql'
define('DB_TYPE', 'sqlite');

// SQLite ���ݿ��ļ�·��
define('DB_PATH', __DIR__ . '/../data/prompts.db');

// MySQL ���ã����� DB_TYPE = 'mysql' ʱ��Ч��
define('DB_HOST', 'localhost');
define('DB_NAME', 'prompt_manager');
define('DB_USER', 'root');
define('DB_PASS', '');

// ʱ��
date_default_timezone_set('Asia/Shanghai');

// ���󱨸棨����������رգ�
error_reporting(E_ALL);
ini_set('display_errors', 0);
