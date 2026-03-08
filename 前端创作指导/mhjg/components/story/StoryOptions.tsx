import React, { useState } from 'react';
import './StoryScreen.scss';

interface StoryOptionsProps {
  options: string[];
  onOptionClick: (option: string) => void;
  onCustomInput: (text: string) => void;
  isLoading: boolean;
}

export const StoryOptions: React.FC<StoryOptionsProps> = ({ 
  options,
  onOptionClick,
  onCustomInput,
  isLoading
}) => {
  const [inputText, setInputText] = useState('');
  const [optionsVisible, setOptionsVisible] = useState(true);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onCustomInput(inputText);
    setInputText('');
  };

  const toggleOptions = () => {
    setOptionsVisible(!optionsVisible);
  };

  return (
    <div className="story-options">
      {/* 切换按钮 */}
      {options.length > 0 && (
        <button
          onClick={toggleOptions}
          className="options-toggle-button"
          aria-label={optionsVisible ? '隐藏选项' : '显示选项'}
        >
          <span className="toggle-text">{optionsVisible ? '隐藏选项' : '显示选项'}</span>
          <svg
            className={`toggle-icon ${optionsVisible ? 'expanded' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* 选项按钮 */}
      {options.length > 0 && optionsVisible && (
        <div className="options-grid">
          {options.map((option, idx) => {
            // 移除 A. B. C. 前缀用于显示
            const displayText = option.replace(/^[A-Z]\.\s*/, '').trim();
            return (
              <button
                key={idx}
                onClick={() => onOptionClick(option)}
                disabled={isLoading}
                className="option-button"
              >
                <span className="option-label">[{String.fromCharCode(65 + idx)}]</span>
                <span>{displayText}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 自定义输入框 */}
      <form onSubmit={handleCustomSubmit} className="custom-input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="描述你的行动..."
          disabled={isLoading}
          className="custom-input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="send-button"
        >
          发送
        </button>
      </form>
    </div>
  );
};

