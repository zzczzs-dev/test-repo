-- ============================================
-- Supabase PostgreSQL 数据库建表脚本
-- 今天吃什么 - 菜品推荐应用
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 分类表 (categories)
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#667eea',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略：所有用户可读取，登录用户可修改
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert categories" ON public.categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update categories" ON public.categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete categories" ON public.categories
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- 2. 菜品表 (dishes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, category_id)
);

ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read dishes" ON public.dishes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert dishes" ON public.dishes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update dishes" ON public.dishes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete dishes" ON public.dishes
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- 3. 推荐历史表 (recommend_history)
-- ============================================
CREATE TABLE IF NOT EXISTS public.recommend_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_dishes JSONB NOT NULL DEFAULT '{}'::jsonb,
    selected_categories JSONB DEFAULT '[]'::jsonb,
    taboo_input TEXT DEFAULT '',
    recommend_date TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE public.recommend_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history" ON public.recommend_history
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can insert own history" ON public.recommend_history
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Users can delete own history" ON public.recommend_history
    FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- ============================================
-- 4. 用户设置表 (user_settings)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    selected_categories JSONB DEFAULT '["主食","荤菜"]'::jsonb,
    taboo_input TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 5. 匿名用户数据表 (anon_user_data) - 不登录用户使用
-- ============================================
CREATE TABLE IF NOT EXISTS public.anon_user_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anon_id UUID NOT NULL UNIQUE,
    categories_dishes JSONB DEFAULT '{}'::jsonb,
    recommend_history JSONB DEFAULT '[]'::jsonb,
    selected_categories JSONB DEFAULT '["主食","荤菜"]'::jsonb,
    taboo_input TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.anon_user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read anon data" ON public.anon_user_data
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert anon data" ON public.anon_user_data
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update anon data" ON public.anon_user_data
    FOR UPDATE USING (true);

-- ============================================
-- 索引优化
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dishes_category ON public.dishes(category_id);
CREATE INDEX IF NOT EXISTS idx_history_user_date ON public.recommend_history(user_id, recommend_date DESC);
CREATE INDEX IF NOT EXISTS idx_history_date ON public.recommend_history(recommend_date DESC);

-- ============================================
-- 函数：自动更新时间戳
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器
DROP TRIGGER IF EXISTS update_categories ON public.categories;
CREATE TRIGGER update_categories
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_dishes ON public.dishes;
CREATE TRIGGER update_dishes
    BEFORE UPDATE ON public.dishes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_settings ON public.user_settings;
CREATE TRIGGER update_user_settings
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 初始化默认数据
-- ============================================
INSERT INTO public.categories (name, color, sort_order) VALUES 
    ('主食', '#f6ad55', 1),
    ('荤菜', '#fc8181', 2),
    ('素菜', '#68d391', 3),
    ('小吃', '#63b3ed', 4)
ON CONFLICT (name) DO NOTHING;

-- 获取分类ID并插入菜品
DO $$
DECLARE
    cat_id UUID;
BEGIN
    -- 主食
    SELECT id INTO cat_id FROM public.categories WHERE name = '主食';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('米饭', cat_id), ('面条', cat_id), ('馒头', cat_id), ('粥', cat_id), ('饺子', cat_id),
        ('包子', cat_id), ('烙饼', cat_id), ('粉丝', cat_id), ('方便面', cat_id), ('炒饭', cat_id),
        ('盖浇饭', cat_id), ('寿司', cat_id)
    ON CONFLICT DO NOTHING;

    -- 荤菜
    SELECT id INTO cat_id FROM public.categories WHERE name = '荤菜';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('宫保鸡丁', cat_id), ('鱼香肉丝', cat_id), ('糖醋排骨', cat_id), ('红烧肉', cat_id),
        ('水煮鱼', cat_id), ('清蒸鲈鱼', cat_id), ('可乐鸡翅', cat_id), ('青椒肉丝', cat_id),
        ('梅菜扣肉', cat_id), ('回锅肉', cat_id), ('酸菜鱼', cat_id), ('红烧鱼', cat_id),
        ('白切鸡', cat_id), ('烤鸭', cat_id), ('排骨汤', cat_id), ('鸡汤', cat_id), ('牛肉', cat_id)
    ON CONFLICT DO NOTHING;

    -- 素菜
    SELECT id INTO cat_id FROM public.categories WHERE name = '素菜';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('麻婆豆腐', cat_id), ('蒜蓉西兰花', cat_id), ('清炒时蔬', cat_id), ('番茄鸡蛋', cat_id),
        ('酸辣土豆丝', cat_id), ('干煸四季豆', cat_id), ('炒青菜', cat_id), ('凉拌黄瓜', cat_id),
        ('炒豆芽', cat_id), ('香菇青菜', cat_id), ('蒜蓉生菜', cat_id)
    ON CONFLICT DO NOTHING;

    -- 小吃
    SELECT id INTO cat_id FROM public.categories WHERE name = '小吃';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('寿司', cat_id), ('披萨', cat_id), ('汉堡', cat_id), ('沙拉', cat_id), ('炸鸡', cat_id),
        ('薯条', cat_id), ('三明治', cat_id), ('肉夹馍', cat_id), ('煎饼果子', cat_id), ('鸡蛋灌饼', cat_id)
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 常用查询示例
-- ============================================

-- 查询所有分类
-- SELECT * FROM public.categories ORDER BY sort_order;

-- 查询所有菜品（带分类名）
-- SELECT d.id, d.name as dish_name, c.name as category_name, c.color as category_color
-- FROM public.dishes d
-- JOIN public.categories c ON d.category_id = c.id
-- WHERE d.is_active = true
-- ORDER BY c.sort_order, d.name;

-- 按分类查询菜品
-- SELECT * FROM public.dishes WHERE category_id = 'xxx' AND is_active = true;

-- 查询用户历史
-- SELECT * FROM public.recommend_history WHERE user_id = 'xxx' ORDER BY recommend_date DESC LIMIT 20;

-- 获取用户设置
-- SELECT * FROM public.user_settings WHERE user_id = 'xxx';
