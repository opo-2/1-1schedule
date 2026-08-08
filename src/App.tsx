import React, { useState, useEffect } from 'react';
import WeekView from './components/WeekView';
import PopupForm from './components/PopupForm';

// 简单 hash 路由
function useRoute() {
  const [route, setRoute] = useState('');

  useEffect(() => {
    const update = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/popup')) {
        setRoute('popup');
      } else {
        setRoute('main');
      }
    };
    window.addEventListener('hashchange', update);
    update();
    return () => window.removeEventListener('hashchange', update);
  }, []);

  return route;
}

// 从 URL 中提取参数
function getPopupHour(): number {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const hour = parseInt(params.get('hour') || '10', 10);
  return hour;
}

const App: React.FC = () => {
  const route = useRoute();

  if (route === 'popup') {
    const hour = getPopupHour();
    return <PopupForm defaultHour={hour} />;
  }

  return <WeekView />;
};

export default App;
