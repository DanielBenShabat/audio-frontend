import { useRef, useState } from 'react';
import './App.css';

// select the correct backend for dev runs vs production builds
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5001'
  : 'https://audio-backend-5j3t.onrender.com';

type Song = {
  id: string;
  artist: string;
  song_name: string;
  file_name: string;
  compression_type: string;
  created_by: string;
  created_at: string;
  metadata: {
    original_filename: string;
    upload_timestamp: string;
  };
  file_size: number;
  s3_key: string;
  mime_type: string;
  presignedUrl?: string;
};

type TabType = 'upload' | 'samples';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [downloadingSongs, setDownloadingSongs] = useState<Set<string>>(new Set());
  const [deletingSongs, setDeletingSongs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // capture file selections so the upload button can send them together
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    setFiles(selectedFiles);
    setMessage('');
  };

  // remove a single file from the queue before uploading
  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // submit the chosen files and confirm the result to the user
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) {
      setMessage('Please choose at least one audio file.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('audio', file);
    });
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message || 'Upload complete!');
    } catch (err) {
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
      setFiles([]);
      // reset the native input so subsequent uploads work with the same file names
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // fetch all sample songs
  const fetchSampleSongs = async () => {
    setLoadingSongs(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/files/all`);
      const data = await res.json();
      if (data.success) {
        setSongs(data.songs || []);
        setMessage(data.message || 'Sample songs loaded!');
      } else {
        setMessage('Failed to load sample songs.');
      }
    } catch (err) {
      setMessage('Failed to load sample songs.');
    } finally {
      setLoadingSongs(false);
    }
  };

  // download a specific song
  const downloadSong = async (songId: string, songName: string) => {
    setDownloadingSongs(prev => new Set(prev).add(songId));
    try {
      console.log(`Attempting to download song: ${songId}`);
      
      // Use the new CORS-safe download endpoint that streams through backend
      const response = await fetch(`${API_BASE_URL}/files/download/${songId}`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = songName;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage(`Downloaded ${songName} successfully!`);
    } catch (err) {
      console.error('Download error:', err);
      setMessage(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(songId);
        return newSet;
      });
    }
  };

  // delete a specific song
  const deleteSong = async (songId: string, songName: string) => {
    if (!confirm(`Are you sure you want to delete "${songName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingSongs(prev => new Set(prev).add(songId));
    try {
      const res = await fetch(`${API_BASE_URL}/files/song/${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token' // Placeholder for now
        }
      });
      const data = await res.json();
      
      if (data.success) {
        // Remove the song from the local state
        setSongs(prev => prev.filter(song => song.id !== songId));
        
        // Show detailed deletion status
        const dbStatus = data.deletedFromDatabase ? '✅ Database' : '❌ Database';
        const s3Status = data.deletedFromS3 ? '✅ Cloud Storage' : '❌ Cloud Storage';
        setMessage(`"${songName}" deleted: ${dbStatus} | ${s3Status}`);
      } else {
        setMessage(`Failed to delete "${songName}". ${data.message || 'Unknown error.'}`);
      }
    } catch (err) {
      setMessage(`Failed to delete "${songName}". Please try again.`);
    } finally {
      setDeletingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(songId);
        return newSet;
      });
    }
  };

  // format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page">
      {/* full-page wave animation so the background feels alive */}
      <div className="wave-background" aria-hidden="true">
        <svg
          className="hero-waves"
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          shapeRendering="auto"
        >
          <defs>
            <path
              id="gentle-wave"
              d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z"
            />
          </defs>
          <g className="parallax">
            <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(32, 86, 214, 0.35)" />
            <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(32, 86, 214, 0.25)" />
            <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(32, 86, 214, 0.18)" />
            <use xlinkHref="#gentle-wave" x="48" y="7" fill="rgba(32, 86, 214, 0.5)" />
          </g>
        </svg>
      </div>
      <header className="header">
        <span className="header__badge">The Song Trio</span>
        <h1>Audio File Upload</h1>
        <p className="subtitle">
          Upload your bad songs to enhance them!
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Songs
        </button>
        <button
          className={`tab-button ${activeTab === 'samples' ? 'active' : ''}`}
          onClick={() => setActiveTab('samples')}
        >
          Sample Songs
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <form className="upload-form" onSubmit={handleUpload}>
        <label className="input-label" htmlFor="audio-input">
          Audio Files
        </label>
        <input
          id="audio-input"
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
        />
        {/* list selected files so users can confirm their choices */}
        {files.length > 0 && (
          <ul className="file-list">
            {files.map((file, index) => (
              <li key={file.name} className="file-list__item">
                <span className="file-list__name" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  className="file-remove-button"
                  onClick={() => handleRemoveFile(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          className="primary-button"
          type="submit"
          disabled={uploading || !files.length}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
      )}

      {/* Sample Songs Tab */}
      {activeTab === 'samples' && (
        <div className="samples-container">
          <div className="samples-header">
            <h2>Sample Songs</h2>
            <p>Browse and download songs from our collection</p>
            <button
              className="primary-button"
              onClick={fetchSampleSongs}
              disabled={loadingSongs}
            >
              {loadingSongs ? 'Loading...' : 'Load All Songs'}
            </button>
          </div>

          {songs.length > 0 && (
            <div className="songs-list">
              <h3>Available Songs ({songs.length})</h3>
              {songs.map((song) => (
                <div key={song.id} className="song-item">
                  <div className="song-info">
                    <h4 className="song-name">{song.artist} - {song.song_name}</h4>
                    <p className="song-details">
                      <strong>Size: {formatFileSize(song.file_size)} • Type: {song.compression_type.toUpperCase()}</strong>
                    </p>
                  </div>
                  <div className="song-actions">
                    <button
                      className="download-button green-download"
                      onClick={() => downloadSong(song.id, `${song.artist} - ${song.song_name}.${song.compression_type}`)}
                      disabled={downloadingSongs.has(song.id) || deletingSongs.has(song.id)}
                    >
                      {downloadingSongs.has(song.id) ? 'Downloading...' : 'Download'}
                    </button>
                    <button
                      className="delete-button red-delete"
                      onClick={() => deleteSong(song.id, `${song.artist} - ${song.song_name}`)}
                      disabled={downloadingSongs.has(song.id) || deletingSongs.has(song.id)}
                    >
                      {deletingSongs.has(song.id) ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {songs.length === 0 && !loadingSongs && (
            <div className="no-songs">
              <p>Click "Load All Songs" to browse songs from our collection.</p>
            </div>
          )}
        </div>
      )}

      {message && <p className="status-message">{message}</p>}
    </div>
  );
}

export default App;
