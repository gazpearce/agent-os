import express from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export default function createTodoRouter(CONTEXT) {
  const router = express.Router();
  // We can either extract SHARED from CONTEXT or hardcode it since this runs inside agent-os root
  const SHARED = 'D:/Agent OS/shared';
  const TODOS_PATH = join(SHARED, 'todo-list.json');

  function readTodos() {
    try {
      if (existsSync(TODOS_PATH)) {
        return JSON.parse(readFileSync(TODOS_PATH, 'utf-8'));
      }
    } catch {}
    return [
      { id: '1', text: 'Deploy Agent OS to production', done: false, priority: 'high' },
      { id: '2', text: 'Connect Spotify integration', done: false, priority: 'medium' },
      { id: '3', text: 'Set up Discord bot webhook', done: true, priority: 'low' },
    ];
  }

  function writeTodos(todos) {
    try {
      writeFileSync(TODOS_PATH, JSON.stringify(todos, null, 2), 'utf-8');
    } catch (e) {
      console.error('Write todos failed:', e.message);
    }
  }

  router.get('/api/todos', (req, res) => {
    res.json({ todos: readTodos() });
  });

  router.post('/api/todos', (req, res) => {
    const { todos } = req.body;
    if (todos) {
      writeTodos(todos);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'todos array required' });
    }
  });

  return router;
}
