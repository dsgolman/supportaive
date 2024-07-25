import axios from 'axios';

const instance = axios.create({
  baseURL: '/api', // Base URL for API requests
  headers: {
    'Content-Type': 'application/json', // Default to sending JSON
  },
  // Optional: You can set other default configurations here if needed
});

// Optional: Add interceptors here if needed
// instance.interceptors.request.use(config => {
//   const token = localStorage.getItem('token'); // Or another method for fetching the token
//   if (token) {
//     config.headers['Authorization'] = `Bearer ${token}`;
//   }
//   return config;
// });

export default instance;
