import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import axios from 'axios';

function ReportGenerator() {
  const { user } = useAuth();
  const [format, setFormat] = useState('pdf');
  const [error, setError] = useState('');

  const handleDownload = async () => {
    try {
      const response = await axios.get(`/api/reports/weekly?format=${format}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weekly_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      setError('Failed to download report');
    }
  };

  return (
    <div className="report-generator">
      <h2>Download Weekly Productivity Report</h2>
      {error && <p className="error">{error}</p>}
      <div>
        <label>
          <input
            type="radio"
            value="pdf"
            checked={format === 'pdf'}
            onChange={() => setFormat('pdf')}
          />
          PDF
        </label>
        <label>
          <input
            type="radio"
            value="csv"
            checked={format === 'csv'}
            onChange={() => setFormat('csv')}
          />
          CSV
        </label>
      </div>
      <Button onClick={handleDownload}>Download Report</Button>
    </div>
  );
}

export default ReportGenerator; 