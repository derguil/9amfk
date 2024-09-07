let socket;

function connectWebSocket() {
    socket = new WebSocket('ws://localhost:3000');

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.type === 'updateCode') {
            const { codeId, code } = data;

            const codeInput = document.querySelector(`.code-input[data-id="${codeId}"]`);
            if (codeInput) {
                codeInput.value = code;
            }
        } else if (data.type === 'allCodes') {
            const codes = data.codes;
            for (const codeId in codes) {
                const codeInput = document.querySelector(`.code-input[data-id="${codeId}"]`);
                if (codeInput) {
                    codeInput.value = codes[codeId];
                }
            }
        } else if (data.type === 'resetCodes') {
            const codeInputs = document.querySelectorAll('.code-input');
            codeInputs.forEach(input => {
                const codeValue = input.value.trim();
                if (codeValue !== '1111' && codeValue !== '9999') {
                    input.value = '';  
                }
            });
            alert('코드가 서버에 의해 초기화되었습니다.(1111,9999제외)');
        }
    };

    socket.onclose = function () {
        console.log('WebSocket 연결 종료');
    };
}

function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}:${seconds}`;
}

setInterval(updateTime, 1000);
updateTime();  

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {

        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('profile-container').classList.remove('hidden'); 
        document.getElementById('profile-container').classList.add('active'); 

        document.getElementById('user-email').textContent = email;
        document.getElementById('profile-pic').src = 'default-profile.png';

        document.getElementById('login-email').setAttribute('data-logged-in', 'true'); 

        connectWebSocket();

        await fetchCurrentCodes();

        const codeInputs = document.querySelectorAll('.code-input');
        codeInputs.forEach(input => {
            input.disabled = false;  
        });

    } else {
        alert('로그인 실패: ' + result.message);
    }
}


async function signup() {
    const email = document.getElementById('signup-email').value.trim(); 
    const password = document.getElementById('signup-password').value.trim(); 

    if (!email || !password) {
        alert('아이디와 비밀번호를 모두 입력하세요.');
        return;  
    }

    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            alert('회원가입 성공! 이제 로그인하세요.');
            toggleAuth();  
        } else {
            alert('회원가입 실패: ' + result.message);
        }
    } catch (error) {
        alert('회원가입 중 오류가 발생했습니다.');
        console.error('Error:', error);
    }
}

function logout() {
  
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('profile-container').classList.add('hidden');
    document.getElementById('profile-container').classList.remove('active');

    const codeInputs = document.querySelectorAll('.code-input');
    codeInputs.forEach(input => {
        input.value = ''; 
        input.disabled = true; 
    });

    alert('로그아웃 되었습니다.');
}


function toggleAuth() {
    document.getElementById('login-container').classList.toggle('active');
    document.getElementById('signup-container').classList.toggle('active');
}


async function fetchCurrentCodes() {
    const response = await fetch('/current-codes');
    const codes = await response.json();

    const codeInputs = document.querySelectorAll('.code-input');
    codeInputs.forEach((input, index) => {
        input.value = codes[index] || '';  
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const codeInputs = document.querySelectorAll('.code-input');

    codeInputs.forEach((input, index) => {
        input.setAttribute('data-id', index); 

        let lastValue = input.value; 

        input.addEventListener('change', function (event) {
            const isLoggedIn = document.getElementById('login-email').getAttribute('data-logged-in');
            if (isLoggedIn !== 'true') {
                alert('로그인하지 않으면 코드를 변경/확인할 수 없습니다.');
                input.value = lastValue; 
                return;
            }

            const code = input.value;
            if (code.length === 4 && !isNaN(code)) {
                lastValue = code;  
                const email = document.getElementById('login-email').value;
                if (email) {
                    const codeId = input.getAttribute('data-id');
                    fetch('/update-code', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, codeId, code })
                    });
                }
            } else {
                input.value = lastValue; 
                alert("올바른 4자리 숫자를 입력해주세요.");
            }
        });
    });

});


document.getElementById('search-box').addEventListener('input', function () {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll('#data-table tbody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

const rowHeight = 30; 
const visibleRowsCount = 20;  
let currentStartIndex = 0; 
let data = []; 

for (let i = 0; i < 3000; i++) {
    data.push({
        subject: `Subject ${i + 1}`,
        professor: `Professor ${i + 1}`,
        time: `Time ${i + 1}`,
        room: `Room ${i + 1}`,
        code: `Code ${i + 1}`
    });
}

function renderRows(startIndex, endIndex) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';  
    const fragment = document.createDocumentFragment();

    for (let i = startIndex; i < endIndex; i++) {
        if (i < data.length) {
            const row = document.createElement('tr');
            
            const subjectCell = document.createElement('td');
            subjectCell.textContent = data[i].subject;
            row.appendChild(subjectCell);

            const professorCell = document.createElement('td');
            professorCell.textContent = data[i].professor;
            row.appendChild(professorCell);

            const timeCell = document.createElement('td');
            timeCell.textContent = data[i].time;
            row.appendChild(timeCell);

            const roomCell = document.createElement('td');
            roomCell.textContent = data[i].room;
            row.appendChild(roomCell);

            const codeCell = document.createElement('td');
            const codeInput = document.createElement('input');
            codeInput.type = 'number';
            codeInput.classList.add('code-input');
            codeInput.min = '1000';
            codeInput.max = '9999';
            codeInput.value = data[i].code;
            codeCell.appendChild(codeInput);
            row.appendChild(codeCell);

            fragment.appendChild(row);
        }
    }

    tableBody.appendChild(fragment);
}

function onScroll() {
    const container = document.querySelector('.list-container');
    const scrollTop = container.scrollTop;
    const totalRows = data.length;

    const newStartIndex = Math.floor(scrollTop / rowHeight);

    if (newStartIndex !== currentStartIndex) {
        currentStartIndex = newStartIndex;
        const endIndex = Math.min(currentStartIndex + visibleRowsCount, totalRows);
        renderRows(currentStartIndex, endIndex);
    }
}

document.addEventListener('visibilitychange', () => {
    const isLoggedIn = document.getElementById('login-email').getAttribute('data-logged-in');
    if (document.visibilityState === 'visible' && isLoggedIn) {
        fetchCurrentCodes();
    }
});

renderRows(0, visibleRowsCount);

