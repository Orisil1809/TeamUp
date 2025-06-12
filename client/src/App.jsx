import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './App.css';
import logo from './assets/logo.png'; // Import the logo image

const socket = io('http://localhost:4000');

function App() {
  const [activities, setActivities] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All Activities');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('All'); // New state for time filter
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: '',
    activityName: '',
    location: '',
    when: new Date(),
    maxParticipants: 4,
    isPrivate: false // New field for privacy setting
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteActivityId, setInviteActivityId] = useState(null);
  const [invitedUserName, setInvitedUserName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteMessageType, setInviteMessageType] = useState('');
  const [showNotifications, setShowNotifications] = useState(false); // New state for notifications dropdown
  const [userInvitations, setUserInvitations] = useState([]); // New state to store user invitations
  const [searchQuery, setSearchQuery] = useState(''); // New state for search query
  const [searchResultIds, setSearchResultIds] = useState(null); // New state for search results (null for no search, empty array for no matches)
  const [searchMessage, setSearchMessage] = useState(''); // New state for search feedback message
  const [showSearchFeedback, setShowSearchFeedback] = useState(false); // New state for search feedback modal

  useEffect(() => {
    console.log('useEffect triggered. Current User:', currentUser);
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

    // Fetch invitations when current user changes
    if (currentUser) {
      fetchInvitations();
    }

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
  }, [currentUser]);

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
    setAuthSuccess(''); // Clear success message on logout
    setUserInvitations([]); // Clear invitations on logout
    socket.emit('fetchActivities'); // Refresh activities after logout
  };

  const fetchInvitations = async () => {
    if (!currentUser) {
      setUserInvitations([]); // Clear invitations if no current user
      return;
    }
    try {
      console.log(`Fetching invitations for user: ${currentUser.fullName}`);
      const response = await fetch(`http://localhost:4000/api/invitations?userName=${encodeURIComponent(currentUser.fullName)}`);
      const data = await response.json();
      console.log('Invitations fetched response:', data);
      if (response.ok) {
        setUserInvitations(data);
      } else {
        console.error('Failed to fetch invitations:', data.message);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleAcceptInvitation = async (invitation) => {
    if (!currentUser) return;
    try {
      const response = await fetch('http://localhost:4000/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId: invitation.activityId,
          invitedUserName: currentUser.fullName,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log(data.message);
        fetchInvitations(); // Refresh invitations
        // Optionally close notifications dropdown after action
        // setShowNotifications(false);
      } else {
        console.error('Failed to accept invitation:', data.message);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDeclineInvitation = async (invitation) => {
    if (!currentUser) return;
    try {
      const response = await fetch('http://localhost:4000/api/invitations/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId: invitation.activityId,
          invitedUserName: currentUser.fullName,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log(data.message);
        fetchInvitations(); // Refresh invitations
        // Optionally close notifications dropdown after action
        // setShowNotifications(false);
      } else {
        console.error('Failed to decline invitation:', data.message);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!currentUser || !inviteActivityId || !invitedUserName.trim()) {
      setInviteMessage('Please enter a user name to invite.');
      setInviteMessageType('error');
      return;
    }

    try {
      const response = await fetch('http://localhost:4000/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId: inviteActivityId,
          invitedUserName: invitedUserName.trim(),
          invitedByUserId: currentUser.id,
        }),
      });
      const data = await response.json();
      setInviteMessage(data.message);
      if (response.ok) {
        setInviteMessageType('success');
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteActivityId(null);
          setInvitedUserName('');
          setInviteMessage('');
          setInviteMessageType('');
        }, 2000); // Close modal and clear message after 2 seconds
      } else {
        setInviteMessageType('error');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      setInviteMessage('Failed to send invitation.');
      setInviteMessageType('error');
    }
  };

  // Helper function to format relative time
  const formatRelativeTime = (dateString) => {
    // Parse DD/MM/YYYY, HH:MM string manually for robust date creation
    const parts = dateString.split(/\D+/).filter(Boolean); // Split by non-digits, filter empty strings
    let date;
    if (parts.length >= 5) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const minute = parseInt(parts[4], 10);
      date = new Date(year, month, day, hour, minute);
    } else {
      // Fallback for unexpected formats, though not ideal
      date = new Date(dateString);
    }

    const now = new Date();
    const diffSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

    let relativeTimeText;
    let isPast = false;

    if (diffSeconds < 0) { // Past
      isPast = true;
      const absDiffSeconds = Math.abs(diffSeconds);
      if (absDiffSeconds < 60) relativeTimeText = `${absDiffSeconds} seconds ago`;
      else {
        const diffMinutes = Math.floor(absDiffSeconds / 60);
        if (diffMinutes < 60) relativeTimeText = `${diffMinutes} minutes ago`;
        else {
          const diffHours = Math.floor(diffMinutes / 60);
          if (diffHours < 24) relativeTimeText = `${diffHours} hours ago`;
          else {
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) relativeTimeText = `${diffDays} days ago`;
            else relativeTimeText = `on ${date.toLocaleDateString('en-GB')}`; // Use en-GB for DD/MM/YYYY
          }
        }
      }
    } else if (diffSeconds < 60) { // Future - less than 1 minute
      relativeTimeText = `in ${diffSeconds} seconds`;
    } else {
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) relativeTimeText = `in ${diffMinutes} minutes`;
      else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) relativeTimeText = `in ${diffHours} hours`;
        else {
          const diffDays = Math.floor(diffHours / 24);
          if (diffDays < 7) relativeTimeText = `in ${diffDays} days`;
          else relativeTimeText = `on ${date.toLocaleDateString('en-GB')}`; // Use en-GB for DD/MM/YYYY
        }
      }
    }
    return { text: relativeTimeText, isPast };
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
      activityName: activity.type === 'Custom' ? activity.activityName : activity.type, // Set activityName to type for non-custom activities
      isPrivate: activity.isPrivate || false // Ensure isPrivate is set, default to false
    });
    setShowEditActivityModal(true);
  };

  const handleUpdateActivity = () => {
    if (editingActivity) {
      const formattedWhen = editingActivity.when.toLocaleString(
        'en-GB', // Specify locale for DD/MM/YYYY format
        { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } // Explicitly define format components
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

    if (!newActivity.type) {
      setNewActivityError('Please select an activity type.');
      return;
    }

    // Validate custom activity name
    if (newActivity.type === 'Custom' && !newActivity.activityName.trim()) {
      setNewActivityError('Please enter a name for your custom activity.');
      return;
    }

    if (newActivity.when < new Date()) {
      setNewActivityError('Activity cannot be created in the past.');
      return;
    }

    const formattedWhen = newActivity.when.toLocaleString(
      'en-GB', // Specify locale for DD/MM/YYYY format
      { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } // Explicitly define format components
    ); 
    socket.emit('createActivity', { ...newActivity, when: formattedWhen, userId: currentUser.id, fullName: currentUser.fullName });
    setShowNewActivityModal(false);
    setNewActivity({ type: '', activityName: '', location: '', when: new Date(), maxParticipants: 4, isPrivate: false }); // Reset isPrivate to false
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

  // Helper function to parse DD/MM/YYYY HH:MM string into a Date object
  const parseDateString = (dateString) => {
    const parts = dateString.split(/\D+/).filter(Boolean); // Split by non-digits, filter empty strings
    if (parts.length >= 5) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const minute = parseInt(parts[4], 10);
      return new Date(year, month, day, hour, minute);
    } else {
      return new Date(dateString); // Fallback for unexpected formats
    }
  };

  // Helper function to check if a date is today
  const isToday = (dateString) => {
    const date = parseDateString(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Helper function to check if a date is tomorrow
  const isTomorrow = (dateString) => {
    const date = parseDateString(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Reset time for accurate date comparison
    date.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    return date.getTime() === tomorrow.getTime();
  };

  // Helper function to check if a date is this week
  const isThisWeek = (dateString) => {
    const date = parseDateString(dateString);
    const today = new Date();
    // Reset time for accurate date comparison
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Set to Sunday (0) of current week

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to Saturday (6) of current week

    return date >= startOfWeek && date <= endOfWeek;
  };

  const filteredActivities = activities.filter(activity => {
    // Check if the activity is private and if the current user has access
    const isPrivate = activity.isPrivate;
    const isCreator = currentUser && activity.creator.id === currentUser.id;
    const isParticipant = currentUser && activity.participants.includes(currentUser.fullName);
    const hasAccessToPrivate = !isPrivate || isCreator || isParticipant;

    if (!hasAccessToPrivate) {
      return false; // Filter out private activities if user doesn't have access
    }

    // Apply search filter if a search has been performed
    if (searchResultIds !== null) {
      if (searchResultIds.length === 0) {
        return false; // No matches from search
      } else if (!searchResultIds.includes(activity.id)) {
        return false; // Activity not in search results
      }
    }

    // First apply type filter
    const typeMatch = selectedFilter === 'All Activities' || 
                     (selectedFilter === 'My Activities' && activity.participants.includes(currentUser ? currentUser.fullName : '')) ||
                     activity.type === selectedFilter;

    // Then apply time filter
    const timeMatch = selectedTimeFilter === 'All' ||
                     (selectedTimeFilter === 'Today' && isToday(activity.createdAt)) ||
                     (selectedTimeFilter === 'Tomorrow' && isTomorrow(activity.createdAt)) ||
                     (selectedTimeFilter === 'This Week' && isThisWeek(activity.createdAt));

    return typeMatch && timeMatch;
  });

  // New handleSearch function
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMessage('');
      setSearchResultIds(null); // Clear search results if query is empty
      return;
    }

    setSearchMessage('Searching...');
    setShowSearchFeedback(true);

    // Format activities with all required fields
    const activitiesForGPT = activities.map(a => ({
      id: a.id,
      title: a.activityName || a.type,
      location: a.location || "N/A",
      time: a.createdAt || "N/A",
      creator_name: a.creator?.fullName || "Unknown Creator",
      max_participants: a.maxParticipants || 0,
      activity_type: a.type || "Unknown",
      privacy: a.isPrivate ? "private" : "public"
    }));

    try {
      const response = await fetch('http://localhost:4000/api/search-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, activities: activitiesForGPT }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.relevantActivityIds && data.relevantActivityIds.length > 0) {
          setSearchResultIds(data.relevantActivityIds);
          setSearchMessage(''); // Clear message on successful search
          setShowSearchFeedback(false); // Hide feedback modal on success
        } else {
          setSearchResultIds([]); // No relevant activities found
          setSearchMessage('No activities found matching your search.');
        }
      } else {
        // Handle cases where backend returns an error message
        if (data.message && data.message.includes("Error processing search query")){
            setSearchMessage('We couldn\'t understand your search. Try something more specific.');
        } else {
            setSearchMessage(data.message || 'An error occurred during search.');
        }
        setSearchResultIds([]); // Clear results on error
      }
    } catch (error) {
      console.error('Search API error:', error);
      setSearchMessage('Failed to connect to search service. Please try again later.');
      setSearchResultIds([]); // Clear results on network error
    } finally {
      setSearchQuery(''); // Clear search input after search
    }
  };

  // Update filter click handler
  const handleFilterClick = (filter) => {
    setSelectedFilter(filter);
    setSearchResultIds(null); // Clear search results when changing filters
  };

  // Update time filter click handler
  const handleTimeFilterClick = (timeFilter) => {
    setSelectedTimeFilter(timeFilter);
    setSearchResultIds(null); // Clear search results when changing time filters
  };

  return (
    <div className="app">
      {authSuccess && <div className="success-message">{authSuccess}</div>}
      <header>
        <div className="header-left">
          <img src={logo} alt="TeamUp Logo" className="app-logo" />
        <p>Join ongoing activities or start something new</p>
        </div>
        <div className="header-right">
          {currentUser ? (
            <button className="new-button" onClick={handleLogout}>Logout ({currentUser.fullName})</button>
          ) : (
            <button className="new-button" onClick={() => { setShowAuthModal(true); setIsLogin(true); }}>Login/Signup</button>
          )}
          {currentUser && (
            <button className="new-button notifications-button" onClick={() => setShowNotifications(!showNotifications)}>
              Notifications {userInvitations.length > 0 && <span className="notification-count">{userInvitations.length}</span>}
              {showNotifications && (
                <div className="notifications-dropdown">
                  <h3>Your Invitations</h3>
                  {console.log('Rendering notifications. userInvitations:', userInvitations)}
                  {userInvitations.length > 0 ? (
                    userInvitations.map(inv => {
                      const activity = activities.find(a => a.id === inv.activityId);
                      console.log('Processing invitation:', inv, 'Activity:', activity);
                      return (
                        <div key={inv.activityId} className="notification-item">
                          <p><span className="notification-label">Activity:</span> {activity?.type || 'N/A'}</p>
                          <p><span className="notification-label">Location:</span> {inv.activityLocation}</p>
                          <p><span className="notification-label">When:</span> {inv.activityWhen}</p>
                          <p><span className="notification-label">Invited by:</span> {inv.invitedByFullName || 'N/A'}</p>
                          <div className="notification-actions">
                            <button onClick={() => handleAcceptInvitation(inv)}>✅ Accept</button>
                            <button onClick={() => handleDeclineInvitation(inv)}>❌ Decline</button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>No new invitations.</p>
                  )}
                </div>
              )}
            </button>
          )}
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search activities (e.g., 'lunch with team', 'outdoor walk this weekend')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <button onClick={handleSearch}>Search</button>
          </div>
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
              onClick={() => handleFilterClick(filter)}
            >
              <span role="img" aria-label={filter}>{getFilterIcon(filter)}</span>
              {filter}
            </button>
          ))}
        </div>
        <div className="time-filters">
          {['All', 'Today', 'Tomorrow', 'This Week'].map(timeFilter => (
            <button
              key={timeFilter}
              className={`${selectedTimeFilter === timeFilter ? 'active' : ''}`}
              onClick={() => handleTimeFilterClick(timeFilter)}
            >
              {timeFilter}
            </button>
          ))}
        </div>
      </div>

      <div className="activity-list">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((a) => (
          <div className="activity-card" key={a.id}>
              {/* console.log(`Activity ${a.id}: createdAt=${a.createdAt}, type=${a.type}, activityName=${a.activityName}`); // Removed debug log */}
              {/* console.log(`formatRelativeTime result for ${a.id}:`, formatRelativeTime(a.createdAt)); // Removed debug log */}
              <div className="activity-icon"><span role="img" aria-label={a.type}>{getFilterIcon(a.type)}</span></div>
              {formatRelativeTime(a.createdAt).isPast && <div className="past-activity-note">Past</div>}
              {a.isPrivate && <div className="private-activity-note">🔒 Private</div>}
              <h2>{a.type === 'Custom' ? a.activityName : a.type}</h2>
              <p><strong>Creator:</strong> {a.creator.fullName}</p>
            <p><strong>Location:</strong> {a.location}</p>
              <p><strong>When:</strong> {a.createdAt} ({formatRelativeTime(a.createdAt).text})</p>
            <p><strong>Participants:</strong> {a.participants.length}/{a.maxParticipants} <span className="spots-left">({a.maxParticipants - a.participants.length} spots left)</span></p>
              <p className="participant-list">{a.participants.map(p => `👤 ${p}`).join(', ')}</p>
              <div className="activity-card-buttons">
                {currentUser && a.creator.id === currentUser.id ? (
                  <>
                    <button 
                      className="invite-activity-button"
                      onClick={() => {
                        setShowInviteModal(true);
                        setInviteActivityId(a.id);
                        setInvitedUserName(''); // Clear previous input
                        setInviteMessage(''); // Clear previous message
                      }}
                      disabled={formatRelativeTime(a.createdAt).isPast} // Disable if past
                    >Invite</button>
                    <button className="edit-activity-button" onClick={() => handleEditActivity(a)}>Edit</button>
                    <button className="delete-activity-button" onClick={() => handleDeleteActivity(a.id)}>Delete</button>
                  </>
                ) : currentUser && a.participants.includes(currentUser.fullName) ? (
                  <button className="leave-activity-button" onClick={() => handleLeaveActivity(a.id)}>Leave</button>
                ) : (
                  <button 
                    onClick={() => joinActivity(a.id)}
                    className="join-activity-button"
                    disabled={!currentUser || a.participants.length >= a.maxParticipants || a.participants.includes(currentUser.fullName) || formatRelativeTime(a.createdAt).isPast} // Disable if past
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
            <div className="modal-scrollable-content">
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
                  onClick={() => setNewActivity({...newActivity, type: 'Custom', activityName: ''})}
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
                    dateFormat="dd/MM/yyyy HH:mm" // Change format to DD/MM/YYYY HH:mm
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

              <div className="privacy-slider-group">
                <span className="privacy-label">Privacy:</span>
                <div className="privacy-slider">
                  <button 
                    className={`privacy-option ${!newActivity.isPrivate ? 'active' : ''}`}
                    onClick={() => setNewActivity({ ...newActivity, isPrivate: false })}
                  >Public</button>
                  <button 
                    className={`privacy-option ${newActivity.isPrivate ? 'active' : ''}`}
                    onClick={() => setNewActivity({ ...newActivity, isPrivate: true })}
                  >Private</button>
                </div>
              </div>
            </div>

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
            <div className="modal-scrollable-content">
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
                    dateFormat="dd/MM/yyyy HH:mm" // Change format to DD/MM/YYYY HH:mm
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

              <div className="privacy-slider-group">
                <span className="privacy-label">Privacy:</span>
                <div className="privacy-slider">
                  <button 
                    className={`privacy-option ${!editingActivity.isPrivate ? 'active' : ''}`}
                    onClick={() => setEditingActivity({ ...editingActivity, isPrivate: false })}
                  >Public</button>
                  <button 
                    className={`privacy-option ${editingActivity.isPrivate ? 'active' : ''}`}
                    onClick={() => setEditingActivity({ ...editingActivity, isPrivate: true })}
                  >Private</button>
                </div>
              </div>
            </div>

            <div className="modal-buttons">
              <button onClick={() => setShowEditActivityModal(false)}>Cancel</button>
              <button onClick={handleUpdateActivity}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Invite User</h2>
            <h3>Enter the user's name</h3>
            {inviteMessage && <p className={`${inviteMessageType}-message`}>{inviteMessage}</p>}
            <input
              type="text"
              placeholder="User Name"
              value={invitedUserName}
              onChange={(e) => setInvitedUserName(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => { 
                setShowInviteModal(false);
                setInviteMessage('');
                setInviteMessageType(''); // Clear message type on cancel
              }}>Cancel</button>
              <button onClick={handleInviteUser}>Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Search Feedback Modal */}
      {showSearchFeedback && (
        <div className="modal">
          <div className="modal-content">
            <h2>Search Results</h2>
            <p>{searchMessage}</p>
            <div className="modal-buttons">
              <button onClick={() => {
                setShowSearchFeedback(false);
                setSearchMessage('');
              }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
