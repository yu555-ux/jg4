export interface SplashScreenCallbacks {
  onStartNewGame: () => void;
  onContinueGame?: () => void;
  onOpenSettings?: () => void;
  onExit?: () => void;
}

export interface SplashScreenOptions {
  title?: string;
  subtitle?: string;
  hasSaveData?: boolean;
  backgroundImage?: string;
  showSettings?: boolean;
  showExit?: boolean;
}

export interface GlassButtonOptions {
  label: string;
  variant?: 'primary' | 'secondary' | 'neutral' | 'danger';
  delay?: number;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

