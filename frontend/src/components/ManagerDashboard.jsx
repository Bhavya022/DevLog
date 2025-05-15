import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Alert } from './ui/alert';
import axios from 'axios';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

function ManagerDashboard() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ date: '', developerName: '', taskTag: '', blockers: '' });
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get('/api/manager', {
          headers: { Authorization: `Bearer ${user.token}` },
          params: filter
        });
        setLogs(response.data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };
    fetchLogs();
  }, [user.token, filter]);

  const handleFeedbackSubmit = async (logId) => {
    try {
      await axios.post(`/api/manager/${logId}/feedback`, { feedback }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setFeedback('');
      setLogs(logs.map(log => log._id === logId ? { ...log, feedback } : log));
    } catch (error) {
      setError('Failed to add feedback');
    }
  };

  const handleMarkReviewed = async (logId) => {
    try {
      await axios.post(`/api/manager/${logId}/review`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setLogs(logs.filter(log => log._id !== logId));
    } catch (error) {
      setError('Failed to mark as reviewed');
    }
  };

  return (
    <div className="manager-dashboard">
      <Card className="filter-form">
        <h2>Filter Logs</h2>
        <form>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={filter.date}
            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
          />
          <Label htmlFor="developerName">Developer Name</Label>
          <Input
            id="developerName"
            type="text"
            value={filter.developerName}
            onChange={(e) => setFilter({ ...filter, developerName: e.target.value })}
          />
          <Label htmlFor="taskTag">Task Tag</Label>
          <Input
            id="taskTag"
            type="text"
            value={filter.taskTag}
            onChange={(e) => setFilter({ ...filter, taskTag: e.target.value })}
          />
          <Label htmlFor="blockers">Blockers</Label>
          <Input
            id="blockers"
            type="text"
            value={filter.blockers}
            onChange={(e) => setFilter({ ...filter, blockers: e.target.value })}
          />
        </form>
      </Card>

      <Card className="log-list">
        <h2>Developer Logs</h2>
        {error && <Alert variant="destructive">{error}</Alert>}
        <ul>
          {logs.map(log => (
            <li key={log._id}>
              <p>{log.taskDescription}</p>
              <p>Developer: {log.user.name}</p>
              <p>Time Spent: {log.timeSpent} minutes</p>
              <p>Mood: {log.mood}</p>
              <p>Blockers: {log.blockers}</p>
              <Input
                type="text"
                placeholder="Add feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <Button onClick={() => handleFeedbackSubmit(log._id)}>Submit Feedback</Button>
              <Button onClick={() => handleMarkReviewed(log._id)}>Mark as Reviewed</Button>
      