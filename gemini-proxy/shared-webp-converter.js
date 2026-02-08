// shared-webp-converter.js
class WebPConverter {
    static async convertToWebP(file, options = {}) {
        const {
            quality = 0.85,
            maxWidth = null,
            lossless = false,
            stripMetadata = true
        } = options;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        
                        // Calculate dimensions
                        let width = img.width;
                        let height = img.height;
                        
                        if (maxWidth && width > maxWidth) {
                            const ratio = maxWidth / width;
                            width = maxWidth;
                            height = Math.round(height * ratio);
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Draw and process image
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Convert to WebP
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Conversion failed'));
                                return;
                            }
                            
                            resolve({
                                blob: blob,
                                url: URL.createObjectURL(blob),
                                originalSize: file.size,
                                webpSize: blob.size,
                                width: width,
                                height: height
                            });
                        }, 'image/webp', quality);
                    };
                    img.onerror = () => reject(new Error('Failed to load image'));
                    img.src = event.target.result;
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}