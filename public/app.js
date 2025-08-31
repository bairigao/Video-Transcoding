// Global state
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// DOM elements
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const messageArea = document.getElementById('message-area');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    if (authToken && currentUser) {
        showApp();
        loadVideos();
        loadJobs();
    } else {
        showLogin();
    }
    
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Upload form
    document.getElementById('upload-form').addEventListener('submit', handleUpload);
    
    // Refresh buttons
    document.getElementById('refresh-videos').addEventListener('click', loadVideos);
    document.getElementById('refresh-jobs').addEventListener('click', loadJobs);
    
    // Transcode modal
    document.getElementById('transcode-form').addEventListener('submit', handleTranscode);
    document.getElementById('cancel-transcode').addEventListener('click', closeTranscodeModal);
    
    // Click outside modal to close
    document.getElementById('transcode-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeTranscodeModal();
        }
    });
    
    // Video details modal
    document.getElementById('video-details-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeVideoDetailsModal();
        }
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showMessage('Login successful!', 'success');
            showApp();
            loadVideos();
            loadJobs();
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    showMessage('Logged out successfully', 'info');
    showLogin();
}

// UI state functions
function showLogin() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
    userInfo.style.display = 'none';
}

function showApp() {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    userInfo.style.display = 'flex';
    usernameDisplay.textContent = `Welcome, ${currentUser.username}`;
}

// File upload functions
async function handleUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('video-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('Please select a file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('video', file);
    
    const progressBar = document.getElementById('upload-progress');
    const progressFill = progressBar.querySelector('.progress-fill');
    const progressText = progressBar.querySelector('.progress-text');
    
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading...';
    
    try {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });
        
        xhr.addEventListener('load', () => {
            progressBar.style.display = 'none';
            
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                showMessage('Video uploaded successfully!', 'success');
                fileInput.value = '';
                loadVideos();
            } else {
                const errorData = JSON.parse(xhr.responseText);
                showMessage(errorData.error || 'Upload failed', 'error');
            }
        });
        
        xhr.addEventListener('error', () => {
            progressBar.style.display = 'none';
            showMessage('Upload failed due to network error', 'error');
        });
        
        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);
        
    } catch (error) {
        progressBar.style.display = 'none';
        showMessage('Upload error: ' + error.message, 'error');
    }
}

// Video management functions
async function loadVideos() {
    try {
        const response = await fetch('/api/videos', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayVideos(data.videos);
        } else {
            showMessage(data.error || 'Failed to load videos', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

function displayVideos(videos) {
    const videosList = document.getElementById('videos-list');
    
    if (videos.length === 0) {
        videosList.innerHTML = `
            <div class="empty-state">
                <h3>No videos uploaded yet</h3>
                <p>Upload your first video to get started!</p>
            </div>
        `;
        return;
    }
    
    videosList.innerHTML = videos.map(video => `
        <div class="video-card">
            <div class="video-title">${escapeHtml(video.originalName)}</div>
            <div class="video-info">
                <div>Uploaded: ${new Date(video.uploadDate).toLocaleString()}</div>
                <div>Size: ${formatFileSize(video.size)}</div>
                <div>Type: ${video.mimetype}</div>
            </div>
            <div class="video-actions">
                <button class="btn btn-primary btn-small" onclick="openTranscodeModal('${video.id}', '${escapeHtml(video.originalName)}')">
                    Transcode
                </button>
                <button class="btn btn-success btn-small" onclick="downloadVideo('original', '${video.filename}')">
                    Download Original
                </button>
                <button class="btn btn-info btn-small" onclick="showVideoDetails('${video.id}', '${escapeHtml(video.originalName)}')">
                    View Details
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteVideo('${video.id}', '${escapeHtml(video.originalName)}')">
                    Delete Video
                </button>
            </div>
        </div>
    `).join('');
}

// Transcoding functions
function openTranscodeModal(videoId, videoName) {
    document.getElementById('transcode-video-id').value = videoId;
    document.getElementById('transcode-modal').style.display = 'flex';
    document.querySelector('#transcode-modal h3').textContent = `Transcode: ${videoName}`;
}

function closeTranscodeModal() {
    document.getElementById('transcode-modal').style.display = 'none';
    document.getElementById('transcode-form').reset();
}

async function handleTranscode(e) {
    e.preventDefault();
    
    const videoId = document.getElementById('transcode-video-id').value;
    const format = document.getElementById('transcode-format').value;
    
    try {
        const response = await fetch('/api/transcode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ videoId, format })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Transcoding started! Check the jobs section for progress.', 'success');
            closeTranscodeModal();
            loadJobs();
        } else {
            showMessage(data.error || 'Failed to start transcoding', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

// Jobs management functions
async function loadJobs() {
    try {
        const response = await fetch('/api/jobs', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayJobs(data.jobs);
        } else {
            showMessage(data.error || 'Failed to load jobs', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

function displayJobs(jobs) {
    const jobsList = document.getElementById('jobs-list');
    
    if (jobs.length === 0) {
        jobsList.innerHTML = `
            <div class="empty-state">
                <h3>No transcoding jobs yet</h3>
                <p>Start a transcoding job to see progress here!</p>
            </div>
        `;
        return;
    }
    
    // Sort jobs by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    jobsList.innerHTML = jobs.map(job => {
        // Extract the display name for the original video
        const originalVideoName = job.originalVideoName || 'Unknown Video';
        const shortVideoName = originalVideoName.length > 30 
            ? originalVideoName.substring(0, 30) + '...' 
            : originalVideoName;
        
        return `
            <div class="job-card">
                <div class="job-header">
                    <div class="job-title" title="${escapeHtml(originalVideoName)}">
                        ${escapeHtml(shortVideoName)} → ${job.format.toUpperCase()}
                    </div>
                    <span class="status-badge status-${job.status}">${job.status}</span>
                </div>
                <div class="job-info">
                    <div>Started: ${new Date(job.createdAt).toLocaleString()}</div>
                    ${job.completedAt ? `<div>Completed: ${new Date(job.completedAt).toLocaleString()}</div>` : ''}
                    ${job.errorMessage ? `<div style="color: #e74c3c;">Error: ${escapeHtml(job.errorMessage)}</div>` : ''}
                </div>
                ${job.status === 'completed' ? `
                    <div style="margin-top: 10px;">
                        <button class="btn btn-success btn-small" onclick="downloadVideo('transcoded', '${job.outputFilename}')">
                            Download ${job.format.toUpperCase()}
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteTranscodedVideo('${job.id}', '${job.format.toUpperCase()}')">
                            Delete ${job.format.toUpperCase()}
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Download function
async function downloadVideo(type, filename) {
    try {
        const response = await fetch(`/api/download/${type}/${filename}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showMessage('Download started!', 'success');
        } else {
            const errorData = await response.json();
            showMessage(errorData.error || 'Download failed', 'error');
        }
    } catch (error) {
        showMessage('Download error: ' + error.message, 'error');
    }
}

// Utility functions
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messageArea.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show video details with YouTube related content
async function showVideoDetails(videoId, videoName) {
    try {
        // Show loading modal first
        showVideoDetailsModal(videoId, videoName, [], true);
        
        const response = await fetch(`/api/videos/${videoId}/related`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showVideoDetailsModal(videoId, videoName, data.relatedVideos, false);
        } else {
            showMessage(data.error || 'Failed to load related content', 'error');
            showVideoDetailsModal(videoId, videoName, [], false);
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
        showVideoDetailsModal(videoId, videoName, [], false);
    }
}

function showVideoDetailsModal(videoId, videoName, relatedVideos, isLoading) {
    const modal = document.getElementById('video-details-modal');
    const title = document.getElementById('video-details-title');
    const content = document.getElementById('video-details-content');
    
    title.textContent = videoName;
    
    if (isLoading) {
        content.innerHTML = '<div class="loading">Loading related content...</div>';
    } else {
        if (relatedVideos.length > 0) {
            content.innerHTML = `
                <h4>Related YouTube Videos</h4>
                <div class="youtube-grid">
                    ${relatedVideos.map(video => `
                        <div class="youtube-item">
                            <a href="${video.url}" target="_blank" class="youtube-link">
                                <img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" class="youtube-thumbnail">
                                <div class="youtube-info">
                                    <h5 class="youtube-title">${escapeHtml(video.title)}</h5>
                                    <p class="youtube-channel">${escapeHtml(video.channel)}</p>
                                    <p class="youtube-date">${new Date(video.publishedAt).toLocaleDateString()}</p>
                                </div>
                            </a>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            content.innerHTML = '<p>No related YouTube content found.</p>';
        }
    }
    
    modal.style.display = 'flex';
}

function closeVideoDetailsModal() {
    document.getElementById('video-details-modal').style.display = 'none';
}

// Delete video function
async function deleteVideo(videoId, videoName) {
    if (!confirm(`Are you sure you want to delete the original video "${videoName}"? Transcoded versions will remain available and can be deleted separately.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Original video deleted successfully!', 'success');
            loadVideos();
            // Note: We don't reload jobs since transcoded videos are kept
        } else {
            showMessage(data.error || 'Failed to delete video', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

// Delete transcoded video function
async function deleteTranscodedVideo(jobId, format) {
    if (!confirm(`Are you sure you want to delete the ${format} transcoded video?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/jobs/${jobId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Transcoded video deleted successfully!', 'success');
            loadJobs();
        } else {
            showMessage(data.error || 'Failed to delete transcoded video', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

// Auto-refresh jobs every 10 seconds when there are processing jobs
setInterval(() => {
    if (authToken && appSection.style.display !== 'none') {
        loadJobs();
    }
}, 10000);