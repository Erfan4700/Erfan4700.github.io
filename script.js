document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const subtitleFileInput = document.getElementById('subtitle-file');
    const loadButton = document.getElementById('load-button');
    const videoContainer = document.getElementById('player-container');
    
    // کنترل‌های زیرنویس
    const subDirectionSelect = document.getElementById('sub-direction');
    const subColorInput = document.getElementById('sub-color');
    const subBgColorSelect = document.getElementById('sub-bg-color');
    
    let player;

    function initializePlayer() {
        // اگر پلیری از قبل وجود دارد، آن را از بین ببر
        if (player) {
            player.dispose();
        }

        // یک تگ ویدیوی جدید بساز تا تنظیمات قبلی پاک شود
        videoContainer.innerHTML = '<video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto"></video>';
        
        const videoElement = document.getElementById('my-video');
        
        // --- تغییر اصلی اینجاست ---
        // ما بخش مربوط به پلاگین "ass" را از تنظیمات اولیه حذف کردیم
        // چون این پلاگین به صورت خودکار خودش را ثبت می‌کند.
        player = videojs(videoElement, {
            fluid: true, // برای واکنش‌گرا بودن پلیر
            playbackRates: [0.5, 1, 1.5, 2], // گزینه‌های سرعت پخش
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
        } else if (videoUrl.endsWith('.mp4')) {
            videoType = 'video/mp4';
        } else if (videoUrl.endsWith('.mkv')) {
            // مرورگرها MKV را معمولاً به عنوان webm یا mp4 پخش می‌کنند.
            // به Video.js اجازه می‌دهیم خودش تشخیص دهد.
            videoType = 'video/mp4';
        } else {
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
                    // حالا که پلیر به درستی ساخته شده، می‌توانیم از متد .ass() استفاده کنیم
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
            if (parts.length >= 2) {
                // اطمینان از اینکه خط زمان معتبر است
                if (parts[1].includes('-->')) {
                    const time = parts[1].replace(/,/g, '.');
                    const text = parts.slice(2).join('\n');
                    vttText += `${time}\n${text}\n\n`;
                }
            }
        });
        return vttText;
    }

    // اعمال تغییرات استایل زیرنویس
    subDirectionSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-direction', e.target.value);
    });
    subColorInput.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--sub-text-color', e.target.value);
    });
    subBgColorSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-bg-color', e.target.value);
    });
});
