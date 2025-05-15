import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import axios from 'axios';

function CalendarView() {
  const { user } = useAuth();
  const [calendarData, setCalendarData] = useState([]);
  const [maxStreak, setMaxStreak] = useState(0);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const response = await axios.get('/api/calendar/data', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setCalendarData(response.data.calendarData);
        setMaxStreak(response.data.maxStreak);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      }
    };
    fetchCalendarData();
  }, [user.token]);

  return (
    <div className="calendar-view">
      <h2>Calendar & Heatmap View</h2>
      <p>Max Streak: {maxStreak} days</p>
      <CalendarHeatmap
        startDate={new Date(new Date().setFullYear(new Date().getFullYear() - 1))}
        endDate={new Date()}
        values={calendarData.map(entry => ({
          date: entry.date,
          count: entry.mood
        }))}
        classForValue={(value) => {
          if (!value) return 'color-empty';
          return `color-scale-${value.count}`;
        }}
      />
    </div>
  );
}

export default CalendarView; 