
import { GoogleGenAI, Type } from "@google/genai";
import { Product, GeminiResponse } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A friendly, concise summary of the findings in 1-2 sentences, directly addressing the user's question.",
    },
    chart: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ["bar", "pie", "none"],
          description: "The best chart type to visualize the data. Use 'bar' for comparisons, 'pie' for proportions. Use 'none' if no chart is relevant.",
        },
        data: {
          type: Type.ARRAY,
          description: "An array of objects for the chart. For 'bar' and 'pie' charts, each object should have a 'name' (string) and a 'value' (number) key.",
          items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                value: { type: Type.NUMBER },
            }
          },
        },
      },
    },
  },
  required: ["summary", "chart"],
};


export const analyzeProductData = async (prompt: string, products: Product[]): Promise<GeminiResponse> => {
  const model = "gemini-2.5-flash";

  const systemInstruction = `You are 'VeriAkışı', a helpful AI data analysis assistant. Your task is to analyze the provided JSON product data based on the user's request.
  - Provide a short, friendly textual summary of your findings.
  - Determine the best chart type to visualize the answer.
  - Format the data for that chart. If no chart is suitable, set the chart type to 'none' and data to an empty array.
  - Here is the product data: ${JSON.stringify(products, null, 2)}`;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("API returned an empty response.");
    }
    
    // The response is already validated by the schema, so we can parse it directly.
    return JSON.parse(jsonText) as GeminiResponse;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze data. The AI model might be unavailable.");
  }
};
