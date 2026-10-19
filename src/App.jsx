import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

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
    let isMounted = true;

    const fetchData = async () => {
      const data = await loadTasks();
      if (isMounted) {
        setTasks(data);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: 'todo',
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setNewTaskTitle('');
    await saveTasks(updatedTasks);
  };

  const moveTask = async (taskId, newStatus) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  const deleteTask = async (taskId) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
    await saveTasks(updatedTasks);
  };

  if (isLoading) return <div style={{ padding: '20px', color: 'white' }}>Загрузка доски...</div>;

  const columns = [
    { id: 'todo', title: 'To Do (Сделать)' },
    { id: 'in-progress', title: 'In Progress (В работе)' },
    { id: 'done', title: 'Done (Готово)' },
  ];

  return (
    <div className="app-container">
      <h1>Рабочая доска команды</h1>
      
      <form onSubmit={addTask} className="add-form">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Что нужно сделать?"
        />
        <button type="submit">Добавить</button>
      </form>

      <div className="board">
        {columns.map((col) => (
          <div key={col.id} className="column">
            <h3>{col.title}</h3>
            
            {tasks.filter((t) => t.status === col.id).map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-title">{task.title}</div>
                
                <div className="task-actions">
                  {col.id !== 'todo' && (
                    <button onClick={() => moveTask(task.id, 'todo')}>← To Do</button>
                  )}
                  {col.id !== 'in-progress' && (
                    <button onClick={() => moveTask(task.id, 'in-progress')}>В Работу</button>
                  )}
                  {col.id !== 'done' && (
                    <button onClick={() => moveTask(task.id, 'done')}>Готово →</button>
                  )}
                  <button className="delete-btn" onClick={() => deleteTask(task.id)}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
