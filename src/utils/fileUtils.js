const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class FileUtils {
    /**
     * Generate unique filename with timestamp and random string
     * @param {string} originalName - Original filename
     * @returns {string} Unique filename
     */
    static generateUniqueFilename(originalName) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, extension);
        return `${nameWithoutExt}_${timestamp}_${randomString}${extension}`;
    }

    /**
     * Ensure directory exists, create if it doesn't
     * @param {string} dirPath - Directory path
     */
    static ensureDirectoryExists(dirPath) {
        if (!fsSync.existsSync(dirPath)) {
            fsSync.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Delete file if it exists
     * @param {string} filePath - File path to delete
     * @returns {boolean} True if file was deleted or didn't exist
     */
    static async deleteFileIfExists(filePath) {
        try {
            if (fsSync.existsSync(filePath)) {
                await fs.unlink(filePath);
                return true;
            }
            return true; // File didn't exist, consider it "deleted"
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    /**
     * Validate file type (case-insensitive)
     * @param {string} mimeType - File MIME type
     * @param {Array} allowedTypes - Array of allowed MIME types
     * @returns {boolean} True if file type is allowed
     */
    static validateFileType(mimeType, allowedTypes) {
        // Convert both the input MIME type and allowed types to lowercase for case-insensitive comparison
        const normalizedMimeType = mimeType.toLowerCase();
        const normalizedAllowedTypes = allowedTypes.map(type => type.toLowerCase());
        return normalizedAllowedTypes.includes(normalizedMimeType);
    }
}

module.exports = FileUtils;