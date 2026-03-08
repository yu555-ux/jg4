import './BackgroundEffects.scss';

export class BackgroundEffects {
  private element: HTMLElement | null = null;
  private particles: HTMLElement[] = [];

  /**
   * 创建背景特效HTML结构
   */
  public createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'background-effects';
    container.innerHTML = this.getEffectsHTML();
    this.element = container;
    this.initParticles();
    return container;
  }

  /**
   * 获取特效HTML
   */
  private getEffectsHTML(): string {
    return `
      <div class="bg-gradient-overlay"></div>
      <div class="bg-radial-gradient"></div>
      <div class="bg-particles-container"></div>
    `;
  }

  /**
   * 初始化粒子
   */
  private initParticles(): void {
    if (!this.element) return;

    const container = this.element.querySelector('.bg-particles-container');
    if (!container) return;

    // 金色粒子（萤火虫/魔法火花）
    for (let i = 0; i < 15; i++) {
      const particle = this.createParticle('amber', i);
      container.appendChild(particle);
      this.particles.push(particle);
      this.animateParticle(particle, 'amber');
    }

    // 紫色粒子（虚空尘埃）
    for (let i = 0; i < 10; i++) {
      const particle = this.createParticle('purple', i);
      container.appendChild(particle);
      this.particles.push(particle);
      this.animateParticle(particle, 'purple');
    }
  }

  /**
   * 创建粒子元素
   */
  private createParticle(type: 'amber' | 'purple', index: number): HTMLElement {
    const particle = document.createElement('div');
    particle.className = `bg-particle bg-particle-${type}`;

    const size = type === 'amber' 
      ? Math.random() * 4 + 2 
      : Math.random() * 6 + 2;

    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = type === 'amber' ? '100%' : `${Math.random() * 100}%`;

    return particle;
  }

  /**
   * 动画粒子
   */
  private animateParticle(particle: HTMLElement, type: 'amber' | 'purple'): void {
    if (type === 'amber') {
      // 从下往上移动
      const duration = Math.random() * 5000 + 5000;
      const delay = Math.random() * 5000;
      const horizontalOffset = (Math.random() - 0.5) * 100;
      const startLeft = parseFloat($(particle).css('left')) || 0;
      const startTop = parseFloat($(particle).css('top')) || 0;

      $(particle)
        .css({ opacity: 0 })
        .delay(delay)
        .animate(
          {
            top: '-100px',
            left: `${startLeft + horizontalOffset}px`,
            opacity: 0.8,
          },
          {
            duration: duration / 2,
            complete: () => {
              $(particle).animate(
                { opacity: 0 },
                {
                  duration: duration / 2,
                  complete: () => {
                    // 重置位置并重新动画
                    particle.style.top = '100%';
                    particle.style.left = `${Math.random() * 100}%`;
                    this.animateParticle(particle, type);
                  },
                }
              );
            },
          }
        );
    } else {
      // 紫色粒子：上下浮动
      const duration = Math.random() * 8000 + 4000;
      const delay = Math.random() * 2000;
      const startTop = parseFloat($(particle).css('top')) || 0;

      $(particle)
        .css({ opacity: 0, transform: 'scale(1)' })
        .delay(delay)
        .animate(
          {
            top: `${startTop - 20}px`,
            opacity: 0.3,
          },
          {
            duration: duration / 2,
            step: function(now, fx) {
              if (fx.prop === 'opacity') {
                const progress = now / 0.3;
                const scale = 1 + (0.5 * progress);
                $(this).css('transform', `scale(${scale})`);
              }
            },
            complete: () => {
              const currentTop = parseFloat($(particle).css('top')) || 0;
              $(particle).animate(
                {
                  top: `${currentTop + 20}px`,
                  opacity: 0,
                },
                {
                  duration: duration / 2,
                  step: function(now, fx) {
                    if (fx.prop === 'opacity') {
                      const progress = 1 - (now / 0.3);
                      const scale = 1.5 - (0.5 * progress);
                      $(this).css('transform', `scale(${Math.max(1, scale)})`);
                    }
                  },
                  complete: () => {
                    this.animateParticle(particle, type);
                  },
                }
              );
            },
          }
        );
    }
  }

  /**
   * 销毁组件
   */
  public destroy(): void {
    if (this.element) {
      this.particles.forEach((particle) => {
        $(particle).stop(true);
      });
      this.particles = [];
      $(this.element).remove();
      this.element = null;
    }
  }
}

