document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const subtitleFileInput = document.getElementById('subtitle-file');
    const loadButton = document.getElementById('load-button');
    const videoContainer = document.getElementById('player-container');
    
    // کنترل‌های زیرنویس
    const subDirectionSelect = document.getElementById('sub-direction');
    const subColorSelect = document.getElementById('sub-color-select');
    const subColorCustom = document.getElementById('sub-color-custom');
    const subBgColorSelect = document.getElementById('sub-bg-color');
    const fileNameSpan = document.getElementById('file-name');
    
    let player;

    function initializePlayer() {
        if (player) {
            player.dispose();
        }

        videoContainer.innerHTML = '<video id="my-video" class="video-js vjs-big-play-centered" controls preload="auto"></video>';
        
        const videoElement = document.getElementById('my-video');
        
        // --- اضافه کردن سرعت‌های پخش جدید ---
        player = videojs(videoElement, {
            fluid: true,
            playbackRates: [0.25, 0.5, 0.75, 1, 1.5, 2, 2.25, 2.5, 2.75, 3, 4],
        });
    }

    loadButton.addEventListener('click', loadVideoAndSubtitle);

    function loadVideoAndSubtitle() {
        const videoUrl = videoUrlInput.value.trim();
        if (!videoUrl) {
            alert('لطفاً لینک ویدیو را وارد کنید.');
            return;
        }

        initializePlayer();

        let videoType;
        if (videoUrl.endsWith('.m3u8')) {
            videoType = 'application/x-mpegURL';
        } else {
            // اجازه دهید Video.js نوع را تشخیص دهد
            videoType = 'video/mp4'; 
        }
        
        player.src({ src: videoUrl, type: videoType });

        const subtitleFile = subtitleFileInput.files[0];
        if (subtitleFile) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const fileContent = event.target.result;
                const fileExtension = subtitleFile.name.split('.').pop().toLowerCase();
                let subtitleBlob, subtitleUrl, kind, label;

                label = subtitleFile.name.replace(/\.[^/.]+$/, ""); 

                if (fileExtension === 'srt') {
                    const vttContent = srtToVtt(fileContent);
                    subtitleBlob = new Blob([vttContent], { type: 'text/vtt' });
                    kind = 'subtitles';
                } else if (fileExtension === 'vtt') {
                    subtitleBlob = new Blob([fileContent], { type: 'text/vtt' });
                    kind = 'subtitles';
                } else if (fileExtension === 'ass') {
                    player.ready(function() {
                        this.ass({
                            src: URL.createObjectURL(new Blob([fileContent], { type: 'text/plain' })),
                            label: label
                        });
                    });
                    player.play();
                    return; 
                } else {
                    alert('فرمت زیرنویس پشتیبانی نمی‌شود.');
                    return;
                }

                subtitleUrl = URL.createObjectURL(subtitleBlob);

                player.addRemoteTextTrack({
                    kind: kind,
                    language: 'fa',
                    label: label,
                    src: subtitleUrl
                }, true);
            };
            reader.readAsText(subtitleFile, 'UTF-8');
        }
        
        player.play();
    }
    
    function srtToVtt(srtText) {
        let vttText = "WEBVTT\n\n";
        srtText = srtText.replace(/\r+/g, '').replace(/^\s+|\s+$/g, '');
        const cues = srtText.split('\n\n');
        cues.forEach(cue => {
            const parts = cue.split('\n');
            if (parts.length >= 2 && parts[1].includes('-->')) {
                const time = parts[1].replace(/,/g, '.');
                const text = parts.slice(2).join('\n');
                vttText += `${time}\n${text}\n\n`;
            }
        });
        return vttText;
    }

    // --- منطق جدید برای کنترل‌های زیرنویس ---

    // نمایش نام فایل انتخاب شده
    subtitleFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileNameSpan.textContent = this.files[0].name;
            fileNameSpan.style.color = '#e0e0e0';
        } else {
            fileNameSpan.textContent = 'انتخاب فایل...';
            fileNameSpan.style.color = '#c0c0c0';
        }
    });

    // تنظیم جهت متن
    subDirectionSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-direction', e.target.value);
    });

    // منطق جدید برای انتخاب رنگ متن
    subColorSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            subColorCustom.classList.remove('hidden');
            subColorCustom.click(); // باز کردن خودکار پالت رنگ
        } else {
            subColorCustom.classList.add('hidden');
            document.documentElement.style.setProperty('--sub-text-color', this.value);
        }
    });
    subColorCustom.addEventListener('input', function() {
        document.documentElement.style.setProperty('--sub-text-color', this.value);
    });

    // تنظیم رنگ پس‌زمینه
    subBgColorSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-bg-color', e.target.value);
    });
});
