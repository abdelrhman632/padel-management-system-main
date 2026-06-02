import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import '../styles/PlayerProfile.css';

export default function PlayerProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('padel_token');
        if (!token) {
          navigate('/signin');
          return;
        }

        const data = await apiFetch('/Players/me');
        setProfile(data);
      } catch (err) {
        setError(err.message || 'Failed to load profile');
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  if (loading) {
    return <div className="profile-container"><p>Loading profile...</p></div>;
  }

  if (error) {
    return (
      <div className="profile-container">
        <p className="error">Error: {error}</p>
        <button onClick={() => navigate('/signin')}>Back to Sign In</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <p>No profile found</p>
        <button onClick={() => navigate('/signin')}>Back to Sign In</button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1>Player Profile</h1>
        <div className="profile-section">
          <h2>Personal Info</h2>
          <div className="profile-row">
            <label>Name:</label>
            <span>{profile.fullName}</span>
          </div>
          <div className="profile-row">
            <label>Email:</label>
            <span>{profile.email}</span>
          </div>
          <div className="profile-row">
            <label>User ID:</label>
            <span>{profile.userId}</span>
          </div>
          <div className="profile-row">
            <label>Player ID:</label>
            <span>{profile.playerId}</span>
          </div>
        </div>

        <div className="profile-section">
          <h2>Stats</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">ELO Rating</div>
              <div className="stat-value">{profile.eloRating}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Skill Level</div>
              <div className="stat-value">{profile.skillLevel}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Matches</div>
              <div className="stat-value">{profile.totalMatches}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Wins</div>
              <div className="stat-value win">{profile.wins}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Losses</div>
              <div className="stat-value loss">{profile.losses}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Win Rate</div>
              <div className="stat-value">
                {profile.totalMatches > 0 ? ((profile.wins / profile.totalMatches) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={() => navigate('/')} className="btn-primary">Dashboard</button>
          <button 
            onClick={() => {
              localStorage.removeItem('padel_token');
              localStorage.removeItem('padel_user');
              navigate('/signin');
            }} 
            className="btn-secondary"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
