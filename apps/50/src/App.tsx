"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TodosPage from './pages/Index'; // Renamed from Index to TodosPage for clarity

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TodosPage />} />
        {/* Add other routes here if needed */}
      </Routes>
    </Router>
  );
}

export default App;