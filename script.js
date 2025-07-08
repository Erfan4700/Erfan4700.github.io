document.addEventListener('DOMContentLoaded', function() {
    // المان‌های اصلی
    const videoUrlInput = document.getElementById('video-url');
    const subtitleFileInput = document.getElementById('subtitle-file');
    const loadButton = document.getElementById('load-button');
    const videoElement = document.getElementById('my-video');
    const fileNameSpan = document.getElementById('file-name');

    // کنترل‌های زیرنویس
    const subDirectionSelect = document.getElementById('sub-direction');
    const subColorSelect = document.getElementById('sub-color-select');
    const subColorCustom = document.getElementById('sub-color-custom');
    const subBgColorSelect = document.getElementById('sub-bg-color');
    const subFontSizeSlider = document.getElementById('sub-font-size');
    const fontSizeValueSpan = document.getElementById('font-size-value');

    let player;
    let originalSpeed = 1;
    let hls; // برای مدیریت HLS

    // تنظیمات پیش‌فرض Plyr
    const plyrOptions = {
        captions: { active: true, update: true, language: 'auto' },
        settings: ['captions', 'quality', 'speed', 'loop'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 4] }
    };

    function initializePlayer() {
        if (player) {
            player.destroy();
        }
        if (hls) {
            hls.destroy();
        }
        player = new Plyr(videoElement, plyrOptions);
        setupPlayerEventListeners(); // اضافه کردن event listener های جدید
    }

    loadButton.addEventListener('click', loadVideo);

    function loadVideo() {
        const videoUrl = videoUrlInput.value.trim();
        if (!videoUrl) {
            alert('لطفاً لینک ویدیو را وارد کنید.');
            return;
        }

        initializePlayer();

        if (Hls.isSupported() && videoUrl.endsWith('.m3u8')) {
            hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoElement);
            player.on('ready', () => player.play());
        } else {
            player.source = {
                type: 'video',
                sources: [{ src: videoUrl, type: 'video/mp4' }],
            };
            player.play();
        }
    }

    // *** قابلیت کلیدی: اضافه کردن زیرنویس در هر لحظه ***
    subtitleFileInput.addEventListener('change', function() {
        if (this.files.length === 0) {
            fileNameSpan.textContent = 'انتخاب فایل...';
            return;
        }
        
        const subtitleFile = this.files[0];
        fileNameSpan.textContent = subtitleFile.name;
        fileNameSpan.style.color = '#e0e0e0';

        if (!player) {
             // اگر هنوز ویدیویی پخش نشده، فقط فایل را نمایش می‌دهیم
            alert('ابتدا ویدیو را پخش کنید و سپس زیرنویس را اضافه نمایید.');
            return;
        }

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
                alert('فرمت زیرنویس پشتیبانی نمی‌شود (فقط SRT و VTT).');
                return;
            }

            // حذف ترک‌های زیرنویس قبلی
            const oldTracks = videoElement.querySelectorAll('track');
            oldTracks.forEach(track => track.remove());
            
            // ساخت ترک جدید و اضافه کردن به ویدیو
            const subtitleBlob = new Blob([vttContent], { type: 'text/vtt' });
            const subtitleUrl = URL.createObjectURL(subtitleBlob);
            
            const trackElement = document.createElement('track');
            trackElement.kind = 'captions';
            trackElement.label = subtitleFile.name.replace(/\.[^/.]+$/, "");
            trackElement.srclang = 'fa';
            trackElement.src = subtitleUrl;
            trackElement.default = true;
            
            videoElement.appendChild(trackElement);

            // بروزرسانی Plyr برای شناسایی ترک جدید
            player.captions.enable = true;
        };
        reader.readAsText(subtitleFile, 'UTF-8');
    });

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

    // --- منطق جدید برای کنترل‌های زیرنویس و پلیر ---

    // جهت متن
    subDirectionSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-direction', e.target.value);
    });

    // رنگ متن
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

    // رنگ پس‌زمینه
    subBgColorSelect.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--sub-bg-color', e.target.value);
    });
    
    // *** اسلایدر اندازه فونت ***
    subFontSizeSlider.addEventListener('input', function() {
        const newSize = this.value;
        fontSizeValueSpan.textContent = newSize;
        document.documentElement.style.setProperty('--sub-font-size', `${newSize}px`);
    });

    // --- قابلیت‌های پیشرفته پلیر ---
    function setupPlayerEventListeners() {
        const playerContainer = player.elements.container;
        let lastTap = 0;

        // *** قابلیت نگه داشتن برای پخش سریع ***
        playerContainer.addEventListener('mousedown', handleFastForwardStart);
        playerContainer.addEventListener('touchstart', handleFastForwardStart, { passive: true });
        
        playerContainer.addEventListener('mouseup', handleFastForwardEnd);
        playerContainer.addEventListener('mouseleave', handleFastForwardEnd);
        playerContainer.addEventListener('touchend', handleFastForwardEnd);
        
        function handleFastForwardStart(e) {
            // فقط روی خود ویدیو کار کند نه کنترل‌ها
            if (e.target !== player.elements.media) return;
            
            if (player.playing) {
                originalSpeed = player.speed;
                player.speed = 2;
            }
        }
        
        function handleFastForwardEnd() {
            if (player.speed === 2) {
                player.speed = originalSpeed;
            }
        }

        // *** قابلیت دو بار ضربه برای جلو/عقب بردن ***
        playerContainer.addEventListener('touchend', (e) => {
            // فقط روی خود ویدیو کار کند نه کنترل‌ها
            if (e.target !== player.elements.media) return;

            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) { // 300ms window for double tap
                const videoRect = player.elements.media.getBoundingClientRect();
                const touchX = e.changedTouches[0].clientX;
                const thirdOfWidth = videoRect.width / 3;

                if (touchX < videoRect.left + thirdOfWidth) {
                    player.rewind(10); // عقب
                } else if (touchX > videoRect.right - thirdOfWidth) {
                    player.forward(10); // جلو
                }
                e.preventDefault();
                lastTap = 0; // Reset tap
            } else {
                lastTap = currentTime;
            }
        });
        
        // *** قابلیت جلو/عقب بردن با کیبورد ***
        document.addEventListener('keydown', (e) => {
            if (!player || !player.source) return; // اگر پلیر فعال نیست، کاری نکن
            // مطمئن شویم که کاربر در حال تایپ در یک فیلد متنی نیست
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                player.forward(10);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                player.rewind(10);
            }
        });
    }

    // اعمال مقدار اولیه CSS variables
    document.documentElement.style.setProperty('--sub-direction', subDirectionSelect.value);
    document.documentElement.style.setProperty('--sub-text-color', subColorSelect.value);
    document.documentElement.style.setProperty('--sub-bg-color', subBgColorSelect.value);
    document.documentElement.style.setProperty('--sub-font-size', `${subFontSizeSlider.value}px`);
});
