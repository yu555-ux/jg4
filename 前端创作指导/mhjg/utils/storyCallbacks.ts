/**
 * 为 React StoryScreen 生成统一的回调函数
 * 用于 handleUnifiedRequest 的回调参数
 */
import { handleTabChange } from './tabManager';
import { GameTab } from '../types';

// 使用全局变量来存储 StoryScreen 的回调函数
// 由于 StoryScreen 是 React 组件，我们需要通过事件或全局状态来通信
let storyScreenCallbacks: {
  setLoading?: (loading: boolean) => void;
  refreshStory?: () => void;
  setStreamingText?: (text: string) => void;
} | null = null;

/**
 * 注册 StoryScreen 的回调函数
 */
export function registerStoryScreenCallbacks(callbacks: {
  setLoading: (loading: boolean) => void;
  refreshStory: () => void;
  setStreamingText: (text: string) => void;
}): void {
  storyScreenCallbacks = callbacks;
}

/**
 * 生成统一的回调函数对象
 */
export function createStoryCallbacks() {
  return {
    onSwitchToStory: () => {
      handleTabChange(GameTab.STORY);
    },
    onRefreshStoryIfOpen: () => {
      // React StoryScreen 始终在 STORY tab 时可见，不需要特殊处理
      if (storyScreenCallbacks?.refreshStory) {
        storyScreenCallbacks.refreshStory();
      }
    },
    onDisableOptions: () => {
      if (storyScreenCallbacks?.setLoading) {
        storyScreenCallbacks.setLoading(true);
      }
    },
    onShowGenerating: () => {
      if (storyScreenCallbacks?.setLoading) {
        storyScreenCallbacks.setLoading(true);
      }
    },
    onHideGenerating: () => {
      if (storyScreenCallbacks?.setLoading) {
        storyScreenCallbacks.setLoading(false);
      }
    },
    onEnableOptions: () => {
      if (storyScreenCallbacks?.setLoading) {
        storyScreenCallbacks.setLoading(false);
      }
    },
    onError: (error: string) => {
      console.error('❌ 请求处理失败:', error);
      if (storyScreenCallbacks?.setLoading) {
        storyScreenCallbacks.setLoading(false);
      }
    },
    onRefreshStory: () => {
      if (storyScreenCallbacks?.refreshStory) {
        setTimeout(() => {
          storyScreenCallbacks?.refreshStory?.();
        }, 100);
      }
    },
    onStreamingUpdate: (text: string) => {
      if (storyScreenCallbacks?.setStreamingText) {
        storyScreenCallbacks.setStreamingText(text);
      }
    },
  };
}

