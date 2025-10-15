
export enum MessageRole {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export interface Message {
  role: MessageRole;
  content: string;
}

export interface Product {
  id: number;
  name: string;
  category: 'Electronics' | 'Books' | 'Clothing' | 'Home Goods';
  price: number;
  stock: number;
  rating: number;
}

export enum RobotState {
  IDLE = 'idle',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
}

export enum InteractionState {
  DEFAULT = 'default',
  USER_TYPING = 'user_typing',
  CONFIRMATION = 'confirmation',
  ANALYSIS_COMPLETE = 'analysis_complete',
}

export enum ChartType {
  BAR = 'bar',
  PIE = 'pie',
  NONE = 'none',
}

export interface ChartData {
  type: ChartType;
  data: any[];
}

export interface GeminiResponse {
  summary: string;
  chart: ChartData;
}
