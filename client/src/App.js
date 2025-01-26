import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import Register from './pages/Register/Register';
import Login from './pages/Login/Login';

function App() {
  return (
    <Router>
      <div className="container mx-auto text-center mt-10">
        <h1 className="text-3xl font-bold text-purple-700">Research Paper Portal</h1>
        <p className="text-gray-600">Upload, search, and access research papers easily.</p>

        {/* Navigation Links */}
        <nav className="mt-4">
          <Link to="/register" className="btn btn-primary mx-2">Register</Link>
          <Link to="/login" className="btn btn-secondary mx-2">Login</Link>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
