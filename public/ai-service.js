(function() {
    'use strict';

    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
    const DEEPSEEK_MODEL = 'deepseek-chat';

    let apiKey = '';

    window.setDeepseekApiKey = function(key) {
        apiKey = key;
    };

    window.getDeepseekApiKey = function() {
        return apiKey;
    };

    async function callDeepSeek(prompt, systemPrompt = '你是一个专业的美食评论家，善于给出贴心的菜品建议。') {
        if (!apiKey) {
            throw new Error('请先设置 DeepSeek API Key');
        }

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API 调用失败');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    window.reviewDish = async function(dishName, categoryName, taboo, timeOfDay) {
        const timeLabel = {
            'breakfast': '早餐',
            'lunch': '午餐',
            'dinner': '晚餐'
        };

        const timeStr = timeLabel[timeOfDay] || '用餐时间';

        let tabooStr = taboo ? `用户忌口：${taboo}` : '用户没有忌口';

        const prompt = `请对以下菜品进行简短点评：

菜品：${dishName}
分类：${categoryName}
${timeStr}
${tabooStr}

要求：
1. 点评长度控制在 50-100 字
2. 从口味、营养、搭配角度点评
3. 结合用餐时间给出建议
4. 语言亲切友好`;

        return await callDeepSeek(prompt, '你是一个专业的美食评论家，善于给出贴心的菜品建议，语言生动有趣。');
    };

    window.reviewDishes = async function(dishes, taboo, timeOfDay) {
        const timeLabel = {
            'breakfast': '早餐',
            'lunch': '午餐',
            'dinner': '晚餐'
        };

        const timeStr = timeLabel[timeOfDay] || '用餐时间';

        let dishList = '';
        for (const [category, dish] of Object.entries(dishes)) {
            dishList += `- ${category}: ${dish}\n`;
        }

        let tabooStr = taboo ? `用户忌口：${taboo}` : '用户没有忌口';

        const prompt = `请对以下这套菜品搭配进行综合点评：

${dishList}
${timeStr}
${tabooStr}

要求：
1. 点评长度控制在 100-200 字
2. 点评内容包括：整体搭配评价、营养均衡分析、根据用餐时间的建议
3. 如果用户有忌口，提醒是否需要注意
4. 语言亲切专业`;

        return await callDeepSeek(prompt, '你是一个专业的美食营养师，善于给出合理的饮食搭配建议。');
    };

})();
