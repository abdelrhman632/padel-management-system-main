import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

  .auth-root {
    min-height: 100vh;
    display: flex;
    font-family: 'DM Sans', sans-serif;
    background: #0e1a13;
    overflow: hidden;
    position: relative;
  }

  .auth-panel {
    width: 45%;
    background: #1D9E75;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 52px 48px;
  }

  .auth-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,255,255,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 90%, rgba(0,0,0,0.18) 0%, transparent 60%);
  }

  .panel-circles {
    position: absolute;
    top: -80px;
    right: -80px;
    width: 360px;
    height: 360px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.12);
  }
  .panel-circles::after {
    content: '';
    position: absolute;
    inset: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.08);
  }

  .panel-word {
    font-family: 'DM Serif Display', serif;
    font-style: italic;
    font-size: 72px;
    line-height: 1;
    color: rgba(255,255,255,0.12);
    letter-spacing: -2px;
    position: absolute;
    top: 50%;
    left: 48px;
    transform: translateY(-50%);
    user-select: none;
  }

  .panel-tagline {
    position: relative;
    z-index: 1;
  }

  .panel-tagline h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 36px;
    color: #fff;
    line-height: 1.2;
    margin: 0 0 12px;
    font-weight: 400;
  }

  .panel-tagline p {
    font-size: 14px;
    color: rgba(255,255,255,0.65);
    line-height: 1.6;
    margin: 0;
    max-width: 280px;
  }

  .auth-form-side {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
  }

  .auth-card {
    width: 100%;
    max-width: 380px;
  }

  .auth-logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 48px;
  }

  .auth-logo-dot {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #1D9E75;
  }

  .auth-logo span {
    font-family: 'DM Serif Display', serif;
    font-size: 20px;
    color: #fff;
    letter-spacing: -0.5px;
  }

  .auth-heading {
    font-family: 'DM Serif Display', serif;
    font-size: 34px;
    color: #fff;
    font-weight: 400;
    margin: 0 0 6px;
    letter-spacing: -0.5px;
  }

  .auth-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.4);
    margin: 0 0 36px;
    line-height: 1.5;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 24px;
  }

  .input-wrap {
    position: relative;
  }

  .input-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    margin-bottom: 7px;
  }

  .auth-input {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 10px;
    color: #fff;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.2s, background 0.2s;
    outline: none;
    box-sizing: border-box;
  }

  .auth-input::placeholder {
    color: rgba(255,255,255,0.2);
  }

  .auth-input:focus {
    border-color: #1D9E75;
    background: rgba(29,158,117,0.07);
  }

  .forgot-link {
    display: block;
    text-align: right;
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    text-decoration: none;
    margin-top: 6px;
    transition: color 0.15s;
  }

  .forgot-link:hover {
    color: #1D9E75;
  }

  .auth-btn {
    width: 100%;
    padding: 14px;
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    letter-spacing: 0.01em;
    margin-top: 8px;
  }

  .auth-btn:hover { background: #17a87c; }
  .auth-btn:active { transform: scale(0.99); }

  .auth-footer {
    margin-top: 24px;
    text-align: center;
    font-size: 13.5px;
    color: rgba(255,255,255,0.35);
  }

  .auth-footer a {
    color: #1D9E75;
    text-decoration: none;
    font-weight: 500;
  }

  .auth-footer a:hover { text-decoration: underline; }

  @media (max-width: 640px) {
    .auth-panel { display: none; }
    .auth-form-side { padding: 32px 24px; }
  }
`;

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate("/player");
    } catch (err) {
      // TODO: replace with inline error UI later
      alert(err.message || "Login failed");
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        <div className="auth-panel">
          <div className="panel-circles" />
          <div className="panel-word">welcome.</div>
          <div className="panel-tagline">
            <h2>Good to see you again.</h2>
            <p>Pick up right where you left off.</p>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-dot" />
              <span>Padel Mates</span>
            </div>

            <h1 className="auth-heading">Sign in</h1>
            <p className="auth-sub">Enter your credentials to continue.</p>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <div className="input-wrap">
                  <label className="input-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-wrap">
                  <label className="input-label">Password</label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <a href="#" className="forgot-link">Forgot password?</a>
                </div>
              </div>

              <button className="auth-btn" type="submit">
                Sign In
              </button>
            </form>

            <p className="auth-footer">
              Don't have an account?{" "}
              <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
