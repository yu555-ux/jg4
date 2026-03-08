import './StartScreen.scss';

export interface StartScreenCallbacks {
  onStart: () => void;
}

export class StartScreen {
  private element: HTMLElement | null = null;
  private callbacks: StartScreenCallbacks;
  private isVisible: boolean = false;

  constructor(callbacks: StartScreenCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 创建开始屏幕HTML结构
   */
  public createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'start-screen';
    screen.innerHTML = this.getStartScreenHTML();
    this.element = screen;
    this.bindEvents();
    return screen;
  }

  /**
   * 获取开始屏幕HTML
   */
  private getStartScreenHTML(): string {
    return `
      <div class="start-screen-content">
        <div class="start-screen-text">
          <span class="start-text-main">点击此处开始</span>
          <span class="start-text-hint">Click to Start</span>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    $(this.element).on('click', () => {
      this.handleStart();
    });

    // 支持键盘 Enter 键
    $(document).on('keydown.startScreen', (e) => {
      if (e.key === 'Enter' && this.isVisible) {
        this.handleStart();
      }
    });
  }

  /**
   * 处理开始
   */
  private handleStart(): void {
    if (!this.isVisible) return;

    // 执行全屏
    this.requestFullscreen();

    // 淡出动画
    this.hide(() => {
      this.callbacks.onStart();
    });
  }

  /**
   * 请求全屏
   */
  private requestFullscreen(): void {
    const doc = document.documentElement;
    if (doc.requestFullscreen) {
      doc.requestFullscreen().catch((err) => {
        console.log('全屏请求失败:', err);
      });
    } else if ((doc as any).webkitRequestFullscreen) {
      (doc as any).webkitRequestFullscreen();
    } else if ((doc as any).mozRequestFullScreen) {
      (doc as any).mozRequestFullScreen();
    } else if ((doc as any).msRequestFullscreen) {
      (doc as any).msRequestFullscreen();
    }
  }

  /**
   * 显示开始屏幕
   */
  public show(): void {
    this.isVisible = true;
    if (this.element) {
      $(this.element).addClass('visible');
    }
  }

  /**
   * 隐藏开始屏幕
   */
  public hide(callback?: () => void): void {
    this.isVisible = false;
    if (this.element) {
      $(this.element).removeClass('visible');
      if (callback) {
        setTimeout(callback, 400); // 等待淡出动画完成
      }
    }
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    if (this.element) {
      $(this.element).off();
      $(document).off('keydown.startScreen');
      this.element = null;
    }
  }
}

