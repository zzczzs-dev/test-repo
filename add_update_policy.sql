-- 在 Supabase SQL 编辑器中执行此脚本
-- 以添加更新推荐历史的权限策略

-- 添加 UPDATE 策略
CREATE POLICY "Public can update history" ON public.recommend_history 
FOR UPDATE USING (true) WITH CHECK (true);
