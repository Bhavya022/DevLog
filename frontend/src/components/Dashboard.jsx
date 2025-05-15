import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Alert } from './ui/alert';
import axios from 'axios';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Pie } from 'react-chartjs-2';

function DeveloperDashboard() {
  return <div>Developer Dashboard</div>;
}

function ManagerDashboard() {
  const { user } = useAuth();
  const [teamStats, setTeamStats] = useState({ topBlockers: [], topTags: [] });
  const [timeDistribution, setTimeDistribution] = useState({});
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        const response = await axios.get(`/api/teams/${user.team}/stats`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setTeamStats(response.data.data);
      } catch (error) {
        console.error('Error fetching team stats:', error);
      }
    };

    const fetchTimeDistribution = async () => {
      try {
        const response = await axios.get(`/api/teams/${user.team}/time-distribution`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setTimeDistribution(response.data.data);
      } catch (error) {
        console.error('Error fetching time distribution:', error);
      }
    };

    const fetchLogs = async () => {
      try {
        const response = await axios.get('/api/logs', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setLogs(response.data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    fetchTeamStats();
    fetchTimeDistribution();
    fetchLogs();
  }, [user.team, user.token]);

  const timeDistributionData = {
    labels: Object.keys(timeDistribution),
    datasets: [
      {
        data: Object.values(timeDistribution),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
      }
    ]
  };

  const handleFeedbackSubmit = async (logId, taskId) => {
    try {
      await axios.post(`/api/logs/${logId}/tasks/${taskId}/feedback`, { comment: feedback }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setFeedback('');
      setLogs(logs.map(log => {
        if (log._id === logId) {
          const updatedTasks = log.tasks.map(task => {
            if (task._id === taskId) {
              return { ...task, feedback: [...task.feedback, { user: user.id, comment: feedback }] };
            }
            return task;
          });
          return { ...log, tasks: updatedTasks };
        }
        return log;
      }));
    } catch (error) {
      setError('Failed to add feedback');
    }
  };

  const handleStatusUpdate = async (logId, taskId, status) => {
    try {
      await axios.patch(`/api/logs/${logId}/tasks/${taskId}/status`, { status }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setLogs(logs.map(log => {
        if (log._id === logId) {
          const updatedTasks = log.tasks.map(task => {
            if (task._id === taskId) {
              return { ...task, status };
            }
            return task;
          });
          return { ...log, tasks: updatedTasks };
        }
        return log;
      }));
    } catch (error) {
      setError('Failed to update task status');
    }
  };

  return (
    <div className="manager-dashboard">
      <Card className="team-stats">
        <h2>Team Statistics</h2>
        <h3>Top Blockers</h3>
        <ul>
          {teamStats.topBlockers.map(([blocker, count], index) => (
            <li key={index}>{blocker}: {count}</li>
          ))}
        </ul>
        <h3>Top Task Tags</h3>
        <ul>
          {teamStats.topTags.map(([tag, count], index) => (
            <li key={index}>{tag}: {count}</li>
          ))}
        </ul>
      </Card>

      <Card className="time-distribution">
        <h2>Time Distribution by Task Type</h2>
        <Pie data={timeDistributionData} />
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
              {log.tasks.map(task => (
                <div key={task._id}>
                  <p>Task: {task.description}</p>
                  <p>Status: {task.status}</p>
                  <ul>
                    {task.feedback.map((fb, index) => (
                      <li key={index}>{fb.user.name}: {fb.comment}</li>
                    ))}
                  </ul>
                  <Input
                    type="text"
                    placeholder="Add feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <Button onClick={() => handleFeedbackSubmit(log._id, task._id)}>Submit Feedback</Button>
                  <Button onClick={() => handleStatusUpdate(log._id, task._id, 'Approved')}>Approve</Button>
                  <Button onClick={() => handleStatusUpdate(log._id, task._id, 'Needs Clarification')}>Needs Clarification</Button>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [taskDescription, setTaskDescription] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [mood, setMood] = useState(3);
  const [blockers, setBlockers] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logStreak, setLogStreak] = useState(0);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get('/api/logs', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setLogs(response.data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };
    fetchLogs();
  }, [user.token]);

  useEffect(() => {
    const fetchStreaksAndAchievements = async () => {
      try {
        const response = await axios.get(`/api/users/${user.id}/streaks`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setLogStreak(response.data.data.logStreak);
        setAchievements(response.data.data.achievements);
      } catch (error) {
        console.error('Error fetching streaks and achievements:', error);
      }
    };
    fetchStreaksAndAchievements();
  }, [user.id, user.token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/logs', {
        taskDescription,
        timeSpent,
        mood,
        blockers
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setLogs([...logs, response.data]);
      setTaskDescription('');
      setTimeSpent(0);
      setMood(3);
      setBlockers('');
    } catch (error) {
      setError('Failed to submit log');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <Card className="log-form">
        <h2>Submit Daily Log</h2>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="taskDescription">Task Description</Label>
          <Input
            id="taskDescription"
            type="text"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            required
          />
          <Label htmlFor="timeSpent">Time Spent (minutes)</Label>
          <Input
            id="timeSpent"
            type="number"
            value={timeSpent}
            onChange={(e) => setTimeSpent(Number(e.target.value))}
            required
          />
          <Label htmlFor="mood">Mood (1-5)</Label>
          <Input
            id="mood"
            type="number"
            min="1"
            max="5"
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            required
          />
          <Label htmlFor="blockers">Blockers</Label>
          <Input
            id="blockers"
            type="text"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
          />
          {error && <Alert variant="destructive">{error}</Alert>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Log'}
          </Button>
        </form>
      </Card>

      <Card className="log-list">
        <h2>Previous Logs</h2>
        <ul>
          {logs.map(log => (
            <li key={log._id}>
              <p>{log.taskDescription}</p>
              <p>Time Spent: {log.timeSpent} minutes</p>
              <p>Mood: {log.mood}</p>
              <p>Blockers: {log.blockers}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="heatmap">
        <h2>Productivity Heatmap</h2>
        <CalendarHeatmap
          startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
          endDate={new Date()}
          values={logs.map(log => ({ date: log.createdAt, count: log.timeSpent }))}
        />
      </Card>

      <Card className="achievements">
        <h2>Achievements</h2>
        <p>Current Streak: {logStreak} days</p>
        <ul>
          {achievements.map((achievement, index) => (
            <li key={index}>{achievement}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default Dashboard; 