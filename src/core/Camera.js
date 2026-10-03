/**
 * VALORIA - Camera System
 * Handles smooth camera following, shake, and zoom effects
 */

import { canvas, GAME_CONFIG } from '../main.js';

export class Camera {
    constructor() {
        // Position
        this.x = 0;
        this.y = 0;

        // Target position
        this.targetX = 0;
        this.targetY = 0;

        // Offset from target
        this.offsetX = 0;
        this.offsetY = 0;

        // Camera bounds
        this.bounds = {
            minX: 0,
            maxX: GAME_CONFIG.CANVAS_WIDTH,
            minY: 0,
            maxY: GAME_CONFIG.CANVAS_HEIGHT
        };

        // Smoothing
        this.followSpeed = 5;
        this.lookAhead = 50;
        this.verticalOffset = -100;

        // Shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Zoom
        this.zoom = 1;
        this.targetZoom = 1;
        this.zoomSpeed = 3;

        // Impact zoom (brief zoom on heavy hits)
        this.impactZoomIntensity = 0;
        this.impactZoomDuration = 0;
        this.impactZoomTime = 0;
    }

    reset() {
        this.x = GAME_CONFIG.CANVAS_WIDTH / 2;
        this.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.impactZoomDuration = 0;
        this.impactZoomTime = 0;
        this.zoom = 1;
        this.targetZoom = 1;
    }

    /**
     * Follow a target entity
     */
    follow(target, lookAheadX = 0) {
        this.targetX = target.x + lookAheadX;
        this.targetY = target.y + this.verticalOffset;
    }

    snapToTarget() {
        this.x = this.clamp(this.targetX, this.bounds.minX, this.bounds.maxX);
        this.y = this.clamp(this.targetY, this.bounds.minY, this.bounds.maxY);
    }

    /**
     * Apply camera transform to canvas context.
     * The caller owns save()/restore().
     */
    applyTransform(ctx) {
        ctx.scale(this.zoom, this.zoom);

        const centerX = GAME_CONFIG.CANVAS_WIDTH / 2 / this.zoom;
        const centerY = GAME_CONFIG.CANVAS_HEIGHT / 2 / this.zoom;

        ctx.translate(centerX - this.x + this.shakeOffsetX, centerY - this.y + this.shakeOffsetY);
    }

    updateShake(dt) {
        if (this.shakeTime < this.shakeDuration) {
            const decay = 1 - this.shakeTime / this.shakeDuration;
            const intensity = this.shakeIntensity * decay;

            this.shakeOffsetX = (Math.random() - 0.5) * intensity * 2;
            this.shakeOffsetY = (Math.random() - 0.5) * intensity * 2;

            this.shakeTime += dt;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }

        if (this.impactZoomTime < this.impactZoomDuration) {
            const progress = this.impactZoomTime / this.impactZoomDuration;
            this.zoom = this.targetZoom + this.impactZoomIntensity * (1 - progress);
            this.impactZoomTime += dt;
        } else {
            this.zoom = this.targetZoom;
        }
    }

    /**
     * Update camera position
     */
    update(dt) {
        // Exponential smoothing that stays stable even on long frames.
        const followFactor = 1 - Math.exp(-this.followSpeed * dt);
        this.x += (this.targetX - this.x) * followFactor;
        this.y += (this.targetY - this.y) * followFactor;

        this.x = this.clamp(this.x, this.bounds.minX, this.bounds.maxX);
        this.y = this.clamp(this.y, this.bounds.minY, this.bounds.maxY);

        this.updateShake(dt);
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Screen shake
     */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = 0;
    }

    /**
     * Light shake for minor impacts
     */
    shakeLight() {
        this.shake(3, 0.1);
    }

    /**
     * Medium shake for moderate impacts
     */
    shakeMedium() {
        this.shake(8, 0.15);
    }

    /**
     * Heavy shake for major impacts
     */
    shakeHeavy() {
        this.shake(15, 0.25);
    }

    /**
     * Impact zoom effect (brief zoom in)
     */
    impactZoom(intensity, duration) {
        this.impactZoomIntensity = intensity;
        this.impactZoomDuration = duration;
        this.impactZoomTime = 0;
    }

    /**
     * Set zoom level
     */
    setZoom(zoom) {
        this.targetZoom = zoom;
    }

    /**
     * Zoom in (for focusing on action)
     */
    zoomIn(amount = 0.1) {
        this.targetZoom = Math.max(0.8, this.targetZoom - amount);
    }

    /**
     * Zoom out
     */
    zoomOut(amount = 0.1) {
        this.targetZoom = Math.min(1.3, this.targetZoom + amount);
    }

    /**
     * Reset zoom to default
     */
    resetZoom() {
        this.targetZoom = 1;
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        const worldX = (screenX / this.zoom) + this.x - GAME_CONFIG.CANVAS_WIDTH / 2 / this.zoom;
        const worldY = (screenY / this.zoom) + this.y - GAME_CONFIG.CANVAS_HEIGHT / 2 / this.zoom;
        return { x: worldX, y: worldY };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x + GAME_CONFIG.CANVAS_WIDTH / 2 / this.zoom) * this.zoom;
        const screenY = (worldY - this.y + GAME_CONFIG.CANVAS_HEIGHT / 2 / this.zoom) * this.zoom;
        return { x: screenX, y: screenY };
    }

    /**
     * Set camera bounds
     */
    setBounds(minX, maxX, minY, maxY) {
        this.bounds.minX = minX;
        this.bounds.maxX = maxX;
        this.bounds.minY = minY;
        this.bounds.maxY = maxY;
    }
}
