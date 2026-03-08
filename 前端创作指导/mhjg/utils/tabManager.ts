/**
 * 标签页管理器
 * 用于避免循环依赖
 */

import { GameTab } from '../types';

// 全局状态
let activeTab: GameTab = GameTab.DASHBOARD;
let handleTabChangeCallback: ((tab: GameTab) => void) | null = null;

/**
 * 设置标签页切换回调
 */
export function setTabChangeCallback(callback: (tab: GameTab) => void): void {
  handleTabChangeCallback = callback;
}

/**
 * 处理标签页切换
 */
export function handleTabChange(tab: GameTab): void {
  if (handleTabChangeCallback) {
    handleTabChangeCallback(tab);
  } else {
    console.warn('⚠️ handleTabChangeCallback 未设置');
  }
}

/**
 * 设置当前活动标签页
 */
export function setActiveTab(tab: GameTab): void {
  activeTab = tab;
}

/**
 * 获取当前活动标签页
 */
export function getActiveTab(): GameTab {
  return activeTab;
}
