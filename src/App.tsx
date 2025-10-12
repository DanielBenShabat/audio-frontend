import { useRef, useState } from 'react';
import './App.css';

// select the correct backend for dev runs vs production builds
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5001'
  : 'https://audio-backend-5j3t.onrender.com';

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
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

      {message && <p className="status-message">{message}</p>}
    </div>
  );
}

export default App;
