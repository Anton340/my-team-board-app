import { useState, useEffect } from 'react';
import axios from 'axios';

// Наши настройки GitHub
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const REPO_OWNER = 'Anton340';
const REPO_NAME = 'team-board-db';
const FILE_PATH = 'tasks.json';

// Функция для получения текущего SHA файла (нужно для обновления)
const getFileSha = async () => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return response.data.sha;
  } catch (error) {
    console.error('Ошибка получения SHA:', error);
    return null;
  }
};

// Функция для загрузки задач из GitHub
const loadTasks = async () => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    
    // Декодируем base64 с поддержкой кириллицы
    const base64Content = response.data.content.replace(/\s/g, '');
    const content = decodeURIComponent(
      atob(base64Content)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(content || '[]');
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    return [];
  }
};

// Функция для сохранения задач в GitHub
const saveTasks = async (tasks) => {
  try {
    const sha = await getFileSha();
    
    // Кодируем в base64 с поддержкой кириллицы
    const content = btoa(
      unescape(
        encodeURIComponent(JSON.stringify(tasks, null, 2))
      )
    );
    
    await axios.put(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        message: 'Обновление задач',
        content: content,
        sha: sha || undefined,
      },
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    console.log('Успешно сохранено в GitHub!');
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    alert('Не удалось сохранить задачу в GitHub. Проверь консоль.');
  }
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем задачи при старте и обновляем каждые 5 секунд
  useEffect(() => {
    let isMounted = true; // Защита от утечек памяти

    const fetchData = async () => {
      const data = await loadTasks();
      if (isMounted) {
        setTasks(data);
        setIsLoading(false);
      }
    };

    fetchData(); // Первая загрузка

    // Проверяем обновления каждые 5 секунд
    const interval = setInterval(fetchData, 5000);

    // Очистка при закрытии компонента
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Добавление новой задачи
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: 'todo', // todo, in-progress, done
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setNewTaskTitle('');
    await saveTasks(updatedTasks);
  };

  // Перемещение задачи (смена статуса)
  const moveTask = async (taskId, newStatus) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  // Удаление задачи
  const deleteTask = async (taskId) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  if (isLoading) return <div style={{ padding: '20px' }}>Загрузка доски...</div>;

  // Колонки
  const columns = [
    { id: 'todo', title: 'To Do (Сделать)' },
    { id: 'in-progress', title: 'In Progress (В работе)' },
    { id: 'done', title: 'Done (Готово)' },
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Рабочая доска команды</h1>
      
      {/* Форма добавления */}
      <form onSubmit={addTask} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Название новой задачи..."
          style={{ padding: '10px', flex: 1, fontSize: '16px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          Добавить
        </button>
      </form>

      {/* Канбан-доска */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {columns.map((col) => (
          <div key={col.id} style={{ flex: 1, background: '#f4f5f7', padding: '15px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>{col.title}</h3>
            
            {/* Список задач в колонке */}
            {tasks.filter((t) => t.status === col.id).map((task) => (
              <div key={task.id} style={{ background: 'white', padding: '10px', marginBottom: '10px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>{task.title}</div>
                
                {/* Кнопки управления */}
                <div style={{ display: 'flex', gap: '5px', fontSize: '12px' }}>
                  {col.id !== 'todo' && (
                    <button onClick={() => moveTask(task.id, 'todo')}>← В To Do</button>
                  )}
                  {col.id !== 'in-progress' && (
                    <button onClick={() => moveTask(task.id, 'in-progress')}>В Работу</button>
                  )}
                  {col.id !== 'done' && (
                    <button onClick={() => moveTask(task.id, 'done')}>Готово →</button>
                  )}
                  <button onClick={() => deleteTask(task.id)} style={{ color: 'red', marginLeft: 'auto' }}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}