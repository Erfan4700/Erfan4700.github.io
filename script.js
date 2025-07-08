document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('video-url');
    const subtitleFileInput = document.getElementById('subtitle-file');
    const loadButton = document.getElementById('load-button');
    const videoElement = document.getElementById('my-video');
    
    // کنترل‌های زیرنویس
    const subDirectionSelect = document.getElementById('sub-direction');
    const subColorSelect = document.getElementById('sub-color-select');
    const subColorCustom = document.getElementById('sub-color-custom');
    const subBgColorSelect = document.getElementById('sub-bg-color');
    const fontSizeSlider = document.getElementById('sub-font-size');
    const fontSizeValueSpan = document.getElementById('font-size-value');
    const fileNameSpan = document.getElementById('file-name');

    let player;
    let originalSpeed = 1;

    // --- رویدادهای اصلی ---
    loadButton.addEventListener('click', loadVideo);
    subtitleFileInput.addEventListener('change', loadSubtitle);

    function loadVideo() {
        const videoUrl = videoUrlInput.value.trim();
        if (!videoUrl) {
            alert('لطفاً لینک ویدیو را وارد کنید.');
            return;
        }

        // اگر پلیری وجود دارد، آن را از بین ببر
        if (player) {
            player.destroy();
        }

        const videoType = videoUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
        
        // پشتیبانی از HLS.js برای فایل‌های m3u8
        if (Hls.isSupported() && videoType === 'application/x-mpegURL') {
            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoElement);
            window.hls = hls;
        } else {
             videoElement.src = videoUrl;
        }

        // مقداردهی اولیه Plyr
        initializePlyr();
        player.play();
    }
    
    function initializePlyr() {
        player = new Plyr(videoElement, {
            captions: { active: true, update: true, language: 'auto' },
            settings: ['captions', 'quality', 'speed', 'loop'],
            speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2, 4] },
            keyboard: { focused: true, global: true },
            tooltips: { controls: true, seek: true },
            // فعال‌سازی ژست‌های لمسی برای جلو/عقب بردن
            listeners: {
                seek: true // This is not a standard Plyr option, gestures are built-in.
            }
        });
        
        // اضافه کردن رویدادهای سفارشی به پلیر
        addCustomPlayerEvents();
    }
    
    function loadSubtitle() {
        if (!player) {
            alert('ابتدا ویدیو را پخش کنید و سپس زیرنویس را اضافه نمایید.');
            return;
        }
        
        const subtitleFile = subtitleFileInput.files[0];
        if (!subtitleFile) return;

        fileNameSpan.textContent = `فایل انتخاب شده: ${subtitleFile.name}`;
        fileNameSpan.style.color = '#e0e0e0';

        const reader = new FileReader();
        reader.onload = function(event) {
            let fileContent = event.target.result;
            const fileExtension = subtitleFile.name.split('.').pop().toLowerCase();

            if (fileExtension === 'srt') {
                fileContent = srtToVtt(fileContent);
            }

            const subtitleBlob = new Blob([fileContent], { type: 'text/vtt' });
            const subtitleUrl = URL.createObjectURL(subtitleBlob);

            // حذف ترک‌های زیرنویس قبلی
            const oldTracks = player.media.querySelectorAll('track');
            oldTracks.forEach(track => track.remove());

            // اضافه کردن ترک جدید به صورت داینامیک
            const trackElement = document.createElement('track');
            trackElement.kind = 'captions';
            trackElement.label = subtitleFile.name.replace(/\.[^/.]+$/, "");
            trackElement.srclang = 'fa';
            trackElement.src = subtitleUrl;
            trackElement.default = true;
            
            player.media.appendChild(trackElement);
            
            // فعال‌سازی زیرنویس
            player.captions.toggled = true;
        };
        reader.readAsText(subtitleFile, 'UTF-8');
    }

    // --- قابلیت‌های اضافی ---

    function addCustomPlayerEvents() {
        const container = player.elements.container;

        // قابلیت: نگه داشتن موس/انگشت برای پخش سریع
        container.addEventListener('mousedown', handleFastForward);
        container.addEventListener('touchstart', handleFastForward, { passive: true });
        
        container.addEventListener('mouseup', handleNormalSpeed);
        container.addEventListener('mouseleave', handleNormalSpeed);
        container.addEventListener('touchend', handleNormalSpeed);
        container.addEventListener('touchcancel', handleNormalSpeed);
        
        // قابلیت: دو بار ضربه برای جلو/عقب بردن (در Plyr به صورت داخلی وجود دارد)
        // Plyr به طور پیش‌فرض از دو بار ضربه در موبایل پشتیبانی می‌کند.
        // همچنین با کلیدهای چپ/راست 5 ثانیه جابجا می‌شود. می‌توانیم این مقدار را تغییر دهیم:
        player.on('ready', () => {
             player.elements.container.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    player.rewind(10);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    player.forward(10);
                }
            });
        });
    }

    function handleFastForward(e) {
        // فقط اگر روی خود ویدیو کلیک شد عمل کند نه روی کنترل‌ها
        if (e.target !== player.elements.media) return;
        originalSpeed = player.speed;
        player.speed = 2;
    }

    function handleNormalSpeed() {
        if(player.speed !== originalSpeed) {
           player.speed = originalSpeed;
        }
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

    // --- منطق کنترل‌های استایل زیرنویس ---

    // اندازه فونت
    fontSizeSlider.addEventListener('input', (e) => {
        const size = `${e.target.value}px`;
        document.documentElement.style.setProperty('--sub-font-size', size);
        fontSizeValueSpan.textContent = size;
    });

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
});
