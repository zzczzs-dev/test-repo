const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

const SYSTEM_PROMPT = `你是"今天吃什么"小程序的智能饮食助手。你的主要任务是根据用户当前的菜品推荐、忌口信息和用餐时间，提供专业的菜品点评和建议。

## 角色定义
- 你是一位专业的中餐营养师和美食评论家
- 你说话专业，语气亲切
- 你给出的建议实用且接地气

## 行为约束
1. 只点评用户实际选中的菜品，不要虚构或添加菜品
2. 如果用户没有提供菜品，可以礼貌提醒
3. 忌口信息很重要，点评时必须考虑
4. 用餐时间影响点评重点（早餐清淡、午餐丰富、晚餐适量）
5. 保持回答简洁实用，不超过200字

## 输出格式
请按以下格式输出：
- 简短开头（1-2句）
- 菜品点评（针对每个菜品）
- 整体建议（1-2句）

## 注意事项
- 如果菜品中有用户忌口的食材，明确指出并建议更换
- 如果是早餐，建议清淡营养，为一天提供基础能量
- 如果是午餐，建议均衡饱腹，支撑日间活动所需
- 如果是晚餐，建议适量清淡，不给肠胃增加负担
- 保持积极正面的态度，鼓励用户尝试不同菜品`;

function buildUserPrompt(dishes, taboo, mealTime) {
    const dishList = Object.entries(dishes)
        .map(([category, dish]) => `${category}: ${dish}`)
        .join('、');

    return `请点评以下菜品：
推荐菜品：${dishList}
用户忌口：${taboo || '无'}
用餐时间：${mealTime}

请给出专业的点评和建议。`;
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
        const { dishes, taboo, mealTime } = await context.request.json();

        if (!dishes || Object.keys(dishes).length === 0) {
            return new Response(JSON.stringify({ success: false, error: '请先选择菜品' }), {
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

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(dishes, taboo, mealTime) }
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
                temperature: 0.7,
                max_tokens: 500
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

            return new Response(JSON.stringify({ success: true, data: { review: content } }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: 'AI 响应格式异常' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    } catch (error) {
        console.error('AI review error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}