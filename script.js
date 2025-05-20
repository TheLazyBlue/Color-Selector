document.addEventListener('DOMContentLoaded', () => {
    const gradient = document.getElementById('gradient');
    const colorPreview = document.getElementById('color-preview');
    const hexValue = document.getElementById('hex-value');
    const unselectBtn = document.getElementById('unselect-btn');
    const randomBtn = document.getElementById('random-btn');
    const brightnessSlider = document.getElementById('brightness-slider');
    const saturationSlider = document.getElementById('saturation-slider');
    const colorIndicator = document.getElementById('color-indicator');

    let isColorLocked = false;
    let lockedColor = null;
    let brightness = 0.5; // 0 (black) to 1 (white)
    let saturation = 1;   // 0 (gray) to 1 (full color)
    let indicatorPos = { x: null, y: null };

    // Create a hidden canvas for gradient rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const GRADIENT_WIDTH = 400;
    const GRADIENT_HEIGHT = 400;
    canvas.width = GRADIENT_WIDTH;
    canvas.height = GRADIENT_HEIGHT;

    function drawGradient() {
        // Draw base hue gradient
        const hueGradient = ctx.createLinearGradient(0, 0, GRADIENT_WIDTH, 0);
        hueGradient.addColorStop(0, '#ff0000');
        hueGradient.addColorStop(0.083, '#ff8000');
        hueGradient.addColorStop(0.166, '#ffff00');
        hueGradient.addColorStop(0.25, '#80ff00');
        hueGradient.addColorStop(0.333, '#00ff00');
        hueGradient.addColorStop(0.416, '#00ff80');
        hueGradient.addColorStop(0.5, '#00ffff');
        hueGradient.addColorStop(0.583, '#0080ff');
        hueGradient.addColorStop(0.666, '#0000ff');
        hueGradient.addColorStop(0.75, '#8000ff');
        hueGradient.addColorStop(0.833, '#ff00ff');
        hueGradient.addColorStop(1, '#ff0080');
        ctx.fillStyle = hueGradient;
        ctx.fillRect(0, 0, GRADIENT_WIDTH, GRADIENT_HEIGHT);

        // Apply vertical white overlay for brightness (top = white, bottom = black)
        ctx.save();
        const whiteToTransparent = ctx.createLinearGradient(0, 0, 0, GRADIENT_HEIGHT);
        whiteToTransparent.addColorStop(0, `rgba(255,255,255,${1 - brightness})`);
        whiteToTransparent.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = whiteToTransparent;
        ctx.fillRect(0, 0, GRADIENT_WIDTH, GRADIENT_HEIGHT);
        ctx.restore();

        // Apply vertical black overlay for brightness (bottom = black)
        ctx.save();
        const transparentToBlack = ctx.createLinearGradient(0, 0, 0, GRADIENT_HEIGHT);
        transparentToBlack.addColorStop(0, `rgba(0,0,0,0)`);
        transparentToBlack.addColorStop(1, `rgba(0,0,0,${1 - brightness})`);
        ctx.fillStyle = transparentToBlack;
        ctx.fillRect(0, 0, GRADIENT_WIDTH, GRADIENT_HEIGHT);
        ctx.restore();

        // Apply vertical saturation overlay (top = full color, bottom = grayscale)
        ctx.save();
        const imageData = ctx.getImageData(0, 0, GRADIENT_WIDTH, GRADIENT_HEIGHT);
        for (let y = 0; y < GRADIENT_HEIGHT; y++) {
            const sat = 1 - (y / (GRADIENT_HEIGHT - 1)) * (1 - saturation);
            for (let x = 0; x < GRADIENT_WIDTH; x++) {
                const idx = (y * GRADIENT_WIDTH + x) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                // Convert to grayscale
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                imageData.data[idx] = Math.round(gray + (r - gray) * sat);
                imageData.data[idx + 1] = Math.round(gray + (g - gray) * sat);
                imageData.data[idx + 2] = Math.round(gray + (b - gray) * sat);
            }
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();

        // Set as background image for the gradient div
        gradient.style.background = `url(${canvas.toDataURL()})`;
        gradient.style.backgroundSize = 'cover';
    }

    function setIndicator(x, y, color) {
        if (x == null || y == null) {
            colorIndicator.style.display = 'none';
            return;
        }
        colorIndicator.style.display = 'block';
        colorIndicator.style.left = `${x}px`;
        colorIndicator.style.top = `${y}px`;
        colorIndicator.style.background = color;
        colorIndicator.style.borderColor = (color === '#ffffff' ? '#111' : '#fff');
    }

    function getColorAtPosition(event) {
        const rect = gradient.getBoundingClientRect();
        const x = Math.min(Math.max(event.clientX - rect.left, 0), GRADIENT_WIDTH - 1);
        const y = Math.min(Math.max(event.clientY - rect.top, 0), GRADIENT_HEIGHT - 1);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = '#' + [pixel[0], pixel[1], pixel[2]]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('');
        return { hex, x, y };
    }

    function updateColor(event) {
        if (isColorLocked) return;
        const { hex, x, y } = getColorAtPosition(event);
        colorPreview.style.backgroundColor = hex;
        hexValue.value = hex;
        document.body.style.backgroundColor = hex;
        setIndicator(x, y, hex);
        indicatorPos = { x, y };
    }

    function lockColor(event) {
        const { hex, x, y } = getColorAtPosition(event);
        isColorLocked = true;
        lockedColor = hex;
        colorPreview.style.backgroundColor = hex;
        hexValue.value = hex;
        document.body.style.backgroundColor = hex;
        gradient.style.cursor = 'default';
        setIndicator(x, y, hex);
        indicatorPos = { x, y };
    }

    function unselectColor() {
        isColorLocked = false;
        lockedColor = null;
        colorPreview.style.backgroundColor = '#FFFFFF';
        hexValue.value = '#FFFFFF';
        document.body.style.backgroundColor = '#FFFFFF';
        gradient.style.cursor = 'pointer';
        setIndicator(null, null, null);
        indicatorPos = { x: null, y: null };
    }

    function getRandomColor() {
        const rect = gradient.getBoundingClientRect();
        const randomX = Math.random() * GRADIENT_WIDTH;
        const randomY = Math.random() * GRADIENT_HEIGHT;
        const fakeEvent = {
            clientX: rect.left + randomX,
            clientY: rect.top + randomY
        };
        lockColor(fakeEvent);
    }

    // Manual hex input logic
    function isValidHex(hex) {
        return /^#([0-9a-fA-F]{6})$/.test(hex);
    }

    function setColorFromHexInput() {
        const hex = hexValue.value.trim();
        if (!isValidHex(hex)) {
            hexValue.classList.add('invalid');
            return;
        }
        hexValue.classList.remove('invalid');
        colorPreview.style.backgroundColor = hex;
        document.body.style.backgroundColor = hex;
        // Hide indicator since we don't know the position on the gradient
        setIndicator(null, null, hex);
        isColorLocked = false;
        lockedColor = null;
    }

    hexValue.addEventListener('change', setColorFromHexInput);
    hexValue.addEventListener('blur', setColorFromHexInput);
    hexValue.addEventListener('input', () => {
        if (isValidHex(hexValue.value.trim())) {
            hexValue.classList.remove('invalid');
        } else {
            hexValue.classList.add('invalid');
        }
    });
    hexValue.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            setColorFromHexInput();
            hexValue.blur();
        }
    });

    // Slider event handlers
    brightnessSlider.addEventListener('input', () => {
        brightness = brightnessSlider.value / 100;
        drawGradient();
        if (!isColorLocked) {
            colorPreview.style.backgroundColor = '#FFFFFF';
            hexValue.value = '#FFFFFF';
            document.body.style.backgroundColor = '#FFFFFF';
            setIndicator(null, null, null);
        } else {
            setIndicator(indicatorPos.x, indicatorPos.y, lockedColor);
        }
    });
    saturationSlider.addEventListener('input', () => {
        saturation = saturationSlider.value / 100;
        drawGradient();
        if (!isColorLocked) {
            colorPreview.style.backgroundColor = '#FFFFFF';
            hexValue.value = '#FFFFFF';
            document.body.style.backgroundColor = '#FFFFFF';
            setIndicator(null, null, null);
        } else {
            setIndicator(indicatorPos.x, indicatorPos.y, lockedColor);
        }
    });

    gradient.addEventListener('mousemove', updateColor);
    gradient.addEventListener('mouseleave', () => {
        if (!isColorLocked) setIndicator(null, null, null);
    });
    gradient.addEventListener('click', lockColor);
    unselectBtn.addEventListener('click', unselectColor);
    randomBtn.addEventListener('click', getRandomColor);

    // Initial draw
    drawGradient();
    setIndicator(null, null, null);
}); 