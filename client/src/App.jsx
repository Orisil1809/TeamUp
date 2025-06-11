import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';

const socket = io('http://localhost:4000');

function App() {
  const [activities, setActivities] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All Activities');
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: '',
    activityName: '',
    location: '',
    when: new Date(),
    maxParticipants: 4
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // true for login, false for signup
  const [authForm, setAuthForm] = useState({ fullName: '', email: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [newActivityError, setNewActivityError] = useState('');

  useEffect(() => {
    // const storedUser = localStorage.getItem('currentUser');
    // if (storedUser) {
    //   setCurrentUser(JSON.parse(storedUser));
    // }

    socket.on('activities', (data) => setActivities(data));

    socket.on('loginSuccess', (user) => {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setShowAuthModal(false);
      setAuthForm({ fullName: '', email: '' });
      setAuthError('');
      setAuthSuccess(`Logged in as ${user.fullName}`);
      setTimeout(() => setAuthSuccess(''), 3000);
      socket.emit('fetchActivities');
    });

    socket.on('loginFailure', (message) => {
      setAuthError(message);
    });

    socket.on('signupSuccess', (user) => {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setShowAuthModal(false);
      setAuthForm({ fullName: '', email: '' });
      setAuthError('');
      setAuthSuccess(`Welcome ${user.fullName}!`);
      setTimeout(() => setAuthSuccess(''), 3000);
      socket.emit('fetchActivities');
    });

    socket.on('signupFailure', (message) => {
      setAuthError(message);
    });

    socket.emit('fetchActivities'); // Fetch activities on component mount

    socket.on('activityUpdated', (updatedActivity) => {
      setActivities(prevActivities => 
        prevActivities.map(activity => 
          activity.id === updatedActivity.id ? updatedActivity : activity
        )
      );
      setShowEditActivityModal(false);
      setEditingActivity(null);
    });

    socket.on('activityDeleted', (deletedActivityId) => {
      setActivities(prevActivities => prevActivities.filter(activity => activity.id !== deletedActivityId));
    });

    socket.on('activityLeft', ({ activityId, fullName }) => {
      setActivities(prevActivities =>
        prevActivities.map(activity =>
          activity.id === activityId
            ? { ...activity, participants: activity.participants.filter(p => p !== fullName) }
            : activity
        )
      );
    });

    return () => {
      socket.off('activities');
      socket.off('loginSuccess');
      socket.off('loginFailure');
      socket.off('signupSuccess');
      socket.off('signupFailure');
      socket.off('activityUpdated');
      socket.off('activityDeleted');
      socket.off('activityLeft');
    };
  }, []);

  const handleAuthChange = (e) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = () => {
    setAuthError(''); // Clear previous errors

    if (!authForm.fullName.trim()) {
      setAuthError('Full Name cannot be empty.');
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(authForm.email)) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (isLogin) {
      socket.emit('login', authForm);
    } else {
      socket.emit('signup', authForm);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setAuthForm({ fullName: '', email: '', id: '' });
    setAuthError('');
    socket.emit('fetchActivities'); // Refresh activities after logout
  };

  const joinActivity = (id) => {
    if (currentUser) {
      socket.emit('joinActivity', { activityId: id, userId: currentUser.id, fullName: currentUser.fullName });
    } else {
      setAuthError('Please log in to join an activity.');
      setShowAuthModal(true);
    }
  };

  const handleLeaveActivity = (activityId) => {
    if (currentUser) {
      socket.emit('leaveActivity', { activityId, userId: currentUser.id, fullName: currentUser.fullName });
    }
  };

  const handleEditActivity = (activity) => {
    setEditingActivity({ 
      ...activity, 
      when: new Date(activity.createdAt), // Convert createdAt string back to Date object for DatePicker
      activityName: activity.type === 'Custom' ? activity.activityName : activity.type // Set activityName to type for non-custom activities
    });
    setShowEditActivityModal(true);
  };

  const handleUpdateActivity = () => {
    if (editingActivity) {
      const formattedWhen = editingActivity.when.toLocaleString(
        undefined, 
        { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      ); 
      socket.emit('updateActivity', { ...editingActivity, createdAt: formattedWhen });
      setShowEditActivityModal(false);
      setEditingActivity(null);
    }
  };

  const handleDeleteActivity = (activityId) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      socket.emit('deleteActivity', activityId);
    }
  };

  const createNewActivity = () => {
    if (!currentUser) {
      setAuthError('Please log in to create an activity.');
      setShowAuthModal(true);
      return;
    }

    setNewActivityError(''); // Clear previous errors

    if (newActivity.when < new Date()) {
      setNewActivityError('Activity cannot be created in the past.');
      return;
    }

    const formattedWhen = newActivity.when.toLocaleString(
      undefined, 
      { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    ); 
    socket.emit('createActivity', { ...newActivity, when: formattedWhen, userId: currentUser.id, fullName: currentUser.fullName });
    setShowNewActivityModal(false);
    setNewActivity({ type: '', activityName: '', location: '', when: new Date(), maxParticipants: 4 });
  };

  const refreshActivities = () => {
    socket.emit('fetchActivities');
  };

  const getFilterIcon = (filterType) => {
    switch (filterType) {
      case 'All Activities':
        return '🌐';
      case 'My Activities':
        return '👤';
      case 'Lunch':
        return '🍽️';
      case 'Coffee Break':
        return '☕';
      case 'Ping Pong':
        return '🏓';
      case 'Carpool':
        return '🚗';
      case 'Beer':
        return '🍺';
      case 'Icecream':
        return '🍦';
      case 'Custom':
        return '⭐';
      default:
        return '';
    }
  };

  const filteredActivities = activities.filter(activity => 
    selectedFilter === 'All Activities' || 
    (selectedFilter === 'My Activities' && activity.participants.includes(currentUser ? currentUser.fullName : '')) ||
    activity.type === selectedFilter
  );

  return (
    <div className="app">
      {authSuccess && <div className="success-message">{authSuccess}</div>}
      <header>
        <div className="header-left">
          <h1>TeamUp</h1>
          <p>Join ongoing activities or start something new</p>
        </div>
        <div className="header-right">
          <button className="refresh-button" onClick={refreshActivities}>🔄 Refresh</button>
          {currentUser ? (
            <button className="new-button" onClick={handleLogout}>Logout ({currentUser.fullName})</button>
          ) : (
            <button className="new-button" onClick={() => { setShowAuthModal(true); setIsLogin(true); }}>Login/Signup</button>
          )}
          <button 
            className="new-button"
            onClick={() => setShowNewActivityModal(true)}
            disabled={!currentUser} /* Disable if not logged in */
          >+ I'm Up For...</button>
        </div>
      </header>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
            {authError && <p className="error-message">{authError}</p>}
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={authForm.fullName}
              onChange={handleAuthChange}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={authForm.email}
              onChange={handleAuthChange}
            />
            <div className="modal-buttons">
              <button onClick={handleAuthSubmit}>{isLogin ? 'Login' : 'Sign Up'}</button>
              <button onClick={() => setShowAuthModal(false)}>Cancel</button>
            </div>
            <p className="auth-toggle-text">
              {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
              <span onClick={() => setIsLogin(!isLogin)} className="auth-toggle-link">
                {isLogin ? ' Sign Up' : ' Login'}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="activity-filters">
        <div className="main-filters">
          {['All Activities', 'My Activities', 'Lunch', 'Coffee Break', 'Ping Pong', 'Carpool', 'Beer', 'Icecream', 'Custom'].map(filter => (
            <button 
              key={filter}
              className={`
                ${selectedFilter === filter ? 'active' : ''}
                ${filter === 'All Activities' ? 'all-activities-button' : ''}
              `.trim()}
              onClick={() => setSelectedFilter(filter)}
            >
              <span role="img" aria-label={filter}>{getFilterIcon(filter)}</span>
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="activity-list">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((a) => (
            <div className="activity-card" key={a.id}>
              <div className="activity-icon"><span role="img" aria-label={a.type}>{getFilterIcon(a.type)}</span></div>
              <h2>{a.type}</h2>
              <p><strong>Creator:</strong> {a.creator.fullName}</p>
              <p><strong>Location:</strong> {a.location}</p>
              <p><strong>When:</strong> {a.createdAt}</p>
              <p><strong>Participants:</strong> {a.participants.length}/{a.maxParticipants} <span className="spots-left">({a.maxParticipants - a.participants.length} spots left)</span></p>
              <p className="participant-list">{a.participants.map(p => `👤 ${p}`).join(', ')}</p>
              <div className="activity-card-buttons">
                {currentUser && a.creator.id === currentUser.id ? (
                  <>
                    <button className="edit-activity-button" onClick={() => handleEditActivity(a)}>Edit</button>
                    <button className="delete-activity-button" onClick={() => handleDeleteActivity(a.id)}>Delete</button>
                  </>
                ) : currentUser && a.participants.includes(currentUser.fullName) ? (
                  <button className="leave-activity-button" onClick={() => handleLeaveActivity(a.id)}>Leave</button>
                ) : (
                  <button 
                    onClick={() => joinActivity(a.id)}
                    className="join-activity-button"
                    disabled={!currentUser || a.participants.length >= a.maxParticipants || a.participants.includes(currentUser.fullName)}
                  >
                    {a.participants.length >= a.maxParticipants ? 'Full' : 'Join Activity'}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">+</div>
            <p className="empty-state-text">No activities yet</p>
            <p>Be the first to suggest something fun!</p>
            <button 
              className="new-button" 
              onClick={() => { 
                if (currentUser) {
                  setShowNewActivityModal(true);
                } else {
                  setShowAuthModal(true);
                  setIsLogin(false);
                }
              }}
            >Start an Activity</button>
          </div>
        )}
      </div>

      {showNewActivityModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Start a New Activity</h2>
            <h3>What are you up for?</h3>
            {newActivityError && <p className="error-message">{newActivityError}</p>}
            <div className="activity-type-selection">
              <button 
                className={`activity-type-button ${newActivity.type === 'Lunch' ? 'selected lunch' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Lunch', activityName: 'Lunch'})}
              >
                <span role="img" aria-label="lunch">🍽️</span>
                <span>Lunch</span>
              </button>
              <button 
                className={`activity-type-button ${newActivity.type === 'Coffee Break' ? 'selected coffee' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Coffee Break', activityName: 'Coffee Break'})}
              >
                <span role="img" aria-label="coffee">☕</span>
                <span>Coffee Break</span>
              </button>
              <button 
                className={`activity-type-button ${newActivity.type === 'Ping Pong' ? 'selected pingpong' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Ping Pong', activityName: 'Ping Pong'})}
              >
                <span role="img" aria-label="ping pong">🏓</span>
                <span>Ping Pong</span>
              </button>
              <button 
                className={`activity-type-button ${newActivity.type === 'Carpool' ? 'selected carpool' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Carpool', activityName: 'Carpool'})}
              >
                <span role="img" aria-label="carpool">🚗</span>
                <span>Carpool</span>
              </button>
              <button 
                className={`activity-type-button ${newActivity.type === 'Beer' ? 'selected beer' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Beer', activityName: 'Beer'})}
              >
                <span role="img" aria-label="beer">🍺</span>
                <span>Beer</span>
              </button>
              <button 
                className={`activity-type-button ${newActivity.type === 'Icecream' ? 'selected icecream' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Icecream', activityName: 'Icecream'})}
              >
                <span role="img" aria-label="icecream">🍦</span>
                <span>Icecream</span>
              </button>
              <button 
                className={`activity-type-button ${newActivity.type === 'Custom' ? 'selected custom' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Custom'})}
              >
                <span role="img" aria-label="custom">⭐</span>
                <span>Custom</span>
              </button>
            </div>

            <h3 className="input-label">Activity Name</h3>
            <input 
              type="text" 
              placeholder="What's the activity?" 
              value={newActivity.activityName || ''}
              onChange={(e) => setNewActivity({...newActivity, activityName: e.target.value})}
              disabled={newActivity.type !== 'Custom'}
            />

            <div className="form-row">
              <div className="form-group">
                <h3 className="input-label">When?</h3>
                <DatePicker
                  selected={newActivity.when}
                  onChange={(date) => setNewActivity({ ...newActivity, when: date })}
                  showTimeSelect
                  dateFormat="Pp"
                  className="date-picker-input"
                  minDate={new Date()} // Prevent selecting past dates
                />
              </div>
              <div className="form-group">
                <h3 className="input-label">Where? (optional)</h3>
                <input 
                  type="text" 
                  placeholder="Cafeteria, Game Room, etc." 
                  value={newActivity.location}
                  onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                />
              </div>
            </div>

            <h3 className="input-label">Maximum participants</h3>
            <select 
              value={newActivity.maxParticipants}
              onChange={(e) => setNewActivity({...newActivity, maxParticipants: parseInt(e.target.value)})}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num} people</option>
              ))}
            </select>

            <div className="modal-buttons">
              <button onClick={() => { setShowNewActivityModal(false); setNewActivityError(''); }}>Cancel</button>
              <button onClick={createNewActivity}>Start Activity</button>
            </div>
          </div>
        </div>
      )}

      {showEditActivityModal && editingActivity && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Activity</h2>
            <h3>What are you up for?</h3>
            <div className="activity-type-selection">
              <button 
                className={`activity-type-button ${editingActivity.type === 'Lunch' ? 'selected lunch' : ''}`}
                onClick={() => setEditingActivity({...editingActivity, type: 'Lunch', activityName: 'Lunch'})}
              >
                <span role="img" aria-label="lunch">🍽️</span>
                <span>Lunch</span>
              </button>
              <button 
                className={`activity-type-button ${editingActivity.type === 'Coffee Break' ? 'selected coffee' : ''}`}
                onClick={() => setEditingActivity({...editingActivity, type: 'Coffee Break', activityName: 'Coffee Break'})}
              >
                <span role="img" aria-label="coffee">☕</span>
                <span>Coffee Break</span>
              </button>
              <button 
                className={`activity-type-button ${editingActivity.type === 'Ping Pong' ? 'selected pingpong' : ''}`}
                onClick={() => setEditingActivity({...editingActivity, type: 'Ping Pong', activityName: 'Ping Pong'})}
              >
                <span role="img" aria-label="ping pong">🏓</span>
                <span>Ping Pong</span>
              </button>
              <button 
                className={`activity-type-button ${editingActivity.type === 'Carpool' ? 'selected carpool' : ''}`}
                onClick={() => setEditingActivity({...editingActivity, type: 'Carpool', activityName: 'Carpool'})}
              >
                <span role="img" aria-label="carpool">🚗</span>
                <span>Carpool</span>
              </button>
              <button 
                className={`activity-type-button ${editingActivity.type === 'Beer' ? 'selected beer' : ''}`}
                onClick={() => setEditingActivity({...editingActivity, type: 'Beer', activityName: 'Beer'})}
              >
                <span role="img" aria-label="beer">🍺</span>
                <span>Beer</span>
              </button>
              <button 
                className={`activity-type-button ${editingActivity.type === 'Icecream' ? 'selected icecream' : ''}`}
                onClick={() => setEditingActivity({...editingActivity, type: 'Icecream', activityName: 'Icecream'})}
              >
                <span role="img" aria-label="icecream">🍦</span>
                <span>Icecream</span>
              </button>
              <button 
                className={`activity-type-button ${editingActivity.type === 'Custom' ? 'selected custom' : ''}`}
                onClick={() => setEditingActivity({...editingActivity, type: 'Custom'})}
              >
                <span role="img" aria-label="custom">⭐</span>
                <span>Custom</span>
              </button>
            </div>

            <h3 className="input-label">Activity Name</h3>
            <input 
              type="text" 
              placeholder="What's the activity?" 
              value={editingActivity.activityName || ''}
              onChange={(e) => setEditingActivity({...editingActivity, activityName: e.target.value})}
              disabled={editingActivity.type !== 'Custom'}
            />
            <div className="form-row">
              <div className="form-group">
                <h3 className="input-label">When?</h3>
                <DatePicker
                  selected={editingActivity.when}
                  onChange={(date) => setEditingActivity({ ...editingActivity, when: date })}
                  showTimeSelect
                  dateFormat="Pp"
                  className="date-picker-input"
                  minDate={new Date()} // Prevent selecting past dates
                />
              </div>
              <div className="form-group">
                <h3 className="input-label">Where? (optional)</h3>
                <input 
                  type="text" 
                  placeholder="Cafeteria, Game Room, etc." 
                  value={editingActivity.location}
                  onChange={(e) => setEditingActivity({...editingActivity, location: e.target.value})}
                />
              </div>
            </div>

            <h3 className="input-label">Maximum participants</h3>
            <select 
              value={editingActivity.maxParticipants}
              onChange={(e) => setEditingActivity({...editingActivity, maxParticipants: parseInt(e.target.value)})}
              disabled={true}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num} people</option>
              ))}
            </select>

            <div className="modal-buttons">
              <button onClick={() => setShowEditActivityModal(false)}>Cancel</button>
              <button onClick={handleUpdateActivity}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
