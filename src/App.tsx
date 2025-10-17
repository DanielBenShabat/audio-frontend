import { useRef, useState } from 'react';
import './App.css';

// select the correct backend for dev runs vs production builds
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5001'
  : 'https://audio-backend-5j3t.onrender.com';

type Song = {
  key: string;
  size: number;
  lastModified: string;
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

  // fetch random sample songs
  const fetchSampleSongs = async () => {
    setLoadingSongs(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/files/random?count=3`);
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
  const downloadSong = async (songKey: string) => {
    setDownloadingSongs(prev => new Set(prev).add(songKey));
    try {
      const res = await fetch(`${API_BASE_URL}/files/retrieve/${encodeURIComponent(songKey)}`);
      const data = await res.json();
      if (data.success && data.presignedUrl) {
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = data.presignedUrl;
        link.download = songKey;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMessage(`Downloading ${songKey}...`);
      } else {
        setMessage('Failed to get download link.');
      }
    } catch (err) {
      setMessage('Download failed.');
    } finally {
      setDownloadingSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(songKey);
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
            <p>Discover random songs from our collection</p>
            <button
              className="primary-button"
              onClick={fetchSampleSongs}
              disabled={loadingSongs}
            >
              {loadingSongs ? 'Loading...' : 'Get Sample Songs'}
            </button>
          </div>

          {songs.length > 0 && (
            <div className="songs-list">
              <h3>Available Songs ({songs.length})</h3>
              {songs.map((song) => (
                <div key={song.key} className="song-item">
                  <div className="song-info">
                    <h4 className="song-name">{song.key}</h4>
                    <p className="song-details">
                      Size: {formatFileSize(song.size)} • 
                      Modified: {new Date(song.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="download-button"
                    onClick={() => downloadSong(song.key)}
                    disabled={downloadingSongs.has(song.key)}
                  >
                    {downloadingSongs.has(song.key) ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {songs.length === 0 && !loadingSongs && (
            <div className="no-songs">
              <p>Click "Get Sample Songs" to load random songs from our collection.</p>
            </div>
          )}
        </div>
      )}

      {message && <p className="status-message">{message}</p>}
    </div>
  );
}

export default App;
