import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthForm from "../components/AuthForm";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
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
      const { data } = await api.post("/auth/register", formData);
      login(data);
      navigate("/chat");
    } catch (error) {
      setError(error.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="auth-page">
      <AuthForm
        title="Create Account"
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        error={error}
        buttonLabel="Sign Up"
        isSignup
        footer={
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        }
      />
    </div>
  );
}

export default SignupPage;

