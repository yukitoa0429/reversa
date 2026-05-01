// Reversa - Developer Studio Logic

const DEV_STATE = {
    tab: 'moras',
    target: null,
    moraList: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(''),
    pilotIndex: 0,
    pilotList: [...PILOT_WORDS, ...PILOT_NUMBERS],
    recorder: null,
    chunks: [],
    blob: null
};

function initDevMode() {
    switchDevTab('moras');
}

function switchDevTab(tabId) {
    DEV_STATE.tab = tabId;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    if (elements.pilotProgress) elements.pilotProgress.classList.toggle('hidden', tabId !== 'pilot');
    refreshDevList();
}

function refreshDevList() {
    elements.devListContainer.innerHTML = '';
    const list = DEV_STATE.tab === 'moras' ? DEV_STATE.moraList : 
                 DEV_STATE.tab === 'pilot' ? DEV_STATE.pilotList : 
                 Array.from(new Set(QUESTION_DATABASE[3].concat(QUESTION_DATABASE[4], QUESTION_DATABASE[5]).map(q => q.word)));
    
    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'mora-item';
        div.textContent = item;
        div.onclick = () => selectDevTarget(item);
        elements.devListContainer.appendChild(div);
    });
}

function selectDevTarget(word) {
    DEV_STATE.target = word;
    elements.devTargetText.innerHTML = '';
    word.split('').forEach(char => {
        const span = document.createElement('span');
        span.className = 'char-unit';
        span.textContent = char;
        elements.devTargetText.appendChild(span);
    });
    elements.btnRecordDev.classList.remove('hidden');
    elements.btnRecordRhythm.classList.remove('hidden');
    elements.btnPlayDev.classList.add('hidden');
    elements.btnSaveDev.classList.add('hidden');
    elements.waveformPreview.classList.add('hidden');
    if (DEV_STATE.tab === 'pilot') updatePilotUI();
}

function updatePilotUI() {
    const current = DEV_STATE.pilotIndex + 1;
    elements.pilotStatus.textContent = `${current} / ${DEV_STATE.pilotList.length}`;
    elements.pilotBar.style.width = `${(current / DEV_STATE.pilotList.length) * 100}%`;
}

async function toggleDevRecording() {
    if (!DEV_STATE.target) return alert('ターゲットを選んでください');
    if (DEV_STATE.recorder && DEV_STATE.recorder.state === 'recording') {
        DEV_STATE.recorder.stop();
        elements.btnRecordDev.textContent = '🔴 録音開始';
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        DEV_STATE.recorder = new MediaRecorder(stream);
        DEV_STATE.chunks = [];
        DEV_STATE.recorder.ondataavailable = e => DEV_STATE.chunks.push(e.data);
        DEV_STATE.recorder.onstop = () => {
            DEV_STATE.blob = new Blob(DEV_STATE.chunks, { type: 'audio/wav' });
            elements.btnPlayDev.classList.remove('hidden');
            elements.btnSaveDev.classList.remove('hidden');
            elements.devStatus.textContent = '録音完了。確認して保存してください。';
            stream.getTracks().forEach(t => t.stop());
        };
        DEV_STATE.recorder.start();
        elements.btnRecordDev.textContent = '⏹ 停止';
        elements.devStatus.textContent = '録音中...';
        visualizeDevWaveform(stream);
    } catch (err) { console.error(err); }
}

async function startRhythmRecording() {
    if (!DEV_STATE.target) return alert('ターゲットを選んでください');
    elements.metronomeArea.classList.remove('hidden');
    elements.waveformPreview.classList.add('hidden');
    elements.btnRecordRhythm.disabled = true;
    const pendulum = document.querySelector('.pendulum');
    pendulum.style.animationDuration = `${RHYTHM_BEAT_MS/1000}s`;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        DEV_STATE.recorder = new MediaRecorder(stream);
        const chunks = [];
        DEV_STATE.recorder.ondataavailable = e => chunks.push(e.data);
        
        for (let i = 3; i > 0; i--) {
            elements.rhythmCountdown.textContent = i;
            elements.beatIndicator.classList.add('hit');
            setTimeout(() => elements.beatIndicator.classList.remove('hit'), 100);
            pendulum.classList.add('active');
            await sleep(RHYTHM_BEAT_MS);
        }
        await sleep(RHYTHM_BEAT_MS - 50); 
        DEV_STATE.recorder.start();
        elements.rhythmCountdown.textContent = 'GO!';
        visualizeDevWaveform(stream);
        
        const totalDuration = (DEV_STATE.target.length * RHYTHM_BEAT_MS) + 500;
        let startTime = Date.now() + 50;
        const hInt = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const index = Math.floor(elapsed / RHYTHM_BEAT_MS);
            const chars = elements.devTargetText.querySelectorAll('.char-unit');
            chars.forEach((c, i) => c.classList.toggle('highlight', i === index));
            if (elapsed >= totalDuration) {
                clearInterval(hInt);
                chars.forEach(c => c.classList.remove('highlight'));
            }
        }, 50);

        await sleep(totalDuration); 
        DEV_STATE.recorder.stop();
        elements.metronomeArea.classList.add('hidden');
        elements.btnRecordRhythm.disabled = false;

        DEV_STATE.recorder.onstop = async () => {
            const fullBlob = new Blob(chunks, { type: DEV_STATE.recorder.mimeType });
            const audioCtx = getPlaybackContext();
            const arrayBuffer = await fullBlob.arrayBuffer();
            const fullAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const duration = (DEV_STATE.target.length * RHYTHM_BEAT_MS) / 1000; 
            const trimmedBuffer = audioCtx.createBuffer(fullAudioBuffer.numberOfChannels, audioCtx.sampleRate * duration, audioCtx.sampleRate);
            for (let ch = 0; ch < fullAudioBuffer.numberOfChannels; ch++) {
                trimmedBuffer.getChannelData(ch).set(fullAudioBuffer.getChannelData(ch).subarray(Math.floor(0.02 * audioCtx.sampleRate)));
            }
            DEV_STATE.blob = exportWAV(trimmedBuffer);
            elements.waveformPreview.classList.remove('hidden');
            drawStaticWaveform(trimmedBuffer);
            elements.btnPlayDev.classList.remove('hidden');
            elements.btnSaveDev.classList.remove('hidden');
            stream.getTracks().forEach(t => t.stop());
        };
    } catch (err) { console.error(err); elements.btnRecordRhythm.disabled = false; }
}

function drawStaticWaveform(buffer) {
    const canvas = elements.waveformCanvasStatic;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    const data = buffer.getChannelData(0);
    const amp = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#34d399';
    ctx.moveTo(0, amp);
    const step = Math.ceil(data.length / canvas.width);
    for (let i = 0; i < canvas.width; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) {
            const d = Math.abs(data[(i * step) + j] || 0);
            if (d > max) max = d;
        }
        ctx.lineTo(i, amp - max * amp);
        ctx.lineTo(i, amp + max * amp);
    }
    ctx.stroke();
}

function playCurrentDevRecording() {
    if (DEV_STATE.blob) new Audio(URL.createObjectURL(DEV_STATE.blob)).play();
}

async function saveCurrentDevRecording() {
    if (!DEV_STATE.blob || !DEV_STATE.target) return;
    try {
        const audioCtx = getPlaybackContext();
        const arrayBuffer = await DEV_STATE.blob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const wavBlob = exportWAV(audioBuffer);
        const params = new URLSearchParams({ filename: `${DEV_STATE.target}.wav`, folder: DEV_STATE.tab === 'moras' ? 'parts' : 'orig' });
        const res = await fetch(`${DEV_SERVER_URL}/save_audio?${params.toString()}`, { method: 'POST', body: wavBlob });
        if (res.ok) {
            elements.devStatus.textContent = '保存完了！✨';
            if (DEV_STATE.tab === 'pilot' && DEV_STATE.pilotIndex < DEV_STATE.pilotList.length - 1) {
                DEV_STATE.pilotIndex++;
                setTimeout(() => selectDevTarget(DEV_STATE.pilotList[DEV_STATE.pilotIndex]), 1000);
            }
        }
    } catch (err) { console.error(err); }
}

async function testMoraConcatenation(text) {
    if (currentState.isReading) return;
    currentState.isReading = true;
    const sequence = text.split('');
    const blobs = [];
    for (let unit of sequence) blobs.push(await getAudioBlob(unit, 'parts'));
    stopAllPlayback();
    for (let i = 0; i < sequence.length; i++) {
        elements.devTargetText.textContent = sequence[i];
        if (blobs[i]) playBlob(blobs[i]);
        await sleep(RHYTHM_BEAT_MS - 20);
    }
    currentState.isReading = false;
}

function visualizeDevWaveform(stream) {
    const audioCtx = getPlaybackContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    function draw() {
        if (!DEV_STATE.recorder || DEV_STATE.recorder.state === 'inactive') return;
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for(let i = 0; i < bufferLength; i++) {
            const h = dataArray[i] / 2;
            ctx.fillStyle = `rgb(${h + 100}, 50, 255)`;
            ctx.fillRect(x, canvas.height - h, barWidth, h);
            x += barWidth + 1;
        }
    }
    draw();
}
