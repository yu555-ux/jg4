import React from 'react';
import SettingsSection from '../sidebar/SettingsSection';

interface SettingsModalProps {
  isStreaming: boolean;
  onToggleStreaming: (val: boolean) => void;
  isFocusMode: boolean;
  onToggleFocusMode: (val: boolean) => void;
  focusSettings?: { hideInterval: number; keepCount: number };
  onUpdateFocusSettings?: (settings: any) => void;
  richTextSettings: any;
  onUpdateRichText: (settings: any) => void;
  textFont: string;
  onUpdateFont: (font: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isStreaming,
  onToggleStreaming,
  isFocusMode,
  onToggleFocusMode,
  focusSettings,
  onUpdateFocusSettings,
  richTextSettings,
  onUpdateRichText,
  textFont,
  onUpdateFont
}) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <SettingsSection
          isStreaming={isStreaming}
          onToggleStreaming={onToggleStreaming}
          isFocusMode={isFocusMode}
          onToggleFocusMode={onToggleFocusMode}
          focusSettings={focusSettings}
          onUpdateFocusSettings={onUpdateFocusSettings || (() => {})}
          richTextSettings={richTextSettings}
          onUpdateRichText={onUpdateRichText}
          textFont={textFont}
          onUpdateFont={onUpdateFont}
        />
      </div>
    </div>
  );
};

export default SettingsModal;
