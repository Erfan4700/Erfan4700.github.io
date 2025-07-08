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
        player = videojs(videoElement, {
            fluid: true, // برای واکنش‌گرا بودن پلیر
            playbackRates: [0.5, 1, 1.5, 2], // گزینه‌های سرعت پخش
            plugins: {
                ass: {} // فعال کردن پلاگین زیرنویس ASS
            }
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

        // تعیین نوع ویدیو بر اساس پسوند
        let videoType;
        if (videoUrl.endsWith('.m3u8')) {
            videoType = 'application/x-mpegURL'; // for HLS (TS streams)
        } else if (videoUrl.endsWith('.mp4')) {
            videoType = 'video/mp4';
        } else if (videoUrl.endsWith('.mkv')) {
            videoType = 'video/webm'; // مرورگرها MKV را گاهی با نوع webm پخش می‌کنند
        } else {
            // برای فرمت‌های دیگر، نوع را خالی بگذار تا مرورگر خودش تشخیص دهد
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

                label = subtitleFile.name.replace(/\.[^/.]+$/, ""); // نام فایل بدون پسوند

                if (fileExtension === 'srt') {
                    const vttContent = srtToVtt(fileContent);
                    subtitleBlob = new Blob([vttContent], { type: 'text/vtt' });
                    kind = 'subtitles';
                } else if (fileExtension === 'vtt') {
                    subtitleBlob = new Blob([fileContent], { type: 'text/vtt' });
                    kind = 'subtitles';
                } else if (fileExtension === 'ass') {
                     // پلاگین videojs-ass مستقیماً با محتوای فایل کار می‌کند
                    player.ass({
                        src: URL.createObjectURL(new Blob([fileContent], { type: 'text/plain' })),
                        label: label
                    });
                    player.play();
                    return; // چون پلاگین ASS خودش کار را انجام می‌دهد
                } else {
                    alert('فرمت زیرنویس پشتیبانی نمی‌شود.');
                    return;
                }

                subtitleUrl = URL.createObjectURL(subtitleBlob);

                // اضافه کردن ترک زیرنویس به پلیر
                player.addRemoteTextTrack({
                    kind: kind,
                    language: 'fa',
                    label: label,
                    src: subtitleUrl
                }, true); // `true` باعث می‌شود این ترک به صورت پیش‌فرض انتخاب شود
            };
            reader.readAsText(subtitleFile, 'UTF-8');
        }
        
        player.play();
    }
    
    // تابع تبدیل SRT به VTT
    function srtToVtt(srtText) {
        let vttText = "WEBVTT\n\n";
        // پاک کردن کاراکترهای اضافی و نرمال‌سازی خطوط
        srtText = srtText.replace(/\r+/g, '').replace(/^\s+|\s+$/g, '');
        const cues = srtText.split('\n\n');
        cues.forEach(cue => {
            const parts = cue.split('\n');
            if (parts.length >= 2) {
                const time = parts[1].replace(/,/g, '.');
                const text = parts.slice(2).join('\n');
                vttText += `${time}\n${text}\n\n`;
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