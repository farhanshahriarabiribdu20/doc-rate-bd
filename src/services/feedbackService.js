// Cloud Feedback Service for FosholNexa BD
// Syncs feedbacks across all devices & browsers using Vercel Blob cloud storage

const API_ENDPOINT = '/api/feedback';

export const fetchFeedbacks = async () => {
  try {
    const res = await fetch(`${API_ENDPOINT}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.feedbacks)) {
      localStorage.setItem('fosholnexa_user_feedbacks', JSON.stringify(data.feedbacks));
      return data.feedbacks;
    }
  } catch (err) {
    console.warn('Could not fetch cloud feedbacks, falling back to local cache:', err);
  }

  // Fallback to local cache if API fails
  try {
    const saved = localStorage.getItem('fosholnexa_user_feedbacks');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const submitFeedback = async (feedbackData) => {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.feedback;
  } catch (err) {
    console.error('Error submitting feedback to cloud API:', err);
    // Return local mock entry on network error
    return {
      id: `fb-${Date.now()}`,
      ...feedbackData,
      date: new Date().toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }),
      dateRaw: new Date().toISOString()
    };
  }
};

export const deleteFeedback = async (id) => {
  try {
    await fetch(API_ENDPOINT, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  } catch (err) {
    console.error('Error deleting feedback from cloud:', err);
  }
};

export const clearAllFeedbacks = async () => {
  try {
    await fetch(API_ENDPOINT, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true })
    });
  } catch (err) {
    console.error('Error clearing feedbacks from cloud:', err);
  }
};
