const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Transform } = require('stream');

const app = express();
const port = 3002;

app.use(cors());

// 创建一个自定义的 Transform 流，控制数据流速
class ThrottleTransform extends Transform {
    constructor(delay) {
        super();
        this.delay = delay; // 延迟时间
    }

    _transform(chunk, encoding, callback) {
        setTimeout(() => {
            this.push(chunk); // 发送数据块
            callback(); // 通知已完成
        }, this.delay);
    }
}

app.get('/audio', (req, res) => {
    const audioPath = path.join(__dirname, 'example.mp3');
    const stat = fs.statSync(audioPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'audio/mp3',
        };

        res.writeHead(206, head);

        const fileStream = fs.createReadStream(audioPath, { start, end });

        // 使用 ThrottleTransform 控制流速，延迟每个数据块发送
        const throttleStream = new ThrottleTransform(500); // 每500ms发送一个数据块

        // 管道传输文件，通过 throttleStream 限速
        fileStream.pipe(throttleStream).pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'audio/mp3',
        };
        res.writeHead(200, head);
        fs.createReadStream(audioPath).pipe(res);
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});