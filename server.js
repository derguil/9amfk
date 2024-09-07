const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codeId INTEGER,
            code TEXT
        )
    `);
});

app.use(bodyParser.json());
app.use(express.static('public'));

const server = app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
})

const wss = new WebSocket.Server({ server });

let clients = [];

function getAllCodes(callback) {
    db.all('SELECT codeId, code FROM codes', (err, rows) => {
        if (err) {
            console.error('코드 가져오기 중 오류:', err);
            return;
        }
        const codes = {};
        rows.forEach(row => {
            codes[row.codeId] = row.code;
        });
        callback(codes);
    });
}



wss.on('connection', (ws) => {
    console.log('WebSocket 연결됨');
    clients.push(ws);

    getAllCodes(codes => {
        ws.send(JSON.stringify({ type: 'allCodes', codes }));
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        console.log('WebSocket 연결 종료됨');
    });
});

app.post('/signup', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: '아이디와 비밀번호를 모두 입력하세요.' });
    }

    const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    stmt.run(email, password, function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.json({ success: false, message: '이미 존재하는 아이디입니다.' });
            } else {
                return res.json({ success: false, message: '회원가입 중 오류가 발생했습니다.' });
            }
        }
        res.json({ success: true, message: '회원가입 성공!' });
    });
    stmt.finalize();
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (err) {
            return res.json({ success: false, message: '로그인 중 오류가 발생했습니다.' });
        }

        if (row) {
            return res.json({ success: true, message: '로그인 성공!' });
        } else {
            return res.json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
    });
});

app.post('/update-code', (req, res) => {
    const { codeId, code } = req.body;

    const stmt = db.prepare('INSERT OR REPLACE INTO codes (codeId, code) VALUES (?, ?)');
    stmt.run(codeId, code, function (err) {
        if (err) {
            return res.json({ success: false, message: '코드 업데이트 중 오류가 발생했습니다.' });
        }

        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'updateCode', codeId, code }));
            }
        });

        res.json({ success: true, message: '코드가 업데이트되었습니다.' });
    });
    stmt.finalize();
});

app.get('/current-codes', (req, res) => {
    getAllCodes(codes => {
        res.json(codes);
    });
});

setInterval(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    
    if (minutes === 19 || minutes === 49) {
        db.run('UPDATE codes SET code = "" WHERE code != "1111" AND code != "9999"', (err) => {
            if (err) {
                console.error('코드 초기화 중 오류:', err);
            } else {
                console.log('1111, 9999를 제외한 코드가 초기화되었습니다.');
                
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'resetCodes' }));
                    }
                });
            }
        });
    }
}, 60000);
