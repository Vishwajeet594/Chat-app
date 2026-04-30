function AuthForm({
  title,
  formData,
  onChange,
  onSubmit,
  error,
  buttonLabel,
  isSignup = false,
  footer,
}) {
  return (
    <div className="auth-card">
      <h1>{title}</h1>
      <p className="auth-subtitle">Simple MERN chat app with JWT and Socket.io</p>

      <form onSubmit={onSubmit} className="auth-form">
        {isSignup && (
          <input
            type="text"
            name="name"
            placeholder="Your name"
            value={formData.name}
            onChange={onChange}
          />
        )}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={onChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={onChange}
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit">{buttonLabel}</button>
      </form>

      <div className="auth-footer">{footer}</div>
    </div>
  );
}

export default AuthForm;

