import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateNarrative = async (
  context: string,
  userAction: string
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "魔法链接中断（API Key缺失）...";

  try {
    const prompt = `
      作为一个TRPG地下城主，为一个经营神秘旅店的游戏生成一段简短的剧情回应。
      
      当前环境: ${context}
      玩家动作: ${userAction}
      
      要求：
      1. 风格：魔兽世界/DND奇幻风格，神秘、古朴但带有一丝幽默。
      2. 长度：100字以内。
      3. 格式：纯文本，不要Markdown格式。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "水晶球暂时模糊不清...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "虚空干扰了通讯 (API Error)。";
  }
};

export const generateGuestDialogue = async (
  guestName: string,
  guestRace: string,
  mood: number
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "...";

  try {
    const prompt = `
      角色: ${guestName} (${guestRace})
      心情: ${mood}/100
      
      请生成一句这个顾客在旅店里说的话。如果心情低落则抱怨，心情好则赞美。
      保持奇幻风格。不要带引号。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "...";
  } catch (error) {
    return "...";
  }
};