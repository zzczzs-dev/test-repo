const axios = require('axios');

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

const SYSTEM_PROMPT_DISH = `你是"今天吃什么"小程序的智能菜品推荐助手。你的主要任务是根据用户忌口和现有菜品库，推荐菜品库中没有的新菜品。

## 角色定义
- 你是一位专业的中餐营养师
- 你推荐菜品时考虑营养均衡、荤素搭配
- 你给出的建议实用且接地气

## 行为约束
1. 只推荐现有菜品库中没有的新菜品（用户可能没吃过的）
2. 推荐时要覆盖所有分类，每个分类至少推荐1道
3. 每次推荐4-6道菜品，确保涵盖所有分类
4. 推荐时考虑早餐/午餐/晚餐的不同需求
5. 保持回答简洁，每道推荐不超过30字
6. 不要推荐用户忌口的食材

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

async function callDeepSeek(dishes, taboo, mealTime) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
        throw new Error('API Key 未配置，请联系管理员');
    }
    
    if (!dishes || Object.keys(dishes).length === 0) {
        throw new Error('请先选择分类并获取推荐菜品');
    }

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(dishes, taboo, mealTime) }
    ];

    try {
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: DEEPSEEK_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 30000
            }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content;
        } else {
            throw new Error('AI 响应格式异常');
        }
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                throw new Error('API Key 无效，请检查配置');
            } else if (status === 429) {
                throw new Error('请求过于频繁，请稍后再试');
            } else {
                throw new Error(`AI 服务错误: ${status}`);
            }
        } else if (error.code === 'ECONNABORTED') {
                throw new Error('AI 响应超时，请稍后再试');
        } else {
            throw new Error(`调用失败: ${error.message}`);
        }
    }
}

async function recommendDishes(dishesData, taboo, mealTime) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
        throw new Error('API Key 未配置，请联系管理员');
    }

    const existingDishesSet = new Set();
    Object.values(dishesData).forEach(dishes => {
        dishes.forEach(dish => existingDishesSet.add(dish));
    });

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT_DISH },
        { role: 'user', content: buildDishRecommendPrompt(dishesData, taboo, mealTime) }
    ];

    try {
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: DEEPSEEK_MODEL,
                messages: messages,
                temperature: 0.8,
                max_tokens: 600
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 30000
            }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const content = response.data.choices[0].message.content;
            
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
                throw new Error('AI 返回格式异常，无法解析菜品');
            }
            
            dishes = dishes.filter(dish => !existingDishesSet.has(dish.name));
            
            return { dishes };
        } else {
            throw new Error('AI 响应格式异常');
        }
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                throw new Error('API Key 无效，请检查配置');
            } else if (status === 429) {
                throw new Error('请求过于频繁，请稍后再试');
            } else {
                throw new Error(`AI 服务错误: ${status}`);
            }
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('AI 响应超时，请稍后再试');
        } else {
            throw new Error(`调用失败: ${error.message}`);
        }
    }
}

module.exports = {
    callDeepSeek,
    recommendDishes
};
