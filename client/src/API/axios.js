import axios from 'axios';

export default axios.create({
    baseURL: '', 
    timeout: 1000,
    headers: { 'Content-Type': 'application/json' }
});
