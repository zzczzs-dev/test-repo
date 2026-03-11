-- ============================================
-- 今天吃什么 - Supabase 数据库初始化脚本
-- 使用方法：在 Supabase SQL 编辑器中执行
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 分类表
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#667eea',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 策略
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Public can delete categories" ON public.categories FOR DELETE USING (true);

-- ============================================
-- 2. 菜品表
-- ============================================
CREATE TABLE IF NOT EXISTS public.dishes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, category_id)
);

ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read dishes" ON public.dishes FOR SELECT USING (true);
CREATE POLICY "Public can insert dishes" ON public.dishes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update dishes" ON public.dishes FOR UPDATE USING (true);
CREATE POLICY "Public can delete dishes" ON public.dishes FOR DELETE USING (true);

-- ============================================
-- 3. 推荐历史表
-- ============================================
CREATE TABLE IF NOT EXISTS public.recommend_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anon_id UUID,
    selected_categories JSONB DEFAULT '[]'::jsonb,
    recommended_dishes JSONB DEFAULT '{}'::jsonb,
    taboo_input TEXT DEFAULT '',
    recommend_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recommend_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read history" ON public.recommend_history FOR SELECT USING (true);
CREATE POLICY "Public can insert history" ON public.recommend_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete history" ON public.recommend_history FOR DELETE USING (true);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_dishes_category ON public.dishes(category_id);
CREATE INDEX IF NOT EXISTS idx_history_date ON public.recommend_history(recommend_date DESC);

-- ============================================
-- 初始化默认分类
-- ============================================
INSERT INTO public.categories (name, color, sort_order) VALUES 
    ('主食', '#f6ad55', 1),
    ('荤菜', '#fc8181', 2),
    ('素菜', '#68d391', 3),
    ('小吃', '#63b3ed', 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 初始化默认菜品
-- ============================================
DO $$
DECLARE cat_uuid UUID;
BEGIN
    -- 主食
    SELECT id INTO cat_uuid FROM public.categories WHERE name = '主食';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('米饭', cat_uuid), ('面条', cat_uuid), ('馒头', cat_uuid), ('粥', cat_uuid), ('饺子', cat_uuid),
        ('包子', cat_uuid), ('烙饼', cat_uuid), ('粉丝', cat_uuid), ('方便面', cat_uuid), ('炒饭', cat_uuid),
        ('盖浇饭', cat_uuid), ('寿司', cat_uuid)
    ON CONFLICT DO NOTHING;

    -- 荤菜
    SELECT id INTO cat_uuid FROM public.categories WHERE name = '荤菜';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('宫保鸡丁', cat_uuid), ('鱼香肉丝', cat_uuid), ('糖醋排骨', cat_uuid), ('红烧肉', cat_uuid),
        ('水煮鱼', cat_uuid), ('清蒸鲈鱼', cat_uuid), ('可乐鸡翅', cat_uuid), ('青椒肉丝', cat_uuid),
        ('梅菜扣肉', cat_uuid), ('回锅肉', cat_uuid), ('酸菜鱼', cat_uuid), ('红烧鱼', cat_uuid),
        ('白切鸡', cat_uuid), ('烤鸭', cat_uuid), ('排骨汤', cat_uuid), ('鸡汤', cat_uuid), ('牛肉', cat_uuid)
    ON CONFLICT DO NOTHING;

    -- 素菜
    SELECT id INTO cat_uuid FROM public.categories WHERE name = '素菜';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('麻婆豆腐', cat_uuid), ('蒜蓉西兰花', cat_uuid), ('清炒时蔬', cat_uuid), ('番茄鸡蛋', cat_uuid),
        ('酸辣土豆丝', cat_uuid), ('干煸四季豆', cat_uuid), ('炒青菜', cat_uuid), ('凉拌黄瓜', cat_uuid),
        ('炒豆芽', cat_uuid), ('香菇青菜', cat_uuid), ('蒜蓉生菜', cat_uuid)
    ON CONFLICT DO NOTHING;

    -- 小吃
    SELECT id INTO cat_uuid FROM public.categories WHERE name = '小吃';
    INSERT INTO public.dishes (name, category_id) VALUES 
        ('寿司', cat_uuid), ('披萨', cat_uuid), ('汉堡', cat_uuid), ('沙拉', cat_uuid), ('炸鸡', cat_uuid),
        ('薯条', cat_uuid), ('三明治', cat_uuid), ('肉夹馍', cat_uuid), ('煎饼果子', cat_uuid), ('鸡蛋灌饼', cat_uuid)
    ON CONFLICT DO NOTHING;
END $$;
