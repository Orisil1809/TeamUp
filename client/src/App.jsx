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

  useEffect(() => {
    socket.on('activities', (data) => setActivities(data));
    socket.emit('fetchActivities'); // Fetch activities on component mount
  }, []);

  const joinActivity = (id) => {
    socket.emit('joinActivity', id);
  };

  const createNewActivity = () => {
    // Format the date and time before sending to the server
    const formattedWhen = newActivity.when.toLocaleString(
      undefined, 
      { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
    ); 
    socket.emit('createActivity', { ...newActivity, when: formattedWhen });
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
      case 'Coffee':
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
    (selectedFilter === 'My Activities' && activity.participants.includes('NewUser')) || // Assuming 'NewUser' is the current user
    activity.type === selectedFilter
  );

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <h1>What's happening?</h1>
          <p>Join ongoing activities or start something new</p>
        </div>
        <div className="header-right">
          <button className="refresh-button" onClick={refreshActivities}>🔄 Refresh</button>
          <button className="new-button" onClick={() => setShowNewActivityModal(true)}>+ I'm Up For...</button>
        </div>
      </header>

      <div className="activity-filters">
        {['All Activities', 'My Activities', 'Lunch', 'Coffee', 'Ping Pong', 'Carpool', 'Beer', 'Icecream', 'Custom'].map(filter => (
          <button 
            key={filter}
            className={selectedFilter === filter ? 'active' : ''}
            onClick={() => setSelectedFilter(filter)}
          >
            <span role="img" aria-label={filter}>{getFilterIcon(filter)}</span>
            {filter}
          </button>
        ))}
      </div>

      <div className="activity-list">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((a) => (
            <div className="activity-card" key={a.id}>
              <div className="activity-icon"><span role="img" aria-label={a.type}>{getFilterIcon(a.type)}</span></div>
              <h2>{a.type}</h2>
              <p><strong>Location:</strong> {a.location}</p>
              <p><strong>When:</strong> {a.createdAt}</p>
              <p><strong>Participants:</strong> {a.participants.length}/{a.maxParticipants} <span className="spots-left">({a.maxParticipants - a.participants.length} spots left)</span></p>
              <button onClick={() => joinActivity(a.id)} className="join-activity-button">Join Activity</button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">+</div>
            <p className="empty-state-text">No activities yet</p>
            <p>Be the first to suggest something fun!</p>
            <button className="new-button" onClick={() => setShowNewActivityModal(true)}>Start an Activity</button>
          </div>
        )}
      </div>

      {showNewActivityModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Start a New Activity</h2>
            <h3>What are you up for?</h3>
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
              <button onClick={() => setShowNewActivityModal(false)}>Cancel</button>
              <button onClick={createNewActivity}>Start Activity</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
