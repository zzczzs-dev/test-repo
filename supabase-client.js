// ============================================
// Supabase 客户端配置
// 今天吃什么 - 菜品推荐应用
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://qweysxweaycvsujyrhnp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZXlzeHdlYXljdnN1anlyaG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NjQ5NDksImV4cCI6MjA4ODQ0MDk0OX0.-n02Kix05b5iLT_5gXieDpVjvpcmFso8isDSErGFA04'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// API 函数封装
// ============================================

// 分类相关
export const categoryApi = {
  // 获取所有分类
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
    if (error) throw error
    return data
  },

  // 创建分类
  async create(name, color = '#667eea') {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, color }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 删除分类
  async delete(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// 菜品相关
export const dishApi = {
  // 获取所有菜品
  async getAll() {
    const { data, error } = await supabase
      .from('dishes')
      .select('*, categories(name, color)')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data
  },

  // 按分类获取菜品
  async getByCategory(categoryId) {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data
  },

  // 添加菜品
  async create(name, categoryId) {
    const { data, error } = await supabase
      .from('dishes')
      .insert([{ name, category_id: categoryId }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 删除菜品
  async delete(id) {
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

// 推荐历史相关
export const historyApi = {
  // 获取历史记录
  async getHistory(userId, limit = 20) {
    const { data, error } = await supabase
      .from('recommend_history')
      .select('*')
      .eq('user_id', userId)
      .order('recommend_date', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  // 保存推荐结果
  async save(userId, selectedCategories, recommendedDishes, tabooInput = '') {
    const { data, error } = await supabase
      .from('recommend_history')
      .insert([{
        user_id: userId,
        selected_categories: selectedCategories,
        recommended_dishes: recommendedDishes,
        taboo_input: tabooInput
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 清空历史
  async clearHistory(userId) {
    const { error } = await supabase
      .from('recommend_history')
      .delete()
      .eq('user_id', userId)
    if (error) throw error
  }
}

// 用户设置相关
export const settingsApi = {
  // 获取用户设置
  async get(userId) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows returned
    return data
  },

  // 保存用户设置
  async save(userId, settings) {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// 匿名用户相关（不登录用户使用）
export const anonApi = {
  // 获取或创建匿名用户数据
  async getOrCreate(anonId) {
    // 先尝试获取
    const { data: existing } = await supabase
      .from('anon_user_data')
      .select('*')
      .eq('anon_id', anonId)
      .single()

    if (existing) return existing

    // 不存在则创建
    const { data, error } = await supabase
      .from('anon_user_data')
      .insert([{
        anon_id: anonId,
        categories_dishes: {},
        recommend_history: [],
        selected_categories: ['主食', '荤菜'],
        taboo_input: ''
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  // 更新匿名用户数据
  async update(anonId, updates) {
    const { data, error } = await supabase
      .from('anon_user_data')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('anon_id', anonId)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ============================================
// 使用示例
// ============================================

/*
// 1. 获取分类列表
const categories = await categoryApi.getAll()

// 2. 获取所有菜品
const dishes = await dishApi.getAll()

// 3. 按分类分组
const dishesByCategory = dishes.reduce((acc, dish) => {
  const catName = dish.categories.name
  if (!acc[catName]) acc[catName] = []
  acc[catName].push(dish)
  return acc
}, {})

// 4. 保存推荐结果到历史
await historyApi.save(userId, ['主食', '荤菜'], { '主食': '炒饭', '荤菜': '红烧肉' }, '辣')

// 5. 获取历史记录
const history = await historyApi.getHistory(userId)
*/
