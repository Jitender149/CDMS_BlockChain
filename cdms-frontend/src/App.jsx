import React, { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";
import { BrowserRouter } from "react-router-dom";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
