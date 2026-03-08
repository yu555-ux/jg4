import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

export function init() {
    console.info('[太虚界] 正在初始化前端界面...');
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        console.error("[太虚界] 找不到挂载点 #root");
        throw new Error("Could not find root element to mount to");
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
    console.info('[太虚界] React 应用已成功挂载，高度设置为 1200px');
}
