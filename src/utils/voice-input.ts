// Type declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Voice Input Handler Module
export class VoiceInputHandler {
  private isListening: boolean;
  private recognition: SpeechRecognition | null;
  private options: {
    language: string;
    onStart: () => void;
    onResult: (transcript: string) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  };

  constructor(options: {
    language?: string;
    onStart?: () => void;
    onResult?: (transcript: string) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
  } = {}) {
    // Initialize variables
    this.isListening = false;
    this.recognition = null;
    this.options = {
      language: options.language || 'en-US',
      onStart: options.onStart || (() => {}),
      onResult: options.onResult || (() => {}),
      onError: options.onError || (() => {}),
      onEnd: options.onEnd || (() => {})
    };
    
    // Initialize speech recognition
    this.initSpeechRecognition();
  }
  
  // Initialize Web Speech API
  private initSpeechRecognition() {
    // Check browser compatibility
    if (typeof window !== 'undefined') {
      if ('webkitSpeechRecognition' in window) {
        // @ts-expect-error - webkitSpeechRecognition is not in TypeScript's lib
        this.recognition = new webkitSpeechRecognition();
      } else if ('SpeechRecognition' in window) {
        // @ts-expect-error - SpeechRecognition needs to be accessed from window
        this.recognition = new window.SpeechRecognition();
      } else {
        console.error('Speech recognition not supported in this browser');
        return false;
      }

      // Configure recognition
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.options.language;

      // Setup event handlers
      this.recognition.onstart = () => {
        this.isListening = true;
        this.options.onStart();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        this.options.onResult(transcript);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        this.options.onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.options.onEnd();
      };
      
      return true;
    }
    return false;
  }
  
  // Start listening
  startListening() {
    if (!this.recognition) {
      if (!this.initSpeechRecognition()) {
        this.options.onError('Speech recognition not supported');
        return false;
      }
    }
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.options.onError('Error starting speech recognition');
      return false;
    }
  }
  
  // Stop listening
  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
    this.isListening = false;
  }
  
  // Toggle listening state
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }
  
  // Check if currently listening
  isCurrentlyListening() {
    return this.isListening;
  }
  
  // Update recognition language
  setLanguage(language: string) {
    this.options.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
}

// Speech synthesis handler
export class SpeechHandler {
  private currentVoice: SpeechSynthesisVoice | null;
  private voiceSpeed: number;
  private onSpeakStart: () => void;
  private onSpeakEnd: () => void;
  private isSpeaking: boolean;
  private isSupported: boolean;
  
  constructor(options: {
    speed?: number;
    onSpeakStart?: () => void;
    onSpeakEnd?: () => void;
  } = {}) {
    this.currentVoice = null;
    this.voiceSpeed = options.speed || 1;
    this.onSpeakStart = options.onSpeakStart || (() => {});
    this.onSpeakEnd = options.onSpeakEnd || (() => {});
    this.isSpeaking = false;
    
    // Initialize if supported
    this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }
  
  // Get available voices
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported) return [];
    return window.speechSynthesis.getVoices();
  }
  
  // Set voice by index
  setVoice(voiceIndex: string | number) {
    if (!this.isSupported) return false;
    
    const voices = this.getVoices();
    if (voiceIndex === 'default') {
      this.currentVoice = null;
    } else if (typeof voiceIndex === 'number' && voices[voiceIndex]) {
      this.currentVoice = voices[voiceIndex];
    }
    return true;
  }
  
  // Set speech rate
  setSpeed(speed: number | string) {
    this.voiceSpeed = parseFloat(speed.toString());
  }
  
  // Speak text
  speak(text: string) {
    if (!this.isSupported) return false;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    this.isSpeaking = true;
    this.onSpeakStart();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set selected voice if available
    if (this.currentVoice) {
      utterance.voice = this.currentVoice;
    }
    
    // Set speech rate
    utterance.rate = this.voiceSpeed;
    
    utterance.onend = () => {
      this.isSpeaking = false;
      this.onSpeakEnd();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
      this.onSpeakEnd();
    };
    
    window.speechSynthesis.speak(utterance);
    return true;
  }
  
  // Stop speaking
  stop() {
    if (!this.isSupported) return;
    window.speechSynthesis.cancel();
    this.isSpeaking = false;
  }
  
  // Check if currently speaking
  isCurrentlySpeaking() {
    return this.isSpeaking;
  }
}

// Audio visualizer class
export class AudioVisualizer {
  private container: HTMLElement;
  private numBars: number;
  private bars: HTMLElement[];
  private animationFrame: number | null;
  private isActive: boolean;
  
  constructor(container: HTMLElement, numBars = 20) {
    this.container = container;
    this.numBars = numBars;
    this.bars = [];
    this.animationFrame = null;
    this.isActive = false;
    
    this.initVisualizer();
  }
  
  // Initialize visualizer bars
  private initVisualizer() {
    this.container.innerHTML = '';
    this.bars = [];
    
    for (let i = 0; i < this.numBars; i++) {
      const bar = document.createElement('div');
      bar.className = 'visualizer-bar';
      this.container.appendChild(bar);
      this.bars.push(bar);
    }
    
    this.hide();
  }
  
  // Show visualizer
  show() {
    this.container.style.display = 'flex';
  }
  
  // Hide visualizer
  hide() {
    this.container.style.display = 'none';
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  // Start animation
  start() {
    this.isActive = true;
    this.show();
    this.animate();
  }
  
  // Stop animation
  stop() {
    this.isActive = false;
    this.hide();
  }
  
  // Animate bars
  private animate() {
    if (!this.isActive) return;
    
    this.bars.forEach(bar => {
      const height = Math.floor(Math.random() * 25) + 5;
      bar.style.height = `${height}px`;
    });
    
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
} 