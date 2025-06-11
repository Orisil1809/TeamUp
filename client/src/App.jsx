import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
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
    when: 'Right now',
    maxParticipants: 4
  });

  useEffect(() => {
    socket.on('activities', (data) => setActivities(data));
  }, []);

  const joinActivity = (id) => {
    socket.emit('joinActivity', id);
  };

  const createNewActivity = () => {
    socket.emit('createActivity', newActivity);
    setShowNewActivityModal(false);
    setNewActivity({ type: '', activityName: '', location: '', when: 'Right now', maxParticipants: 4 });
  };

  const filteredActivities = activities.filter(activity => 
    selectedFilter === 'All Activities' || activity.type === selectedFilter
  );

  return (
    <div className="app">
      <header>
        <h1>What's happening?</h1>
        <p>Join ongoing activities or start something new</p>
        <button className="new-button" onClick={() => setShowNewActivityModal(true)}>+ I'm Up For...</button>
      </header>

      <div className="activity-filters">
        {['All Activities', 'Lunch', 'Coffee', 'Ping Pong', 'Carpool', 'Walk', 'Brainstorm'].map(filter => (
          <button 
            key={filter}
            className={selectedFilter === filter ? 'active' : ''}
            onClick={() => setSelectedFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="activity-list">
        {filteredActivities.map((a) => (
          <div className="activity-card" key={a.id}>
            <div className="activity-icon">🚗</div>
            <h2>{a.type}</h2>
            <p><strong>Location:</strong> {a.location}</p>
            <p><strong>Started:</strong> {a.createdAt}</p>
            <p><strong>Participants:</strong> {a.participants.length}/{a.maxParticipants} <span className="spots-left">({a.maxParticipants - a.participants.length} spots left)</span></p>
            <button onClick={() => joinActivity(a.id)}>Join Activity</button>
          </div>
        ))}
      </div>

      {showNewActivityModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Start a New Activity</h2>
            <h3>What are you up for?</h3>
            <div className="activity-type-selection">
              <button 
                className={`activity-type-button ${newActivity.type === 'Lunch' ? 'selected lunch' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Lunch', activityName: 'Lunch'})
              }>
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
                className={`activity-type-button ${newActivity.type === 'Walk' ? 'selected walk' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Walk', activityName: 'Walk'})}
              >
                <span role="img" aria-label="walk">🚶</span>
                <span>Walk</span>
              </button>
              <button 
                className={`activity-type-button ${newActivity.type === 'Brainstorm' ? 'selected brainstorm' : ''}`}
                onClick={() => setNewActivity({...newActivity, type: 'Brainstorm', activityName: 'Brainstorm'})}
              >
                <span role="img" aria-label="brainstorm">💡</span>
                <span>Brainstorm</span>
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
                <select 
                  value={newActivity.when} 
                  onChange={(e) => setNewActivity({...newActivity, when: e.target.value})}
                >
                  <option value="Right now">Right now</option>
                  {/* Add more time options here if needed */}
                </select>
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
