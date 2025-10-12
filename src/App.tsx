import { useMemo, useRef, useState } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [isCompressed, setIsCompressed] = useState(false);
  const [compressionType, setCompressionType] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const compressionOptions = useMemo(
    () => ['zip', 'rar', '7z', 'gzip', 'tar.gz', 'other'],
    [],
  );

  // capture all files chosen in the file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = e.target.files ? Array.from(e.target.files) : [];
    setFiles(nextFiles);
    setMessage('');
  };

  // submit files and compression metadata to the backend
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
    formData.append('compressed', String(isCompressed));
    if (isCompressed && compressionType) {
      formData.append('compression_type', compressionType);
    }

    try {
      const res = await fetch('https://audio-backend-5j3t.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message || 'Upload complete!');
      setFiles([]);
      setCompressionType('');
      setIsCompressed(false);
      // reset the native input so subsequent uploads work with the same file names
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Audio File Upload</h1>
        <p className="subtitle">
          Upload audio assets and describe their compression so we can process
          them accurately.
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
        />
        {files.length > 0 && (
          <ul className="file-list">
            {files.map((file) => (
              <li key={file.name} className="file-list__item">
                {file.name}
              </li>
            ))}
          </ul>
        )}

        <section className="compression-section">
          <span className="input-label">Compression</span>
          <div className="radio-group">
            <label className={`radio-option ${!isCompressed ? 'active' : ''}`}>
              <input
                type="radio"
                name="compression"
                value="no"
                checked={!isCompressed}
                onChange={() => {
                  setIsCompressed(false);
                  setCompressionType('');
                }}
              />
              Not compressed
            </label>
            <label className={`radio-option ${isCompressed ? 'active' : ''}`}>
              <input
                type="radio"
                name="compression"
                value="yes"
                checked={isCompressed}
                onChange={() => setIsCompressed(true)}
              />
              Compressed
            </label>
          </div>

          {isCompressed && (
            <div className="compression-select">
              <label className="input-label" htmlFor="compression-type">
                Compression type
              </label>
              <select
                id="compression-type"
                value={compressionType}
                onChange={(event) => setCompressionType(event.target.value)}
              >
                <option value="">Select a compression</option>
                {compressionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <button
          className="primary-button"
          type="submit"
          disabled={uploading || !files.length || (isCompressed && !compressionType)}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {message && <p className="status-message">{message}</p>}
      <div className="helper-text">
        <p>
          Need to upload more? Simply select additional files and submit again.
        </p>
      </div>
    </div>
  );
}

export default App;
