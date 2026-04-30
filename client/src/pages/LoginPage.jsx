import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthForm from "../components/AuthForm";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const { data } = await api.post("/auth/login", formData);
      login(data);
      navigate("/chat");
    } catch (error) {
      setError(error.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <AuthForm
        title="Login"
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        error={error}
        buttonLabel="Login"
        footer={
          <p>
            New here? <Link to="/signup">Create an account</Link>
          </p>
        }
      />
    </div>
  );
}

export default LoginPage;

