// hooks/useStepCounter.ts
// High-accuracy step counter using accelerometer + distance fallback
// Implements peak detection from device motion API for real-time pedometer

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

export type StepCounterState = {
  steps: number;
  stepRate: number; // steps per minute
  cadence: number; // current step cadence
  isDetecting: boolean;
  error: string | null;
};

type Options = {
  onStepDetected?: (steps: number) => void;
  onUpdate?: (state: StepCounterState) => void;
  enabled?: boolean;
  useAccelerometer?: boolean;
};

// Empirically tuned constants for step detection
const STEP_DETECTION_CONFIG = {
  THRESHOLD_LOW: 15,        // Minimum acceleration peak
  THRESHOLD_HIGH: 30,       // Maximum normal walking peak
  MIN_STEP_INTERVAL_MS: 250, // Min milliseconds between steps (240 bpm max)
  MAX_STEP_INTERVAL_MS: 1200, // Max milliseconds between steps (50 bpm min)
  BUFFER_SIZE: 16,          // Rolling window for smoothing
  GRAVITY: 9.81,            // m/s² for filtering gravity
};

export function useStepCounter({ 
  onStepDetected, 
  onUpdate, 
  enabled = false,
  useAccelerometer = true 
}: Options = {}) {
  const [state, setState] = useState<StepCounterState>({
    steps: 0,
    stepRate: 0,
    cadence: 0,
    isDetecting: false,
    error: null,
  });

  const stepCountRef = useRef(0);
  const lastStepTimeRef = useRef<number>(0);
  const accelBufferRef = useRef<number[]>([]);
  const stepTimesRef = useRef<number[]>([]);
  const onStepDetectedRef = useRef(onStepDetected);
  const accelDataRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // Keep refs in sync with props
  useEffect(() => {
    onStepDetectedRef.current = onStepDetected;
  }, [onStepDetected]);

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!event.acceleration) return;

    const x = event.acceleration.x ?? 0;
    const y = event.acceleration.y ?? 0;
    const z = event.acceleration.z ?? 0;

    // Store latest acceleration data
    accelDataRef.current = { x, y, z };

    // Calculate magnitude (ignore gravity component)
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Add to rolling buffer for smoothing
    accelBufferRef.current.push(magnitude);
    if (accelBufferRef.current.length > STEP_DETECTION_CONFIG.BUFFER_SIZE) {
      accelBufferRef.current.shift();
    }

    // Only detect steps if we have enough buffer
    if (accelBufferRef.current.length < 4) return;

    // Calculate moving average
    const avgAccel = accelBufferRef.current.reduce((a, b) => a + b, 0) / accelBufferRef.current.length;
    const currentIdx = accelBufferRef.current.length - 1;
    const prevIdx = currentIdx - 1;

    // Peak detection: is current point > neighbors?
    if (currentIdx > 0 && accelBufferRef.current.length > 2) {
      const prev = accelBufferRef.current[prevIdx];
      const current = accelBufferRef.current[currentIdx];

      // Rising peak with threshold
      const isPeak = 
        current > prev && 
        current > STEP_DETECTION_CONFIG.THRESHOLD_LOW && 
        current < STEP_DETECTION_CONFIG.THRESHOLD_HIGH;

      if (isPeak) {
        const now = Date.now();
        const timeSinceLastStep = now - lastStepTimeRef.current;

        // Validate step timing (debounce false positives)
        if (
          timeSinceLastStep >= STEP_DETECTION_CONFIG.MIN_STEP_INTERVAL_MS &&
          timeSinceLastStep <= STEP_DETECTION_CONFIG.MAX_STEP_INTERVAL_MS
        ) {
          // Confirmed step detection
          stepCountRef.current++;
          lastStepTimeRef.current = now;

          // Track step times for cadence calculation
          stepTimesRef.current.push(now);
          if (stepTimesRef.current.length > 12) {
            stepTimesRef.current.shift(); // Keep last 12 steps for cadence
          }

          // Calculate cadence (steps per minute)
          let cadence = 0;
          if (stepTimesRef.current.length >= 2) {
            const timeSpan = stepTimesRef.current[stepTimesRef.current.length - 1] - stepTimesRef.current[0];
            if (timeSpan > 0) {
              cadence = Math.round((stepTimesRef.current.length / timeSpan) * 60000);
            }
          }

          // Calculate rolling step rate (steps/min)
          const rate60s = stepTimesRef.current.filter(t => now - t < 60000).length;
          const stepRate = rate60s > 0 ? rate60s : 0;

          setState({
            steps: stepCountRef.current,
            stepRate,
            cadence,
            isDetecting: true,
            error: null,
          });

          onStepDetectedRef.current?.(stepCountRef.current);
        }
      }
    }
  }, []);

  const start = useCallback(() => {
    if (!useAccelerometer) {
      setState(prev => ({ ...prev, error: 'Accelerometer disabled in config' }));
      return;
    }

    if (!('DeviceMotionEvent' in window)) {
      const msg = 'Accelerometer not available on this device';
      setState(prev => ({ ...prev, error: msg }));
      toast.error(msg);
      return;
    }

    // Request permission for iOS 13+
    if ('requestPermission' in (DeviceMotionEvent as any)) {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion, false);
            setState(prev => ({ ...prev, isDetecting: true, error: null }));
          } else {
            const msg = 'Motion sensor permission denied';
            setState(prev => ({ ...prev, error: msg }));
            toast.error(msg);
          }
        })
        .catch((err: any) => {
          console.warn('[StepCounter] Permission request failed:', err);
          // Fallback: try starting anyway
          window.addEventListener('devicemotion', handleDeviceMotion, false);
          setState(prev => ({ ...prev, isDetecting: true }));
        });
    } else {
      // Non-iOS: start immediately
      window.addEventListener('devicemotion', handleDeviceMotion, false);
      setState(prev => ({ ...prev, isDetecting: true, error: null }));
      toast.success('Step counter active');
    }
  }, [handleDeviceMotion, useAccelerometer]);

  const stop = useCallback(() => {
    window.removeEventListener('devicemotion', handleDeviceMotion);
    setState(prev => ({ ...prev, isDetecting: false }));
  }, [handleDeviceMotion]);

  const reset = useCallback(() => {
    stepCountRef.current = 0;
    lastStepTimeRef.current = Date.now();
    accelBufferRef.current = [];
    stepTimesRef.current = [];
    setState({
      steps: 0,
      stepRate: 0,
      cadence: 0,
      isDetecting: state.isDetecting,
      error: null,
    });
  }, [state.isDetecting]);

  // Update caller whenever state changes
  useEffect(() => {
    onUpdate?.(state);
  }, [state, onUpdate]);

  // Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [handleDeviceMotion]);

  return {
    ...state,
    start,
    stop,
    reset,
    accelData: accelDataRef.current,
  };
}
