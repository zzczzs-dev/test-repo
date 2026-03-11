-- 今天吃什么 - 数据库建表脚本
-- 支持 SQLite 数据库

-- ============================================
-- 分类表
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化默认分类
INSERT INTO categories (name) VALUES 
    ('主食'),
    ('荤菜'),
    ('素菜'),
    ('小吃');

-- ============================================
-- 菜品表
-- ============================================
CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(name, category_id)
);

-- 初始化默认主食
INSERT INTO dishes (name, category_id) VALUES 
    ('米饭', 1), ('面条', 1), ('馒头', 1), ('粥', 1), ('饺子', 1),
    ('包子', 1), ('烙饼', 1), ('粉丝', 1), ('方便面', 1), ('炒饭', 1),
    ('盖浇饭', 1), ('寿司', 1);

-- 初始化默认荤菜
INSERT INTO dishes (name, category_id) VALUES 
    ('宫保鸡丁', 2), ('鱼香肉丝', 2), ('糖醋排骨', 2), ('红烧肉', 2),
    ('水煮鱼', 2), ('清蒸鲈鱼', 2), ('可乐鸡翅', 2), ('青椒肉丝', 2),
    ('梅菜扣肉', 2), ('回锅肉', 2), ('酸菜鱼', 2), ('红烧鱼', 2),
    ('白切鸡', 2), ('烤鸭', 2), ('排骨汤', 2), ('鸡汤', 2), ('牛肉', 2);

-- 初始化默认素菜
INSERT INTO dishes (name, category_id) VALUES 
    ('麻婆豆腐', 3), ('蒜蓉西兰花', 3), ('清炒时蔬', 3), ('番茄鸡蛋', 3),
    ('酸辣土豆丝', 3), ('干煸四季豆', 3), ('炒青菜', 3), ('凉拌黄瓜', 3),
    ('炒豆芽', 3), ('香菇青菜', 3), ('蒜蓉生菜', 3);

-- 初始化默认小吃
INSERT INTO dishes (name, category_id) VALUES 
    ('寿司', 4), ('披萨', 4), ('汉堡', 4), ('沙拉', 4), ('炸鸡', 4),
    ('薯条', 4), ('三明治', 4), ('肉夹馍', 4), ('煎饼果子', 4), ('鸡蛋灌饼', 4);

-- ============================================
-- 推荐历史表
-- ============================================
CREATE TABLE IF NOT EXISTS recommend_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dishes TEXT NOT NULL,
    recommend_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 用户设置表
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化默认设置
INSERT INTO user_settings (setting_key, setting_value) VALUES 
    ('selected_categories', '["主食","荤菜"]'),
    ('taboo_input', '');

-- ============================================
-- 视图：菜品完整信息
-- ============================================
CREATE VIEW IF NOT EXISTS v_dishes AS
SELECT 
    d.id,
    d.name AS dish_name,
    c.name AS category_name,
    d.created_at
FROM dishes d
JOIN categories c ON d.category_id = c.id
ORDER BY c.name, d.name;

-- ============================================
-- 查询示例
-- ============================================

-- 查询所有分类
-- SELECT * FROM categories;

-- 查询所有菜品（带分类）
-- SELECT * FROM v_dishes;

-- 按分类查询菜品
-- SELECT * FROM dishes WHERE category_id = 1;

-- 查询推荐历史（最近10条）
-- SELECT * FROM recommend_history ORDER BY recommend_date DESC LIMIT 10;

-- 获取用户选中的分类
-- SELECT setting_value FROM user_settings WHERE setting_key = 'selected_categories';
