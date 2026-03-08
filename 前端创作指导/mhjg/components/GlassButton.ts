import { GlassButtonOptions } from './SplashScreen.types';
import './GlassButton.scss';

export class GlassButton {
  /**
   * 创建按钮HTML
   */
  public static createHTML(options: GlassButtonOptions): string {
    const variant = options.variant || 'neutral';
    const delay = options.delay || 0;
    const className = options.className || '';
    const disabled = options.disabled || false;

    const variantClasses = {
      primary: 'glass-btn-primary',
      secondary: 'glass-btn-secondary',
      neutral: 'glass-btn-neutral',
      danger: 'glass-btn-danger',
    };

    return `
      <button 
        class="glass-btn ${variantClasses[variant]} ${className}"
        data-delay="${delay}"
        ${disabled ? 'disabled' : ''}
        ${options.onClick ? `data-onclick="true"` : ''}
      >
        <span class="glass-btn-shine"></span>
        <span class="glass-btn-label">${options.label}</span>
      </button>
    `;
  }

  /**
   * 绑定按钮事件
   */
  public static bindEvents(container: HTMLElement, options: GlassButtonOptions): void {
    const button = $(container).find('.glass-btn').last();
    if (button.length && options.onClick) {
      button.on('click', (e) => {
        e.preventDefault();
        if (!options.disabled) {
          options.onClick?.();
        }
      });
    }
  }

  /**
   * 初始化所有按钮动画
   */
  public static initAnimations(container: HTMLElement): void {
    $(container)
      .find('.glass-btn')
      .each((_, el) => {
        const $btn = $(el);
        const delay = parseFloat($btn.attr('data-delay') || '0') * 1000;

        $btn.css({
          opacity: 0,
          transform: 'translateY(30px)',
        });

        setTimeout(() => {
          $btn.animate(
            { opacity: 1 },
            {
              duration: 600,
              step: function(now) {
                const progress = now;
                const translateY = 30 - (30 * progress);
                $(this).css('transform', `translateY(${translateY}px)`);
              },
            }
          );
        }, delay);
      });
  }
}

