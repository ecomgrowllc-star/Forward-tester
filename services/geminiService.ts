import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, PairAnalysisResult, Trade } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateTradeInsight = async (
  singleStats: AnalysisResult[],
  pairStats: PairAnalysisResult[],
  trades: Trade[]
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "API Key not configured in environment variables.";

  const recentTrades = trades.slice(0, 5).map(t => ({
      strategy: t.strategyNames.join(', '),
      mfe: t.mfe,
      mae: t.mae,
      delta: t.delta,
      entry: t.entryType
  }));

  const topSingle = singleStats.slice(0, 3);
  const topPairs = pairStats.slice(0, 3);

  const prompt = `
    You are a senior quantitative trading analyst. Analyze this summary data from a user's trading journal.
    
    **Dataset Overview:**
    - Total Trades: ${trades.length}
    - Recent Trades Sample: ${JSON.stringify(recentTrades)}
    
    **Statistical Edge (Single Factors):**
    ${JSON.stringify(topSingle)}
    
    **Combinatorial Edge (Best Pairs):**
    ${JSON.stringify(topPairs)}
    
    **Task:**
    1. Identify the strongest edge based on MFE (Max Favorable Excursion) vs MAE (Max Adverse Excursion).
    2. Suggest a strategy refinement based on the best pairs.
    3. Comment on the consistency of the recent trades.
    
    Keep it concise, professional, and actionable. Use bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text || "No insight generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate AI insights. Please check your API key or try again later.";
  }
};

export const generateSingleTradeNote = async (tradeData: any): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "";

  const prompt = `
    You are a professional trading journal assistant. Write a concise, 1-2 sentence note for a trade based on the following technical data.
    Focus on the "why" and the outcome context. Do not use markdown.
    
    **Trade Data:**
    - Direction: ${tradeData.direction}
    - Strategies: ${tradeData.strategyNames.join(', ')}
    - Confluence Levels: ${tradeData.taLevels.join(', ')}
    - Entry Type: ${tradeData.entryType}
    - Delta (Aggression): ${tradeData.delta} (High Delta > 7, Extreme > 20)
    - Result: MFE ${tradeData.mfe}% / MAE ${tradeData.mae}%
    
    **Example Output:**
    "Long entry at Daily Open with high delta validation; strong expansion to 2% MFE with minimal drawdown."
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Note Gen Error:", error);
    return "";
  }
};