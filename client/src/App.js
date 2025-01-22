import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import Register from './pages/Register/Register';
function App() {
  return (
    <div className="container mx-auto text-center mt-10">
      <h1 className="text-3xl font-bold text-purple-700">Research Paper Portal</h1>
      <p className="text-gray-600">Upload, search, and access research papers easily.</p>
      <Register/>
    </div>
  );
}

export default App;
