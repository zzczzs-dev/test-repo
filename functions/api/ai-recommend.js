const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

const SYSTEM_PROMPT_DISH = `你是"今天吃什么"小程序的智能菜品推荐助手。你的主要任务是根据用户忌口和现有菜品库，随机推荐菜品库中没有的新菜品。

## 角色定义
- 你是一位专业的中餐营养师
- 你推荐菜品时考虑营养均衡、荤素搭配
- 你给出的建议实用且接地气

## 行为约束
1. 【重要】每次推荐必须完全不同，严禁重复之前推荐过的菜品
2. 推荐时要覆盖所有分类，每个分类至少推荐1道
3. 每次推荐4-6道菜品，确保涵盖所有分类
4. 推荐时考虑早餐/午餐/晚餐的不同需求
5. 保持回答简洁，每道推荐不超过30字
6. 不要推荐用户忌口的食材
7. 【关键】发挥创意，推荐多样化、有特色的菜品，不要总是推荐常见菜品

## 输出格式
请按以下 Markdown 格式输出（不要有其他内容）：

### 推荐菜品

1. **菜品名** [分类]
   - 推荐理由

2. **菜品名** [分类]
   - 推荐理由

注意：必须包含至少3道菜品！

## 注意事项
- 分类必须是现有分类，不能使用新分类
- 推荐理由要简短实用
- 必须推荐菜品库中不存在的菜品

`;

function buildDishRecommendPrompt(dishesData, taboo, mealTime) {
    const categories = Object.keys(dishesData);
    const existingDishes = categories
        .map(category => {
            const dishes = dishesData[category] || [];
            return `${category}：${dishes.length > 0 ? dishes.join('、') : '（暂无菜品）'}`;
        })
        .join('\n');

    return `## 现有分类（必须全部覆盖）：${categories.join('、')}

## 现有菜品库（这些菜品已存在，请勿推荐）：
${existingDishes}

## 用户忌口：${taboo || '无'}
## 用餐时间：${mealTime}

## 任务
请为上述每个分类各推荐1-2道【菜品库中不存在】的新菜品。
必须覆盖全部 ${categories.length} 个分类！
`;
}

export async function onRequest(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, error: '仅支持 POST 请求' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    try {
        const { dishesData, taboo, mealTime } = await context.request.json();

        if (!dishesData || Object.keys(dishesData).length === 0) {
            return new Response(JSON.stringify({ success: false, error: '缺少菜品数据' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        const apiKey = context.env.DEEPSEEK_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ success: false, error: 'API Key 未配置' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        const existingDishesSet = new Set();
        Object.values(dishesData).forEach(dishes => {
            dishes.forEach(dish => existingDishesSet.add(dish));
        });

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT_DISH },
            { role: 'user', content: buildDishRecommendPrompt(dishesData, taboo, mealTime) }
        ];

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: messages,
                temperature: 1.0,
                max_tokens: 800,
                top_p: 0.9
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API error:', response.status, errorText);
            return new Response(JSON.stringify({ success: false, error: 'AI 服务调用失败' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            const content = data.choices[0].message.content;

            const dishRegex = /\d+\.\s+\*\*([^\*]+)\*\*\s*\[([^\]]+)\]\s*[-–]\s*([^\n]+)/g;
            let dishes = [];
            let match;

            while ((match = dishRegex.exec(content)) !== null) {
                dishes.push({
                    name: match[1].trim(),
                    category: match[2].trim(),
                    reason: match[3].trim()
                });
            }

            if (dishes.length === 0) {
                return new Response(JSON.stringify({ success: false, error: 'AI 返回格式异常' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            dishes = dishes.filter(dish => !existingDishesSet.has(dish.name));

            return new Response(JSON.stringify({ success: true, data: { dishes } }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: 'AI 响应格式异常' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    } catch (error) {
        console.error('AI recommend error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}