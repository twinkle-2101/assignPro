// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import SignUp from "./components/login_details/SignUp.jsx";
import Login from "./components/login_details/Login.jsx";
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import Notification from './components/Notification.jsx';
import AdminDashboard from "./components/Dashboard/AdminDashboard.jsx";
import FacultyDashboard from "./components/Dashboard/FacultyDashboard.jsx";
import StudentDashboard from "./components/Dashboard/StudentDashboard.jsx";
import LandingPage from "./components/LandingPage/LandingPage.jsx";
// import StudentAssignmentList from "./components/Assignment/StudentAssignmentList.js";
// import FacultyAssignmentList from "./components/Assignment/FacultyAssignmentList.js";
// import ClassroomList from "./components/Classroom/ClassroomList.js";
// import CreateClassroom from "./components/Classroom/CreateClassroom.jsx";
import { UpdateProvider } from './context/UpdateContext.jsx';
import About from './components/About/About.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, userRole, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        // Redirect based on role
        switch (userRole) {
            case 'Admin':
                return <Navigate to="/admin-dashboard" />;
            case 'Faculty':
                return <Navigate to="/faculty-dashboard" />;
            case 'Student':
                return <Navigate to="/student-dashboard" />;
            default:
                return <Navigate to="/login" />;
        }
    }

    return children;
};

function App() {
    return (
        <ErrorBoundary>
            <UpdateProvider>
                <AuthProvider>
                    <Router>
                        <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/login" element={<Login />} />
                        <Route
                            path="/admin-dashboard"
                            element={
                                <ProtectedRoute allowedRoles={["Admin"]}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/faculty-dashboard"
                            element={
                                <ProtectedRoute allowedRoles={["Faculty"]}>
                                    <FacultyDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/student-dashboard"
                            element={
                                <ProtectedRoute allowedRoles={["Student"]}>
                                    <StudentDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/about" element={<About />} />
                        {/* <Route path="/classroom/:id/student-assignments" element={
                            <ProtectedRoute allowedRoles={["Student"]}>
                                <StudentAssignmentList />
                            </ProtectedRoute>
                        } />
                        <Route path="/classroom/:id/faculty-assignments" element={
                            <ProtectedRoute allowedRoles={["Faculty"]}>
                                <FacultyAssignmentList />
                            </ProtectedRoute>
                        } />
                        <Route path="/classrooms" element={
                            <ProtectedRoute allowedRoles={["Faculty"]}>
                                <ClassroomList />
                            </ProtectedRoute>
                        } />
                        <Route path="/create-classroom" element={
                            <ProtectedRoute allowedRoles={["Faculty"]}>
                                <CreateClassroom />
                            </ProtectedRoute>
                        } /> */}
                    </Routes>
                </Router>
            </AuthProvider>
        </UpdateProvider>
        </ErrorBoundary>
    );
}

export default App;