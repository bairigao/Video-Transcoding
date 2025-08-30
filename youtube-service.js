const { google } = require('googleapis');
require('dotenv').config();

class YouTubeService {
    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.youtube = google.youtube({
            version: 'v3',
            auth: this.apiKey
        });
    }

    /**
     * Search for YouTube videos related to a given query
     * @param {string} query - Search query (usually video title or tags)
     * @param {number} maxResults - Maximum number of results to return (default: 10)
     * @returns {Promise<Array>} Array of video objects with title, thumbnail, and link
     */
    async searchRelatedVideos(query, maxResults = 10) {
        try {
            if (!this.apiKey) {
                console.warn('YouTube API key not configured');
                return [];
            }

            // Clean up the query - remove file extensions and special characters
            const cleanQuery = query
                .replace(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i, '')
                .replace(/[^\w\s]/g, ' ')
                .trim();

            const response = await this.youtube.search.list({
                part: 'snippet',
                q: cleanQuery,
                type: 'video',
                maxResults: maxResults,
                order: 'relevance',
                safeSearch: 'moderate',
                videoEmbeddable: 'true',
                fields: 'items(id/videoId,snippet(title,description,thumbnails/medium,channelTitle,publishedAt))'
            });

            if (!response.data.items) {
                return [];
            }

            return response.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium.url,
                channel: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`
            }));

        } catch (error) {
            console.error('YouTube API error:', error.message);
            return [];
        }
    }

    /**
     * Get video suggestions based on video metadata
     * @param {Object} videoMetadata - Video metadata object
     * @returns {Promise<Array>} Array of related YouTube videos
     */
    async getVideoSuggestions(videoMetadata) {
        try {
            // Create search queries based on video metadata
            const queries = [];
            
            // Primary query: use the original filename
            if (videoMetadata.originalName) {
                queries.push(videoMetadata.originalName);
            }

            // Fallback query: use filename without extension
            if (videoMetadata.filename) {
                const nameWithoutExt = videoMetadata.filename.replace(/\.[^/.]+$/, '');
                queries.push(nameWithoutExt);
            }

            // Try each query until we get results
            for (const query of queries) {
                const results = await this.searchRelatedVideos(query, 6);
                if (results.length > 0) {
                    return results;
                }
            }

            // If no specific results, return trending videos as fallback
            return await this.getTrendingVideos(6);

        } catch (error) {
            console.error('Error getting video suggestions:', error);
            return [];
        }
    }

    /**
     * Get trending videos as fallback content
     * @param {number} maxResults - Maximum number of results
     * @returns {Promise<Array>} Array of trending videos
     */
    async getTrendingVideos(maxResults = 6) {
        try {
            if (!this.apiKey) {
                return [];
            }

            const response = await this.youtube.videos.list({
                part: 'snippet',
                chart: 'mostPopular',
                maxResults: maxResults,
                regionCode: 'US',
                videoCategoryId: '0', // All categories
                fields: 'items(id,snippet(title,description,thumbnails/medium,channelTitle,publishedAt))'
            });

            if (!response.data.items) {
                return [];
            }

            return response.data.items.map(item => ({
                id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium.url,
                channel: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/watch?v=${item.id}`,
                embedUrl: `https://www.youtube.com/embed/${item.id}`
            }));

        } catch (error) {
            console.error('Error getting trending videos:', error);
            return [];
        }
    }

    /**
     * Test the YouTube API connection
     * @returns {Promise<boolean>} True if API is working
     */
    async testConnection() {
        try {
            if (!this.apiKey) {
                console.warn('YouTube API key not configured');
                return false;
            }

            await this.youtube.search.list({
                part: 'snippet',
                q: 'test',
                maxResults: 1
            });

            console.log('YouTube API connection successful');
            return true;
        } catch (error) {
            console.error('YouTube API connection failed:', error.message);
            return false;
        }
    }
}

module.exports = new YouTubeService();