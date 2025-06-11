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
    location: '',
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
    setNewActivity({ type: '', location: '', maxParticipants: 4 });
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
            <h2>Create New Activity</h2>
            <select 
              value={newActivity.type} 
              onChange={(e) => setNewActivity({...newActivity, type: e.target.value})}
            >
              <option value="">Select Activity Type</option>
              <option value="Lunch">Lunch</option>
              <option value="Coffee">Coffee</option>
              <option value="Ping Pong">Ping Pong</option>
              <option value="Carpool">Carpool</option>
              <option value="Walk">Walk</option>
              <option value="Brainstorm">Brainstorm</option>
            </select>
            <input 
              type="text" 
              placeholder="Location" 
              value={newActivity.location}
              onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Max Participants" 
              value={newActivity.maxParticipants}
              onChange={(e) => setNewActivity({...newActivity, maxParticipants: parseInt(e.target.value)})}
              min="2"
              max="10"
            />
            <div className="modal-buttons">
              <button onClick={createNewActivity}>Create</button>
              <button onClick={() => setShowNewActivityModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
