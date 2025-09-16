export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();
  private logs: Array<{ metric: string; value: number; timestamp: number }> = [];

  startTimer(label: string): void {
    this.startTimes.set(label, Date.now());
  }

  endTimer(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`Timer "${label}" was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.metrics.set(label, duration);
    this.logs.push({ metric: label, value: duration, timestamp: Date.now() });
    this.startTimes.delete(label);

    console.log(`Performance: ${label} took ${duration}ms`);
    return duration;
  }

  recordMetric(label: string, value: number): void {
    this.metrics.set(label, value);
    this.logs.push({ metric: label, value, timestamp: Date.now() });
    console.log(`Performance: ${label} = ${value}`);
  }

  getMetric(label: string): number | undefined {
    return this.metrics.get(label);
  }

  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getAverageLatency(): number {
    const latencyMetrics = this.logs.filter(log => 
      log.metric.includes('latency') || log.metric.includes('translation')
    );
    
    if (latencyMetrics.length === 0) return 0;
    
    const sum = latencyMetrics.reduce((acc, log) => acc + log.value, 0);
    return sum / latencyMetrics.length;
  }

  getPerformanceReport(): {
    totalTranslations: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    audioProcessingTime: number;
    translationTime: number;
    ttsTime: number;
  } {
    const translationMetrics = this.logs.filter(log => 
      log.metric.includes('translation') || log.metric.includes('total')
    );

    const audioMetrics = this.logs.filter(log => log.metric.includes('audio'));
    const ttsMetrics = this.logs.filter(log => log.metric.includes('tts'));

    const latencies = translationMetrics.map(m => m.value);

    return {
      totalTranslations: translationMetrics.length,
      averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      audioProcessingTime: audioMetrics.length > 0 ? audioMetrics[audioMetrics.length - 1].value : 0,
      translationTime: this.metrics.get('translation_processing') || 0,
      ttsTime: ttsMetrics.length > 0 ? ttsMetrics[ttsMetrics.length - 1].value : 0,
    };
  }

  logPerformanceIssues(): void {
    const report = this.getPerformanceReport();
    
    if (report.averageLatency > 1000) {
      console.warn('⚠️ High average latency detected:', report.averageLatency + 'ms');
    }
    
    if (report.maxLatency > 2000) {
      console.warn('⚠️ Very high max latency detected:', report.maxLatency + 'ms');
    }

    if (report.audioProcessingTime > 500) {
      console.warn('⚠️ Slow audio processing detected:', report.audioProcessingTime + 'ms');
    }

    console.log('📊 Performance Report:', report);
  }

  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
    this.logs = [];
  }

  // Specific performance tracking methods for the translation app
  trackTranslationStart(): void {
    this.startTimer('total_translation_time');
    this.startTimer('audio_capture_time');
  }

  trackAudioCaptured(): void {
    this.endTimer('audio_capture_time');
    this.startTimer('openai_processing_time');
  }

  trackTranslationReceived(): void {
    this.endTimer('openai_processing_time');
    this.startTimer('tts_processing_time');
  }

  trackTTSComplete(): void {
    this.endTimer('tts_processing_time');
    const totalTime = this.endTimer('total_translation_time');
    
    // Log if latency exceeds targets
    if (totalTime > 700) {
      console.warn(`🐌 Translation exceeded target latency: ${totalTime}ms (target: <700ms)`);
    } else {
      console.log(`✅ Translation completed within target: ${totalTime}ms`);
    }
  }

  trackAudioLatency(bufferSize: number, sampleRate: number): void {
    const latency = (bufferSize / sampleRate) * 1000; // Convert to ms
    this.recordMetric('audio_buffer_latency', latency);
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
