const API_BASE = '/api';

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Login failed');
  }
  return res.json();
}

export async function register(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Registration failed');
  }
  return res.json();
}

export async function getQuizzes(token: string) {
  const res = await fetch(`${API_BASE}/quizzes`, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch quizzes');
  return res.json();
}

export async function getQuiz(token: string, id: number) {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch quiz');
  return res.json();
}

export async function createQuiz(token: string, data: unknown) {
  const res = await fetch(`${API_BASE}/quizzes`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create quiz');
  }
  return res.json();
}

export async function updateQuiz(token: string, id: number, data: unknown) {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update quiz');
  }
  return res.json();
}

export async function deleteQuiz(token: string, id: number) {
  const res = await fetch(`${API_BASE}/quizzes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to delete quiz');
  return res.json();
}

export async function exportQuiz(token: string, id: number) {
  const res = await fetch(`${API_BASE}/quizzes/${id}/export`, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Failed to export quiz');
  return res.json();
}

export async function importQuiz(token: string, data: unknown) {
  const res = await fetch(`${API_BASE}/quizzes/import`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import quiz');
  }
  return res.json();
}
