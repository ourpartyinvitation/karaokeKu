// =====================================================================
// 1. STATE GLOBAL & VARIABEL DOKUMEN HTML (DOM)
// =====================================================================

// PASTE URL DARI GOOGLE APPS SCRIPT ANDA DI SINI
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyfPBUp6nONa9lSgKVYfYmBzUFjoX8Hz-pj80GnbEWugdHPxsKiHQvBuTTutPvNzm-e6g/exec'; 

let allLocalSongs = []; 
let allGeneralSongs = []; 
let playlist = [];      
let currentIndex = 0; 
let currentSourceTab = 'local'; 

const searchInput = document.getElementById('searchInput');
const searchYtInput = document.getElementById('searchYtInput');
const searchGeneralInput = document.getElementById('searchGeneralInput'); 

const songList = document.getElementById('songList');
const ytSavedList = document.getElementById('ytSavedList');
const ytListContainer = document.getElementById('ytListContainer');
const generalSavedList = document.getElementById('generalSavedList');
const generalListContainer = document.getElementById('generalListContainer');

const playlistContainer = document.getElementById('playlistContainer');
const localPlayer = document.getElementById('localPlayer');
const ytWrapper = document.getElementById('ytWrapper'); 
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const folderInput = document.getElementById('folderInput');

let audioCtx, mediaSource, eqBass, eqMid, eqTreble;
let splitter, merger, inverter, busGain; 
let audioInitialized = false; 
let ytPlayer; 

window.onload = () => {
    fetchYtSaved(); 
};

// =====================================================================
// 2. FUNGSI FILE LOKAL (Membaca Folder Klien)
// =====================================================================
folderInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    allLocalSongs = []; 
    files.forEach(file => {
        if (file.type.startsWith('video/') || file.type.startsWith('audio/') || file.name.endsWith('.mkv') || file.name.endsWith('.mp4') || file.name.endsWith('.dat')) {
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
            const parts = nameWithoutExt.split('-');
            const title = parts[0] ? parts[0].trim() : 'Unknown';
            const singer = parts[1] ? parts[1].trim() : 'Unknown';
            allLocalSongs.push({ title: title, singer: singer, source: 'local', fileObj: file });
        }
    });
    renderSongList(allLocalSongs);
});

searchInput.addEventListener('keyup', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filteredSongs = allLocalSongs.filter(song => 
        song.title.toLowerCase().includes(keyword) || song.singer.toLowerCase().includes(keyword)
    );
    renderSongList(filteredSongs);
});

function renderSongList(songs) {
    songList.innerHTML = ''; 
    if (songs.length === 0) {
        songList.innerHTML = `<div class="text-gray-500 text-center text-sm">Tidak ditemukan.</div>`;
        return; 
    }
    songs.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = "bg-gray-700 hover:bg-gray-600 rounded p-3 mb-2 flex justify-between items-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 cursor-pointer";
        div.innerHTML = `
            <div class="overflow-hidden">
                <div class="font-bold text-sm lg:text-base truncate">${song.title}</div>
                <div class="text-xs text-gray-400 truncate">${song.singer}</div>
            </div>
            <button class="bg-indigo-500 hover:bg-indigo-400 text-white text-xs px-3 py-1.5 rounded shadow hover:scale-105 transition-transform duration-200 shrink-0 ml-2" onclick='addToPlaylistByIndex(${index})'>+ Add</button>
        `;
        songList.appendChild(div);
    });
}
function addToPlaylistByIndex(globalIndex) { addToPlaylist(allLocalSongs[globalIndex]); }


// =====================================================================
// 3. FUNGSI YOUTUBE (LOCALSTORAGE & SYNC SPREADSHEET AUTOMATIS)
// =====================================================================
searchYtInput.addEventListener('keyup', (e) => {
    const keyword = e.target.value.toLowerCase();
    const saved = JSON.parse(localStorage.getItem('ytHistory')) || [];
    const filteredYt = saved.filter(song => song.title.toLowerCase().includes(keyword) || song.videoId.toLowerCase().includes(keyword));
    renderYtSavedList(filteredYt);
});

function fetchYtSaved() {
    const saved = JSON.parse(localStorage.getItem('ytHistory')) || [];
    const keyword = searchYtInput.value.toLowerCase();
    if (keyword !== '') {
        const filteredYt = saved.filter(song => song.title.toLowerCase().includes(keyword) || song.videoId.toLowerCase().includes(keyword));
        renderYtSavedList(filteredYt);
    } else {
        renderYtSavedList(saved);
    }
}

function renderYtSavedList(songs) {
    ytListContainer.innerHTML = ''; 
    if (songs.length === 0) {
        ytListContainer.innerHTML = `<div class="text-gray-500 text-center text-xs mt-2">Tidak ditemukan / Belum ada riwayat.</div>`;
        return;
    }
    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = "bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-between items-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5";
        const safeTitle = song.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        div.innerHTML = `
            <div class="overflow-hidden flex-1 cursor-pointer" title="${song.title}">
                <div class="font-bold text-sm lg:text-base truncate text-indigo-300">${song.title}</div>
                <div class="text-[10px] lg:text-xs text-gray-400 truncate">YT-ID: ${song.videoId}</div>
            </div>
            <div class="flex gap-1 ml-2 shrink-0">
                <button title="Hapus Riwayat" class="bg-red-800 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded shadow hover:scale-110 transition-transform duration-200" onclick="deleteYtHistory('${song.videoId}')">🗑️</button>
                <button class="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded shadow hover:scale-105 transition-transform duration-200" onclick="addFromYtHistory('${safeTitle}', '${song.videoId}')">+ Add</button>
            </div>
        `;
        ytListContainer.appendChild(div);
    });
}

function saveAndAddYoutube() {
    const title = document.getElementById('ytTitleInput').value.trim(); 
    const url = document.getElementById('ytLinkInput').value.trim();    
    const videoId = extractVideoID(url);                                
    
    if (!title || !videoId) { 
        showAlert("Maaf, Judul dan Link YouTube valid wajib diisi dengan benar!"); 
        return; 
    }

    // 1. Simpan ke LocalStorage Browser
    let saved = JSON.parse(localStorage.getItem('ytHistory')) || [];
    saved.push({ title: title, videoId: videoId });
    localStorage.setItem('ytHistory', JSON.stringify(saved));
    
    // 2. FITUR BARU: Tembak data ke Google Sheets (Backup / Crowdsourcing Database)
    if (GAS_URL && GAS_URL !== 'ISI_DENGAN_URL_WEB_APP_ANDA_DISINI') {
        // Menggunakan mode text/plain untuk melewati blokir CORS Preflight dari Google
        fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                titleSinger: title,
                link: url
            })
        }).catch(err => console.error("Gagal mengirim data ke spreadsheet:", err));
    }

    // 3. Masukkan ke Playlist dan Refresh UI
    addFromYtHistory(title, videoId);
    document.getElementById('ytTitleInput').value = '';
    document.getElementById('ytLinkInput').value = '';
    fetchYtSaved();
}

function deleteYtHistory(videoId) {
    showConfirm("Apakah Anda yakin ingin menghapus lagu ini dari riwayat permanen?", () => {
        let saved = JSON.parse(localStorage.getItem('ytHistory')) || [];
        saved = saved.filter(song => song.videoId !== videoId);
        localStorage.setItem('ytHistory', JSON.stringify(saved));
        fetchYtSaved();
    });
}

function extractVideoID(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null; 
}


// =====================================================================
// 4. FUNGSI GENERAL (SINKRONISASI GOOGLE SHEETS)
// =====================================================================
searchGeneralInput.addEventListener('keyup', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filteredGeneral = allGeneralSongs.filter(song => 
        song.titleSinger.toLowerCase().includes(keyword)
    );
    renderGeneralList(filteredGeneral);
});

function fetchGeneralSongs() {
    if (GAS_URL === 'ISI_DENGAN_URL_WEB_APP_ANDA_DISINI') {
        showAlert("Anda belum memasukkan URL Web App Google Apps Script ke dalam file javascript.js");
        return;
    }

    generalListContainer.innerHTML = `<div class="text-blue-400 text-center text-sm mt-5">🔄 Mengunduh data dari Spreadsheet...</div>`;
    
    fetch(GAS_URL)
        .then(res => res.json())
        .then(data => {
            allGeneralSongs = data;
            renderGeneralList(allGeneralSongs);
        })
        .catch(err => {
            generalListContainer.innerHTML = `<div class="text-red-500 text-center text-sm mt-5">Gagal terhubung ke Cloud.</div>`;
        });
}

function renderGeneralList(songs) {
    generalListContainer.innerHTML = ''; 
    if (songs.length === 0) {
        generalListContainer.innerHTML = `<div class="text-gray-500 text-center text-xs mt-2">Tidak ada data ditemukan.</div>`;
        return;
    }
    
    songs.forEach(song => {
        const div = document.createElement('div');
        div.className = "bg-gray-700 hover:bg-gray-600 rounded p-2 flex justify-between items-center transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5";
        
        const safeTitle = song.titleSinger.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        div.innerHTML = `
            <div class="overflow-hidden flex-1 cursor-pointer" title="${song.titleSinger}">
                <div class="font-bold text-sm lg:text-base truncate text-blue-300">${song.titleSinger}</div>
                <div class="text-[10px] lg:text-xs text-gray-400 truncate">Sistem Cloud Spreadsheet</div>
            </div>
            <div class="flex gap-1 ml-2 shrink-0">
                <button class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded shadow hover:scale-105 transition-transform duration-200" onclick="addFromGeneral('${safeTitle}', '${song.link}')">
                    + Add
                </button>
            </div>
        `;
        generalListContainer.appendChild(div);
    });
}

function addFromGeneral(title, url) {
    const videoId = extractVideoID(url);
    if (!videoId) {
        showAlert(`Link YouTube tidak valid pada lagu: ${title}`);
        return;
    }
    addToPlaylist({ title: title, singer: "Online (General)", filename: videoId, source: 'general' });
}


// =====================================================================
// 5. NAVIGASI TAB (LOCAL, YOUTUBE, GENERAL)
// =====================================================================
function addFromYtHistory(title, videoId) {
    addToPlaylist({ title: title, singer: "YouTube Video", filename: videoId, source: 'youtube' });
}

function setBtnStyle(btn, isActive) {
    if(isActive) {
        btn.classList.replace('bg-gray-700', 'bg-indigo-600');
        btn.classList.replace('hover:bg-gray-600', 'hover:bg-indigo-500');
    } else {
        btn.classList.replace('bg-indigo-600', 'bg-gray-700');
        btn.classList.replace('hover:bg-indigo-500', 'hover:bg-gray-600');
    }
}

function switchSource(source) {
    currentSourceTab = source; 
    
    setBtnStyle(document.getElementById('btnLocal'), false);
    setBtnStyle(document.getElementById('btnYT'), false);
    setBtnStyle(document.getElementById('btnGeneral'), false);

    document.getElementById('localInputContainer').classList.add('hidden');
    document.getElementById('ytInputContainer').classList.add('hidden');
    document.getElementById('ytInputContainer').classList.remove('flex');
    document.getElementById('generalInputContainer').classList.add('hidden');
    document.getElementById('generalInputContainer').classList.remove('flex');

    document.getElementById('songList').classList.add('hidden');
    document.getElementById('ytSavedList').classList.add('hidden');
    document.getElementById('ytSavedList').classList.remove('flex');
    document.getElementById('generalSavedList').classList.add('hidden');
    document.getElementById('generalSavedList').classList.remove('flex');

    if (source === 'local') {
        setBtnStyle(document.getElementById('btnLocal'), true);
        document.getElementById('localInputContainer').classList.remove('hidden');
        document.getElementById('localInputContainer').classList.add('flex');
        document.getElementById('songList').classList.remove('hidden');
    } 
    else if (source === 'youtube') {
        setBtnStyle(document.getElementById('btnYT'), true);
        document.getElementById('ytInputContainer').classList.remove('hidden');
        document.getElementById('ytInputContainer').classList.add('flex');
        document.getElementById('ytSavedList').classList.remove('hidden');
        document.getElementById('ytSavedList').classList.add('flex');
        fetchYtSaved(); 
    }
    else if (source === 'general') {
        setBtnStyle(document.getElementById('btnGeneral'), true);
        document.getElementById('generalInputContainer').classList.remove('hidden');
        document.getElementById('generalInputContainer').classList.add('flex');
        document.getElementById('generalSavedList').classList.remove('hidden');
        document.getElementById('generalSavedList').classList.add('flex');
        if(allGeneralSongs.length === 0) fetchGeneralSongs();
    }
}


// =====================================================================
// 6. KUMPULAN MODAL POPUP & MANAJEMEN PLAYLIST
// =====================================================================
function showAlert(message) {
    const modal = document.getElementById('customAlert');     
    const box = document.getElementById('customAlertBox');    
    document.getElementById('customAlertMsg').innerText = message; 
    modal.classList.remove('hidden'); 
    setTimeout(() => { modal.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 10);
}
function closeAlert() {
    const modal = document.getElementById('customAlert');
    const box = document.getElementById('customAlertBox');
    modal.classList.add('opacity-0'); box.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

let confirmCallback = null;
function showConfirm(message, callback) {
    confirmCallback = callback; 
    const modal = document.getElementById('customConfirm');
    const box = document.getElementById('customConfirmBox');
    document.getElementById('customConfirmMsg').innerText = message; 
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 10);
}
document.getElementById('btnConfirmCancel').onclick = function() { closeConfirm(); };
document.getElementById('btnConfirmOk').onclick = function() { closeConfirm(); if (confirmCallback) confirmCallback(); };
function closeConfirm() {
    const modal = document.getElementById('customConfirm');
    const box = document.getElementById('customConfirmBox');
    modal.classList.add('opacity-0'); box.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function toggleFullScreen() {
    const centerPanel = document.getElementById('centerPanel');
    if (!document.fullscreenElement) {
        if (centerPanel.requestFullscreen) { centerPanel.requestFullscreen(); } 
        else if (centerPanel.webkitRequestFullscreen) { centerPanel.webkitRequestFullscreen(); } 
        else if (centerPanel.msRequestFullscreen) { centerPanel.msRequestFullscreen(); }
    } else {
        if (document.exitFullscreen) { document.exitFullscreen(); } 
        else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); } 
        else if (document.msExitFullscreen) { document.msExitFullscreen(); }
    }
}

function addToPlaylist(songData) {
    playlist.push(songData); 
    renderPlaylist(); 
    if (playlist.length === 1 && localPlayer.paused && (!ytPlayer || ytPlayer.getPlayerState() !== 1)) {
        playSong(0);
    }
}

function renderPlaylist() {
    playlistContainer.innerHTML = ''; 
    if (playlist.length === 0) {
        playlistContainer.innerHTML = `<div class="text-center text-gray-500 text-sm mt-5">Playlist kosong.</div>`;
        return; 
    }
    playlist.forEach((song, index) => {
        const div = document.createElement('div');
        const isActive = index === 0 ? 'bg-indigo-800 border-indigo-400 transform scale-[1.01] shadow-md z-10' : 'bg-gray-700 hover:-translate-y-0.5 hover:shadow-md';
        div.className = `playlist-item ${isActive} border rounded p-2.5 lg:p-3 mb-2 flex justify-between items-center transition-all duration-300`;
        div.draggable = true;
        div.dataset.index = index; 
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);

        div.innerHTML = `
            <div class="overflow-hidden cursor-grab flex-1" onclick="playSong(${index})">
                <div class="font-bold text-sm lg:text-base truncate">${index + 1}. ${song.title}</div>
                <div class="text-[10px] lg:text-xs text-gray-400 truncate">${song.singer} ${song.source === 'local' ? '📁' : '📺'}</div>
            </div>
            <button class="text-red-400 hover:text-red-200 hover:scale-125 transition-transform duration-200 ml-2 font-bold px-2 text-lg shrink-0" onclick="removeFromPlaylist(${index})">×</button>
        `;
        playlistContainer.appendChild(div);
    });
}

function removeFromPlaylist(index) {
    playlist.splice(index, 1); 
    if (index === 0) { stopAllPlayers(); if (playlist.length > 0) playSong(0); }
    renderPlaylist(); 
}

function stopAllPlayers() {
    localPlayer.pause(); 
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo(); 
    nowPlayingTitle.innerText = "Belum ada lagu diputar"; 
}

let draggedItemIndex = null; 
function handleDragStart(e) { draggedItemIndex = this.dataset.index; this.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } 
function handleDrop(e) {
    e.preventDefault();
    const targetIndex = this.dataset.index; 
    if (draggedItemIndex === targetIndex) return; 
    const itemToMove = playlist.splice(draggedItemIndex, 1)[0]; 
    playlist.splice(targetIndex, 0, itemToMove); 
    if (draggedItemIndex == 0 || targetIndex == 0) playSong(0); else renderPlaylist(); 
}
function handleDragEnd(e) { this.classList.remove('dragging'); } 


// =====================================================================
// 7. MESIN PENGOLAH SINYAL SUARA API (AUDIO ROUTING & YOUTUBE)
// =====================================================================
function initAudio() {
    if (audioInitialized) return; 
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    mediaSource = audioCtx.createMediaElementSource(localPlayer);
    eqBass = audioCtx.createBiquadFilter(); eqBass.type = 'lowshelf'; eqBass.frequency.value = 250;
    eqMid = audioCtx.createBiquadFilter(); eqMid.type = 'peaking'; eqMid.frequency.value = 1500;
    eqTreble = audioCtx.createBiquadFilter(); eqTreble.type = 'highshelf'; eqTreble.frequency.value = 4000;
    splitter = audioCtx.createChannelSplitter(2);
    merger = audioCtx.createChannelMerger(2);
    busGain = audioCtx.createGain(); 
    inverter = audioCtx.createGain(); inverter.gain.value = -1; 
    mediaSource.connect(eqBass); eqBass.connect(eqMid); eqMid.connect(eqTreble); eqTreble.connect(splitter);
    audioInitialized = true; 
    changeVocalMode(); 
}

function playSong(index) {
    if (playlist.length === 0) { stopAllPlayers(); return; }
    if (index !== 0) { const selected = playlist.splice(index, 1)[0]; playlist.unshift(selected); }
    
    const song = playlist[0]; 
    nowPlayingTitle.innerText = `${song.title} - ${song.singer}`; 
    renderPlaylist(); 

    if (song.source === 'local') {
        localPlayer.classList.remove('hidden'); ytWrapper.classList.add('hidden'); 
        if(ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
        const fileURL = URL.createObjectURL(song.fileObj);
        localPlayer.src = fileURL;
        if (!audioInitialized) initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        localPlayer.play();
    } 
    else if (song.source === 'youtube' || song.source === 'general') {
        localPlayer.classList.add('hidden'); localPlayer.pause(); ytWrapper.classList.remove('hidden');
        if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
            ytPlayer.loadVideoById(song.filename); 
        } else {
            ytPlayer = new YT.Player('ytPlayerContainer', {
                height: '100%', width: '100%', videoId: song.filename,
                playerVars: { 'controls': 0, 'disablekb': 1, 'rel': 0, 'modestbranding': 1, 'fs': 0, 'iv_load_policy': 3 },
                events: { 'onReady': (e) => e.target.playVideo(), 'onStateChange': onPlayerStateChange }
            });
        }
    }
}

function onPlayerStateChange(event) { if (event.data == YT.PlayerState.ENDED) nextSong(); }
localPlayer.addEventListener('ended', () => { nextSong(); });

function nextSong() {
    if (playlist.length > 0) {
        playlist.shift(); 
        if (playlist.length > 0) { playSong(0); } else { stopAllPlayers(); renderPlaylist(); }
    }
}

function togglePlay() {
    if (playlist.length === 0) return; 
    const song = playlist[0]; 
    if (song.source === 'local') {
        if (localPlayer.paused) { localPlayer.play(); if (audioCtx.state === 'suspended') audioCtx.resume(); } else { localPlayer.pause(); }
    } else {
        if (ytPlayer) {
            const state = ytPlayer.getPlayerState(); 
            if (state === 1) ytPlayer.pauseVideo(); else ytPlayer.playVideo(); 
        }
    }
}

function changeVolume() {
    const vol = document.getElementById('volumeControl').value; 
    localPlayer.volume = vol; 
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') ytPlayer.setVolume(vol * 100);
}

function updateEQ() {
    if (!audioInitialized) return;
    eqBass.gain.value = parseFloat(document.getElementById('eqBass').value);
    eqMid.gain.value = parseFloat(document.getElementById('eqMid').value);
    eqTreble.gain.value = parseFloat(document.getElementById('eqTreble').value);
}

function changeVocalMode() {
    if (!audioInitialized) return; 
    const mode = document.getElementById('vocalMode').value;
    splitter.disconnect(); inverter.disconnect(); busGain.disconnect();
    
    if (mode === 'remove_center') {
        splitter.connect(busGain, 0); splitter.connect(inverter, 1); inverter.connect(busGain); 
        busGain.connect(merger, 0, 0); busGain.connect(merger, 0, 1); merger.connect(audioCtx.destination);
    }
    else if (mode === 'left') {
        splitter.connect(merger, 0, 0); splitter.connect(merger, 0, 1); merger.connect(audioCtx.destination);
    } 
    else if (mode === 'right') {
        splitter.connect(merger, 1, 0); splitter.connect(merger, 1, 1); merger.connect(audioCtx.destination);
    } 
    else {
        splitter.connect(merger, 0, 0); splitter.connect(merger, 1, 1); merger.connect(audioCtx.destination);
    }
}
