import React, { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const audioRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const mediaSource = new MediaSource();
    audio.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', sourceOpen);

    function sourceOpen() {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      fetchAudioStream(sourceBuffer);
    }

    async function fetchAudioStream(sourceBuffer) {
      try {
        const response = await fetch('http://localhost:3002/audio', {
          headers: { Range: 'bytes=0-' }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();

        // 持续读取音频流并逐块传输给 sourceBuffer
        const processStream = async ({ done, value }) => {
          if (done) {
            mediaSource.endOfStream(); // 流结束
            setIsLoading(false);
            return;
          }

          sourceBuffer.appendBuffer(value); // 将每块数据传递给 sourceBuffer

          await new Promise(resolve => {
            if (sourceBuffer.updating) {
              sourceBuffer.addEventListener('updateend', resolve, { once: true });
            } else {
              resolve();
            }
          });

          // 继续读取下一块数据
          return reader.read().then(processStream);
        };

        // 开始读取数据流
        reader.read().then(processStream);
      } catch (err) {
        console.error('Error fetching audio:', err);
        setError(err.message);
        setIsLoading(false);
      }
    }

    return () => {
      URL.revokeObjectURL(audio.src);
    };
  }, []);

  return (
    <div className="App">
      <div className="player-container">
        <h2>音频流式播放</h2>
        {isLoading && <p>加载中...</p>}
        {error && <p>错误: {error}</p>}
        <audio ref={audioRef} controls />
      </div>
    </div>
  );
}

export default App;