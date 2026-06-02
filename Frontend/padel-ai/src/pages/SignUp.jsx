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

  /* Decorative left panel */
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

  /* Right form side */
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
  }

  .auth-btn:hover { background: #18876300; background: #17a87c; }
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

  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
  }

  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.08);
  }

  .divider span {
    font-size: 12px;
    color: rgba(255,255,255,0.25);
  }

  @media (max-width: 640px) {
    .auth-panel { display: none; }
    .auth-form-side { padding: 32px 24px; }
  }
`;

export default function SignUp() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register({ fullName, email, password });
      navigate("/player");
    } catch (err) {
      alert(err.message || "Sign up failed");
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        {/* Left decorative panel */}
        <div className="auth-panel">
          <div className="panel-circles" />
          <div className="panel-word">grow.</div>
          <div className="panel-tagline">
            <h2>Your journey starts here.</h2>
            <p>Join thousands making progress every single day.</p>
          </div>
        </div>

        {/* Right form */}
        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-dot" />
              <span>Padel Mates</span>
            </div>

            <h1 className="auth-heading">Create account</h1>
            <p className="auth-sub">Fill in your details to get started.</p>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <div className="input-wrap">
                  <label className="input-label">Full Name</label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

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
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="auth-btn" type="submit">
                Create Account
              </button>
            </form>

            <p className="auth-footer">
              Already have an account?{" "}
              <Link to="/signin">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
