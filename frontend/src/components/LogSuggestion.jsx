import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import axios from 'axios';
import VoiceToText from './VoiceToText';

function LogSuggestion() {
  const { user } = useAuth();
  const [rawText, setRawText] = useState('');
  const [polishedSummary, setPolishedSummary] = useState('');
  const [error, setError] = useState('');

  const handleGenerateSummary = async () => {
    try {
      const response = await axios.post('/api/ai/suggest-log', { rawText }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setPolishedSummary(response.data.polishedSummary);
    } catch (error) {
      setError('Failed to generate summary');
    }
  };

  return (
    <div className="log-suggestion">
      <h2>AI Log Suggestion</h2>
      {error && <p className="error">{error}</p>}
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Enter raw log text or bullet points"
      />
      <VoiceToText onTranscribe={(text) => setRawText(text)} />
      <Button onClick={handleGenerateSummary}>Generate Summary</Button>
      {polishedSummary && (
        <div className="polished-summary">
          <h3>Polished Summary</h3>
          <p>{polishedSummary}</p>
        </div>
      )}
    </div>
  );
}

export default LogSuggestion; 