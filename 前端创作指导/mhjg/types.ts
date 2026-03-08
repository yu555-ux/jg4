export enum GameTab {
  DASHBOARD = 'DASHBOARD',
  GUESTS = 'GUESTS',
  BUILD = 'BUILD',
  STAFF = 'STAFF',
  STORY = 'STORY'
}

export interface Resource {
  id: string;
  name: string;
  amount: number;
  icon: string;
}

export interface Guest {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  appearance: string;
  mood: number; // 0-100
  gold: number;
  request?: string;
  avatarUrl: string;
}

export interface BuildingUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  imageUrl: string;
}

export interface Staff {
  id: string;
  name: string;
  race: string;
  combatClass: string;
  innRole: string;
  level: number;
  appearance: string;
  mood?: number; // 0-100
  favorability: number; // 0-100
  workSatisfaction?: number; // 0-100
  salary: number;
  likes: string[];
  dislikes: string[];
  currentThought?: string;
  avatarUrl: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  content: string;
  type: 'system' | 'narrative' | 'chat';
  sender?: string;
}

// 营业状态
export type BusinessStatus = '营业中' | '升级中' | '筹备中';

// 设施/区域
export interface Facility {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
}

// 旅馆法则
export type InnLaw = '禁魔' | '高魔' | '发情力场' | '好朋友法则' | '中立' | '自由';