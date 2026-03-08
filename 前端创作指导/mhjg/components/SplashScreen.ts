import { SplashScreenCallbacks, SplashScreenOptions } from './SplashScreen.types';
import { BackgroundEffects } from './BackgroundEffects';
import './SplashScreen.scss';

const DEFAULT_OPTIONS: SplashScreenOptions = {
  title: '诸天便携旅店',
  subtitle: '迷失者的庇护所',
  hasSaveData: false,
  backgroundImage: 'https://pub-0f03753252fb439e966a538d805f20ef.r2.dev/docs/1765458743425.png',
  showSettings: false,
  showExit: false,
};

export class SplashScreen {
  private element: HTMLElement | null = null;
  private callbacks: SplashScreenCallbacks;
  private options: SplashScreenOptions;
  private isVisible: boolean = false;
  private isExiting: boolean = false;
  private bgLoaded: boolean = false;
  private backgroundEffects: BackgroundEffects | null = null;
  private fullscreenBtn: HTMLElement | null = null;
  private fullscreenListenerAttached: boolean = false;

  constructor(callbacks: SplashScreenCallbacks, options?: SplashScreenOptions) {
    this.callbacks = callbacks;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 创建标题页面HTML结构
   */
  public createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'splash-screen';
    screen.innerHTML = this.getSplashHTML();
    this.element = screen;
    this.preloadBackground();
    return screen;
  }

  /**
   * 预加载背景图片
   */
  private preloadBackground(): void {
    if (!this.options.backgroundImage) {
      this.bgLoaded = true;
      if (this.isVisible && this.element) {
        this.render();
      }
      return;
    }

    const img = new Image();
    img.src = this.options.backgroundImage;
    img.onload = () => {
      this.bgLoaded = true;
      if (this.isVisible && this.element) {
        this.render();
        // 小延迟确保渲染完成
        setTimeout(() => {
          $(this.element!).addClass('visible');
        }, 100);
      }
    };
    img.onerror = () => {
      this.bgLoaded = true;
      if (this.isVisible && this.element) {
        this.render();
        setTimeout(() => {
          $(this.element!).addClass('visible');
        }, 100);
      }
    };
  }

  /**
   * 获取标题页面HTML
   */
  private getSplashHTML(): string {
    if (!this.bgLoaded) {
      return `
        <div class="splash-loading">
          <div class="loading-spinner"></div>
        </div>
      `;
    }

    return `
      <div class="splash-background" style="background-image: url('${this.options.backgroundImage}')"></div>
      <div class="splash-aurora"></div>
      <div class="splash-effects-container"></div>
      
      <div class="splash-utility-buttons">
        <button class="splash-utility-btn splash-fullscreen-btn" data-fullscreen-btn aria-label="切换全屏" title="切换全屏">
          ${this.getFullscreenIcon()}
        </button>
      </div>
      
      <div class="splash-content">
        <div class="splash-title-section">
          <h1 class="splash-title" data-text="${this.options.title}">${this.options.title}</h1>
          <div class="splash-subtitle-wrapper">
            <div class="splash-subtitle-line"></div>
            <h2 class="splash-subtitle">${this.options.subtitle}</h2>
            <div class="splash-subtitle-line"></div>
          </div>
        </div>
        
        <div class="splash-buttons">
          ${this.createButtonsHTML()}
        </div>
      </div>
      
      <div class="splash-footer">
        <div class="footer-line"></div>
        <div class="footer-content">
          <div class="footer-left">
            <div class="footer-text">Ver 1.0.0 • Void Walker Studio</div>
          </div>
          <div class="footer-center">
            <div class="footer-author">
              <span class="author-label">Created by</span>
              <span class="author-name">POARIES</span>
            </div>
            <div class="footer-copyright">
              <p xmlns:cc="http://creativecommons.org/ns#">
                Licensed under 
                <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1" 
                   target="_blank" 
                   rel="license noopener noreferrer" 
                   class="license-link">
                  CC BY-NC-SA 4.0
                  <span class="license-icons">
                    <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1" alt="CC" class="license-icon">
                    <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1" alt="BY" class="license-icon">
                    <img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg?ref=chooser-v1" alt="NC" class="license-icon">
                    <img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg?ref=chooser-v1" alt="SA" class="license-icon">
                  </span>
                </a>
              </p>
            </div>
          </div>
          <div class="footer-right">
            <nav class="footer-navigation">
              <a href="https://discord.gg/nJecqe5HUx" 
                 class="footer-nav-link" 
                 target="_blank" 
                 rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                DISCORD
              </a>
            </nav>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 创建按钮HTML
   */
  private createButtonsHTML(): string {
    const buttons: string[] = [];

    // 继续游戏
    if (this.options.hasSaveData) {
      buttons.push(this.createButton('continue', '继续旅程', 'primary', `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      `, 0.4));
    }

    // 开始新游戏
    buttons.push(this.createButton('new-game', '开启新篇章', this.options.hasSaveData ? 'secondary' : 'primary', `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    `, 0.5));

    return buttons.join('');
  }

  private createButton(action: string, label: string, variant: string, icon: string, delay: number): string {
    return `
      <button class="glass-btn glass-btn-${variant}" data-action="${action}" data-delay="${delay}">
        <div class="btn-content">
          <div class="btn-icon">${icon}</div>
          <span class="glass-btn-label">${label}</span>
        </div>
      </button>
    `;
  }

  /**
   * 处理操作
   */
  private handleAction(callback?: () => void): void {
    if (!callback || this.isExiting) return;

    this.isExiting = true;
    this.animateOut(() => {
      callback();
    });
  }

  /**
   * 重新渲染
   */
  private render(): void {
    if (!this.element) return;
    const wasVisible = this.isVisible;
    this.element.innerHTML = this.getSplashHTML();
    this.bindEvents();
    this.initBackgroundEffects();
    if (wasVisible) {
      this.animateIn();
    }
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.element) return;

    // 绑定按钮点击事件
    $(this.element).on('click', '.glass-btn[data-action]', (e) => {
      e.preventDefault();
      const action = $(e.currentTarget).attr('data-action');
      this.handleButtonAction(action);
    });

    // 绑定全屏按钮
    $(this.element).on('click', '[data-fullscreen-btn]', () => {
      this.toggleFullscreen();
    });

    // 初始化按钮动画
    this.initButtonAnimations();
    
    // 初始化全屏监听
    this.attachFullscreenListeners();
    this.updateFullscreenIcon();
  }

  /**
   * 处理按钮操作
   */
  private handleButtonAction(action: string | undefined): void {
    if (!action) return;

    switch (action) {
      case 'new-game':
        this.handleAction(this.callbacks.onStartNewGame);
        break;
      case 'continue':
        if (this.callbacks.onContinueGame) {
          this.handleAction(this.callbacks.onContinueGame);
        }
        break;
      case 'settings':
        if (this.callbacks.onOpenSettings) {
          this.handleAction(this.callbacks.onOpenSettings);
        }
        break;
      case 'exit':
        if (this.callbacks.onExit) {
          this.handleAction(this.callbacks.onExit);
        }
        break;
    }
  }

  /**
   * 初始化按钮动画
   */
  private initButtonAnimations(): void {
    if (!this.element) return;

    $(this.element)
      .find('.glass-btn')
      .each((_, el) => {
        const $btn = $(el);
        const delay = parseFloat($btn.attr('data-delay') || '0') * 1000;

        $btn.css({
          opacity: 0,
          transform: 'translateY(20px) rotateX(10deg)',
        });

        setTimeout(() => {
          $btn.animate(
            { opacity: 1 },
            { 
              duration: 800,
              easing: 'swing', // jQuery easing
              step: function(now, fx) {
                 if (fx.prop === 'opacity') return; // Skip transform on opacity step
                 // Manually handling complex transform if needed, but jQuery animate only supports basic props usually.
                 // Better to use CSS transition class for complex transforms, but here we use inline for stagger.
                 // Simplified:
                 $(this).css('transform', 'translateY(0) rotateX(0)');
              }
            }
          );
          // Since jQuery animate transform support is limited without plugin, 
          // we'll just set the final state and let CSS transition handle it if class is present,
          // or use a simple timeout to remove the offset.
          // Actually, let's rely on a CSS class for entrance.
          $btn.addClass('animate-in');
        }, delay);
      });
  }

  /**
   * 初始化背景特效
   */
  private initBackgroundEffects(): void {
    if (!this.element) return;

    const effectsContainer = this.element.querySelector('.splash-effects-container');
    if (effectsContainer) {
      this.backgroundEffects = new BackgroundEffects();
      const effectsElement = this.backgroundEffects.createElement();
      effectsContainer.appendChild(effectsElement);
    }
  }

  /**
   * 进入动画
   */
  private animateIn(): void {
    if (!this.element) return;

    // 容器淡入
    $(this.element).css({ opacity: 0 });
    $(this.element).animate({ opacity: 1 }, 800);

    // 标题动画
    const title = $(this.element).find('.splash-title');
    title.css({ opacity: 0, transform: 'translateY(-50px) scale(0.9)' });
    setTimeout(() => {
      title.css({ transition: 'all 1s cubic-bezier(0.22, 1, 0.36, 1)', opacity: 1, transform: 'translateY(0) scale(1)' });
    }, 200);

    // 副标题动画
    const subtitle = $(this.element).find('.splash-subtitle-wrapper');
    subtitle.css({ opacity: 0, transform: 'translateY(20px)' });
    setTimeout(() => {
       subtitle.css({ transition: 'all 1s ease', opacity: 1, transform: 'translateY(0)' });
    }, 600);
  }

  /**
   * 退出动画
   */
  private animateOut(callback: () => void): void {
    if (!this.element) {
      callback();
      return;
    }

    // Zoom in and fade out
    const bg = $(this.element).find('.splash-background');
    bg.css({ transform: 'scale(1.2)', transition: 'transform 0.8s ease-in' });
    
    $(this.element).animate({ opacity: 0 }, { duration: 800, complete: callback });
  }

  /**
   * 显示标题页面
   */
  public show(): void {
    this.isVisible = true;
    if (this.element) {
      if (this.bgLoaded) {
        this.render();
        setTimeout(() => {
          $(this.element!).addClass('visible');
        }, 50);
      } else {
        // 如果背景还没加载完，等待加载完成后再显示
        $(this.element).addClass('visible');
      }
    }
  }

  /**
   * 隐藏标题页面
   */
  public hide(): void {
    this.isVisible = false;
    if (this.element) {
      $(this.element).removeClass('visible');
    }
  }

  /**
   * 获取全屏图标
   */
  private getFullscreenIcon(): string {
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (isFullscreen) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>';
    } else {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
    }
  }

  /**
   * 切换全屏
   */
  private toggleFullscreen(): void {
    const doc = document.documentElement;
    
    // 检查当前是否全屏
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    if (isFullscreen) {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.log('退出全屏失败:', err);
        });
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    } else {
      // 进入全屏
      if (doc.requestFullscreen) {
        doc.requestFullscreen().catch((err) => {
          console.log('全屏请求失败:', err);
        });
      } else if ((doc as any).webkitRequestFullscreen) {
        (doc as any).webkitRequestFullscreen();
      } else if ((doc as any).mozRequestFullScreen) {
        (doc as any).mozRequestFullScreen();
      } else if ((doc as any).msRequestFullscreen) {
        (document as any).msRequestFullscreen();
      }
    }
  }

  /**
   * 更新全屏图标
   */
  private updateFullscreenIcon(): void {
    if (!this.element) return;
    const btn = $(this.element).find('[data-fullscreen-btn]');
    if (btn.length) {
      btn.html(this.getFullscreenIcon());
    }
  }

  /**
   * 附加全屏状态监听器
   */
  private attachFullscreenListeners(): void {
    if (this.fullscreenListenerAttached) return;

    const handleFullscreenChange = () => {
      this.updateFullscreenIcon();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    this.fullscreenListenerAttached = true;
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    if (this.backgroundEffects) {
      this.backgroundEffects.destroy();
      this.backgroundEffects = null;
    }
    if (this.element) {
      $(this.element).off();
      $(this.element).remove();
      this.element = null;
    }
    this.fullscreenListenerAttached = false;
  }
}
