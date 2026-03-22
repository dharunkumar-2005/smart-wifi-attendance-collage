/**
 * Camera Service
 * Handles camera operations, face capture, and image processing for security verification
 */

export interface CapturedFaceData {
  base64: string;
  timestamp: string;
  deviceId: string;
  width: number;
  height: number;
}

export interface CameraPermissionStatus {
  granted: boolean;
  error?: string;
}

class CameraService {
  private videoRef: HTMLVideoElement | null = null;
  private canvasRef: HTMLCanvasElement | null = null;
  private mediaStream: MediaStream | null = null;
  private facingMode: 'user' | 'environment' = 'user'; // user = front camera

  /**
   * Request camera permissions and access
   */
  async requestCameraAccess(): Promise<CameraPermissionStatus> {
    try {
      // Check browser support
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      console.log('Requesting camera access with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      
      console.log('✅ Camera access granted. Stream tracks:', stream.getTracks().length);

      return {
        granted: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Camera access denied:', error);

      let userFriendlyError = 'Camera access denied. ';
      if (errorMessage.includes('NotAllowedError')) {
        userFriendlyError += 'Please allow camera access when prompted. If you previously blocked it, check your browser settings.';
      } else if (errorMessage.includes('NotFoundError')) {
        userFriendlyError += 'No camera device found on your device.';
      } else if (errorMessage.includes('NotReadableError')) {
        userFriendlyError += 'Camera is already in use by another application. Please close it first.';
      } else if (errorMessage.includes('TypeError')) {
        userFriendlyError += 'Please use https or localhost to access the camera.';
      } else {
        userFriendlyError += 'Please refresh the page and try again.';
      }

      return {
        granted: false,
        error: userFriendlyError,
      };
    }
  }

  /**
   * Initialize camera stream and attach to video element
   */
  initializeCamera(videoElement: HTMLVideoElement): void {
    if (!this.mediaStream) {
      console.error('Media stream not initialized. Call requestCameraAccess first.');
      return;
    }

    this.videoRef = videoElement;
    videoElement.srcObject = this.mediaStream;
    videoElement.muted = true; // Critical for autoplay in browsers
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    
    // Handle both old and new ways of playing video
    videoElement.onloadedmetadata = () => {
      console.log('Video metadata loaded, attempting to play...');
      videoElement.play().catch((err) => {
        console.error('Video play error on metadata load:', err);
      });
    };
    
    // Also try to play immediately
    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Video started playing successfully');
        })
        .catch((err) => {
          console.error('Autoplay error:', err);
        });
    }
  }

  /**
   * Capture face from camera stream and return base64 image
   */
  captureFace(deviceId: string): CapturedFaceData | null {
    if (!this.videoRef || !this.mediaStream) {
      console.error('Camera not initialized');
      return null;
    }

    // Create canvas if not exists
    if (!this.canvasRef) {
      this.canvasRef = document.createElement('canvas');
    }

    const canvas = this.canvasRef;
    const video = this.videoRef;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capture frame
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return null;
    }

    // Mirror the image horizontally (for front camera, this is expected)
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1); // Reset to normal

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', 0.8);

    return {
      base64,
      timestamp: new Date().toISOString(),
      deviceId,
      width: canvas.width,
      height: canvas.height,
    };
  }

  /**
   * Stop camera stream
   */
  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.mediaStream = null;
    }

    if (this.videoRef) {
      this.videoRef.srcObject = null;
      this.videoRef = null;
    }
  }

  /**
   * Check if browser supports camera
   */
  isCameraSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Get camera device information
   */
  async getCameraDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error enumerating camera devices:', error);
      return [];
    }
  }

  /**
   * Check if camera is actively streaming
   */
  isCameraActive(): boolean {
    return this.mediaStream !== null && this.videoRef !== null;
  }

  /**
   * Compress base64 image for storage (reduce quality/size)
   */
  async compressImage(base64: string, quality: number = 0.6): Promise<string> {
    const canvas = document.createElement('canvas');
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(base64); // Return original if compression fails
        }
      };
      img.src = base64;
    });
  }

  /**
   * Generate thumbnail from base64 image
   */
  async generateThumbnail(base64: string, maxWidth: number = 150): Promise<string> {
    const canvas = document.createElement('canvas');
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        const ratio = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else {
          resolve(base64);
        }
      };
      img.src = base64;
    });
  }
}

// Export singleton instance
export const cameraService = new CameraService();
