/**
 * 默认批改提示词配置
 * 这些提示词用于指导 AI 生成批改报告的各个部分
 */

import { GradingPrompts } from '../types';

export const DEFAULT_GRADING_PROMPTS: GradingPrompts = {
    summaryPrompt: `用中文撰写教师总评（summary_cn），要求：
1. 基于学生的整体写作水平给出评价
2. 涵盖写作能力、表达清晰度和内容完整性
3. 控制在2-3句话内
4. 语气专业且鼓励`,

    strengthsPrompt: `在 strengths 数组中列出学生写作的2-3个亮点，要求：
1. 每个亮点用一句中文描述
2. 关注具体的优秀表现，如词汇运用得当、句式多样、逻辑清晰、内容丰富等
3. 给出具体例子或证据`,

    improvementsPrompt: `在 improvements 数组中列出2-3个需要改进的方面，要求：
1. 每个建议用一句中文描述
2. 明确指出问题类型，如语法错误、拼写问题、句式单一、逻辑不清等
3. 给出具体的改进建议`
};
