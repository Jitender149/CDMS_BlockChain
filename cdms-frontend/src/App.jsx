import React, { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";



const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
