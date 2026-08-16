import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.id);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('userDept', data.department || '');
        localStorage.setItem('employeeId', data.employee_id || '');
        localStorage.setItem('isAdmin', data.is_admin ? 'true' : 'false');
        navigate('/home');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: 40, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: 360 }}>
        <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Saarthi Portal Login</h1>
        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6 }} />
        </div>
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: 12, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}