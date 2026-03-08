/**
 * 应用状态管理
 * 用于避免循环依赖
 */

import { StoryModal } from '../components/modals/StoryModal';
import { GameTab } from '../types';

// 全局状态
let activeTab: GameTab = GameTab.DASHBOARD;
let storyModalInstance: StoryModal | null = null;

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

/**
 * 设置 StoryModal 实例
 */
export function setStoryModal(modal: StoryModal | null): void {
  storyModalInstance = modal;
}

/**
 * 获取 StoryModal 实例
 */
export function getStoryModal(): StoryModal | null {
  return storyModalInstance;
}
