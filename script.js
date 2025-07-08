document.addEventListener('DOMContentLoaded', function() {
    // المان‌های ورودی
    const videoUrlInput = document.getElementById('video-url');
    const subtitleFileInput = document.getElementById('subtitle-file');
    const loadButton = document.getElementById('load-button');
    const videoElement = document.getElementById('my-video');
    const fileNameSpan = document.getElementById('file-name');

    // المان‌های کنترل زیرنویس
    const subDirectionSelect = document.getElementById('sub-direction');
    const subColorSelect = document.getElementById('sub-color-select');
    const subColorCustom = document.getElementById('sub-color-custom');
    const subBgColorSelect = document.getElementById('sub-bg-color');
    const subFontSizeSlider = document.getElementById('sub-font-size');
    const fontSizeValueSpan = document.getElementById('font-size-value');

    let player;
    let hls;
    let originalSpeed = 1; // برای ذخیره سرعت عادی ویدیو

    // --- راه‌اندازی پلیر Plyr ---
    function initializePlayer() {
        if (player) {
            player.destroy();
        }
        if (hls) {
            hls.destroy();
        }

        player = new Plyr(videoElement, {
            // گزینه‌های Plyr
            captions: { active: true, update: true, language: 'auto' },
            speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 4] },
            // فعال‌سازی میانبرهای کیبورد و کنترل‌های لمسی
            keyboard: { focused: true, global: true },
            tooltips: { controls: true, seek: true }
        });

        // اضافه کردن قابلیت "نگه داشتن برای پخش سریع"
        addSpeedOnHold(player);
    }

    loadButton.addEventListener('click', loadVideoAndSubtitle);

    function loadVideoAndSubtitle() {
        const videoUrl = videoUrlInput.value.trim();
        if (!videoUrl) {
            alert('لطفاً لینک ویدیو را وارد کنید.');
            return;
        }

        initializePlayer();

        const subtitleFile = subtitleFileInput.files[0];
        const tracks = [];

        // آماده‌سازی زیرنویس برای بارگذاری
        if (subtitleFile) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const fileContent = event.target.result;
                const fileExtension = subtitleFile.name.split('.').pop().toLowerCase();
                let vttContent;

                if (fileExtension === 'srt') {
                    vttContent = srtToVtt(fileContent);
                } else if (fileExtension === 'vtt') {
                    vttContent = fileContent;
                } else {
                    alert('فرمت زیرنویس پشتیبانی نمی‌شود. لطفاً از SRT یا VTT استفاده کنید.');
                    return;
                }

                const subtitleBlob = new Blob([vttContent], { type: 'text/vtt' });
                tracks.push({
                    kind: 'subtitles',
                    label: subtitleFile.name.replace(/\.[^/.]+$/, ""),
                    src: URL.createObjectURL(subtitleBlob),
                    srclang: 'fa',
                    default: true,
                });
                
                // بعد از خواندن فایل، منبع را تنظیم کن
                setPlayerSource(videoUrl, tracks);
            };
            reader.readAsText(subtitleFile, 'UTF-8');
        } else {
             // اگر زیرنویسی نبود، فقط منبع ویدیو را تنظیم کن
             setPlayerSource(videoUrl, []);
        }
    }

    function setPlayerSource(videoUrl, tracks) {
        const source = {
            type: 'video',
            sources: [
                {
                    src: videoUrl,
                    type: videoUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
                },
            ],
            tracks: tracks,
        };

        // مدیریت پخش HLS
        if (videoUrl.endsWith('.m3u8') && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoElement);
            window.hls = hls;
        }

        // به‌روزرسانی منبع پلیر
        player.source = source;
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

    // --- منطق جدید برای کنترل‌های زیرنویس با استفاده از متغیرهای CSS ---

    subtitleFileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileNameSpan.textContent = this.files[0].name;
            fileNameSpan.style.color = '#e0e0e0';
        } else {
            fileNameSpan.textContent = 'انتخاب فایل...';
            fileNameSpan.style.color = '#c0c0c0';
        }
    });

    subDirectionSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-direction', e.target.value);
    });

    subColorSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            subColorCustom.classList.remove('hidden');
            subColorCustom.click();
        } else {
            subColorCustom.classList.add('hidden');
            document.documentElement.style.setProperty('--sub-text-color', this.value);
        }
    });
    subColorCustom.addEventListener('input', function() {
        document.documentElement.style.setProperty('--sub-text-color', this.value);
    });

    subBgColorSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-bg-color', e.target.value);
    });

    subFontSizeSlider.addEventListener('input', (e) => {
        const newSize = e.target.value;
        document.documentElement.style.setProperty('--sub-font-size', `${newSize}px`);
        fontSizeValueSpan.textContent = newSize;
    });

    // --- قابلیت "نگه داشتن برای پخش 2x" ---
    function addSpeedOnHold(p) {
        const playerContainer = p.elements.container;

        const startFastPlay = () => {
            if (!p.paused && !p.ended) {
                originalSpeed = p.speed;
                p.speed = 2;
            }
        };

        const stopFastPlay = () => {
            if (p.speed === 2) {
                p.speed = originalSpeed;
            }
        };

        playerContainer.addEventListener('mousedown', startFastPlay);
        playerContainer.addEventListener('touchstart', startFastPlay);

        playerContainer.addEventListener('mouseup', stopFastPlay);
        playerContainer.addEventListener('mouseleave', stopFastPlay);
        playerContainer.addEventListener('touchend', stopFastPlay);
    }
});
