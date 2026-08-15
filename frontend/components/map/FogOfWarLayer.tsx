'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { cellToBoundary } from 'h3-js';
import L from 'leaflet';

const FOG_COLOR = 'rgba(10, 12, 18, 0.88)';
const REDRAW_THROTTLE_MS = 80;

export default function FogOfWarLayer({ unfoggedHexes }: { unfoggedHexes: string[] }) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paneRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDrawArgs = useRef<string>('');
  const hexSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    hexSetRef.current = new Set(unfoggedHexes);
  }, [unfoggedHexes]);

  useEffect(() => {
    if (!map) return;

    const pane = map.getPane('overlayPane');
    paneRef.current = pane as HTMLElement;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '450';
    canvasRef.current = canvas;
    pane?.appendChild(canvas);

    const resize = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      requestDraw();
    };

    const requestDraw = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        draw();
      });
    };

    const draw = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      const w = cvs.width;
      const h = cvs.height;
      if (w <= 0 || h <= 0) return;

      ctx.clearRect(0, 0, w, h);

      const unfogged = hexSetRef.current;
      if (unfogged.size === 0) {
        ctx.fillStyle = FOG_COLOR;
        ctx.fillRect(0, 0, w, h);
        return;
      }

      ctx.fillStyle = FOG_COLOR;
      ctx.fillRect(0, 0, w, h);

      const zoom = map.getZoom();
      const simplifyAtZoom = (z: number) => z > 16 ? 1 : z > 14 ? 2 : z > 12 ? 3 : z > 10 ? 4 : 5;
      const skip = simplifyAtZoom(zoom);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      const hexArray = Array.from(unfogged);
      let idx = 0;
      for (const hexId of hexArray) {
        if (idx % (skip + 1) !== 0) { idx++; continue; }
        idx++;

        try {
          const boundary = cellToBoundary(hexId);
          if (!boundary || boundary.length < 3) continue;

          ctx.beginPath();
          const first = map.latLngToLayerPoint(boundary[0]);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < boundary.length; i++) {
            const pt = map.latLngToLayerPoint(boundary[i]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.fill();
        } catch {
          // skip invalid hex
        }
      }

      ctx.restore();
    };

    map.on('move zoom moveend zoomend resize', requestDraw);
    resize();

    return () => {
      map.off('move', requestDraw);
      map.off('zoom', requestDraw);
      map.off('moveend', requestDraw);
      map.off('zoomend', requestDraw);
      map.off('resize', requestDraw);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
      paneRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [map]);

  return null;
}
