<?php
/**
 * ���ݿ��������ʼ��
 * �״�����ʱ�Զ����������ʾ������
 */

require_once __DIR__ . '/config.php';

/**
 * ��ȡ���ݿ����ӣ�������
 */
function getDB() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    if (DB_TYPE === 'sqlite') {
        $dir = dirname(DB_PATH);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        try {
            $pdo = new PDO('sqlite:' . DB_PATH);
            $pdo->exec('PRAGMA journal_mode=WAL');
            $pdo->exec('PRAGMA foreign_keys=ON');
        } catch (PDOException $e) {
            throw new Exception('SQLite connection failed: ' . $e->getMessage() . ' (Path: ' . DB_PATH . ')');
        }
    } else {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            throw new Exception('MySQL connection failed: ' . $e->getMessage());
        }
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

/**
 * �����Ƿ���ڣ��������򽨱���������
 */
function initDatabase() {
    $pdo = getDB();

    // ����Ƿ��ѳ�ʼ��
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM categories");
        if ($stmt->fetchColumn() > 0) return; // �������ݣ�����
    } catch (Exception $e) {
        // ������ڣ���������
    }

    // ������
    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        color VARCHAR(7) DEFAULT '#6366f1',
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category_id INTEGER DEFAULT NULL,
        is_favorite INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (prompt_id, tag_id),
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id INTEGER NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        variables_used TEXT DEFAULT NULL,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    )");

    // ���ʾ������
    seedData($pdo);
}

/**
 * ���Ԥ����ࡢ��ǩ��ʾ����ʾ��
 */
function seedData($pdo) {
    // Ԥ����ࣨ���ӷ��ࣩ
    $categories = [
        ['д��', '#6366f1', 1],
        ['���', '#10b981', 2],
        ['����', '#f59e0b', 3],
        ['����', '#ef4444', 4],
        ['����', '#8b5cf6', 5],
    ];
    foreach ($categories as $c) {
        $pdo->prepare("INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)")
            ->execute($c);
    }

    // �ӷ���
    $subCategories = [
        ['����д��', 1, '#818cf8', 1],
        ['�ʼ�׫д', 1, '#a78bfa', 2],
        ['Python', 2, '#34d399', 1],
        ['JavaScript', 2, '#6ee7b7', 2],
        ['SQL', 2, '#a7f3d0', 3],
    ];
    foreach ($subCategories as $sc) {
        $pdo->prepare("INSERT INTO categories (name, parent_id, color, sort_order) VALUES (?, ?, ?, ?)")
            ->execute($sc);
    }

    // Ԥ���ǩ
    $tags = ['GPT', 'Claude', 'ͨ��', '��Ч', 'ģ��', '�ճ�', '����', 'ѧϰ', '����д��', '��������'];
    foreach ($tags as $t) {
        $pdo->prepare("INSERT INTO tags (name) VALUES (?)")->execute([$t]);
    }

    // ʾ����ʾ��
    $prompts = [
        ['����д������', '�����дһƪ����{{topic|�˹�����}}�����¡�\n\nҪ��\n- Ŀ����ߣ�{{audience|����������}}\n- ������Լ{{word_count|1000}}��\n- ���{{style|רҵ���׶�}}\n- �������ԡ����ĺ��ܽ�', 7, 1],
        ['�������ר��', '���������{{language|Python}}���룬�����½Ƕȸ������飺\n\n1. ���������Ϳɶ���\n2. �����Ż�\n3. ��ȫ����\n4. ���ʵ��\n\n�������£�\n```{{language|Python}}\n{{code}}\n```', 3, 1],
        ['Ӣ�ķ����', '�뽫�������ķ���Ϊ{{target_language|Ӣ��}}��Ҫ��\n- ����ԭ�������ͷ��\n- ʹ�õص��ı�﷽ʽ\n- ����רҵ�������ע\n\nԭ�ģ�\n{{text}}', 4, 0],
        ['���ݷ�������', '������������ݲ����ɱ��棺\n\n����������{{data_description}}\n����Ŀ�꣺{{goal|�ҳ��ؼ�����}}\n\n�������\n1. ���ݸ���\n2. �ؼ�����\n3. ���Ʒ���\n4. �����ж�', 5, 0],
        ['����ͷ�Է籩', '��Χ��{{topic}}���д���ͷ�Է籩��\n\nĿ�����ڣ�{{audience|�����û�}}\n����������{{count|10}}��\n�������ͣ�{{type|Ӫ������}}\n\nÿ����������������⡢����������������', 6, 1],
        ['Python ��������', '���дһ��{{language|Python}}�����������������£�\n\n���ܣ�{{description}}\n���������{{params}}\n����ֵ��{{return_value}}\n\nҪ��\n- �������ע��\n- ���� docstring\n- ��ӱ�Ҫ���쳣����\n- ��д��Ӧ�ĵ�Ԫ����', 9, 0],
        ['SQL ��ѯ�Ż�', '���Ż����� SQL ��ѯ��\n\n```sql\n{{sql_query}}\n```\n\n��ṹ������{{table_description}}\n����������{{data_size|����}}\n\n���ṩ��\n1. �Ż���� SQL\n2. ������ӵ�����\n3. ���ܶԱȷ���', 11, 0],
        ['�ʼ��ظ�ģ��', '����һظ������ʼ���\n\n�յ����ʼ���\n{{received_email}}\n\n�ظ�������{{tone|רҵ�Ѻ�}}\n�ؼ��㣺{{key_points}}\n\n��ȷ���ظ����塢��ࡢ�������', 8, 1],
        ['Bug ���ר��', '������������ Bug��\n\n������Ϣ��\n{{error_message}}\n\n��ش��룺\n```\n{{code}}\n```\n\n���л�����{{environment|Node.js 18}}\n\n���ṩ��\n1. ����ԭ�����\n2. �޸�����\n3. Ԥ����ʩ', 3, 0],
        ['API �ĵ�����', '��Ϊ���� API �����ĵ���\n\n�˵㣺{{endpoint}}\n������{{method|GET}}\n������{{description}}\n\n�������\n- ��������������ͺͱ���˵����\n- ��Ӧ��ʽ����ʾ����\n- ������˵��\n- ʹ��ʾ����curl ���', 3, 0],
        ['ѧϰ�ƻ��ƶ�', '��Ϊ���ƶ�һ��{{subject}}ѧϰ�ƻ���\n\n��ǰˮƽ��{{level|��ѧ��}}\nĿ��ˮƽ��{{target|�м�}}\n����ʱ�䣺{{duration|30��}}\nÿ���Ͷ�룺{{daily_hours|2Сʱ}}\n\n�����ÿ��ѧϰ���ݺ���ϰ����', 12, 0],
        ['������ʽ����', '������ƥ�����¹����������ʽ��\n\n����������{{description}}\nĿ�����ԣ�{{language|JavaScript}}\n\n���ṩ��\n1. ������ʽ\n2. ��ν���\n3. ����������ƥ��Ͳ�ƥ������ӣ�', 4, 0],
    ];

    foreach ($prompts as $p) {
        $stmt = $pdo->prepare("INSERT INTO prompts (title, content, category_id, is_favorite) VALUES (?, ?, ?, ?)");
        $stmt->execute($p);
        $promptId = $pdo->lastInsertId();

        // ��ÿ����ʾ�ʷ��� 2-3 ����ǩ
        $tagCount = rand(2, 3);
        $tagIds = range(1, count($tags));
        shuffle($tagIds);
        $tagIds = array_slice($tagIds, 0, $tagCount);
        foreach ($tagIds as $tid) {
            $pdo->prepare("INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)")
                ->execute([$promptId, $tid]);
        }
    }
}
