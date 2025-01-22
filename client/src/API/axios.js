import axios from 'axios';

export default axios.create({
    baseURL: 'https://api.example.com', // Replace with your API base URL
    timeout: 1000,
    headers: { 'Content-Type': 'application/json' }
});
