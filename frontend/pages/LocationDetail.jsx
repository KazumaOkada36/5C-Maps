import React, { useState, useEffect } from 'react';
import '../styles/locationdetail.css';

const LocationDetail = ({ location, currentUser, onClose }) => {
  const [posts, setPosts] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('temporary');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocationDetails();
  }, [location.id]);

  const fetchLocationDetails = async () => {
    try {
      const response = await fetch(`https://fivec-maps.onrender.com/api/v1/locations/${location.id}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to fetch location details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();

    if (currentUser.role === 'guest') {
      alert('Guests cannot post. Please create an account!');
      return;
    }

    try {
      const response = await fetch(`https://fivec-maps.onrender.com/api/v1/locations/${location.id}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_id: location.id,
          content: postContent,
          post_type: postType
        })
      });

      if (response.ok) {
        if (postType === 'temporary') {
          alert('✅ Post submitted! It will disappear in 3 hours.');
          fetchLocationDetails();
        } else {
          alert('✅ Post submitted for admin approval!');
        }
        setPostContent('');
        setShowPostForm(false);
      }
    } catch (err) {
      console.error('Failed to submit post:', err);
      alert('Failed to submit post. Please try again.');
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diff = Math.floor((now - posted) / 1000); // seconds

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const funFacts = location.fun_facts ? JSON.parse(location.fun_facts) : [];
  const temporaryPosts = posts.filter(p => p.post_type === 'temporary');
  const permanentPosts = posts.filter(p => p.post_type === 'permanent');

  return (
    <div className="location-detail-container">
      <div className="location-detail-header">
        <div>
          <h2>{location.name}</h2>
          <div className="location-meta">
            <span className="location-category">{location.category}</span>
            <span className="location-college">{location.college}</span>
          </div>
        </div>
        <button onClick={onClose} className="close-detail-btn">✕</button>
      </div>

      {location.description && (
        <div className="location-description">
          <p>{location.description}</p>
        </div>
      )}

      {funFacts.length > 0 && (
        <div className="fun-facts-section">
          <h3>✨ Fun Facts</h3>
          <ul className="fun-facts-list">
            {funFacts.map((fact, index) => (
              <li key={index}>{fact}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="posts-section">
        <div className="posts-header">
          <h3>💬 What Students Are Saying</h3>
          <button 
            onClick={() => setShowPostForm(!showPostForm)} 
            className="add-post-btn"
          >
            {showPostForm ? 'Cancel' : '+ Post'}
          </button>
        </div>

        {showPostForm && (
          <div className="post-form">
            <form onSubmit={handleSubmitPost}>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share your thoughts about this location..."
                maxLength="500"
                required
                rows="4"
              />
              <div className="post-form-footer">
                <div className="post-type-selector">
                  <label className={`post-type-option ${postType === 'temporary' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      value="temporary"
                      checked={postType === 'temporary'}
                      onChange={(e) => setPostType(e.target.value)}
                    />
                    <div>
                      <strong>⏱️ Temporary</strong>
                      <small>Disappears in 3 hours (e.g., "It's packed right now")</small>
                    </div>
                  </label>
                  <label className={`post-type-option ${postType === 'permanent' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      value="permanent"
                      checked={postType === 'permanent'}
                      onChange={(e) => setPostType(e.target.value)}
                    />
                    <div>
                      <strong>📌 Permanent</strong>
                      <small>Needs admin approval (e.g., facts, tips)</small>
                    </div>
                  </label>
                </div>
                <button type="submit" className="submit-post-btn">
                  Post Anonymously
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-posts">Loading posts...</div>
        ) : (
          <>
            {temporaryPosts.length > 0 && (
              <div className="posts-group">
                <h4>⏱️ Recent Updates</h4>
                <div className="posts-list">
                  {temporaryPosts.map(post => (
                    <div key={post.id} className="post-item temporary">
                      <div className="post-content">{post.content}</div>
                      <div className="post-footer">
                        <span className="post-author">Anonymous</span>
                        <span className="post-time">{getTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {permanentPosts.length > 0 && (
              <div className="posts-group">
                <h4>📌 Community Tips & Facts</h4>
                <div className="posts-list">
                  {permanentPosts.map(post => (
                    <div key={post.id} className="post-item permanent">
                      <div className="post-content">{post.content}</div>
                      <div className="post-footer">
                        <span className="post-author">Anonymous</span>
                        <span className="post-time">{getTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {temporaryPosts.length === 0 && permanentPosts.length === 0 && (
              <div className="no-posts">
                <p>No posts yet. Be the first to share!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LocationDetail;