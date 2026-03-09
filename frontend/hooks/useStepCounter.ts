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

// Tuned constants for real-device walking/running detection
const STEP_DETECTION_CONFIG = {
  THRESHOLD_RISE: 1.15,      // Higher threshold reduces noise-triggered false steps
  THRESHOLD_FALL: 0.7,       // Stronger hysteresis before next step can trigger
  MIN_STEP_INTERVAL_MS: 280, // Filters unrealistically fast double counts
  MAX_STEP_INTERVAL_MS: 1800, // Keeps slow walking cadence valid
  BUFFER_SIZE: 10,           // Slightly smoother baseline to reduce jitter
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
  const wasAboveThresholdRef = useRef(false);

  // Keep refs in sync with props
  useEffect(() => {
    onStepDetectedRef.current = onStepDetected;
  }, [onStepDetected]);

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;

    // Store latest acceleration data
    accelDataRef.current = { x, y, z };

    // Magnitude of acceleration vector
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    // Add to rolling buffer for smoothing
    accelBufferRef.current.push(magnitude);
    if (accelBufferRef.current.length > STEP_DETECTION_CONFIG.BUFFER_SIZE) {
      accelBufferRef.current.shift();
    }

    // Only detect steps if we have enough buffer
    if (accelBufferRef.current.length < 2) return;

    // Smoothed baseline from rolling average
    const avgAccel = accelBufferRef.current.reduce((a, b) => a + b, 0) / accelBufferRef.current.length;
    const signal = Math.abs(magnitude - avgAccel);
    const now = Date.now();
    const timeSinceLastStep = now - lastStepTimeRef.current;

    // Hysteresis detector to avoid double-counting on one stride
    if (!wasAboveThresholdRef.current && signal >= STEP_DETECTION_CONFIG.THRESHOLD_RISE) {
      // Allow first detected step even after long idle time,
      // then apply cadence window constraints for subsequent steps.
      const isFirstStep = stepCountRef.current === 0;
      const validInterval = isFirstStep
        ? timeSinceLastStep >= STEP_DETECTION_CONFIG.MIN_STEP_INTERVAL_MS
        : (
            timeSinceLastStep >= STEP_DETECTION_CONFIG.MIN_STEP_INTERVAL_MS &&
            timeSinceLastStep <= STEP_DETECTION_CONFIG.MAX_STEP_INTERVAL_MS
          );

      if (validInterval) {
        stepCountRef.current++;
        lastStepTimeRef.current = now;

        stepTimesRef.current.push(now);
        if (stepTimesRef.current.length > 12) stepTimesRef.current.shift();

        let cadence = 0;
        if (stepTimesRef.current.length >= 2) {
          const timeSpan = stepTimesRef.current[stepTimesRef.current.length - 1] - stepTimesRef.current[0];
          if (timeSpan > 0) cadence = Math.round((stepTimesRef.current.length / timeSpan) * 60000);
        }

        const stepRate = stepTimesRef.current.filter((timestamp) => now - timestamp < 60000).length;

        // Debug logging every 10 steps
        if (stepCountRef.current % 10 === 0) {
          console.log(`[Steps] Detected ${stepCountRef.current} steps, Rate: ${stepRate}/min, Cadence: ${cadence} bpm`);
        }

        setState({
          steps: stepCountRef.current,
          stepRate,
          cadence,
          isDetecting: true,
          error: null,
        });

        onStepDetectedRef.current?.(stepCountRef.current);
      }
      wasAboveThresholdRef.current = true;
    } else if (wasAboveThresholdRef.current && signal <= STEP_DETECTION_CONFIG.THRESHOLD_FALL) {
      wasAboveThresholdRef.current = false;
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
    wasAboveThresholdRef.current = false;
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
