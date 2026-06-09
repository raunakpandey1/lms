import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "../components/ProtectedRoute";
import { RoleProtectedRoute } from "../components/RoleProtectedRoute";

import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { InstructorDashboard } from "../pages/InstructorDashboard";
import { StudentDashboard } from "../pages/StudentDashboard";
import { Unauthorized } from "../pages/Unauthorized";
import { NotFound } from "../pages/NotFound";
import { CourseChapters } from "../pages/CourseChapters";
import { Test } from "../pages/Test";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route
          element={<RoleProtectedRoute allowedRoles={["instructor"]} />}
        >
          <Route
            path="/instructor/dashboard"
            element={<InstructorDashboard />}
          />
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Route>
     
        <Route
            path="/courses/:courseId/chapters"
            element={<CourseChapters />}
        /> 
        </Route>
        
        <Route
            path="/test" element={<Test />}
        /> 

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}