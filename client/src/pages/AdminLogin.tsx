import React, {useState} from 'react';
import {login} from '../services/api';
import {Button, Card, Input} from '../components/ui';

interface Props {
  onLogin: (token: string) => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      onLogin(data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '1rem'
      }}>
        <Card centered style={{width: '100%', maxWidth: '400px', padding: '2.5rem'}}>
          <h1 style={{marginBottom: '2rem', fontSize: '2rem'}}>🧠 Quizzy Admin</h1>
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                   required/>
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                   required/>
            {error && <div style={{color: '#e74c3c', textAlign: 'center', fontSize: '0.9rem'}}>{error}</div>}
            <Button type="submit" fullWidth disabled={loading} style={{marginTop: '0.5rem'}}>
            {loading ? 'Logging in...' : 'Login'}
            </Button>
        </form>
        </Card>
    </div>
  );
}
