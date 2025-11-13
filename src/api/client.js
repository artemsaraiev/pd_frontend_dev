import axios from 'axios';
export const BASE_URL = 'http://localhost:8000/api';
export async function post(path, body) {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
    const data = res.data;
    if (data && typeof data === 'object' && 'error' in data && data.error) {
        throw new Error(String(data.error));
    }
    return data;
}
